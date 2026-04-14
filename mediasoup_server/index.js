const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mediasoup = require('mediasoup');
const config = require('./config');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

let workers = [];
let nextWorkerIdx = 0;

const rooms = new Map(); // roomId -> { router, peers: Map<socketId, Peer> }

async function createWorkers() {
  const { numWorkers, worker: workerConfig } = config.mediasoup;
  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: workerConfig.logLevel,
      logTags: workerConfig.logTags,
      rtcMinPort: workerConfig.rtcMinPort,
      rtcMaxPort: workerConfig.rtcMaxPort,
    });
    worker.on('died', () => {
      console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
      setTimeout(() => process.exit(1), 2000);
    });
    workers.push(worker);
  }
}

function getWorker() {
  const worker = workers[nextWorkerIdx];
  if (++nextWorkerIdx === workers.length) nextWorkerIdx = 0;
  return worker;
}

io.on('connection', (socket) => {
  let userRoomId = null;

  socket.on('joinRoom', async ({ roomId, userId }, callback) => {
    userRoomId = roomId;
    let room = rooms.get(roomId);
    if (!room) {
      const worker = getWorker();
      const router = await worker.createRouter({ mediaCodecs: config.mediasoup.router.mediaCodecs });
      room = { router, peers: new Map() };
      rooms.set(roomId, room);
    }

    room.peers.set(socket.id, {
      userId,
      transports: new Map(), // transportId -> transport
      producers: new Map(),  // producerId -> producer
      consumers: new Map(),  // consumerId -> consumer
    });

    const rtpCapabilities = room.router.rtpCapabilities;
    
    // Notify others
    socket.to(roomId).emit('userJoined', { peerId: socket.id, userId });
    socket.join(roomId);

    callback({ rtpCapabilities });
  });

  socket.on('createWebRtcTransport', async ({ sender }, callback) => {
    try {
      const room = rooms.get(userRoomId);
      const peer = room.peers.get(socket.id);
      
      const { listenIps, maxIncomingBitrate, initialAvailableOutgoingBitrate } = config.mediasoup.webRtcTransport;
      const transport = await room.router.createWebRtcTransport({
        listenIps: listenIps,
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate,
        appData: { consuming: !sender }
      });

      if (maxIncomingBitrate) {
        try { await transport.setMaxIncomingBitrate(maxIncomingBitrate); } catch (error) {}
      }

      peer.transports.set(transport.id, transport);

      transport.on('dtlsstatechange', (dtlsState) => {
        if (dtlsState === 'closed') transport.close();
      });

      transport.on('routerclose', () => {
        transport.close();
      });

      callback({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
      });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  socket.on('connectWebRtcTransport', async ({ transportId, dtlsParameters }, callback) => {
    try {
      const room = rooms.get(userRoomId);
      const peer = room.peers.get(socket.id);
      const transport = peer.transports.get(transportId);
      await transport.connect({ dtlsParameters });
      callback();
    } catch (error) {
      callback({ error: error.message });
    }
  });

  socket.on('produce', async ({ transportId, kind, rtpParameters, appData }, callback) => {
    try {
      const room = rooms.get(userRoomId);
      const peer = room.peers.get(socket.id);
      const transport = peer.transports.get(transportId);
      
      const producer = await transport.produce({ kind, rtpParameters, appData });
      peer.producers.set(producer.id, producer);

      producer.on('transportclose', () => producer.close());

      // Broadcast to others
      socket.to(userRoomId).emit('newProducer', {
        producerId: producer.id,
        peerId: socket.id,
        kind: producer.kind
      });

      callback({ id: producer.id });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  socket.on('consume', async ({ producerId, rtpCapabilities }, callback) => {
    try {
      const room = rooms.get(userRoomId);
      if (!room || !room.router.canConsume({ producerId, rtpCapabilities })) {
        return callback({ error: 'Cannot consume' });
      }

      // Find the receiving peer's consume transport
      const peer = room.peers.get(socket.id);
      
      // Grab any receiving transport (assuming the client created one)
      let consumerTransport;
      for (const [_, transport] of peer.transports) {
        if (transport.appData && transport.appData.consuming) {
          consumerTransport = transport;
          break;
        } else if (!consumerTransport) {
          consumerTransport = transport; // fallback
        }
      }

      if (!consumerTransport) return callback({ error: 'No transport available' });

      // Create an initial paused consumer
      const consumer = await consumerTransport.consume({
        producerId,
        rtpCapabilities,
        paused: true
      });

      peer.consumers.set(consumer.id, consumer);

      consumer.on('transportclose', () => {
        peer.consumers.delete(consumer.id);
        consumer.close();
      });

      consumer.on('producerclose', () => {
        peer.consumers.delete(consumer.id);
        consumer.close();
        socket.emit('consumerClosed', { consumerId: consumer.id });
      });

      callback({
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters
      });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  socket.on('resumeConsumer', async ({ consumerId }, callback) => {
    try {
      const room = rooms.get(userRoomId);
      const peer = room.peers.get(socket.id);
      const consumer = peer.consumers.get(consumerId);
      
      if (consumer) {
        await consumer.resume();
        if (callback) callback({ success: true });
      }
    } catch (error) {
      if (callback) callback({ error: error.message });
    }
  });

  socket.on('disconnect', () => {
    if (userRoomId) {
      const room = rooms.get(userRoomId);
      if (room) {
        const peer = room.peers.get(socket.id);
        if (peer) {
          peer.transports.forEach(t => t.close());
          room.peers.delete(socket.id);
          socket.to(userRoomId).emit('userLeft', { peerId: socket.id });
          if (room.peers.size === 0) {
            rooms.delete(userRoomId);
          }
        }
      }
    }
  });
});

createWorkers().then(() => {
  const PORT = config.listenPort || 3016;
  server.listen(PORT, config.listenIp, () => {
    console.log(`Mediasoup SFU Server running at http://${config.listenIp}:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to create workers', err);
});
