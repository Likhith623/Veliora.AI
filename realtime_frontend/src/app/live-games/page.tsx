'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Gamepad2, Loader2, Wifi, WifiOff, Trophy, Zap, X as XIcon
} from 'lucide-react';
import { api } from '@/lib/api';
import { createLiveGameWS, type ManagedWebSocket } from '@/lib/websocket';
import { useAuth } from '@/lib/AuthContext';
import toast from 'react-hot-toast';

// ── Types matching backend exactly ─────────────────────────────
interface PongState {
  type: 'pong';
  canvas: { width: number; height: number };
  ball: { x: number; y: number; vx: number; vy: number; radius: number };
  paddles: Record<string, { y: number; height: number; width: number; x: number; speed: number }>;
  scores: Record<string, number>;
  max_score: number;
  status: 'playing' | 'finished';
  player_a: string;
  player_b: string;
  winner?: string;
}

interface AirHockeyState {
  type: 'air_hockey';
  canvas: { width: number; height: number };
  puck: { x: number; y: number; vx: number; vy: number; radius: number };
  mallets: Record<string, { x: number; y: number; radius: number }>;
  scores: Record<string, number>;
  max_score: number;
  status: 'playing' | 'finished';
  player_a: string;
  player_b: string;
  winner?: string;
}

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

const GAME_COLORS: Record<string, { from: string; to: string; glow: string }> = {
  pong: { from: '#a855f7', to: '#ec4899', glow: 'rgba(168,85,247,0.3)' },
  air_hockey: { from: '#3b82f6', to: '#06b6d4', glow: 'rgba(59,130,246,0.3)' },
  tic_tac_toe: { from: '#f97316', to: '#ef4444', glow: 'rgba(249,115,22,0.3)' },
};

function LiveGamesPageContent() {
  const searchParams = useSearchParams();
  const joinSessionId = searchParams.get('session') || '';
  const { user, relationships } = useAuth();
  
  const [view, setView] = useState<PageView>('lobby');
  const [availableGames, setAvailableGames] = useState<LiveGameInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRel, setSelectedRel] = useState('');
  const [selectedGameType, setSelectedGameType] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [finalScores, setFinalScores] = useState<Record<string, number>>({});
  const [xpAwarded, setXpAwarded] = useState<any>(null);
  const [scoreFlash, setScoreFlash] = useState(false);
  const [prevScores, setPrevScores] = useState<Record<string, number>>({});

  const wsRef = useRef<ManagedWebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState | null>(null); // ← FIX: ref for stale closure
  const animFrameRef = useRef<number>(0);

  // Keep ref in sync with state (fixes stale closure in event handlers)
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Detect score changes for flash effect
  useEffect(() => {
    if (!gameState || gameState.type === 'tic_tac_toe') return;
    const scores = gameState.scores;
    const prevTotal = Object.values(prevScores).reduce((a, b) => a + b, 0);
    const newTotal = Object.values(scores).reduce((a, b) => a + b, 0);
    if (newTotal > prevTotal && prevTotal > 0) {
      setScoreFlash(true);
      setTimeout(() => setScoreFlash(false), 400);
    }
    setPrevScores({ ...scores });
  }, [gameState?.type === 'tic_tac_toe' ? null : JSON.stringify((gameState as any)?.scores)]);

  // ── Load available live games ──
  useEffect(() => {
    api.getLiveGames().then(res => {
      setAvailableGames(res.games || []);
    }).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  // ── Deep-link: auto-join from ?session= URL param ──
  useEffect(() => {
    if (joinSessionId && user?.id) {
      setSessionId(joinSessionId);
      setView('waiting');
      connectToSession(joinSessionId);
    }
  }, [joinSessionId, user?.id]);

  // ── Connect to a game session WebSocket ──
  const connectToSession = useCallback((sid: string) => {
    if (!user?.id) return;

    const ws = createLiveGameWS(sid, user.id, {
      onOpen: () => {
        setIsWsConnected(true);
        ws.send({ type: 'ready' });
      },
      onClose: () => setIsWsConnected(false),
      onWaitingForOpponent: () => setView('waiting'),
      onGameStart: (state) => {
        setGameState(state);
        setSelectedGameType(state.type);
        setView('playing');
      },
      onState: (state) => setGameState(state),
      onGameOver: (w, scores, xp) => {
        setWinner(w);
        setFinalScores(scores);
        setXpAwarded(xp);
        setView('game_over');
      },
      onOpponentDisconnected: () => {
        toast.error('Opponent disconnected');
        setView('game_over');
        setWinner(user.id);
      },
    });

    wsRef.current = ws;
  }, [user?.id]);

  // ── Create a session and connect WebSocket ──
  const startGame = async (gameType: string) => {
    if (!selectedRel || !user?.id) {
      toast.error('Select a partner first');
      return;
    }
    setSelectedGameType(gameType);
    setView('waiting');

    try {
      const res = await api.createLiveGame({
        game_type: gameType,
        relationship_id: selectedRel,
      });

      const sid = res.session_id;
      setSessionId(sid);
      connectToSession(sid);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create game');
      setView('lobby');
    }
  };

  // ── Send movement (reads from ref to avoid stale closure) ──
  const sendMove = useCallback((data: any) => {
    wsRef.current?.send({ type: 'move', data });
  }, []);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      wsRef.current?.close();
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // ═══════════════════════════════════════════════
  // PONG Canvas Renderer — with neon glow effects
  // ═══════════════════════════════════════════════
  useEffect(() => {
    if (!gameState || gameState.type !== 'pong' || view !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const state = gameState as PongState;

    const scaleX = canvas.width / state.canvas.width;
    const scaleY = canvas.height / state.canvas.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background with subtle grid
    ctx.fillStyle = '#07071a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid pattern
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Center line — neon dashed
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = 'rgba(168,85,247,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Neon ball with trail
    const bx = state.ball.x * scaleX;
    const by = state.ball.y * scaleY;
    const br = state.ball.radius * Math.min(scaleX, scaleY);

    // Ball trail glow
    const ballGlow = ctx.createRadialGradient(bx, by, 0, bx, by, br * 6);
    ballGlow.addColorStop(0, 'rgba(255,107,53,0.35)');
    ballGlow.addColorStop(0.4, 'rgba(255,107,53,0.08)');
    ballGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = ballGlow;
    ctx.fillRect(bx - br * 6, by - br * 6, br * 12, br * 12);

    // Ball body
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    const ballGrad = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.3, 0, bx, by, br);
    ballGrad.addColorStop(0, '#ffb088');
    ballGrad.addColorStop(0.7, '#FF6B35');
    ballGrad.addColorStop(1, '#cc4400');
    ctx.fillStyle = ballGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Paddles with neon glow
    for (const pid of Object.keys(state.paddles)) {
      const p = state.paddles[pid];
      const px = p.x * scaleX;
      const py = p.y * scaleY;
      const pw = p.width * scaleX;
      const ph = p.height * scaleY;
      const isMe = pid === user?.id;
      const color = isMe ? '#22c55e' : '#3b82f6';
      const glowColor = isMe ? 'rgba(34,197,94,' : 'rgba(59,130,246,';

      // Paddle neon glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 4);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Paddle edge highlight
      const padGrad = ctx.createLinearGradient(px, py, px + pw, py + ph);
      padGrad.addColorStop(0, `${glowColor}0.6)`);
      padGrad.addColorStop(0.5, `${glowColor}0.9)`);
      padGrad.addColorStop(1, `${glowColor}0.6)`);
      ctx.fillStyle = padGrad;
      ctx.fillRect(px, py, pw, ph);
    }

    // Score display — large, semi-transparent
    ctx.font = 'bold 48px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const playerIds = Object.keys(state.scores);
    ctx.fillStyle = 'rgba(34,197,94,0.12)';
    ctx.fillText(String(state.scores[playerIds[0]] || 0), canvas.width * 0.25, canvas.height / 2);
    ctx.fillStyle = 'rgba(59,130,246,0.12)';
    ctx.fillText(String(state.scores[playerIds[1]] || 0), canvas.width * 0.75, canvas.height / 2);
  }, [gameState, view, user?.id]);

  // ── Pong mouse/touch input (uses ref for latest state) ──
  useEffect(() => {
    if (!gameState || gameState.type !== 'pong' || view !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMove = (clientY: number) => {
      const state = gameStateRef.current as PongState | null;
      if (!state || state.type !== 'pong') return;
      const scaleY = canvas.height / state.canvas.height;
      const rect = canvas.getBoundingClientRect();
      const y = (clientY - rect.top) / scaleY;
      const paddle = state.paddles[user?.id || ''];
      if (paddle) {
        const clampedY = Math.max(0, Math.min(state.canvas.height - paddle.height, y - paddle.height / 2));
        sendMove({ y: clampedY });
      }
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientY);
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('touchmove', onTouchMove);
    };
  }, [gameState?.type, view, user?.id, sendMove]);

  // ═══════════════════════════════════════════════
  // AIR HOCKEY Canvas Renderer — with neon effects
  // ═══════════════════════════════════════════════
  useEffect(() => {
    if (!gameState || gameState.type !== 'air_hockey' || view !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const state = gameState as AirHockeyState;

    const scaleX = canvas.width / state.canvas.width;
    const scaleY = canvas.height / state.canvas.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Rink background
    ctx.fillStyle = '#070e1f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Rink border glow
    ctx.strokeStyle = 'rgba(59,130,246,0.15)';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    // Center circle — neon
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 50 * scaleX, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(6,182,212,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6,182,212,0.3)';
    ctx.fill();

    // Center line
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.strokeStyle = 'rgba(6,182,212,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Goals — glowing
    const goalWidth = 120 * scaleX;
    const goalX = (canvas.width - goalWidth) / 2;

    // Top goal
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 15;
    ctx.fillStyle = 'rgba(34,197,94,0.25)';
    ctx.fillRect(goalX, 0, goalWidth, 6);
    ctx.shadowBlur = 0;

    // Bottom goal
    ctx.shadowColor = '#3b82f6';
    ctx.shadowBlur = 15;
    ctx.fillStyle = 'rgba(59,130,246,0.25)';
    ctx.fillRect(goalX, canvas.height - 6, goalWidth, 6);
    ctx.shadowBlur = 0;

    // Puck with neon glow
    const px = state.puck.x * scaleX;
    const py = state.puck.y * scaleY;
    const pr = state.puck.radius * Math.min(scaleX, scaleY);

    const puckGlow = ctx.createRadialGradient(px, py, 0, px, py, pr * 4);
    puckGlow.addColorStop(0, 'rgba(255,107,53,0.4)');
    puckGlow.addColorStop(0.5, 'rgba(255,107,53,0.1)');
    puckGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = puckGlow;
    ctx.beginPath(); ctx.arc(px, py, pr * 4, 0, Math.PI * 2); ctx.fill();

    // Puck body
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    const pGrad = ctx.createRadialGradient(px - pr * 0.2, py - pr * 0.2, 0, px, py, pr);
    pGrad.addColorStop(0, '#ffb088');
    pGrad.addColorStop(0.7, '#FF6B35');
    pGrad.addColorStop(1, '#cc4400');
    ctx.fillStyle = pGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Mallets with neon glow
    for (const pid of Object.keys(state.mallets)) {
      const m = state.mallets[pid];
      const mx = m.x * scaleX;
      const my = m.y * scaleY;
      const mr = m.radius * Math.min(scaleX, scaleY);
      const isMe = pid === user?.id;
      const color = isMe ? '#22c55e' : '#3b82f6';

      // Outer glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 25;

      // Mallet body
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      const mGrad = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
      mGrad.addColorStop(0, isMe ? '#4ade80' : '#60a5fa');
      mGrad.addColorStop(0.7, color);
      mGrad.addColorStop(1, isMe ? '#166534' : '#1e3a5f');
      ctx.fillStyle = mGrad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Center dot
      ctx.beginPath();
      ctx.arc(mx, my, mr * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fill();
    }

    // Scores
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.textAlign = 'center';
    const pids = Object.keys(state.scores);
    ctx.fillStyle = 'rgba(34,197,94,0.15)';
    ctx.fillText(String(state.scores[pids[0]] || 0), 30, canvas.height / 2 - 15);
    ctx.fillStyle = 'rgba(59,130,246,0.15)';
    ctx.fillText(String(state.scores[pids[1]] || 0), 30, canvas.height / 2 + 30);
  }, [gameState, view, user?.id]);

  // ── Air Hockey mouse/touch input (uses ref for latest state) ──
  useEffect(() => {
    if (!gameState || gameState.type !== 'air_hockey' || view !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMove = (clientX: number, clientY: number) => {
      const state = gameStateRef.current as AirHockeyState | null;
      if (!state || state.type !== 'air_hockey') return;
      const scaleX = canvas.width / state.canvas.width;
      const scaleY = canvas.height / state.canvas.height;
      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left) / scaleX;
      const y = (clientY - rect.top) / scaleY;
      sendMove({ x, y });
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('touchmove', onTouchMove);
    };
  }, [gameState?.type, view, user?.id, sendMove]);

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════
  const partnerName = relationships.find(r => r.id === selectedRel)?.partner_display_name || 'Partner';
  const isMyWin = winner === user?.id;
  const isDraw = winner === 'draw';
  const gameColor = GAME_COLORS[selectedGameType] || GAME_COLORS.pong;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass-card max-w-md">
          <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-purple-400" />
          <h2 className="text-xl font-bold mb-2">Live Games</h2>
          <p className="text-muted mb-6">Please log in to play</p>
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
          <h1 className="font-bold text-lg flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <Gamepad2 className="w-4 h-4 text-purple-400" />
            </div>
            Live Games
          </h1>
          {view === 'playing' && (
            <div className={`ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
              isWsConnected ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {isWsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isWsConnected ? 'Live' : 'Disconnected'}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* ── LOBBY ── */}
          {view === 'lobby' && (
            <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="glass-card mb-6 text-center relative overflow-hidden">
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5" />
                <div className="relative z-10">
                  <motion.h2
                    className="text-2xl font-bold mb-2 gradient-text"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    Real-Time Games ⚡
                  </motion.h2>
                  <p className="text-muted text-sm mb-6">Play live canvas games with your bond partner. Physics run server-side at 30fps.</p>

                  <div className="max-w-sm mx-auto text-left">
                    <label className="text-xs text-muted mb-2 block">Play with:</label>
                    <select
                      value={selectedRel}
                      onChange={(e) => setSelectedRel(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-themed text-sm outline-none focus:border-purple-500/50 transition-colors"
                    >
                      <option value="">Select bond partner...</option>
                      {relationships.filter(r => r.status === 'active').map(r => (
                        <option key={r.id} value={r.id}>
                          {r.partner?.display_name || r.partner_display_name || 'Partner'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {availableGames.map((game, i) => {
                    const color = GAME_COLORS[game.type] || GAME_COLORS.pong;
                    return (
                      <motion.div
                        key={game.type}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => selectedRel && startGame(game.type)}
                        className={`glass-card text-center cursor-pointer group relative overflow-hidden transition-all duration-300 hover:shadow-lg ${!selectedRel ? 'opacity-40 cursor-not-allowed' : ''}`}
                        whileHover={selectedRel ? { scale: 1.03, y: -4 } : {}}
                        whileTap={selectedRel ? { scale: 0.97 } : {}}
                        style={{
                          borderColor: selectedRel ? 'transparent' : undefined,
                        }}
                      >
                        {/* Hover gradient overlay */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          style={{ background: `linear-gradient(135deg, ${color.from}10, ${color.to}10)` }}
                        />
                        {/* Top accent line */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] opacity-40 group-hover:opacity-100 transition-opacity"
                          style={{ background: `linear-gradient(90deg, transparent, ${color.from}, ${color.to}, transparent)` }}
                        />
                        
                        <div className="relative z-10">
                          <motion.div
                            className="text-5xl mb-4 inline-block"
                            whileHover={{ rotate: [0, -10, 10, 0], scale: 1.2 }}
                            transition={{ duration: 0.4 }}
                          >
                            {GAME_ICONS[game.type] || '🎮'}
                          </motion.div>
                          <h3 className="font-bold text-sm mb-1 group-hover:text-purple-400 transition">
                            {game.title.replace(/^[^\s]+\s/, '')}
                          </h3>
                          <p className="text-xs text-muted mb-4">{game.description}</p>
                          <div className="flex items-center justify-center gap-3 text-[10px] text-subtle">
                            <span>~{game.estimated_minutes}min</span>
                            <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-semibold">
                              +{game.xp_reward} XP
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── WAITING ── */}
          {view === 'waiting' && (
            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <div className="relative w-24 h-24 mx-auto mb-8">
                {/* Pulsing rings */}
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border-2 border-purple-500/30"
                    animate={{ scale: [1, 1.8, 2.2], opacity: [0.5, 0.15, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.6, ease: 'easeOut' }}
                  />
                ))}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/20">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2">Waiting for {partnerName}</h2>
              <p className="text-muted text-sm mb-2">An invite has been sent. When they join, the game starts!</p>
              {sessionId && (
                <p className="text-xs text-subtle mb-6 font-mono">Session: {sessionId.slice(0, 8)}...</p>
              )}
              <button
                onClick={() => { wsRef.current?.close(); setView('lobby'); }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            </motion.div>
          )}

          {/* ── PLAYING — Pong/Air Hockey (Canvas) ── */}
          {view === 'playing' && gameState && (gameState.type === 'pong' || gameState.type === 'air_hockey') && (
            <motion.div key="playing-canvas" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Score bar with flash effect */}
              <motion.div
                className={`flex items-center justify-between mb-4 px-4 py-3 rounded-xl border border-themed transition-all ${
                  scoreFlash ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[var(--bg-card)]'
                }`}
                animate={scoreFlash ? { scale: [1, 1.02, 1] } : {}}
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
                  <span className="text-sm font-medium">You</span>
                  <motion.span
                    key={`my-score-${gameState.scores[user.id]}`}
                    className="text-2xl font-bold text-green-400"
                    initial={{ scale: 1.4, color: '#fbbf24' }}
                    animate={{ scale: 1, color: '#4ade80' }}
                    transition={{ duration: 0.3 }}
                  >
                    {gameState.scores[user.id] || 0}
                  </motion.span>
                </div>
                <div className="text-xs text-muted px-3 py-1 rounded-full bg-[var(--bg-card-hover)] border border-themed">
                  First to {gameState.max_score}
                </div>
                <div className="flex items-center gap-3">
                  <motion.span
                    key={`opp-score-${gameState.scores[Object.keys(gameState.scores).find(k => k !== user.id) || '']}`}
                    className="text-2xl font-bold text-blue-400"
                    initial={{ scale: 1.4, color: '#fbbf24' }}
                    animate={{ scale: 1, color: '#60a5fa' }}
                    transition={{ duration: 0.3 }}
                  >
                    {gameState.scores[Object.keys(gameState.scores).find(k => k !== user.id) || ''] || 0}
                  </motion.span>
                  <span className="text-sm font-medium">{partnerName}</span>
                  <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
                </div>
              </motion.div>

              {/* Canvas with neon border */}
              <div className="flex justify-center">
                <div className="relative group">
                  {/* Neon border glow */}
                  <div
                    className="absolute -inset-[2px] rounded-2xl opacity-60 blur-[2px]"
                    style={{
                      background: `linear-gradient(135deg, ${gameColor.from}, ${gameColor.to}, ${gameColor.from})`,
                      backgroundSize: '200% 200%',
                      animation: 'gradient-shift 3s ease infinite',
                    }}
                  />
                  <canvas
                    ref={canvasRef}
                    width={gameState.type === 'pong' ? 800 : 400}
                    height={gameState.type === 'pong' ? 400 : 700}
                    className="relative rounded-2xl shadow-2xl shadow-black/50 touch-none"
                    style={{
                      maxWidth: '100%',
                      maxHeight: gameState.type === 'pong' ? '50vh' : '70vh',
                      aspectRatio: gameState.type === 'pong' ? '2/1' : '4/7',
                    }}
                  />
                </div>
              </div>

              <p className="text-center text-xs text-muted mt-4 flex items-center justify-center gap-2">
                <Gamepad2 className="w-3 h-3" />
                {gameState.type === 'pong' ? 'Move mouse/finger up and down to control your paddle' : 'Move mouse/finger to control your mallet'}
              </p>
            </motion.div>
          )}

          {/* ── PLAYING — Tic-Tac-Toe (Grid) ── */}
          {view === 'playing' && gameState && gameState.type === 'tic_tac_toe' && (() => {
            const ttt = gameState as TicTacToeState;
            const mySymbol = ttt.symbols[user.id];
            const isMyTurn = ttt.current_turn === user.id;

            return (
              <motion.div key="playing-ttt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-sm mx-auto">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold mb-2">Tic-Tac-Toe</h2>
                  <motion.p
                    className={`text-sm font-medium px-4 py-2 rounded-full inline-flex items-center gap-2 ${
                      isMyTurn
                        ? 'text-green-400 bg-green-500/10 border border-green-500/20'
                        : 'text-muted bg-[var(--bg-card)] border border-themed'
                    }`}
                    animate={isMyTurn ? { boxShadow: ['0 0 10px rgba(34,197,94,0.1)', '0 0 20px rgba(34,197,94,0.2)', '0 0 10px rgba(34,197,94,0.1)'] } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    {isMyTurn ? `Your turn (${mySymbol})` : `Waiting for ${partnerName}...`}
                  </motion.p>
                </div>

                {/* Board with neon effects */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {ttt.board.map((cell, i) => (
                    <motion.button
                      key={i}
                      onClick={() => {
                        if (isMyTurn && !cell && ttt.status === 'playing') {
                          sendMove({ cell: i });
                        }
                      }}
                      disabled={!isMyTurn || !!cell || ttt.status !== 'playing'}
                      className={`aspect-square rounded-2xl border-2 text-4xl font-bold transition-all flex items-center justify-center ${
                        cell === 'X'
                          ? 'border-green-500/50 bg-green-500/10 text-green-400 shadow-md shadow-green-500/10'
                          : cell === 'O'
                            ? 'border-blue-500/50 bg-blue-500/10 text-blue-400 shadow-md shadow-blue-500/10'
                            : isMyTurn
                              ? 'border-themed bg-[var(--bg-card)] hover:border-purple-500/40 hover:bg-purple-500/5 hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer'
                              : 'border-themed bg-[var(--bg-card)] opacity-60'
                      }`}
                      whileTap={isMyTurn && !cell ? { scale: 0.92 } : {}}
                      whileHover={isMyTurn && !cell ? { scale: 1.05 } : {}}
                    >
                      <AnimatePresence>
                        {cell && (
                          <motion.span
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                          >
                            {cell}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  ))}
                </div>

                <div className="text-center text-xs text-muted">
                  You are <span className="font-bold text-green-400">{mySymbol}</span> · {partnerName} is <span className="font-bold text-blue-400">{mySymbol === 'X' ? 'O' : 'X'}</span>
                </div>
              </motion.div>
            );
          })()}

          {/* ── GAME OVER — with confetti and celebration ── */}
          {view === 'game_over' && (
            <motion.div
              key="game_over"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12 relative overflow-hidden"
            >
              {/* Confetti particles for winner */}
              {isMyWin && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        left: `${10 + Math.random() * 80}%`,
                        top: '-5%',
                        backgroundColor: ['#22c55e', '#a855f7', '#3b82f6', '#f59e0b', '#ec4899', '#06b6d4'][i % 6],
                      }}
                      animate={{
                        y: ['0vh', '110vh'],
                        x: [0, (Math.random() - 0.5) * 100],
                        rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
                        opacity: [1, 1, 0],
                      }}
                      transition={{
                        duration: 2 + Math.random() * 2,
                        delay: Math.random() * 1.5,
                        ease: 'easeIn',
                      }}
                    />
                  ))}
                </div>
              )}

              <motion.div
                className="text-7xl mb-6"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: [0, 1.3, 1], rotate: 0 }}
                transition={{ type: 'spring', duration: 1 }}
              >
                {isDraw ? '🤝' : isMyWin ? '🏆' : '😤'}
              </motion.div>

              <motion.h2
                className="text-3xl font-bold mb-2 gradient-text"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {isDraw ? 'It\'s a Draw!' : isMyWin ? 'You Win!' : 'You Lost!'}
              </motion.h2>

              {Object.keys(finalScores).length > 0 && (
                <motion.div
                  className="glass-card max-w-xs mx-auto mb-6 mt-6 relative overflow-hidden"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  {/* Shimmer effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                  />
                  
                  <div className="relative z-10 grid grid-cols-2 gap-4 text-center">
                    <div>
                      <motion.div
                        className="text-4xl font-bold text-green-400"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.8, type: 'spring' }}
                      >
                        {finalScores[user.id] || 0}
                      </motion.div>
                      <div className="text-xs text-muted mt-1">You</div>
                    </div>
                    <div>
                      <motion.div
                        className="text-4xl font-bold text-blue-400"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.9, type: 'spring' }}
                      >
                        {finalScores[Object.keys(finalScores).find(k => k !== user.id) || ''] || 0}
                      </motion.div>
                      <div className="text-xs text-muted mt-1">{partnerName}</div>
                    </div>
                  </div>

                  {xpAwarded && (
                    <motion.div
                      className="mt-4 pt-4 border-t border-themed flex items-center justify-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.1 }}
                    >
                      <Zap className="w-5 h-5 text-amber-400" />
                      <span className="font-bold text-amber-400 text-lg">
                        +{isDraw ? xpAwarded.both : (isMyWin ? xpAwarded.winner : xpAwarded.loser)} XP
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              )}

              <motion.div
                className="flex justify-center gap-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
              >
                <button onClick={() => { setView('lobby'); setGameState(null); setPrevScores({}); }} className="btn-primary flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" /> Play Again
                </button>
                <Link href="/dashboard">
                  <button className="btn-secondary text-sm">Back to Home</button>
                </Link>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function LiveGamesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    }>
      <LiveGamesPageContent />
    </Suspense>
  );
}
