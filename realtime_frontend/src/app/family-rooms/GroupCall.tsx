import React, { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Device } from 'mediasoup-client';
import { io, Socket } from 'socket.io-client';

interface GroupCallProps {
  roomId: string;
  userId: string;
  ws: any; // Kept for interface compatibility, but we use standalone Socket.io for mediasoup 
  onLeave: () => void;
  members: any[];
}

export function GroupCall({ roomId, userId, onLeave, members }: GroupCallProps) {
  // MEDIASOUP LOGIC HERE
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const streamRef = useRef<MediaStream | null>(null);
  
  const deviceRef = useRef<Device | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const sendTransportRef = useRef<any>(null);
  const recvTransportRef = useRef<any>(null);
  const consumersRef = useRef<Map<string, any>>(new Map());

  // Connect to Mediasoup specific signaling server
  useEffect(() => {
    const MEDIASOUP_SERVER = process.env.NEXT_PUBLIC_MEDIASOUP_URL || 'http://localhost:3016';
    const socket = io(MEDIASOUP_SERVER);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to Mediasoup SFU');
      socket.emit('joinRoom', { roomId, userId }, async ({ rtpCapabilities }: any) => {
        try {
          const device = new Device();
          await device.load({ routerRtpCapabilities: rtpCapabilities });
          deviceRef.current = device;

          socket.emit('createWebRtcTransport', { sender: true }, async (params: any) => {
            if (params.error) return console.error(params.error);
            const transport = device.createSendTransport(params);
            sendTransportRef.current = transport;

            transport.on('connect', ({ dtlsParameters }, callback, errback) => {
              socket.emit('connectWebRtcTransport', { transportId: transport.id, dtlsParameters }, (res: any) => {
                if (res?.error) errback(res.error); else callback();
              });
            });

            transport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
              socket.emit('produce', { transportId: transport.id, kind, rtpParameters, appData }, (id: any) => {
                if (id?.error) errback(id.error); else callback({ id: id.id });
              });
            });

            initMediaAndProduce(transport);
          });

          socket.emit('createWebRtcTransport', { sender: false }, async (params: any) => {
            if (params.error) return console.error(params.error);
            const transport = device.createRecvTransport(params);
            recvTransportRef.current = transport;

            transport.on('connect', ({ dtlsParameters }, callback, errback) => {
              socket.emit('connectWebRtcTransport', { transportId: transport.id, dtlsParameters }, (res: any) => {
                if (res?.error) errback(res.error); else callback();
              });
            });
          });

        } catch (error) {
          console.error('Mediasoup error:', error);
        }
      });
    });

    socket.on('newProducer', async ({ producerId, peerId }: any) => {
      const device = deviceRef.current;
      const transport = recvTransportRef.current;
      if (!device || !transport) return;

      socket.emit('consume', { producerId, rtpCapabilities: device.rtpCapabilities }, async (params: any) => {
        if (params.error) return console.error(params.error);
        const consumer = await transport.consume({ ...params });
        consumersRef.current.set(consumer.id, consumer);

        const { track } = consumer;
        setRemoteStreams(prev => {
          const newStream = prev[peerId] ? prev[peerId].clone() : new MediaStream();
          newStream.addTrack(track);
          return { ...prev, [peerId]: newStream };
        });

        socket.emit('resumeConsumer', { consumerId: consumer.id });
      });
    });

    socket.on('userLeft', ({ peerId }: any) => {
      setRemoteStreams(prev => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
    });

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (sendTransportRef.current) sendTransportRef.current.close();
      if (recvTransportRef.current) recvTransportRef.current.close();
      socket.disconnect();
      deviceRef.current = null;
    };
  }, [roomId, userId]);

  const initMediaAndProduce = async (transport: any) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      const encodings = [
        { maxBitrate: 100000, scaleResolutionDownBy: 4 }, // low
        { maxBitrate: 300000, scaleResolutionDownBy: 2 }, // medium
        { maxBitrate: 900000, scaleResolutionDownBy: 1 }, // high
      ];

      await transport.produce({ track: videoTrack, encodings, codecOptions: { videoGoogleStartBitrate: 1000 } });
      await transport.produce({ track: audioTrack });

    } catch (err) {
      console.error('Failed to get media:', err);
    }
  };

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    Object.entries(remoteStreams).forEach(([id, stream]) => {
      const vRef = remoteVideoRefs.current[id];
      if (vRef && vRef.srcObject !== stream) {
        vRef.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  const getMemberConfig = (id: string) => {
    const member = members.find(m => m.user_id === id);
    if (!member?.profiles_realtime) return { display_name: 'Unknown User' };
    return member.profiles_realtime;
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (sendTransportRef.current) sendTransportRef.current.close();
    if (recvTransportRef.current) recvTransportRef.current.close();
    socketRef.current?.disconnect();
    onLeave();
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const peers = Object.entries(remoteStreams);

  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="bg-[#0f111a] border-b border-themed p-4 relative z-10"
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Video className="w-4 h-4 text-green-400" />
          Live Room Call (SFU)
        </h3>
        <button onClick={cleanup} className="text-xs flex items-center gap-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition">
          <PhoneOff className="w-3 h-3" /> Leave Call
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-lg border border-white/10 group">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur text-white text-[10px] px-2 py-1 rounded-md flex items-center gap-1">
            <User className="w-3 h-3" /> You
          </div>
          <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
            <button onClick={toggleAudio} className={`p-1.5 rounded-lg backdrop-blur ${isAudioEnabled ? 'bg-black/40 text-white' : 'bg-red-500/80 text-white'}`}>
              {isAudioEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
            </button>
            <button onClick={toggleVideo} className={`p-1.5 rounded-lg backdrop-blur ${isVideoEnabled ? 'bg-black/40 text-white' : 'bg-red-500/80 text-white'}`}>
              {isVideoEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {peers.map(([pid, stream]) => (
            <motion.div 
              key={pid}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative aspect-video bg-[#1a1d2d] rounded-xl overflow-hidden shadow-lg border border-white/5"
            >
              <video
                ref={el => { if (el) remoteVideoRefs.current[pid] = el; }}
                autoPlay
                playsInline
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur text-white text-[10px] px-2 py-1 rounded-md flex items-center gap-1">
                <User className="w-3 h-3" /> {getMemberConfig(pid).display_name}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}