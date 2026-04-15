const express = require('express');
const cors = require('cors');
const mediasoup = require('mediasoup');

const app = express();
app.use(cors());
app.use(express.json());

let worker;
// State Management
// Room = { router: mediasoup.Router, peers: Set<string> }
const rooms = new Map(); 
// Peer = { transports: Map, producers: Map, consumers: Map }
const peers = new Map(); 

// Allowed IPs for media (replace with public IP in production)
const LISTEN_IP = process.env.LISTEN_IP || '127.0.0.1';
const ANNOUNCED_IP = process.env.ANNOUNCED_IP || '127.0.0.1';

async function createWorker() {
  worker = await mediasoup.createWorker({
    logLevel: 'warn',
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
  });
  console.log('Mediasoup worker created [pid:%d]', worker.pid);
  worker.on('died', () => {
    console.error('Mediasoup worker died, exiting...');
    process.exit(1);
  });
}
createWorker();

// --- Internal API for FastAPI ---

// 0. Get Existing Producers in a room
app.get('/room/:roomId/producers', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) return res.json({ producers: [] });

  const producers = [];
  for (const peerId of room.peers) {
    const peer = peers.get(peerId);
    if (!peer) continue;
    for (const [producerId, producer] of peer.producers) {
      producers.push({ producerId: producer.id, peerId, kind: producer.kind });
    }
  }
  res.json({ producers });
});

// 1. Get Router RTP Capabilities (Creates room if not exists)
app.post('/room/:roomId/capabilities', async (req, res) => {
  const { roomId } = req.params;
  try {
    if (!rooms.has(roomId)) {
      const router = await worker.createRouter({
        mediaCodecs: [
          { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
          { kind: 'video', mimeType: 'video/VP8', clockRate: 90000 }
        ]
      });
      rooms.set(roomId, { router, peers: new Set() });
      console.log(`Created router for room ${roomId}`);
    }
    const router = rooms.get(roomId).router;
    res.json({ rtpCapabilities: router.rtpCapabilities });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Create WebRTC Transport Let FastAPI handle the signaling
app.post('/room/:roomId/peer/:peerId/transport', async (req, res) => {
  const { roomId, peerId } = req.params;
  const { producing, consuming } = req.body;
  try {
    const room = rooms.get(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const transport = await room.router.createWebRtcTransport({
      listenIps: [{ ip: LISTEN_IP, announcedIp: ANNOUNCED_IP }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

    transport.on('dtlsstatechange', dtlsState => {
      if (dtlsState === 'closed') transport.close();
    });

    if (!peers.has(peerId)) {
      peers.set(peerId, { transports: new Map(), producers: new Map(), consumers: new Map() });
    }
    peers.get(peerId).transports.set(transport.id, transport);
    room.peers.add(peerId);

    res.json({
      transportOptions: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Connect Transport (DTLS parameters from client -> FastAPI -> Mediasoup)
app.post('/peer/:peerId/transport/:transportId/connect', async (req, res) => {
  const { peerId, transportId } = req.params;
  const { dtlsParameters } = req.body;
  try {
    const transport = peers.get(peerId)?.transports.get(transportId);
    if (!transport) return res.status(404).json({ error: 'Transport not found' });
    await transport.connect({ dtlsParameters });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Produce Media
app.post('/peer/:peerId/transport/:transportId/produce', async (req, res) => {
  const { peerId, transportId } = req.params;
  const { kind, rtpParameters } = req.body;
  try {
    const peer = peers.get(peerId);
    const transport = peer?.transports.get(transportId);
    if (!transport) return res.status(404).json({ error: 'Transport not found' });

    const producer = await transport.produce({ kind, rtpParameters });
    peer.producers.set(producer.id, producer);

    producer.on('transportclose', () => producer.close());

    res.json({ id: producer.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Consume Media
app.post('/room/:roomId/peer/:peerId/transport/:transportId/consume', async (req, res) => {
  const { roomId, peerId, transportId } = req.params;
  const { producerId, rtpCapabilities } = req.body;
  try {
    const room = rooms.get(roomId);
    if (!room || !room.router.canConsume({ producerId, rtpCapabilities })) {
      return res.status(400).json({ error: 'Cannot consume' });
    }
    const transport = peers.get(peerId)?.transports.get(transportId);
    if (!transport) return res.status(404).json({ error: 'Transport not found' });

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: false
    });

    peers.get(peerId).consumers.set(consumer.id, consumer);
    consumer.on('transportclose', () => consumer.close());
    consumer.on('producerclose', () => consumer.close());

    res.json({
      id: consumer.id,
      producerId: consumer.producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Delete Peer & Cleanup Empty Rooms (Prevents Memory Leaks)
app.delete('/room/:roomId/peer/:peerId', (req, res) => {
  const { roomId, peerId } = req.params;
  const peer = peers.get(peerId);
  if (peer) {
    for (const transport of peer.transports.values()) {
      transport.close(); // Automatically closes associated producers/consumers
    }
    peers.delete(peerId);
  }
  const room = rooms.get(roomId);
  if (room) {
    room.peers.delete(peerId);
    if (room.peers.size === 0) {
      room.router.close();
      rooms.delete(roomId);
      console.log(`Cleaned up empty room ${roomId}`);
    }
  }
  res.json({ success: true });
});

app.listen(4000, () => console.log('SFU Internal API listening on port 4000'));
