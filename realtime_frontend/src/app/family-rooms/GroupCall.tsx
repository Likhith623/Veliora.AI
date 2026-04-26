import React, { useEffect, useRef, useState } from 'react';
import { Loader2, PhoneOff, Mic, MicOff, Video, VideoOff, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Device } from 'mediasoup-client';
import { io, Socket } from 'socket.io-client';

interface GroupCallProps {
  roomId: string;
  userId: string;
  ws: any; // FastAPI WebSocket instance
  onLeave: () => void;
  members: any[];
  mode?: 'p2p' | 'sfu';
  callType?: 'audio' | 'video';
}

export function GroupCall({ roomId, userId, ws, onLeave, members, mode = 'sfu', callType = 'video' }: GroupCallProps) {
  // --- STATE ---
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [activeMode, setActiveMode] = useState<'p2p'|'sfu'|'transitioning'>(mode);
  
  // --- REFS ---
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const streamRef = useRef<MediaStream | null>(null);
  const peerMapRef = useRef<Record<string, string>>({});
  const sfuSocketRef = useRef<Socket | null>(null);
  const consumeQueueRef = useRef<Promise<void>>(Promise.resolve());
  
  // Custom P2P Mesh Trackers
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  
  // Mediasoup SFU Trackers
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<any>(null);
  const recvTransportRef = useRef<any>(null);
  const consumersRef = useRef<Map<string, any>>(new Map());
  // Pre-cached producers during transition to avoid race conditions
  const pendingRemoteProducersRef = useRef<Array<{producerId: string, peerId: string, kind: string}>>([]);

  // 1. Initialize local media early
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: callType === 'video' ? {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30, max: 30 }
          } : false
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!active) return;
        setLocalStream(stream);
        streamRef.current = stream;
        
        // Boot straight into the active mode
        if (mode === 'p2p') {
           ws.send({ type: "call_join" }); // Tell FastAPI we are ready for P2P
        } else if (mode === 'sfu' || mode === 'transitioning') {
           ws.send({ type: "call_join" }); 
           
           // NATIVE SFU CONNECTION: Connect directly to Mediasoup Server Node.js
           const socket = io('http://localhost:3016');
           sfuSocketRef.current = socket;
           
           socket.on('connect', () => {
             console.log("🟢 Connected to Mediasoup SFU");
             socket.emit('joinRoom', { roomId, userId }, async (response: any) => {
               const { rtpCapabilities } = response;
               const device = new Device();
               await device.load({ routerRtpCapabilities: rtpCapabilities });
               deviceRef.current = device;
               
               socket.emit('createWebRtcTransport', { sender: true }, (opts: any) => handleTransportCreated(opts, true));
               socket.emit('createWebRtcTransport', { sender: false }, (opts: any) => handleTransportCreated(opts, false));
               
               // Fetch existing producers already in the room
               socket.emit('getProducers', {}, (producers: any[]) => {
                 for (const p of producers) {
                   consumeSFUTrack(p.producerId, p.peerId);
                 }
               });
             });
           });
           
           socket.on('newProducer', ({ producerId, peerId, kind }: any) => {
             if (peerId !== socket.id) {
                 consumeSFUTrack(producerId, peerId);
             }
           });
           
           socket.on('userLeft', ({ peerId }: any) => {
             setRemoteStreams(prev => {
               const next = { ...prev };
               delete next[peerId];
               return next;
             });
           });
        }
      } catch (err) {
        console.error('Failed to get local media:', err);
      }
    })();
    return () => { active = false; };
  }, [mode, ws]);

  // 2. Central WebSocket Router
  useEffect(() => {
    if (!ws) return;
    
    const handleWsMessage = async (msg: any) => {
        // ---- FALLBACK MEDIA PLANE: WebRTC P2P Mesh ----
        if (msg.type === 'call_join' && msg.user_id !== userId && activeMode === 'p2p') {
             initiateP2PConnection(msg.user_id);
        }
        else if (msg.type === 'webrtc_offer' && msg.from_user_id !== userId && activeMode === 'p2p') {
             handleP2POffer(msg);
        }
        else if (msg.type === 'webrtc_answer' && msg.from_user_id !== userId && activeMode === 'p2p') {
             handleP2PAnswer(msg);
        }
        else if (msg.type === 'webrtc_ice_candidate' && msg.from_user_id !== userId && activeMode === 'p2p') {
             handleP2PIceCandidate(msg);
        }
        else if (msg.type === "call_leave") {
             closePeerP2PConnection(msg.user_id);
        }
    };
    
    (window as any)._handleRoomWebRTC = handleWsMessage;
    return () => {
      if ((window as any)._handleRoomWebRTC === handleWsMessage) {
        delete (window as any)._handleRoomWebRTC;
      }
    };
  }, [ws, activeMode, userId]);


  // ---- SFU IMPLEMENTATION (Mediasoup Client) ----
  
  const handleTransportCreated = async (transportOptions: any, isSender: boolean) => {
    const device = deviceRef.current;
    const socket = sfuSocketRef.current;
    if (!device || !socket) return;

    try {
        if (isSender) {
            const sendTransport = device.createSendTransport(transportOptions);
            sendTransportRef.current = sendTransport;
            
            sendTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
                socket.emit('connectWebRtcTransport', { transportId: sendTransport.id, dtlsParameters }, () => callback());
            });

            sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
                socket.emit('produce', { transportId: sendTransport.id, kind, rtpParameters, appData }, ({ id, error }: any) => {
                    if (error) errback(new Error(error));
                    else callback({ id });
                });
            });
            
            if (streamRef.current) {
                 const videoTrack = streamRef.current.getVideoTracks()[0];
                 const audioTrack = streamRef.current.getAudioTracks()[0];
                 
                 if (videoTrack) {
                     await sendTransport.produce({ 
                         track: videoTrack,
                         encodings: [
                             { maxBitrate: 100000, scaleResolutionDownBy: 4 }, // Low Quality (e.g. 160x120)
                             { maxBitrate: 300000, scaleResolutionDownBy: 2 }, // Medium Quality (e.g. 320x240)
                             { maxBitrate: 900000, scaleResolutionDownBy: 1 }  // High Quality (e.g. 640x480)
                         ],
                         codecOptions: { videoGoogleStartBitrate: 300 }
                     });
                 }
                 if (audioTrack) {
                     await sendTransport.produce({ track: audioTrack });
                 }
            }
        } 
        else {
            const recvTransport = device.createRecvTransport(transportOptions);
            recvTransportRef.current = recvTransport;
            
            recvTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
                socket.emit('connectWebRtcTransport', { transportId: recvTransport.id, dtlsParameters }, () => callback());
            });
            
            // Drain any producers that were fetched before this transport was ready
            if (pendingRemoteProducersRef.current.length > 0) {
                pendingRemoteProducersRef.current.forEach(p => consumeSFUTrack(p.producerId, p.peerId));
                pendingRemoteProducersRef.current = [];
            }
        }
    } catch(err) {
        console.error("SFU Transport Error: ", err);
    }
  };
  
  const consumeSFUTrack = async (producerId: string, peerId: string) => {
      const device = deviceRef.current;
      const recvTransport = recvTransportRef.current;
      const socket = sfuSocketRef.current;
      
      if (!device || !recvTransport || !socket) {
          pendingRemoteProducersRef.current.push({ producerId, peerId, kind: 'unknown' });
          return;
      }
      
      peerMapRef.current[producerId] = peerId;
      
      socket.emit('consume', {
          producerId,
          rtpCapabilities: device.rtpCapabilities
      }, ({ id, kind, rtpParameters, error }: any) => {
          if (error) return console.error(error);
          
          consumeQueueRef.current = consumeQueueRef.current.then(async () => {
              try {
                  const consumer = await recvTransport.consume({
                     id, producerId, kind, rtpParameters
                  });
                  
                  const { track } = consumer;
                  setRemoteStreams(prev => {
                      const newStream = prev[peerId] ? prev[peerId].clone() : new MediaStream();
                      newStream.addTrack(track);
                      return { ...prev, [peerId]: newStream };
                  });
                  
                  socket.emit('resumeConsumer', { consumerId: id });
                  
                  if (activeMode === 'transitioning') {
                      console.log("✅ SFU Stream Secured. Tearing down P2P cleanly...");
                      tearDownP2P();
                      setActiveMode('sfu');
                  }
                  
              } catch(err) {
                  console.error("Consumer creation failed", err);
              }
          }).catch(err => console.error("Consume Queue Error: ", err));
      });
  };


  // ---- P2P IMPLEMENTATION (Mesh) ----
  
  const ICE_SERVERS = {
      iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }]
  };

  const initiateP2PConnection = async (remoteUserId: string) => {
      // Setup WebRTC peer locally
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current[remoteUserId] = pc;
      
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => pc.addTrack(track, streamRef.current!));
      }
      
      pc.onicecandidate = e => {
          if (e.candidate) ws.send({ type: "webrtc_ice_candidate", candidate: e.candidate, to_user_id: remoteUserId });
      };
      
      pc.ontrack = e => {
          setRemoteStreams(prev => ({ ...prev, [remoteUserId]: e.streams[0] }));
      };
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ws.send({ type: 'webrtc_offer', offer: pc.localDescription, to_user_id: remoteUserId });
  };
  
  const handleP2POffer = async (msg: any) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current[msg.from_user_id] = pc;
      
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => pc.addTrack(track, streamRef.current!));
      }
      
      pc.onicecandidate = e => {
          if (e.candidate) ws.send({ type: "webrtc_ice_candidate", candidate: e.candidate, to_user_id: msg.from_user_id });
      };
      
      pc.ontrack = e => {
          setRemoteStreams(prev => ({ ...prev, [msg.from_user_id]: e.streams[0] }));
      };
      
      await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.send({ type: "webrtc_answer", answer: pc.localDescription, to_user_id: msg.from_user_id });
  };
  
  const handleP2PAnswer = async (msg: any) => {
       const pc = peerConnectionsRef.current[msg.from_user_id];
       if (pc) await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
  };
  
  const handleP2PIceCandidate = async (msg: any) => {
       const pc = peerConnectionsRef.current[msg.from_user_id];
       if (pc && msg.candidate) await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
  };
  
  const closePeerP2PConnection = (remoteUser: string) => {
       if (peerConnectionsRef.current[remoteUser]) {
           peerConnectionsRef.current[remoteUser].close();
           delete peerConnectionsRef.current[remoteUser];
       }
       setRemoteStreams(prev => {
            const next = {...prev}; delete next[remoteUser]; return next;
       });
  };
  
  const tearDownP2P = () => {
      Object.keys(peerConnectionsRef.current).forEach(id => closePeerP2PConnection(id));
      peerConnectionsRef.current = {};
      // Reset video streams object for SFU injection
      setRemoteStreams({});
  };

  // ---- UI RENDERING ----

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
    if (!member?.profiles_realtime) return { display_name: `User ${id.substring(0,4)}` };
    return member.profiles_realtime;
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

  const cleanup = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    tearDownP2P();
    if (sendTransportRef.current) sendTransportRef.current.close();
    if (recvTransportRef.current) recvTransportRef.current.close();
    if (sfuSocketRef.current) sfuSocketRef.current.disconnect();
    ws.send({ type: "call_leave" });
    onLeave();
  };

  const peersToDisplay = Object.entries(remoteStreams);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[100] bg-[#0a0a0a] flex flex-col p-6 overflow-y-auto"
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          {activeMode === 'sfu' ? <Video className="w-4 h-4 text-green-400" /> : 
           activeMode === 'transitioning' ? <Loader2 className="w-4 h-4 text-yellow-400 animate-spin"/> :
           <Video className="w-4 h-4 text-blue-400" />}
          Live Room Call ({activeMode.toUpperCase()})
        </h3>
        <button onClick={cleanup} className="text-xs flex items-center gap-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition">
          <PhoneOff className="w-3 h-3" /> Leave Call
        </button>
      </div>

      <div className={`flex-1 ${Object.keys(remoteStreams).length === 0 ? 'flex justify-center items-center max-w-4xl mx-auto w-full' : 
        Object.keys(remoteStreams).length === 1 ? 'grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl mx-auto w-full' : 
        Object.keys(remoteStreams).length === 2 ? 'grid grid-cols-2 md:grid-cols-2 gap-4 max-w-6xl mx-auto w-full' : 
        'grid grid-cols-2 md:grid-cols-3 gap-4 max-w-7xl mx-auto w-full'}`}>
        {callType === 'video' ? (
          <div className={`relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 group ${Object.keys(remoteStreams).length === 0 ? 'w-full aspect-video max-h-[70vh]' : 'aspect-video w-full'} ${Object.keys(remoteStreams).length === 2 ? 'col-span-2 md:col-span-1 md:row-span-2' : ''}`}>
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
        ) : (
          <div className={`relative bg-[#1a1d2d] rounded-2xl flex flex-col items-center justify-center shadow-2xl border border-white/10 ${Object.keys(remoteStreams).length === 0 ? 'w-full aspect-video max-h-[70vh]' : 'aspect-video w-full'} ${Object.keys(remoteStreams).length === 2 ? 'col-span-2 md:col-span-1 md:row-span-2' : ''}`}>
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-familia-500 to-bond-500 flex items-center justify-center shadow-2xl border-4 border-[#1a1d2d]">
              <User className="w-10 h-10 text-white opacity-90" />
            </div>
            <div className="mt-4 bg-black/60 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
              <User className="w-3 h-3" /> You
            </div>
            <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
              <button onClick={toggleAudio} className={`p-1.5 rounded-lg backdrop-blur ${isAudioEnabled ? 'bg-black/40 text-white' : 'bg-red-500/80 text-white'}`}>
                {isAudioEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
              </button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {peersToDisplay.map(([pid, stream]) => (
            <motion.div 
              key={pid}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`relative bg-[#1a1d2d] rounded-2xl overflow-hidden shadow-2xl border border-white/5 aspect-video w-full ${Object.keys(remoteStreams).length === 2 ? 'h-full' : ''}`}
            >
              <video
                ref={el => { if (el) remoteVideoRefs.current[pid] = el; }}
                autoPlay
                playsInline
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
              {stream.getVideoTracks().length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1d2d]">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-2xl border-4 border-[#1a1d2d]">
                    {getMemberConfig(pid).avatar_url ? (
                      <img src={getMemberConfig(pid).avatar_url} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <User className="w-10 h-10 text-white opacity-80" />
                    )}
                  </div>
                  <div className="mt-4 bg-black/60 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
                    <User className="w-3 h-3" /> {getMemberConfig(pid).display_name || 'Member'}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}