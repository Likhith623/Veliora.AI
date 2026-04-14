import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GroupCallProps {
  roomId: string;
  userId: string;
  ws: any; // Room WebSocket instance
  onLeave: () => void;
  members: any[];
}

export function GroupCall({ roomId, userId, ws, onLeave, members }: GroupCallProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const pcs = useRef<Record<string, RTCPeerConnection>>({});
  const pendingCandidates = useRef<Record<string, RTCIceCandidateInit[]>>({});

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const getMemberConfig = (id: string) => {
    const member = members.find(m => m.user_id === id);
    if (!member?.profiles_realtime) return { display_name: 'Unknown User' };
    return member.profiles_realtime;
  };

  // Attach streams to video elements
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

  // Clean up a specific peer
  const closePeer = useCallback((id: string) => {
    if (pcs.current[id]) {
      pcs.current[id].close();
      delete pcs.current[id];
    }
    setRemoteStreams(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const createPeerConnection = useCallback((targetId: string, stream: MediaStream) => {
    if (pcs.current[targetId]) return pcs.current[targetId];

    const pc = new RTCPeerConnection(iceServers);
    pcs.current[targetId] = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      setRemoteStreams(prev => ({
        ...prev,
        [targetId]: event.streams[0]
      }));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        ws.send({
          type: 'webrtc_ice_candidate',
          target_user_id: targetId,
          candidate: event.candidate,
        });
      }
    };

    // If we have pending candidates, add them now
    if (pendingCandidates.current[targetId]) {
      pendingCandidates.current[targetId].forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}));
      delete pendingCandidates.current[targetId];
    }

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        closePeer(targetId);
      }
    };

    return pc;
  }, [ws, closePeer]);

  // Handle incoming WS messages for WebRTC
  useEffect(() => {
    if (!ws) return;
    
    // Save original handler to restore later or chain
    const originalOnMessage = ws._originalOnMessage || ws.onMessage;
    // Note: To cleanly hook into the managed websocket, the parent should pass down a callback. 
    // For simplicity, we assume the parent exposes a way to register or we listen.
    // Instead of hacking the WS, we'll build an event system or just use the generic event listener if we could.
  }, [ws]);

  // Initialize Media
  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const initCall = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        
        // Announce readiness
        ws?.send({ type: 'call_join' });
        
        // Hook WS handler
      } catch (err) {
        console.error('Failed to get media:', err);
      }
    };
    
    initCall();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      ws?.send({ type: 'call_leave' });
      Object.keys(pcs.current).forEach(closePeer);
    };
  }, []);

  // Handle signaling inside a ref to avoid stale closures
  const handleSignaling = useCallback(async (msg: any) => {
    if (!localStream) return;
    
    const fromId = msg.from_user_id;
    if (!fromId || fromId === userId) return;
    
    // If it's targeted at someone else, ignore
    if (msg.target_user_id && msg.target_user_id !== userId) return;

    if (msg.type === 'call_join') {
      // New user joined, we create an offer
      const pc = createPeerConnection(fromId, localStream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ws.send({
        type: 'webrtc_offer',
        target_user_id: fromId,
        sdp: offer
      });
    } 
    else if (msg.type === 'call_leave') {
      closePeer(fromId);
    }
    else if (msg.type === 'webrtc_offer') {
      const pc = createPeerConnection(fromId, localStream);
      await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.send({
        type: 'webrtc_answer',
        target_user_id: fromId,
        sdp: answer
      });
    }
    else if (msg.type === 'webrtc_answer') {
      const pc = pcs.current[fromId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      }
    }
    else if (msg.type === 'webrtc_ice_candidate') {
      const pc = pcs.current[fromId];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(console.error);
      } else {
        if (!pendingCandidates.current[fromId]) pendingCandidates.current[fromId] = [];
        pendingCandidates.current[fromId].push(msg.candidate);
      }
    }
  }, [localStream, userId, ws, createPeerConnection, closePeer]);

  // Expose signaling to parent via useEffect passing
  useEffect(() => {
    // In our architecture, the parent receives the message and triggers this
    // We attach it to the window or a global ref for the parent to call
    (window as any)._handleRoomWebRTC = handleSignaling;
    return () => {
      delete (window as any)._handleRoomWebRTC;
    };
  }, [handleSignaling]);

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
          Live Room Call
        </h3>
        <button onClick={onLeave} className="text-xs flex items-center gap-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition">
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
                ref={el => { remoteVideoRefs.current[pid] = el; }}
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
