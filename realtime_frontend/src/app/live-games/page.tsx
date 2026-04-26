'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Gamepad2, Loader2, Wifi, WifiOff, Trophy, Zap, Activity
} from 'lucide-react';
import { api } from '@/lib/api';
import { createLiveGameWS, type ManagedWebSocket } from '@/lib/websocket';
import { useAuth } from '@/lib/AuthContext';
import toast from 'react-hot-toast';
import {
  PongState, AirHockeyState, initPongState, initAirHockeyState, updateAirHockey, TICK_RATE
} from '@/lib/gameEngine';
import { RollbackManager } from '@/lib/RollbackManager';
import { FP_MULT } from '@/lib/FixedPointEngine';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TicTacToeState {
  type: 'tic_tac_toe';
  board: string[];
  current_turn: string;
  symbols: Record<string, string>;
  player_a: string;
  player_b: string;
  status: 'playing' | 'finished';
  winner?: string | null;
}

type GameState = PongState | AirHockeyState | TicTacToeState;
type PageView = 'lobby' | 'waiting' | 'playing' | 'game_over';

interface LiveGameInfo {
  type: string;
  title: string;
  description: string;
  players: number;
  estimated_minutes: number;
  xp_reward: number;
}

const GAME_ICONS: Record<string, string> = {
  pong: '🏓',
  air_hockey: '🥅',
  tic_tac_toe: '❌',
};

const GAME_COLORS: Record<string, { from: string; to: string }> = {
  pong: { from: '#a855f7', to: '#ec4899' },
  air_hockey: { from: '#3b82f6', to: '#06b6d4' },
  tic_tac_toe: { from: '#f97316', to: '#ef4444' },
};

// ─── Constants ─────────────────────────────────────────────────────────────────

/**
 * Fixed simulation timestep in ms.
 * 60 Hz keeps rollback cheap (each resim step is ~0.016ms of physics).
 * The old 30 Hz value (TICK_RATE=33ms) made rollback feel "skippy".
 */
const SIM_HZ = 60;
const SIM_STEP_MS = 1000 / SIM_HZ; // 16.667ms

// ─── Component ─────────────────────────────────────────────────────────────────

function LiveGamesPageContent() {
  const searchParams = useSearchParams();
  const joinSessionId = searchParams.get('session') || '';
  const { user, relationships, nicknames } = useAuth();

  const [view, setView] = useState<PageView>('lobby');
  const [availableGames, setAvailableGames] = useState<LiveGameInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRel, setSelectedRel] = useState('');
  const [selectedGameType, setSelectedGameType] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [isP2pConnected, setIsP2pConnected] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [finalScores, setFinalScores] = useState<Record<string, number>>({});
  const [xpAwarded, setXpAwarded] = useState<any>(null);
  // Scores displayed in the HUD — updated deterministically from physics, never randomly
  const [hudScores, setHudScores] = useState<{ p1: number; p2: number }>({ p1: 0, p2: 0 });

  // ── Networking refs ──
  const wsRef = useRef<ManagedWebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const isInitiatorRef = useRef<boolean>(false);
  const playersRef = useRef<string[]>([]);

  // ── Game engine refs ──
  const rollbackManagerRef = useRef<RollbackManager | null>(null);
  const localInputYRef = useRef<number | null>(null);
  const localInputXRef = useRef<number | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Loop refs (no useState — avoids re-render on every tick) ──
  const animFrameRef = useRef<number>(0);
  const lastSimTimeRef = useRef<number>(0);
  const accumRef = useRef<number>(0);

  // ── WebRTC pending message queue ──
  // FIX (Bug 7): Buffer offer/answer/ice that arrive before pcRef is ready
  const pendingWebRTCMessages = useRef<Array<{ type: string; data: any }>>([]);
  const webRTCReadyRef = useRef<boolean>(false);

  // Sync react gameState → ref for use inside rAF callbacks
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // ─── WebRTC setup ───────────────────────────────────────────────────────────

  const setupDataChannel = useCallback((dc: RTCDataChannel) => {
    dc.binaryType = 'arraybuffer';
    dc.onopen = () => {
      setIsP2pConnected(true);
    };
    dc.onclose = () => setIsP2pConnected(false);
    dc.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data as string);
        if (data.type === 'state') {
          // Air hockey host-authoritative fallback
          gameStateRef.current = data.state as GameState;
        } else if (data.type === 'input') {
          // Air hockey fallback input
          handleOpponentInput(data);
        } else if (data.type === 'rb_input') {
          // Rollback input packet
          rollbackManagerRef.current?.onRemoteInput(data.frame, data.input);
        }
      } catch (_) {}
    };
    dcRef.current = dc;
  }, []);

  const flushPendingWebRTC = useCallback(async () => {
    if (!pcRef.current) return;
    while (pendingWebRTCMessages.current.length > 0) {
      // Don't process ICE candidates yet if we don't have a remote description
      if (pendingWebRTCMessages.current[0].type === 'ice' && !pcRef.current.remoteDescription) {
        // Move ICE to the back of the line or wait
        // Wait, if it's the only type left, we just wait until an answer/offer comes.
        const nonIceIdx = pendingWebRTCMessages.current.findIndex(m => m.type !== 'ice');
        if (nonIceIdx === -1) break; // Only ICE candidates left, wait for offer/answer
        
        // Bring the offer/answer to the front
        const msg = pendingWebRTCMessages.current.splice(nonIceIdx, 1)[0];
        pendingWebRTCMessages.current.unshift(msg);
      }

      const msg = pendingWebRTCMessages.current.shift()!;
      try {
        if (msg.type === 'offer') {
          if (pcRef.current.signalingState !== 'stable') {
            continue;
          }
          await pcRef.current.setRemoteDescription(msg.data);
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          wsRef.current?.send({ type: 'webrtc_answer', answer });
        } else if (msg.type === 'answer') {
          if (pcRef.current.signalingState !== 'stable') {
            await pcRef.current.setRemoteDescription(msg.data);
          }
        } else if (msg.type === 'ice') {
          await pcRef.current.addIceCandidate(msg.data);
        }
      } catch (err) {
        console.warn('[WebRTC] flush error', err);
      }
    }
  }, []);

  const setupWebRTC = useCallback((isInitiator: boolean) => {
    isInitiatorRef.current = isInitiator;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });
    pcRef.current = pc;

    // Use a negotiated data channel — avoids the offer/answer race on channel creation
    const dc = pc.createDataChannel('game_state', { negotiated: true, id: 0, ordered: false, maxRetransmits: 0 });
    setupDataChannel(dc);

    pc.onicecandidate = (e) => {
      if (e.candidate && wsRef.current) {
        wsRef.current.send({ type: 'webrtc_ice_candidate', candidate: e.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        toast.error('P2P connection failed — check your network');
      }
    };

    // Mark WebRTC as ready and flush anything queued before pcRef was set
    webRTCReadyRef.current = true;
    flushPendingWebRTC();

    if (isInitiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          wsRef.current?.send({ type: 'webrtc_offer', offer: pc.localDescription });
        })
        .catch((err) => console.error('[WebRTC] offer error', err));
    }
  }, [setupDataChannel, flushPendingWebRTC]);

  const handleOpponentInput = useCallback(
    (data: any) => {
      if (!isInitiatorRef.current || !gameStateRef.current || !playersRef.current.length || !user)
        return;
      const state = gameStateRef.current;
      const opponentId = playersRef.current.find((id) => id !== user.id);
      if (!opponentId || state.type !== 'air_hockey') return;
      const m = state.mallets[opponentId];
      if (!m) return;
      m.x = Math.max(m.radius, Math.min(state.canvas.width - m.radius, data.x));
      if (opponentId === state.player_a) {
        m.y = Math.max(state.canvas.height / 2 + m.radius, Math.min(state.canvas.height - m.radius, data.y));
      } else {
        m.y = Math.max(m.radius, Math.min(state.canvas.height / 2 - m.radius, data.y));
      }
    },
    [user]
  );

  // ─── Main game loop (rAF + fixed-step accumulator) ─────────────────────────
  //
  // FIX (Bug 3 & 4): replaces setInterval with rAF-based accumulator.
  // This runs at the browser's native refresh rate and advances the simulation
  // in discrete 16.667ms steps. Prevents drift and ensures rollback has enough
  // frames of history to work with.

  const gameLoop = useCallback(
    (timestamp: number) => {
      animFrameRef.current = requestAnimationFrame(gameLoop);

      const state = gameStateRef.current;
      if (!state || state.status !== 'playing') {
        drawCurrentState();
        return;
      }

      // Accumulate elapsed time
      if (lastSimTimeRef.current === 0) lastSimTimeRef.current = timestamp;
      const elapsed = timestamp - lastSimTimeRef.current;
      lastSimTimeRef.current = timestamp;

      // Cap at 200ms to avoid spiral-of-death after a tab becomes visible again
      accumRef.current = Math.min(accumRef.current + elapsed, 200);

      // ── PONG: rollback path ──────────────────────────────────────────────────
      if (state.type === 'pong' && rollbackManagerRef.current) {
        while (accumRef.current >= SIM_STEP_MS) {
          rollbackManagerRef.current.update(localInputYRef.current);
          accumRef.current -= SIM_STEP_MS;

          // Check win condition from the authoritative physics state
          const vState = rollbackManagerRef.current.getVisualState();
          if (vState.scores.p1 >= 5 || vState.scores.p2 >= 5) {
            const winnerKey = vState.scores.p1 >= 5 ? state.player_a : state.player_b;
            // Only fire once
            if (state.status === 'playing') {
              state.status = 'finished';
              state.winner = winnerKey;
              wsRef.current?.send({ type: 'game_finished', winner: winnerKey, state });
            }
          }

          // Update HUD scores deterministically (no Math.random gate!)
          const s = rollbackManagerRef.current.getVisualState().scores;
          setHudScores((prev) => {
            if (prev.p1 !== s.p1 || prev.p2 !== s.p2) return { p1: s.p1, p2: s.p2 };
            return prev;
          });
        }
      }

      // ── AIR HOCKEY: host-authoritative path ─────────────────────────────────
      if (state.type === 'air_hockey') {
        if (isInitiatorRef.current) {
          while (accumRef.current >= TICK_RATE) {
            const prevStatus = state.status;
            updateAirHockey(state as AirHockeyState);
            accumRef.current -= TICK_RATE;

            if (dcRef.current?.readyState === 'open') {
              dcRef.current.send(JSON.stringify({ type: 'state', state }));
            }
            if (prevStatus === 'playing' && state.status === 'finished') {
              wsRef.current?.send({ type: 'game_finished', winner: state.winner, state });
            }
          }

          // Sync HUD
          const scores = (state as AirHockeyState).scores;
          const p1Score = scores[state.player_a] ?? 0;
          const p2Score = scores[state.player_b] ?? 0;
          setHudScores((prev) => {
            if (prev.p1 !== p1Score || prev.p2 !== p2Score) return { p1: p1Score, p2: p2Score };
            return prev;
          });
        } else {
          // Guest: throttle input sending to TICK_RATE (30 Hz) so we don't crash WebRTC DataChannel buffer.
          while (accumRef.current >= TICK_RATE) {
            accumRef.current -= TICK_RATE;
            if (localInputXRef.current !== null && localInputYRef.current !== null) {
              if (dcRef.current?.readyState === 'open') {
                dcRef.current.send(JSON.stringify({ type: 'input', x: localInputXRef.current, y: localInputYRef.current }));
              }
            }
          }
        }
      }

      drawCurrentState();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id]
  );

  // ─── Canvas draw (separated from sim logic) ────────────────────────────────

  const drawCurrentState = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const state = gameStateRef.current;
    if (!canvas || !ctx || !state || state.type === 'tic_tac_toe') return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.type === 'pong') {
      if (!rollbackManagerRef.current) return;
      const vState = rollbackManagerRef.current.getVisualState();

      // Center line
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      const { p1, p2 } = vState.paddles;
      const b = vState.ball;
      const isP1 = rollbackManagerRef.current.isPlayerOne;

      // Draw paddles — local player is highlighted
      const localColor = '#ec4899';
      const remoteColor = '#3b82f6';

      ctx.fillStyle = isP1 ? localColor : remoteColor;
      ctx.beginPath();
      ctx.roundRect(p1.x / FP_MULT, p1.y / FP_MULT, p1.width / FP_MULT, p1.height / FP_MULT, 4);
      ctx.fill();

      ctx.fillStyle = isP1 ? remoteColor : localColor;
      ctx.beginPath();
      ctx.roundRect(p2.x / FP_MULT, p2.y / FP_MULT, p2.width / FP_MULT, p2.height / FP_MULT, 4);
      ctx.fill();

      // Ball with subtle glow
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(b.x / FP_MULT, b.y / FP_MULT, b.radius / FP_MULT, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

    } else if (state.type === 'air_hockey') {
      // Center line
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(0, canvas.height / 2 - 1, canvas.width, 2);

      // Center circle
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Goals
      Object.values(state.goals).forEach((g: any) => {
        ctx.fillStyle = 'rgba(239,68,68,0.25)';
        ctx.fillRect(canvas.width / 2 - g.width / 2, g.y === 0 ? 0 : g.y - 8, g.width, 8);
      });

      // Mallets
      Object.keys(state.mallets).forEach((pid) => {
        const m = state.mallets[pid];
        ctx.fillStyle = pid === user?.id ? '#ec4899' : '#3b82f6';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Puck
      const p = state.puck;
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, [user?.id]);

  // Start/stop game loop based on view
  useEffect(() => {
    if (view === 'playing') {
      lastSimTimeRef.current = 0;
      accumRef.current = 0;
      animFrameRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    };
  }, [view, gameLoop]);

  // ─── Load available games ──────────────────────────────────────────────────

  useEffect(() => {
    api
      .getLiveGames()
      .then((res) => setAvailableGames(res.games || []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (joinSessionId && user?.id) {
      setSessionId(joinSessionId);
      setView('waiting');
      connectToSession(joinSessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinSessionId, user?.id]);

  // ─── Session connection ────────────────────────────────────────────────────

  const connectToSession = useCallback(
    (sid: string) => {
      if (!user?.id) return;

      const ws = createLiveGameWS(sid, user.id, {
        onOpen: () => {
          setIsWsConnected(true);
          ws.send({ type: 'ready' });
        },
        onClose: () => setIsWsConnected(false),
        onWaitingForOpponent: () => setView('waiting'),

        onGameStart: (serverState, isInitiator, players, serverGameType) => {
          playersRef.current = players || [];
          
          // Use the game type from the server if selectedGameType is missing (happens for invited players)
          const actualGameType = selectedGameType || serverGameType;

          // FIX (Bug 1 & 2): both players get a RollbackManager.
          // isPlayerOne = am I players[0] (the left-side / initiator player).
          const isP1 = players?.[0] === user.id;

          let initialState: GameState | null = null;

          if (actualGameType === 'pong' && players?.length === 2) {
            initialState = initPongState(players[0], players[1]);
            rollbackManagerRef.current = new RollbackManager(
              (frame, input) => {
                if (dcRef.current?.readyState === 'open') {
                  dcRef.current.send(JSON.stringify({ type: 'rb_input', frame, input }));
                }
              },
              isP1  // ← This is the critical fix: P2 gets isPlayerOne=false
            );
          } else if (actualGameType === 'air_hockey' && players?.length === 2) {
             initialState = initAirHockeyState(players[0], players[1]);
          } else if (actualGameType === 'tic_tac_toe' && players?.length === 2) {
             initialState = {
               type: 'tic_tac_toe',
               board: Array(9).fill(''),
               current_turn: players[0],
               symbols: { [players[0]]: 'X', [players[1]]: 'O' },
               player_a: players[0],
               player_b: players[1],
               status: 'playing',
               winner: null,
             } as TicTacToeState;
          } else {
            initialState = serverState;
          }

          if (initialState) {
            setGameState(initialState);
            gameStateRef.current = initialState;
          }

          setHudScores({ p1: 0, p2: 0 });

          if (initialState?.type === 'pong' || initialState?.type === 'air_hockey') {
            // FIX (Bug 7): setupWebRTC now marks webRTCReadyRef=true and flushes queue
            setupWebRTC(!!isInitiator);
            setView('playing');
          } else {
            setView('playing');
          }
        },

        // FIX (Bug 7): queue messages that arrive before pcRef is populated
        onWebRTCOffer: async (offer) => {
          if (webRTCReadyRef.current && pcRef.current) {
            try {
              if (pcRef.current.signalingState === 'stable') {
                await pcRef.current.setRemoteDescription(offer);
                const answer = await pcRef.current.createAnswer();
                await pcRef.current.setLocalDescription(answer);
                wsRef.current?.send({ type: 'webrtc_answer', answer });
                flushPendingWebRTC(); // Flush ICE candidates now
              }
            } catch (err) {
              console.error('[WebRTC] offer handler error', err);
            }
          } else {
            pendingWebRTCMessages.current.push({ type: 'offer', data: offer });
          }
        },

        onWebRTCAnswer: async (answer) => {
          if (webRTCReadyRef.current && pcRef.current) {
            try {
              if (pcRef.current.signalingState !== 'stable') {
                await pcRef.current.setRemoteDescription(answer);
              }
              flushPendingWebRTC(); // Flush ICE candidates now
            } catch (err) {
              console.error('[WebRTC] answer handler error', err);
            }
          } else {
            pendingWebRTCMessages.current.push({ type: 'answer', data: answer });
          }
        },

        onWebRTCICECandidate: async (candidate) => {
          if (webRTCReadyRef.current && pcRef.current && pcRef.current.remoteDescription) {
            try {
              await pcRef.current.addIceCandidate(candidate);
            } catch (err) {
              console.error('[WebRTC] ICE error', err);
            }
          } else {
            pendingWebRTCMessages.current.push({ type: 'ice', data: candidate });
            // Attempt flush in case this was just waiting for the ref flag
            if (webRTCReadyRef.current) flushPendingWebRTC();
          }
        },

        onSyncState: (state) => {
          setGameState(state);
        },

        onGameOver: (w, scores, xp) => {
          setWinner(w);
          setFinalScores(scores);
          setXpAwarded(xp);
          setView('game_over');
        },

        onOpponentDisconnected: () => {
          toast.error('Opponent disconnected');
          setWinner(user.id);
          setView('game_over');
        },
      });

      wsRef.current = ws;
    },
    [user?.id, selectedGameType, setupWebRTC]
  );

  // ─── Input handling ────────────────────────────────────────────────────────

  const handleClientInput = useCallback(
    (clientX: number, clientY: number) => {
      if (!user || !gameStateRef.current || view !== 'playing') return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      const st = gameStateRef.current;

      if (st.type === 'pong') {
        // Store raw canvas-pixel Y — RollbackManager converts to FP internally
        localInputYRef.current = y;
      } else if (st.type === 'air_hockey') {
        if (isInitiatorRef.current) {
          const m = st.mallets[user.id];
          if (m) {
            m.x = Math.max(m.radius, Math.min(st.canvas.width - m.radius, x));
            if (user.id === st.player_a) {
              m.y = Math.max(st.canvas.height / 2 + m.radius, Math.min(st.canvas.height - m.radius, y));
            } else {
              m.y = Math.max(m.radius, Math.min(st.canvas.height / 2 - m.radius, y));
            }
          }
        } else {
          localInputXRef.current = x;
          localInputYRef.current = y;
        }
      }
    },
    [user, view]
  );

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) =>
    handleClientInput(e.clientX, e.clientY);

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) handleClientInput(e.touches[0].clientX, e.touches[0].clientY);
  };

  const checkTicTacToeWinner = (b: string[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (const [x, y, z] of lines) {
      if (b[x] && b[x] === b[y] && b[x] === b[z]) return b[x];
    }
    if (!b.includes('')) return 'draw';
    return null;
  };

  const handleTicTacToeClick = (idx: number) => {
    if (!wsRef.current || !gameState || gameState.type !== 'tic_tac_toe') return;
    if (gameState.current_turn === user?.id && gameState.board[idx] === '') {
      const newState: GameState = { ...gameState, board: [...gameState.board] };
      newState.board[idx] = newState.symbols[user.id];
      newState.current_turn =
        newState.player_a === user.id ? newState.player_b : newState.player_a;
      
      const symbolWinner = checkTicTacToeWinner(newState.board);
      if (symbolWinner) {
        newState.status = 'finished';
        let winnerId = 'draw';
        if (symbolWinner !== 'draw') {
          winnerId = symbolWinner === newState.symbols[newState.player_a] ? newState.player_a : newState.player_b;
        }
        newState.winner = winnerId;
        wsRef.current.send({ type: 'game_finished', winner: winnerId, state: newState });
      } else {
        wsRef.current.send({ type: 'sync_state', state: newState });
      }
      
      // Zero latency immediate update locally
      setGameState(newState);
      gameStateRef.current = newState;
    }
  };

  // ─── Start game ───────────────────────────────────────────────────────────

  const startGame = async (gameType: string) => {
    if (!selectedRel || !user?.id) {
      toast.error('Select a partner first');
      return;
    }
    setSelectedGameType(gameType);
    setView('waiting');
    // Reset WebRTC state
    webRTCReadyRef.current = false;
    pendingWebRTCMessages.current = [];
    rollbackManagerRef.current = null;

    try {
      const res = await api.createLiveGame({ game_type: gameType, relationship_id: selectedRel });
      const sid = res.session_id;
      setSessionId(sid);
      connectToSession(sid);
    } catch {
      toast.error('Failed to create game');
      setView('lobby');
    }
  };

  const leaveGame = () => {
    pcRef.current?.close();
    wsRef.current?.close();
    pcRef.current = null;
    dcRef.current = null;
    rollbackManagerRef.current = null;
    webRTCReadyRef.current = false;
    pendingWebRTCMessages.current = [];
    setView('lobby');
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-140px)]">
        <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] pb-24 font-sans text-gray-100 flex flex-col relative overflow-hidden bg-black/50">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-[-1] flex justify-center items-center opacity-20 blur-3xl">
        <div className="w-[30rem] h-[30rem] bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center p-4 border-b border-white/10 bg-black/30 backdrop-blur-md sticky top-0 z-20">
        {view !== 'lobby' ? (
          <button
            onClick={leaveGame}
            className="p-2 mr-3 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        ) : (
          <Link href="/dashboard" className="p-2 mr-3 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
        )}
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-500 flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-pink-400" />
          Live Games
        </h1>
        <div className="ml-auto flex items-center text-xs space-x-3">
          <div className="flex items-center gap-1">
            {isWsConnected ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            <span className="text-gray-500">WS</span>
          </div>
          {(gameState?.type === 'pong' || gameState?.type === 'air_hockey') && (
            <div className="flex items-center gap-1">
              {isP2pConnected ? (
                <Activity className="w-4 h-4 text-cyan-400" />
              ) : (
                <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
              )}
              <span className="text-gray-500">P2P</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Lobby ── */}
      {view === 'lobby' && (
        <div className="flex-1 p-6 flex flex-col max-w-4xl mx-auto w-full">
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Challenge a friend:
            </label>
            <div className="flex gap-4 overflow-x-auto pb-3">
              {relationships.map((r) => {
                const partner = r.partner;
                if (!partner) return null;
                const isSelected = selectedRel === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRel(r.id)}
                    className={`flex flex-col items-center flex-shrink-0 min-w-[5rem] transition-all ${
                      isSelected ? 'scale-110' : 'opacity-60 hover:opacity-90'
                    }`}
                  >
                    <div
                      className={`w-14 h-14 rounded-full overflow-hidden border-2 ${
                        isSelected
                          ? 'border-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.5)]'
                          : 'border-transparent'
                      }`}
                    >
                      <img
                        src={(partner as any).avatar_url || '/placeholder.png'}
                        alt={partner.display_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-xs mt-2 truncate w-full text-center">
                      {nicknames[partner.id] || partner.display_name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {availableGames.map((game) => {
              const colors = GAME_COLORS[game.type] || GAME_COLORS.pong;
              return (
                <motion.div
                  key={game.type}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative flex flex-col bg-white/5 border border-white/10 rounded-2xl p-6 overflow-hidden cursor-pointer group"
                  onClick={() => startGame(game.type)}
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-15 transition-opacity duration-500"
                    style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}
                  />
                  <div className="text-4xl mb-4">{GAME_ICONS[game.type]}</div>
                  <h3 className="text-lg font-bold mb-1">{game.title}</h3>
                  <p className="text-sm text-gray-400 flex-1">{game.description}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-yellow-500" />
                      {game.xp_reward} XP
                    </span>
                    <span>{game.estimated_minutes} min</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Waiting ── */}
      {view === 'waiting' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Loader2 className="w-14 h-14 animate-spin text-pink-500 mb-6" />
          <h2 className="text-2xl font-bold mb-2">Waiting for opponent…</h2>
          <p className="text-gray-400 text-sm">
            An invite has been sent. The game starts when they join.
          </p>
        </div>
      )}

      {/* ── Playing ── */}
      {view === 'playing' && gameState && (
        <div className="flex-1 flex flex-col items-center py-4 px-2 w-full max-w-4xl mx-auto">
          {/* HUD */}
          <div className="flex justify-between w-full mb-3 px-6 items-center bg-white/5 rounded-xl border border-white/10 py-2.5">
            <div className="text-2xl font-black px-4 py-1 rounded-lg bg-pink-500/20 text-pink-400 tabular-nums min-w-[3rem] text-center">
              {hudScores.p1}
            </div>
            <div className="text-xs uppercase tracking-[0.2em] font-bold text-gray-500">
              First to {(gameState as any).max_score || 5}
            </div>
            <div className="text-2xl font-black px-4 py-1 rounded-lg bg-blue-500/20 text-blue-400 tabular-nums min-w-[3rem] text-center">
              {hudScores.p2}
            </div>
          </div>

          {/* P2P status banner */}
          {(gameState.type === 'pong' || gameState.type === 'air_hockey') && !isP2pConnected && (
            <div className="w-full mb-3 py-2 px-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs text-center">
              Establishing peer-to-peer connection…
            </div>
          )}

          <div className="flex-1 w-full flex items-center justify-center touch-none">
            {(gameState.type === 'pong' || gameState.type === 'air_hockey') && (
              <canvas
                ref={canvasRef}
                width={(gameState as PongState).canvas.width}
                height={(gameState as PongState).canvas.height}
                className="max-w-full max-h-full object-contain border-2 border-white/10 bg-black/50 rounded-xl touch-none shadow-2xl"
                onPointerMove={handlePointerMove}
                onTouchMove={handleTouchMove}
                style={{ cursor: 'none' }}
              />
            )}
            {gameState.type === 'tic_tac_toe' && (
              <div className="grid grid-cols-3 gap-2 bg-white/10 p-3 rounded-xl">
                {gameState.board.map((cell, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleTicTacToeClick(idx)}
                    className="w-20 h-20 sm:w-24 sm:h-24 bg-black/40 hover:bg-white/10 rounded-lg text-4xl flex items-center justify-center font-black transition-colors"
                  >
                    <span className={cell === 'X' ? 'text-pink-500' : 'text-blue-500'}>{cell}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Game over ── */}
      {view === 'game_over' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col items-center justify-center p-6 text-center"
        >
          <Trophy className="w-20 h-20 text-yellow-400 mb-5 drop-shadow-[0_0_16px_rgba(250,204,21,0.5)]" />
          <h2 className="text-4xl font-black mb-4">
            {winner === user?.id ? '🎉 Victory!' : winner === 'draw' ? 'Draw!' : 'Defeat'}
          </h2>
          <div className="text-3xl font-black mb-8 flex items-center gap-6">
            <span className={winner === user?.id ? 'text-pink-400' : 'text-gray-500'}>
              {finalScores[user?.id || ''] ?? 0}
            </span>
            <span className="text-gray-600">—</span>
            <span className={winner !== user?.id && winner !== 'draw' ? 'text-blue-400' : 'text-gray-500'}>
              {finalScores[Object.keys(finalScores).find((k) => k !== user?.id) || ''] ?? 0}
            </span>
          </div>

          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col items-center mb-8 px-12">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
              XP Earned
            </span>
            <div className="flex items-center gap-2 text-2xl font-bold text-yellow-400">
              <Zap className="w-6 h-6" />+
              {winner === user?.id
                ? xpAwarded?.winner
                : winner === 'draw'
                ? xpAwarded?.both
                : xpAwarded?.loser}{' '}
              XP
            </div>
          </div>

          <button
            onClick={() => setView('lobby')}
            className="bg-gradient-to-r from-pink-500 to-purple-600 px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-pink-500/40 transition-all hover:scale-105 active:scale-95"
          >
            Play Again
          </button>
        </motion.div>
      )}
    </div>
  );
}

export default function LiveGamesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-pink-500" />
        </div>
      }
    >
      <LiveGamesPageContent />
    </Suspense>
  );
}