import React, { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Device } from 'mediasoup-client';

interface GroupCallProps {
  roomId: string;
  userId: string;
  ws: any; // FastAPI WebSocket instance
  onLeave: () => void;
  members: any[];
  mode?: 'p2p' | 'sfu';
  callType?: 'audio' | 'video';
}

export function GroupCall({ roomId, userId, ws, onLeave, members, mode = 'p2p', callType = 'video' }: GroupCallProps) {
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
  
  // Promise-based callback map for native asynchronous WebRTC negotiation over WebSockets
  const pendingRequestsRef = useRef<Map<string, (val: any) => void>>(new Map());
  
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
        
        // Boot straight into P2P if mode is 'p2p'
        if (mode === 'p2p') {
           ws.send({ type: "call_join" }); // Tell FastAPI we are ready for P2P
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
        // ---- CONTROL PLANE: Transition Logic ----
        if (msg.type === "prepare_sfu_transition") {
            console.log("🔥 Make-Before-Break: Activating SFU Transition Engine");
            setActiveMode("transitioning");
            // Kickstart Mediasoup Handshake
            ws.send({ type: "sfu_get_router_rtp_capabilities" });
        }
        
        // ---- MEDIA PLANE: Mediasoup SFU Signaling ----
        else if (msg.type === "sfu_router_rtp_capabilities") {
            const rtpCaps = msg.data.rtpCapabilities;
            const device = new Device();
            await device.load({ routerRtpCapabilities: rtpCaps });
            deviceRef.current = device;
            
            // Ask FastAPI to provision a Send & Recv Transport on Mediasoup
            ws.send({ type: "sfu_create_webrtc_transport", data: { producing: true, consuming: false }});
            ws.send({ type: "sfu_create_webrtc_transport", data: { producing: false, consuming: true }});
        }
        
        else if (msg.type === "sfu_webrtc_transport_created") {
            handleTransportCreated(msg.data.transportOptions);
        }
        
        else if (msg.type === "sfu_transport_connected") {
            // Acknowledge connect
        }
        
        else if (msg.type === "sfu_produced") {
            const { transactionId } = msg;
            console.log("SFU Track producing:", msg.data.id);
            
            // Resolve the Promise awaiting the true Mediasoup ID
            if (transactionId && pendingRequestsRef.current.has(transactionId)) {
                pendingRequestsRef.current.get(transactionId)!({ id: msg.data.id });
                pendingRequestsRef.current.delete(transactionId);
            }
            
            // If we successfully produced both audio and video, we ask for existing remote producers
            if (activeMode === 'transitioning') {
                ws.send({ type: "sfu_get_producers" });
            }
        }
        
        else if (msg.type === "sfu_existing_producers") {
            // These are producers that were already in the room when we transitioned
            const producers = msg.data.producers;
            for (const p of producers) {
                if (p.peerId !== userId) {
                   consumeSFUTrack(p.producerId, p.peerId);
                }
            }
        }
        
        else if (msg.type === "sfu_new_producer") {
            // Dynamically consume new incoming SFU participants
            if (msg.peerId !== userId && (activeMode === 'sfu' || activeMode === 'transitioning')) {
                consumeSFUTrack(msg.producerId, msg.peerId);
            }
        }
        
        else if (msg.type === "sfu_consumed") {
            handleConsumerCreated(msg);
        }
        
        // ---- FALLBACK MEDIA PLANE: WebRTC P2P Mesh ----
        else if (msg.type === 'call_join' && msg.user_id !== userId && activeMode === 'p2p') {
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
  
  const handleTransportCreated = async (transportOptions: any) => {
    const device = deviceRef.current;
    if (!device) return;

    try {
        // If we haven't created Send yet
        if (!sendTransportRef.current) {
            const sendTransport = device.createSendTransport(transportOptions);
            sendTransportRef.current = sendTransport;
            
            sendTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
                ws.send({ type: "sfu_connect_transport", data: { transportId: sendTransport.id, dtlsParameters }});
                // We fake the callback since we trust FastAPI WebSocket delivery. In prod, wait for ACK.
                callback();
            });

            sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
                const transactionId = Math.random().toString(36).substr(2, 9);
                
                // Store the callback in the queue mapping awaiting the true server response
                pendingRequestsRef.current.set(transactionId, (responseIdData) => {
                    callback(responseIdData);
                });
                
                ws.send({ 
                    type: "sfu_produce", 
                    transactionId, 
                    data: { transportId: sendTransport.id, kind, rtpParameters }
                });
            });
            
            // Start producing automatically
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
        else if (!recvTransportRef.current) {
            const recvTransport = device.createRecvTransport(transportOptions);
            recvTransportRef.current = recvTransport;
            
            recvTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
                ws.send({ type: "sfu_connect_transport", data: { transportId: recvTransport.id, dtlsParameters }});
                callback();
            });
        }
    } catch(err) {
        console.error("SFU Transport Error: ", err);
    }
  };
  
  const consumeSFUTrack = async (producerId: string, peerId: string) => {
      const device = deviceRef.current;
      const recvTransport = recvTransportRef.current;
      if (!device || !recvTransport) {
          pendingRemoteProducersRef.current.push({ producerId, peerId, kind: 'unknown' });
          return;
      }
      ws.send({
          type: "sfu_consume",
          data: {
              transportId: recvTransport.id,
              producerId,
              rtpCapabilities: device.rtpCapabilities
          }
      });
  };
  
  const handleConsumerCreated = async (msg: any) => {
     const recvTransport = recvTransportRef.current;
     if (!recvTransport) return;
     
     const { id, producerId, kind, rtpParameters } = msg.data;
     try {
         const consumer = await recvTransport.consume({
            id, producerId, kind, rtpParameters
         });
         
         const { track } = consumer;
         // Find peerId by querying the pending lists or relying on metadata
         // React stream mapping
         setRemoteStreams(prev => {
              const newStream = prev[producerId] ? prev[producerId].clone() : new MediaStream();
              newStream.addTrack(track);
              return { ...prev, [producerId]: newStream }; // We use producerId as proxy key for display
         });
         
         // Trigger the Make-Before-Break Atomic Switch
         if (activeMode === 'transitioning') {
             console.log("✅ SFU Stream Secured. Tearing down P2P cleanly...");
             tearDownP2P();
             setActiveMode('sfu');
         }
         
     } catch (err) {
        console.error("Consumer creation failed", err);
     }
  };


  // ---- P2P IMPLEMENTATION (Mesh) ----
  
  const ICE_SERVERS = {
      iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'turn:127.0.0.1:3478'] }]
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
    ws.send({ type: "call_leave" });
    onLeave();
  };

  const peersToDisplay = Object.entries(remoteStreams);

  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="bg-[#0f111a] border-b border-themed p-4 relative z-10"
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {callType === 'video' ? (
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
        ) : (
          <div className="relative aspect-video bg-[#1a1d2d] rounded-xl flex flex-col items-center justify-center shadow-lg border border-white/10">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-familia-500 to-bond-500 flex items-center justify-center shadow-lg border-4 border-[#1a1d2d]">
              <User className="w-8 h-8 text-white opacity-80" />
            </div>
            <div className="mt-2 bg-black/60 backdrop-blur text-white text-[10px] px-2 py-1 rounded-md flex items-center gap-1">
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