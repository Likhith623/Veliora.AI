'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Phone, PhoneOff, Video, VideoOff, Mic, MicOff,
  Volume2, VolumeX, Clock, Loader2, PhoneIncoming, PhoneForwarded,
  PhoneMissed
} from 'lucide-react';
import { api } from '@/lib/api';
import { createCallSignalingWS, type ManagedWebSocket } from '@/lib/websocket';
import { useAuth } from '@/lib/AuthContext';
import type { CallLog } from '@/types';
import toast from 'react-hot-toast';

type CallView = 'idle' | 'ringing' | 'incoming' | 'connecting' | 'active' | 'ended';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

function CallsPageContent() {
  const searchParams = useSearchParams();
  const relId = searchParams.get('rel') || '';
  const callTypeParam = (searchParams.get('type') as 'audio' | 'video') || 'audio';
  const { user, relationships } = useAuth();

  const [callView, setCallView] = useState<CallView>(searchParams.get('incoming') === 'true' ? 'incoming' : 'idle');
  const [callType, setCallType] = useState<'audio' | 'video'>(callTypeParam);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [selectedRel, setSelectedRel] = useState(relId);
  const [partnerName, setPartnerName] = useState('Partner');
  const [incomingCallType, setIncomingCallType] = useState<'audio' | 'video'>(callTypeParam);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<ManagedWebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number>(0);
  const timerStartedRef = useRef(false); // Prevent double-start

  const activeRel = relationships.find(r => r.id === selectedRel);

  // Load call logs
  useEffect(() => {
    if (selectedRel) {
      api.getCallLogs(selectedRel).then(res => {
        setCallLogs(Array.isArray(res) ? res : res.logs || []);
      }).catch(() => {});
      if (activeRel?.partner?.display_name) setPartnerName(activeRel.partner.display_name);
      else if (activeRel?.partner_display_name) setPartnerName(activeRel.partner_display_name);
    }
  }, [selectedRel, activeRel]);

  // ── SDP Optimizer for Maximum Audio Quality ──
  const enhanceSDPAudioQuality = (sdp: string) => {
    let enhancedSdp = sdp;
    // Extract the OPUS payload type (usually 111, but can vary)
    const rtpmapMatch = enhancedSdp.match(/a=rtpmap:(\d+) opus\/48000\/2/);
    if (rtpmapMatch) {
      const pt = rtpmapMatch[1];
      // Target existing fmtp line for OPUS, or append if missing
      const fmtpRegex = new RegExp(`a=fmtp:${pt}\\s+(.*?)(?:\\r?\\n|$)`);
      if (fmtpRegex.test(enhancedSdp)) {
        enhancedSdp = enhancedSdp.replace(fmtpRegex, (match, p1) => {
          let newParams = p1;
          if (!newParams.includes('stereo=1')) newParams += ';stereo=1';
          if (!newParams.includes('sprop-stereo=1')) newParams += ';sprop-stereo=1';
          if (!newParams.includes('maxaveragebitrate=')) newParams += ';maxaveragebitrate=510000'; // 510kbps Opus max
          if (!newParams.includes('useinbandfec=1')) newParams += ';useinbandfec=1';
          if (!newParams.includes('cbr=1')) newParams += ';cbr=1';
          return `a=fmtp:${pt} ${newParams}\r\n`;
        });
      } else {
        enhancedSdp = enhancedSdp.replace(
          new RegExp(`a=rtpmap:${pt} opus\\/48000\\/2`),
          `a=rtpmap:${pt} opus/48000/2\r\na=fmtp:${pt} stereo=1;sprop-stereo=1;maxaveragebitrate=510000;useinbandfec=1;cbr=1`
        );
      }
    }
    return enhancedSdp;
  };

  // ── Acquire local media ──
  const acquireMedia = useCallback(async (type: 'audio' | 'video') => {
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 2,
        // Advanced browser-specific constraints for broadcasting quality
        googEchoCancellation: true,
        googAutoGainControl: true,
        googNoiseSuppression: true,
        googHighpassFilter: false, // Prevents cutting off deep voices
        googTypingNoiseDetection: true,
        googAudioMirroring: false
      } as any,
      video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60, min: 24 }, facingMode: 'user' } : false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    // We attach srcObject later using useEffect on callView change to ensure elements exist in DOM.
    if (localVideoRef.current && type === 'video') {
      localVideoRef.current.srcObject = stream;
    }
    return stream;
  }, []);

  // ── Create RTCPeerConnection ──
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.ontrack = (event) => {
      if (event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          remoteVideoRef.current.play().catch(e => console.warn('Video play blocked:', e));
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(e => console.warn('Audio play blocked:', e));
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallView('active');
        startTimer();
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        toast.error('Connection lost');
        endCall(false);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send({ type: 'ice_candidate', candidate: event.candidate.toJSON() });
      }
    };

    return pc;
  }, []);

  // ── Timer (with guard against double-start) ──
  const startTimer = useCallback(() => {
    if (timerStartedRef.current) return; // Prevent double-start
    timerStartedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setElapsedTime(0);
    callStartTimeRef.current = Date.now();
    timerRef.current = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
  }, []);

  // ── End call ──
  const endCall = useCallback((sendEndSignal = true) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    timerStartedRef.current = false;

    const duration = callStartTimeRef.current > 0
      ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
      : elapsedTime;

    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;

    if (sendEndSignal && wsRef.current) {
      wsRef.current.send({
        type: 'call_end',
        call_type: callType,
        duration_seconds: duration,
      });
    }

    wsRef.current?.close();
    wsRef.current = null;

    setCallView('ended');
    callStartTimeRef.current = 0;
  }, [callType, elapsedTime]);

  // ── Start an outgoing call (CALLER flow) ──
  const startCall = useCallback(async () => {
    if (!user?.id || !selectedRel) return;
    setCallView('connecting');

    try {
      const stream = await acquireMedia(callType);
      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const ws = createCallSignalingWS(selectedRel, user.id, {
        onOpen: () => {
          ws.send({ type: 'call_start', call_type: callType });
          setCallView('ringing');
        },
        onIncomingCall: () => { /* Caller won't receive incoming_call for own call */ },
        onCallAccept: async () => {
          // Partner has accepted, now we can send our offer
          try {
            const offer = await pc.createOffer();
            offer.sdp = enhanceSDPAudioQuality(offer.sdp || ''); // Apply highest quality OPUS settings
            await pc.setLocalDescription(offer);
            ws.send({ type: 'offer', sdp: offer.sdp });
          } catch (e) {
            console.error('[Call] Failed to create offer:', e);
          }
        },
        onOffer: async (sdp) => {
          // If we're the caller and receive an offer, handle gracefully (edge case)
          try {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
            const answer = await pc.createAnswer();
            answer.sdp = enhanceSDPAudioQuality(answer.sdp || ''); // Apply highest quality OPUS settings
            await pc.setLocalDescription(answer);
            ws.send({ type: 'answer', sdp: answer.sdp });
          } catch (e) {
            console.error('[Call] Failed to handle offer:', e);
          }
        },
        onAnswer: async (sdp) => {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
            setCallView('active');
            startTimer();
          } catch (e) {
            console.error('[Call] Failed to set remote answer:', e);
          }
        },
        onICECandidate: async (candidate) => {
          try {
            if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error('[Call] ICE candidate error:', e);
          }
        },
        onCallEnded: () => endCall(false),
        onCallRejected: () => {
          toast('Call was rejected');
          endCall(false);
        },
        onPeerDisconnected: () => {
          toast.error('Partner disconnected');
          endCall(false);
        },
        onError: (msg) => {
          toast.error(msg);
          endCall(false);
        },
      });

      wsRef.current = ws;

    } catch (err: any) {
      console.error('Failed to start call:', err);
      if (err.name === 'NotAllowedError') {
        toast.error('Microphone/camera access denied');
      } else {
        toast.error(err.message || 'Failed to start call');
      }
      setCallView('idle');
    }
  }, [user?.id, selectedRel, callType, acquireMedia, createPeerConnection, startTimer, endCall]);

  // ── Accept an incoming call (RECEIVER flow) ──
  const acceptIncomingCall = useCallback(async () => {
    if (!user?.id || !selectedRel) return;
    setCallView('connecting');

    try {
      const stream = await acquireMedia(incomingCallType);
      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      setCallType(incomingCallType);

      // Close the previous idle listening WS
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // The existing WS is already connected from the signaling listener
      // We now need to handle the full WebRTC handshake as the answerer
      const ws = createCallSignalingWS(selectedRel, user.id, {
        onOpen: () => {
          // Send ready signal — the caller's offer should arrive shortly
          ws.send({ type: 'call_accept' });
        },
        onIncomingCall: () => { /* Already accepted */ },
        onOffer: async (sdp) => {
          // Step 1: Receive caller's offer → create answer
          try {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
            const answer = await pc.createAnswer();
            answer.sdp = enhanceSDPAudioQuality(answer.sdp || ''); // Apply highest quality OPUS settings
            await pc.setLocalDescription(answer);
            ws.send({ type: 'answer', sdp: answer.sdp });
            setCallView('active');
            startTimer();
          } catch (e) {
            console.error('[Call] Failed to handle incoming offer:', e);
            toast.error('Failed to connect');
            endCall(false);
          }
        },
        onAnswer: async (sdp) => {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
          } catch (e) {
            console.error('[Call] Answer error:', e);
          }
        },
        onICECandidate: async (candidate) => {
          try {
            if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error('[Call] ICE error:', e);
          }
        },
        onCallEnded: () => endCall(false),
        onCallRejected: () => endCall(false),
        onPeerDisconnected: () => {
          toast.error('Partner disconnected');
          endCall(false);
        },
        onError: (msg) => {
          toast.error(msg);
          endCall(false);
        },
      });

      wsRef.current = ws;

    } catch (err: any) {
      console.error('Failed to accept call:', err);
      toast.error(err.name === 'NotAllowedError' ? 'Microphone/camera access denied' : 'Failed to accept call');
      setCallView('idle');
    }
  }, [user?.id, selectedRel, incomingCallType, acquireMedia, createPeerConnection, startTimer, endCall]);

  // ── Reject an incoming call ──
  const rejectCall = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send({ type: 'call_reject' });
      wsRef.current.close();
      wsRef.current = null;
    }
    setCallView('idle');
    toast('Call rejected');
  }, []);

  // Auto-accept if directed from notification
  const hasAutoAccepted = useRef(false);
  useEffect(() => {
    if (callView === 'incoming' && searchParams.get('incoming') === 'true' && user?.id && selectedRel && !hasAutoAccepted.current) {
      hasAutoAccepted.current = true;
      // Clean URL params silently so refreshes don't re-trigger it
      window.history.replaceState({}, '', `/calls?rel=${selectedRel}&type=${callTypeParam}`);
      // Add slight delay to ensure UI state transitions cleanly before acquiring media
      setTimeout(() => acceptIncomingCall(), 300);
    }
  }, [callView, searchParams, user?.id, selectedRel, callTypeParam, acceptIncomingCall]);

  // ── Listen for incoming calls via WS when idle ──
  useEffect(() => {
    if (!user?.id || !selectedRel || callView !== 'idle') return;

    const ws = createCallSignalingWS(selectedRel, user.id, {
      onIncomingCall: (ct, callerId) => {
        setIncomingCallType(ct as 'audio' | 'video');
        setCallView('incoming');
        // Find caller's name from relationship
        const rel = relationships.find(r => r.id === selectedRel);
        if (rel?.partner?.display_name) setPartnerName(rel.partner.display_name);
      },
      onOffer: () => { /* Will be handled after accept */ },
      onAnswer: () => {},
      onICECandidate: () => {},
      onCallEnded: () => setCallView('idle'),
      onCallRejected: () => setCallView('idle'),
      onPeerDisconnected: () => setCallView('idle'),
      onError: () => {},
    });

    wsRef.current = ws;

    return () => {
      // Only close if still idle (don't close during active calls)
      if (callView === 'idle') {
        ws.close();
      }
    };
  }, [user?.id, selectedRel, callView, relationships]);

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    setIsMuted(!isMuted);
  };

  const toggleCamera = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = isCameraOff; });
    setIsCameraOff(!isCameraOff);
  };

  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !isSpeakerOn;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !isSpeakerOn;
    }
  }, [isSpeakerOn]);

  const fmtTimer = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const fmtDuration = (s: number) => {
    if (!s || s <= 0) return '0s';
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  // Add useEffect to sync media streams to dynamically rendered DOM elements
  useEffect(() => {
    if (callView === 'active' || callView === 'connecting' || callView === 'ringing') {
      if (localStreamRef.current && localVideoRef.current && callType === 'video') {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.play().catch(e => console.warn('Local play blocked:', e));
      }
      if (remoteStreamRef.current) {
        if (remoteVideoRef.current && callType === 'video') {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
          remoteVideoRef.current.play().catch(e => console.warn('Remote video play blocked:', e));
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStreamRef.current;
          remoteAudioRef.current.play().catch(e => console.warn('Remote audio play blocked:', e));
        }
      }
    }
  }, [callView, callType]);

  // Cleanup on unmount
  useEffect(() => () => { endCall(false); }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass-card max-w-md">
          <Phone className="w-12 h-12 mx-auto mb-4 text-green-400" />
          <h2 className="text-xl font-bold mb-2">Calls</h2>
          <p className="text-muted mb-6">Please log in to make calls</p>
          <Link href="/login"><button className="btn-primary w-full">Log In</button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 glass border-b border-themed z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard">
            <motion.button className="p-2 rounded-xl hover:bg-[var(--bg-card-hover)] border border-themed transition" whileTap={{ scale: 0.92 }}>
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-lg flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-green-500/20 to-blue-500/20">
                <Phone className="w-4 h-4 text-green-400" />
              </div>
              Calls
            </h1>
          </div>
          {callView === 'active' && (
            <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/30">
              <motion.div className="w-2 h-2 rounded-full bg-green-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} />
              <span className="text-xs font-mono text-green-400 font-bold">{fmtTimer(elapsedTime)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" muted={!isSpeakerOn} />
        <AnimatePresence mode="wait">
          {/* ── INCOMING CALL VIEW ── */}
          {callView === 'incoming' && (
            <motion.div
              key="incoming-call"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <div className="relative w-32 h-32 mx-auto mb-8">
                {/* Pulsing rings */}
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border-2 border-green-500/40"
                    animate={{ scale: [1, 1.8, 2.2], opacity: [0.6, 0.2, 0] }}
                    transition={{ repeat: Infinity, duration: 2, delay: i * 0.5, ease: 'easeOut' }}
                  />
                ))}
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-5xl shadow-2xl shadow-green-500/40"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  {activeRel?.partner?.display_name?.[0]?.toUpperCase() || '👤'}
                </motion.div>
              </div>

              <motion.h2
                className="text-2xl font-bold mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {partnerName}
              </motion.h2>
              <motion.p
                className="text-muted text-sm mb-8 flex items-center justify-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <PhoneIncoming className="w-4 h-4 text-green-400" />
                Incoming {incomingCallType} call...
              </motion.p>

              {/* Accept / Reject buttons */}
              <div className="flex items-center justify-center gap-6">
                <motion.button
                  onClick={rejectCall}
                  className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-500/30"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                >
                  <PhoneOff className="w-7 h-7" />
                </motion.button>

                <motion.button
                  onClick={acceptIncomingCall}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center shadow-xl shadow-green-500/40"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  {incomingCallType === 'video' ? <Video className="w-8 h-8" /> : <Phone className="w-8 h-8" />}
                </motion.button>
              </div>

              <p className="text-xs text-muted mt-6">
                {incomingCallType === 'video' ? '📹 Video Call' : '📞 Audio Call'}
              </p>
            </motion.div>
          )}

          {/* ── Active Call View (Ringing / Connecting / Active) ── */}
          {(callView === 'ringing' || callView === 'connecting' || callView === 'active') && (
            <motion.div
              key="active-call"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="relative"
            >
              {/* Video area */}
              {callType === 'video' ? (
                <div className="relative rounded-2xl overflow-hidden bg-black mb-6 shadow-2xl shadow-black/30 neon-border-green" style={{ aspectRatio: '16/9', minHeight: 300 }}>
                  <video ref={remoteVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  {/* Local camera PiP */}
                  <motion.div
                    className="absolute bottom-4 right-4 w-36 h-28 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl"
                    drag
                    dragConstraints={{ top: -200, left: -300, right: 0, bottom: 0 }}
                    whileDrag={{ scale: 1.05 }}
                  >
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    {isCameraOff && (
                      <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                        <VideoOff className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </motion.div>

                  {callView !== 'active' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                      <div className="text-center">
                        <Loader2 className="w-10 h-10 mx-auto animate-spin text-white mb-3" />
                        <p className="text-white/80 text-sm">{callView === 'ringing' ? `Ringing ${partnerName}...` : 'Connecting...'}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Audio-only view with animated waveform visualization
                <div className="glass-card text-center py-16 mb-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-blue-500/5" />
                  
                  {/* Animated waveform bars for active audio calls */}
                  {callView === 'active' && (
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-[3px] h-20 px-12 opacity-20">
                      {Array.from({ length: 40 }).map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-[3px] rounded-t-full bg-gradient-to-t from-green-500 to-emerald-400"
                          animate={{ height: [4, 12 + Math.random() * 40, 8, 20 + Math.random() * 30, 4] }}
                          transition={{ repeat: Infinity, duration: 1.2 + Math.random() * 0.8, delay: i * 0.03, ease: 'easeInOut' }}
                        />
                      ))}
                    </div>
                  )}

                  <div className="relative z-10">
                    <div className="relative inline-block">
                      {/* Pulse rings for ringing state */}
                      {(callView === 'ringing' || callView === 'connecting') && [0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          className="absolute inset-0 rounded-full border-2 border-green-500/30"
                          animate={{ scale: [1, 1.6, 2], opacity: [0.5, 0.15, 0] }}
                          transition={{ repeat: Infinity, duration: 2, delay: i * 0.6 }}
                        />
                      ))}
                      <motion.div
                        className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-5xl mb-5 shadow-2xl shadow-green-500/30 border-4 border-green-400/20"
                        animate={callView === 'active'
                          ? { boxShadow: ['0 0 20px rgba(34,197,94,0.2)', '0 0 40px rgba(34,197,94,0.4)', '0 0 20px rgba(34,197,94,0.2)'] }
                          : { scale: [1, 1.08, 1] }
                        }
                        transition={{ repeat: Infinity, duration: 2 }}
                      >
                        {activeRel?.partner?.display_name?.[0]?.toUpperCase() || '👤'}
                      </motion.div>
                    </div>
                    <h2 className="text-xl font-bold mb-1">{partnerName}</h2>
                    <div className="text-muted text-sm flex items-center justify-center gap-2">
                      {callView === 'ringing' && <><PhoneForwarded className="w-4 h-4 text-amber-400" /> Ringing...</>}
                      {callView === 'connecting' && <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>}
                      {callView === 'active' && (
                        <>
                          <motion.div className="w-2 h-2 rounded-full bg-green-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} />
                          {fmtTimer(elapsedTime)}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Call controls — glassmorphic bar */}
              <motion.div
                className="flex items-center justify-center gap-4 p-4 rounded-2xl bg-[var(--bg-card)]/80 backdrop-blur-xl border border-themed shadow-2xl"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <motion.button
                  onClick={toggleMute}
                  className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-[var(--bg-card)] text-muted border border-themed hover:bg-[var(--bg-card-hover)]'}`}
                  whileTap={{ scale: 0.9 }}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </motion.button>

                {callType === 'video' && (
                  <motion.button
                    onClick={toggleCamera}
                    className={`p-4 rounded-full transition-all ${isCameraOff ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-[var(--bg-card)] text-muted border border-themed hover:bg-[var(--bg-card-hover)]'}`}
                    whileTap={{ scale: 0.9 }}
                  >
                    {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </motion.button>
                )}

                <motion.button
                  onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                  className={`p-4 rounded-full transition-all ${!isSpeakerOn ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-[var(--bg-card)] text-muted border border-themed hover:bg-[var(--bg-card-hover)]'}`}
                  whileTap={{ scale: 0.9 }}
                >
                  {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </motion.button>

                <motion.button
                  onClick={() => endCall(true)}
                  className="p-5 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 border border-red-400/20"
                  whileTap={{ scale: 0.85 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <PhoneOff className="w-6 h-6" />
                </motion.button>
              </motion.div>
            </motion.div>
          )}

          {/* ── Idle / Ended View ── */}
          {(callView === 'idle' || callView === 'ended') && (
            <motion.div key="idle" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              {callView === 'ended' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card text-center mb-6 border border-green-500/20 bg-green-500/5"
                >
                  <Phone className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p className="font-semibold">Call Ended</p>
                  <p className="text-muted text-sm">Duration: {fmtTimer(elapsedTime)}</p>
                </motion.div>
              )}

              {/* Start new call */}
              <div className="glass-card mb-6">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-green-400" /> Start a Call
                </h3>

                <label className="text-xs text-muted mb-2 block">Select a bond partner:</label>
                <select
                  value={selectedRel}
                  onChange={(e) => setSelectedRel(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-themed text-sm mb-4 outline-none focus:border-green-500/50 transition-colors"
                >
                  <option value="">Choose...</option>
                  {relationships.filter(r => r.status === 'active').map(r => (
                    <option key={r.id} value={r.id}>
                      {r.partner?.display_name || r.partner_display_name || 'Partner'}
                      {r.level ? ` — Level ${r.level}` : ''}
                    </option>
                  ))}
                </select>


                {/* Call type selector */}
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => setCallType('audio')}
                    className={`flex-1 p-3.5 rounded-xl border-2 transition text-sm flex items-center justify-center gap-2 font-medium ${
                      callType === 'audio' ? 'border-green-500/50 bg-green-500/10 text-green-400 shadow-sm shadow-green-500/10' : 'border-themed text-muted hover:border-green-500/20'
                    }`}
                  >
                    <Phone className="w-4 h-4" /> Audio Call
                  </button>
                  <button
                    onClick={() => setCallType('video')}
                    className={`flex-1 p-3.5 rounded-xl border-2 transition text-sm flex items-center justify-center gap-2 font-medium ${
                      callType === 'video' ? 'border-blue-500/50 bg-blue-500/10 text-blue-400 shadow-sm shadow-blue-500/10' : 'border-themed text-muted hover:border-blue-500/20'
                    }`}
                  >
                    <Video className="w-4 h-4" /> Video Call
                  </button>
                </div>

                <motion.button
                  onClick={startCall}
                  disabled={!selectedRel}
                  className={`w-full py-3.5 rounded-xl flex items-center justify-center gap-2 font-semibold text-white transition-all ${
                    callType === 'video'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg shadow-green-500/25 hover:shadow-green-500/40'
                  } disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none`}
                  whileTap={{ scale: 0.97 }}
                >
                  {callType === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                  {callType === 'video' ? 'Start Video Call' : 'Start Audio Call'}
                </motion.button>
              </div>

              {/* Call history */}
              <div className="glass-card">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted" /> Call History
                </h3>
                {callLogs.length === 0 ? (
                  <div className="text-center py-10">
                    <Phone className="w-10 h-10 mx-auto mb-3 text-muted opacity-20" />
                    <p className="text-muted text-sm">No calls yet</p>
                    <p className="text-muted text-xs mt-1">Start your first call above!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {callLogs.map((log, i) => (
                      <motion.div
                        key={log.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-card-hover)] border border-themed hover:border-[var(--border-hover)] transition"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          log.call_type === 'video' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'
                        }`}>
                          {log.status === 'missed' ? <PhoneMissed className="w-4 h-4 text-red-400" /> :
                           log.call_type === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium capitalize">{log.call_type} Call</p>
                          <p className="text-xs text-muted">
                            {new Date(log.started_at || log.created_at || '').toLocaleDateString()} · {fmtDuration(log.duration_seconds)}
                          </p>
                        </div>
                        <div className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          log.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                          log.status === 'missed' ? 'bg-red-500/10 text-red-400' : 'bg-gray-500/10 text-gray-400'
                        }`}>
                          {log.status}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function CallsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-400" />
      </div>
    }>
      <CallsPageContent />
    </Suspense>
  );
}
