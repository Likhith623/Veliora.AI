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

// Helper: safely look up room and peer
function getRoomAndPeer(userRoomId, socketId) {
  const room = rooms.get(userRoomId);
  if (!room) return { room: null, peer: null };
  const peer = room.peers.get(socketId);
  return { room, peer: peer || null };
}

io.on('connection', (socket) => {
  let userRoomId = null;

  socket.on('joinRoom', async ({ roomId, userId }, callback) => {
    try {
      userRoomId = roomId;
      let room = rooms.get(roomId);
      if (!room) {
        const worker = getWorker();
        const router = await worker.createRouter({ mediaCodecs: config.mediasoup.router.mediaCodecs });
        
        // Check if another concurrent request already created the room
        if (rooms.has(roomId)) {
          room = rooms.get(roomId);
          router.close(); // Clean up the unused router
        } else {
          room = { router, peers: new Map() };
          rooms.set(roomId, room);
        }
      }

      if (socket.disconnected) return; // Prevent ghost peers if disconnected during await

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

      console.log(`[Room ${roomId}] User ${userId} (${socket.id}) joined. Peers: ${room.peers.size}`);
      callback({ rtpCapabilities });
    } catch (error) {
      console.error('[joinRoom] Error:', error.message);
      callback({ error: error.message });
    }
  });

  socket.on('createWebRtcTransport', async ({ sender }, callback) => {
    try {
      const { room, peer } = getRoomAndPeer(userRoomId, socket.id);
      if (!room || !peer) {
        return callback({ error: `Peer not found in room. roomId=${userRoomId}, socketId=${socket.id}` });
      }

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
      console.error('[createWebRtcTransport] Error:', error.message);
      callback({ error: error.message });
    }
  });

  socket.on('connectWebRtcTransport', async ({ transportId, dtlsParameters }, callback) => {
    try {
      const { room, peer } = getRoomAndPeer(userRoomId, socket.id);
      if (!room || !peer) return callback({ error: 'Peer not found' });
      
      const transport = peer.transports.get(transportId);
      if (!transport) return callback({ error: `Transport ${transportId} not found` });
      
      await transport.connect({ dtlsParameters });
      callback({});
    } catch (error) {
      console.error('[connectWebRtcTransport] Error:', error.message);
      callback({ error: error.message });
    }
  });

  socket.on('produce', async ({ transportId, kind, rtpParameters, appData }, callback) => {
    try {
      const { room, peer } = getRoomAndPeer(userRoomId, socket.id);
      if (!room || !peer) return callback({ error: 'Peer not found' });
      
      const transport = peer.transports.get(transportId);
      if (!transport) return callback({ error: `Transport ${transportId} not found` });
      
      const producer = await transport.produce({ kind, rtpParameters, appData });
      peer.producers.set(producer.id, producer);

      producer.on('transportclose', () => producer.close());

      // Broadcast to others
      socket.to(userRoomId).emit('newProducer', {
        producerId: producer.id,
        peerId: peer.userId,
        kind: producer.kind
      });

      callback({ id: producer.id });
    } catch (error) {
      console.error('[produce] Error:', error.message);
      callback({ error: error.message });
    }
  });

  socket.on('consume', async ({ producerId, rtpCapabilities }, callback) => {
    try {
      const { room, peer } = getRoomAndPeer(userRoomId, socket.id);
      if (!room || !peer) return callback({ error: 'Peer not found' });

      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        return callback({ error: 'Cannot consume' });
      }

      // Find the receiving transport (marked with consuming=true appData)
      let consumerTransport = null;
      for (const [_, transport] of peer.transports) {
        if (transport.appData && transport.appData.consuming) {
          consumerTransport = transport;
          break;
        }
      }
      // Fallback to any transport
      if (!consumerTransport && peer.transports.size > 0) {
        consumerTransport = peer.transports.values().next().value;
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
      console.error('[consume] Error:', error.message);
      callback({ error: error.message });
    }
  });

  socket.on('resumeConsumer', async ({ consumerId }, callback) => {
    try {
      const { room, peer } = getRoomAndPeer(userRoomId, socket.id);
      if (!room || !peer) {
        if (callback) callback({ error: 'Peer not found' });
        return;
      }
      
      const consumer = peer.consumers.get(consumerId);
      if (consumer) {
        await consumer.resume();
        if (callback) callback({ success: true });
      } else {
        if (callback) callback({ error: 'Consumer not found' });
      }
    } catch (error) {
      console.error('[resumeConsumer] Error:', error.message);
      if (callback) callback({ error: error.message });
    }
  });

  socket.on('disconnect', () => {
    if (userRoomId) {
      const room = rooms.get(userRoomId);
      if (room) {
        const peer = room.peers.get(socket.id);
        if (peer) {
          // Close all transports (this also closes producers and consumers)
          peer.transports.forEach(t => { try { t.close(); } catch(e) {} });
          room.peers.delete(socket.id);
          socket.to(userRoomId).emit('userLeft', { peerId: peer.userId });
          console.log(`[Room ${userRoomId}] User ${peer.userId} (${socket.id}) left. Peers: ${room.peers.size}`);
          if (room.peers.size === 0) {
            room.router.close();
            rooms.delete(userRoomId);
            console.log(`[Room ${userRoomId}] Empty, deleted.`);
          }
        }
      }
    }
  });

  socket.on('getProducers', (data, callback) => {
    const room = rooms.get(userRoomId);
    if (!room) return callback([]);
    
    const producersList = [];
    for (const [peerId, peer] of room.peers.entries()) {
      if (peerId !== socket.id) {
        for (const [producerId, producer] of peer.producers.entries()) {
          producersList.push({
            producerId,
            peerId: peer.userId,
            kind: producer.kind
          });
        }
      }
    }
    callback(producersList);
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
