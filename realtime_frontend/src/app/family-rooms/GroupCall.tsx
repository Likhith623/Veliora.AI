import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Device } from 'mediasoup-client';
import { io, Socket } from 'socket.io-client';

interface GroupCallProps {
  roomId: string;
  userId: string;
  ws: any; // FastAPI ManagedWebSocket from family-rooms page
  onLeave: () => void;
  members: any[];
  callType?: 'audio' | 'video';
}

export function GroupCall({ roomId, userId, ws, onLeave, members, callType = 'video' }: GroupCallProps) {
  // --- STATE ---
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // --- REFS ---
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const streamRef = useRef<MediaStream | null>(null);
  const sfuSocketRef = useRef<Socket | null>(null);
  const consumeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const cleanedUpRef = useRef(false);
  const remoteStreamsRef = useRef<Record<string, MediaStream>>({});

  // Mediasoup SFU Trackers
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<any>(null);
  const recvTransportRef = useRef<any>(null);
  const consumersRef = useRef<Map<string, any>>(new Map());
  const pendingRemoteProducersRef = useRef<Array<{producerId: string, peerId: string, kind: string}>>([]);

  // Keep remoteStreamsRef synced with state
  useEffect(() => {
    remoteStreamsRef.current = remoteStreams;
  }, [remoteStreams]);

  // ── SFU: Handle transport creation ──
  const handleTransportCreated = useCallback(async (transportOptions: any, isSender: boolean) => {
    const device = deviceRef.current;
    const socket = sfuSocketRef.current;
    if (!device || !socket) return;

    if (transportOptions.error) {
      console.error("SFU Server Error creating transport:", transportOptions.error);
      return;
    }

    try {
      if (isSender) {
        const sendTransport = device.createSendTransport(transportOptions);
        sendTransportRef.current = sendTransport;

        sendTransport.on('connect', ({ dtlsParameters }: any, callback: () => void, errback: (e: Error) => void) => {
          socket.emit('connectWebRtcTransport', { transportId: sendTransport.id, dtlsParameters }, (res: any) => {
            if (res?.error) errback(new Error(res.error));
            else callback();
          });
        });

        sendTransport.on('produce', async ({ kind, rtpParameters, appData }: any, callback: (arg: {id: string}) => void, errback: (e: Error) => void) => {
          socket.emit('produce', { transportId: sendTransport.id, kind, rtpParameters, appData }, ({ id, error }: any) => {
            if (error) errback(new Error(error));
            else callback({ id });
          });
        });

        // Produce local tracks
        const stream = streamRef.current;
        if (stream) {
          const audioTrack = stream.getAudioTracks()[0];
          const videoTrack = stream.getVideoTracks()[0];

          if (audioTrack) {
            await sendTransport.produce({ track: audioTrack });
            console.log('🎤 Audio producer created');
          }
          if (videoTrack) {
            await sendTransport.produce({
              track: videoTrack,
              encodings: [
                { maxBitrate: 100000, scaleResolutionDownBy: 4 },
                { maxBitrate: 300000, scaleResolutionDownBy: 2 },
                { maxBitrate: 900000, scaleResolutionDownBy: 1 }
              ],
              codecOptions: { videoGoogleStartBitrate: 300 }
            });
            console.log('📹 Video producer created');
          }
        }
      } else {
        const recvTransport = device.createRecvTransport(transportOptions);
        recvTransportRef.current = recvTransport;

        recvTransport.on('connect', ({ dtlsParameters }: any, callback: () => void, errback: (e: Error) => void) => {
          socket.emit('connectWebRtcTransport', { transportId: recvTransport.id, dtlsParameters }, (res: any) => {
            if (res?.error) errback(new Error(res.error));
            else callback();
          });
        });

        console.log('📥 Receive transport created');

        // Drain any producers that were queued before this transport was ready
        if (pendingRemoteProducersRef.current.length > 0) {
          const pending = [...pendingRemoteProducersRef.current];
          pendingRemoteProducersRef.current = [];
          console.log(`Draining ${pending.length} pending producers`);
          for (const p of pending) {
            consumeSFUTrack(p.producerId, p.peerId);
          }
        }
      }
    } catch (err) {
      console.error("SFU Transport Error:", err);
    }
  }, []);

  // ── SFU: Consume a remote track ──
  const consumeSFUTrack = useCallback((producerId: string, peerId: string) => {
    const device = deviceRef.current;
    const recvTransport = recvTransportRef.current;
    const socket = sfuSocketRef.current;

    if (!device || !recvTransport || !socket) {
      console.log(`⏳ Queuing producer ${producerId} from ${peerId} (transport not ready)`);
      pendingRemoteProducersRef.current.push({ producerId, peerId, kind: 'unknown' });
      return;
    }

    socket.emit('consume', {
      producerId,
      rtpCapabilities: device.rtpCapabilities
    }, ({ id, kind, rtpParameters, error }: any) => {
      if (error) {
        console.error("Consume signaling error:", error);
        return;
      }

      console.log(`🔊 Consuming ${kind} from ${peerId}`);

      // Queue consumer creation to prevent duplicate a=mid SDP collisions
      consumeQueueRef.current = consumeQueueRef.current.then(async () => {
        try {
          if (recvTransport.closed || cleanedUpRef.current) return;

          const consumer = await recvTransport.consume({
            id, producerId, kind, rtpParameters
          });

          consumersRef.current.set(id, consumer);

          const { track } = consumer;
          setRemoteStreams(prev => {
            const existing = prev[peerId];
            if (existing) {
              existing.addTrack(track);
              // Force React to see this as a new reference
              return { ...prev, [peerId]: existing };
            } else {
              const newStream = new MediaStream();
              newStream.addTrack(track);
              return { ...prev, [peerId]: newStream };
            }
          });

          socket.emit('resumeConsumer', { consumerId: id });
          console.log(`✅ Consumer ${kind} from ${peerId} resumed`);

        } catch (err: any) {
          if (err?.name === 'InvalidStateError' || cleanedUpRef.current) return;
          console.error("Consumer creation failed:", err);
        }
      }).catch(err => {
        if (!cleanedUpRef.current) console.error("Consume queue error:", err);
      });
    });
  }, []);

  // ── Initialize local media & SFU connection ──
  useEffect(() => {
    let active = true;
    cleanedUpRef.current = false;

    (async () => {
      try {
        const constraints: MediaStreamConstraints = {
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
        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        setLocalStream(stream);
        streamRef.current = stream;

        // Connect to Mediasoup SFU server
        const socket = io('http://localhost:3016');
        sfuSocketRef.current = socket;

        let initialized = false;
        socket.on('connect', () => {
          if (initialized) return;
          initialized = true;
          console.log("🟢 Connected to Mediasoup SFU (Group)");

          socket.emit('joinRoom', { roomId, userId }, async (response: any) => {
            if (!response?.rtpCapabilities) {
              console.error("joinRoom: invalid response", response);
              return;
            }

            const { rtpCapabilities } = response;
            const device = new Device();
            await device.load({ routerRtpCapabilities: rtpCapabilities });
            deviceRef.current = device;

            // Create send transport first, wait for it, then create recv transport
            socket.emit('createWebRtcTransport', { sender: true }, async (sendOpts: any) => {
              await handleTransportCreated(sendOpts, true);
              // Now create recv transport
              socket.emit('createWebRtcTransport', { sender: false }, (recvOpts: any) => {
                handleTransportCreated(recvOpts, false);
              });
            });

            // Fetch existing producers in the room
            socket.emit('getProducers', {}, (producers: any[]) => {
              if (!Array.isArray(producers)) return;
              console.log(`Found ${producers.length} existing producers in room`);
              for (const p of producers) {
                consumeSFUTrack(p.producerId, p.peerId);
              }
            });
          });
        });

        socket.on('newProducer', ({ producerId, peerId, kind }: any) => {
          console.log(`📢 New ${kind} producer from ${peerId}`);
          if (peerId !== userId) {
            consumeSFUTrack(producerId, peerId);
          }
        });

        socket.on('userLeft', ({ peerId }: any) => {
          console.log(`👋 User left: ${peerId}`);
          setRemoteStreams(prev => {
            const next = { ...prev };
            if (next[peerId]) {
              next[peerId].getTracks().forEach(t => t.stop());
              delete next[peerId];
            }
            return next;
          });
        });

        socket.on('consumerClosed', ({ consumerId }: any) => {
          const consumer = consumersRef.current.get(consumerId);
          if (consumer) {
            try { consumer.close(); } catch (e) {}
            consumersRef.current.delete(consumerId);
          }
        });

      } catch (err) {
        console.error('Failed to initialize group call:', err);
      }
    })();

    return () => {
      active = false;
    };
  }, [roomId, userId, callType, handleTransportCreated, consumeSFUTrack]);

  // ── Attach local video to DOM ──
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // ── Attach remote videos to DOM ──
  useEffect(() => {
    Object.entries(remoteStreams).forEach(([id, stream]) => {
      const vRef = remoteVideoRefs.current[id];
      if (vRef && vRef.srcObject !== stream) {
        vRef.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  // ── Helper: get member display info ──
  const getMemberConfig = useCallback((id: string) => {
    const member = members.find((m: any) => m.user_id === id);
    if (!member?.profiles_realtime && !member?.profile) {
      return { display_name: `User ${id.substring(0, 4)}`, avatar_url: null };
    }
    return member.profiles_realtime || member.profile || { display_name: `User ${id.substring(0, 4)}`, avatar_url: null };
  }, [members]);

  // ── Media controls ──
  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => { t.enabled = !isVideoEnabled; });
      setIsVideoEnabled(prev => !prev);
    }
  }, [localStream, isVideoEnabled]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => { t.enabled = !isAudioEnabled; });
      setIsAudioEnabled(prev => !prev);
    }
  }, [localStream, isAudioEnabled]);

  // ── Cleanup & Leave Call ──
  const cleanup = useCallback(() => {
    if (cleanedUpRef.current) return;
    cleanedUpRef.current = true;

    console.log('🔴 Cleaning up group call');

    // Stop local tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setLocalStream(null);

    // Stop all remote streams (use ref, not state — avoids stale closure)
    Object.values(remoteStreamsRef.current).forEach(stream => {
      stream.getTracks().forEach(t => t.stop());
    });
    setRemoteStreams({});

    // Close all consumers
    consumersRef.current.forEach((consumer) => {
      try { consumer.close(); } catch (e) {}
    });
    consumersRef.current.clear();

    // Close transports
    if (sendTransportRef.current) {
      try { sendTransportRef.current.close(); } catch (e) {}
      sendTransportRef.current = null;
    }
    if (recvTransportRef.current) {
      try { recvTransportRef.current.close(); } catch (e) {}
      recvTransportRef.current = null;
    }

    // Disconnect SFU socket
    if (sfuSocketRef.current) {
      sfuSocketRef.current.disconnect();
      sfuSocketRef.current = null;
    }

    deviceRef.current = null;

    // Notify FastAPI room WS
    try {
      if (ws && typeof ws.send === 'function') {
        ws.send({ type: "call_leave" });
      }
    } catch (e) {
      console.warn('Failed to send call_leave:', e);
    }

    onLeave();
  }, [ws, onLeave]);

  // Cleanup on unmount (safety net)
  useEffect(() => {
    return () => {
      if (!cleanedUpRef.current) {
        cleanedUpRef.current = true;
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
        }
        Object.values(remoteStreamsRef.current).forEach(stream => {
          stream.getTracks().forEach(t => t.stop());
        });
        consumersRef.current.forEach((consumer) => {
          try { consumer.close(); } catch (e) {}
        });
        if (sendTransportRef.current) {
          try { sendTransportRef.current.close(); } catch (e) {}
        }
        if (recvTransportRef.current) {
          try { recvTransportRef.current.close(); } catch (e) {}
        }
        if (sfuSocketRef.current) {
          sfuSocketRef.current.disconnect();
        }
      }
    };
  }, []);

  // ── UI ──
  const peersToDisplay = Object.entries(remoteStreams);
  const peerCount = peersToDisplay.length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[100] bg-[#0a0a0a] flex flex-col p-6 overflow-y-auto"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          {callType === 'video' ? (
            <Video className="w-4 h-4 text-green-400" />
          ) : (
            <Mic className="w-4 h-4 text-green-400" />
          )}
          Live Room Call
          {peerCount > 0 && (
            <span className="text-[10px] text-muted bg-white/5 px-2 py-0.5 rounded-full">
              {peerCount + 1} participants
            </span>
          )}
        </h3>
        <button
          onClick={cleanup}
          className="text-xs flex items-center gap-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition"
        >
          <PhoneOff className="w-3 h-3" /> Leave Call
        </button>
      </div>

      {/* Video grid */}
      <div className={`flex-1 ${
        peerCount === 0 ? 'flex justify-center items-center max-w-4xl mx-auto w-full' :
        peerCount === 1 ? 'grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl mx-auto w-full' :
        peerCount === 2 ? 'grid grid-cols-2 gap-4 max-w-6xl mx-auto w-full' :
        'grid grid-cols-2 md:grid-cols-3 gap-4 max-w-7xl mx-auto w-full'
      }`}>
        {/* Local tile */}
        {callType === 'video' ? (
          <div className={`relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 group ${
            peerCount === 0 ? 'w-full aspect-video max-h-[70vh]' : 'aspect-video w-full'
          }`}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform scale-x-[-1] ${!isVideoEnabled ? 'opacity-0' : ''}`}
            />
            {!isVideoEnabled && (
              <div className="absolute inset-0 bg-[#1a1d2d] flex items-center justify-center pointer-events-none">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-2xl border-4 border-[#1a1d2d]">
                  <User className="w-10 h-10 text-white opacity-80" />
                </div>
              </div>
            )}
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
          <div className={`relative bg-[#1a1d2d] rounded-2xl flex flex-col items-center justify-center shadow-2xl border border-white/10 group ${
            peerCount === 0 ? 'w-full aspect-video max-h-[70vh]' : 'aspect-video w-full'
          }`}>
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-2xl border-4 border-[#1a1d2d]">
              <User className="w-10 h-10 text-white opacity-90" />
            </div>
            <div className="mt-4 bg-black/60 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
              <User className="w-3 h-3" /> You
            </div>
            <div className="absolute top-2 right-2 flex gap-1">
              <button onClick={toggleAudio} className={`p-1.5 rounded-lg backdrop-blur ${isAudioEnabled ? 'bg-black/40 text-white' : 'bg-red-500/80 text-white'}`}>
                {isAudioEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
              </button>
            </div>
          </div>
        )}

        {/* Remote peer tiles */}
        <AnimatePresence>
          {peersToDisplay.map(([pid, stream]) => {
            const memberInfo = getMemberConfig(pid);
            const hasVideo = stream.getVideoTracks().some(t => t.enabled && !t.muted);

            return (
              <motion.div
                key={pid}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative bg-[#1a1d2d] rounded-2xl overflow-hidden shadow-2xl border border-white/5 aspect-video w-full"
              >
                {/* Video element — always present for srcObject attachment */}
                <video
                  ref={el => { remoteVideoRefs.current[pid] = el; }}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover ${!hasVideo ? 'hidden' : ''}`}
                />
                {/* Hidden audio element for audio-only streams */}
                <audio
                  autoPlay
                  playsInline
                  ref={el => {
                    if (el && stream) {
                      el.srcObject = stream;
                    }
                  }}
                />

                {/* Audio-only avatar overlay */}
                {!hasVideo && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1d2d]">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-2xl border-4 border-[#1a1d2d]">
                      {memberInfo.avatar_url ? (
                        <img src={memberInfo.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />
                      ) : (
                        <User className="w-10 h-10 text-white opacity-80" />
                      )}
                    </div>
                    <div className="mt-4 bg-black/60 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
                      <User className="w-3 h-3" /> {memberInfo.display_name || 'Member'}
                    </div>
                  </div>
                )}

                {/* Name badge for video tiles */}
                {hasVideo && (
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur text-white text-[10px] px-2 py-1 rounded-md flex items-center gap-1">
                    <User className="w-3 h-3" /> {memberInfo.display_name || 'Member'}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}