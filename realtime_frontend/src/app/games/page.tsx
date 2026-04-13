'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  ArrowLeft, Gamepad2, Trophy, Star, Heart, Users, Clock,
  Sparkles, Play, Zap, ChevronRight, RotateCcw, Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import toast from 'react-hot-toast';

interface Game {
  id: string;
  game_type: string;
  title: string;
  description: string;
  instructions: string;
  category: string;
  difficulty: string;
  icon_emoji: string;
  bond_points_reward: number;
  estimated_minutes: number;
  is_active?: boolean;
}

// Fallback games in case API fails
const FALLBACK_GAMES: Game[] = [
  {
    id: 'mood-mirror', game_type: 'mood-mirror', icon_emoji: '🪞', title: 'Mood Mirror', category: 'Empathy',
    description: "Guess your partner's current mood from clues", bond_points_reward: 5, instructions: '',
    difficulty: 'easy', estimated_minutes: 5,
  },
  {
    id: 'emotion-charades', game_type: 'emotion-charades', icon_emoji: '🎭', title: 'Emotion Charades', category: 'Expression',
    description: 'Act out emotions across cultures', bond_points_reward: 10, instructions: '',
    difficulty: 'medium', estimated_minutes: 10,
  },
  {
    id: 'would-you-rather', game_type: 'would-you-rather', icon_emoji: '🤔', title: 'Would You Rather', category: 'Fun',
    description: 'Cross-cultural dilemma questions', bond_points_reward: 5, instructions: '',
    difficulty: 'easy', estimated_minutes: 5,
  },
];

// Simple "Would You Rather" demo game
const WYR_QUESTIONS = [
  { a: 'Live in Brazil for a year 🇧🇷', b: 'Live in Japan for a year 🇯🇵' },
  { a: 'Learn 5 languages at basic level', b: 'Master 1 foreign language perfectly' },
  { a: 'Cook a traditional meal from another culture', b: 'Teach someone your family recipe' },
  { a: 'Have a pen pal in every continent', b: 'Have one lifelong cross-cultural best friend' },
  { a: 'Celebrate Holi in India 🎨', b: 'Celebrate Carnival in Brazil 🎉' },
];

type GameState = 'catalog' | 'playing' | 'results';

const GAME_COLORS: Record<string, string> = {
  'emotional': 'from-pink-500 to-rose-500',
  'cultural': 'from-blue-500 to-indigo-500',
  'creative': 'from-green-500 to-emerald-500',
  'reflective': 'from-amber-500 to-yellow-500',
  'fun': 'from-purple-500 to-violet-500',
  'default': 'from-familia-500 to-bond-500',
};

export default function GamesPage() {
  const { user, relationships } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [state, setState] = useState<GameState>('catalog');
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [myChoices, setMyChoices] = useState<string[]>([]);
  const [partnerChoices, setPartnerChoices] = useState<string[]>([]);
  const [showPartnerChoice, setShowPartnerChoice] = useState(false);
  const [totalBondPoints, setTotalBondPoints] = useState(0);
  
  // Get actual partner name from relationships or use demo
  const partnerName = relationships.length > 0 
    ? (relationships[0]?.partner?.display_name || 'Your partner')
    : 'Demo Partner';

  useEffect(() => {
    const loadGames = async () => {
      try {
        const data = await api.getGames();
        if (data.games && data.games.length > 0) {
          setGames(data.games);
        } else {
          setGames(FALLBACK_GAMES);
        }
      } catch (err) {
        console.error('Failed to load games:', err);
        setGames(FALLBACK_GAMES);
      } finally {
        setIsLoading(false);
      }
    };
    loadGames();
  }, []);

  const startGame = (gameId: string) => {
    setSelectedGame(gameId);
    setState('playing');
    setCurrentQ(0);
    setMyChoices([]);
    setPartnerChoices([]);
  };

  const handleChoice = (choice: 'a' | 'b') => {
    setMyChoices([...myChoices, choice]);
    setShowPartnerChoice(true);

    // Simulate partner choice
    const partnerChoice = Math.random() > 0.5 ? 'a' : 'b';
    setPartnerChoices([...partnerChoices, partnerChoice]);

    setTimeout(() => {
      setShowPartnerChoice(false);
      if (currentQ < WYR_QUESTIONS.length - 1) {
        setCurrentQ(currentQ + 1);
      } else {
        setState('results');
        // Award bond points
        const game = games.find(g => g.id === selectedGame || g.game_type === selectedGame);
        if (game) {
          setTotalBondPoints(prev => prev + game.bond_points_reward);
          toast.success(`+${game.bond_points_reward} bond points earned!`);
        }
      }
    }, 2000);
  };

  const matchCount = myChoices.filter((c, i) => c === partnerChoices[i]).length;

  const getGameColor = (category: string) => {
    return GAME_COLORS[category.toLowerCase()] || GAME_COLORS['default'];
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 glass border-b border-themed z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard">
            <motion.button className="p-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition" whileTap={{ scale: 0.95 }}>
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          </Link>
          <h1 className="font-bold text-lg flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-purple-400" />
            Bonding Games
          </h1>
          {state === 'catalog' && (
            <div className="ml-auto flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-full ring-1 ring-amber-500/20">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-400">{user?.total_bond_points || totalBondPoints} pts</span>
            </div>
          )}
          {state === 'playing' && (
            <motion.button
              onClick={() => { setState('catalog'); setSelectedGame(null); setCurrentQ(0); setMyChoices([]); setPartnerChoices([]); setShowPartnerChoice(false); }}
              className="ml-auto text-xs text-muted hover:text-[var(--text-secondary)] transition flex items-center gap-1.5 bg-[var(--bg-card-hover)] px-3 py-1.5 rounded-full hover:bg-[var(--bg-card-hover)]" 
              whileTap={{ scale: 0.95 }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Exit Game
            </motion.button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* ── Game Catalog ─────────────────── */}
          {state === 'catalog' && (
            <motion.div key="catalog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-8">
                <motion.h2 className="text-2xl font-bold mb-2" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                  Play & Bond Together <span className="inline-block animate-bounce">🎮</span>
                </motion.h2>
                <p className="text-muted text-sm">Games designed to deepen your cross-cultural connection</p>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-familia-400" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {games.map((game, i) => (
                    <motion.div
                      key={game.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div
                        className="rounded-2xl p-[1px] bg-gradient-to-br from-[var(--border-color)] to-transparent hover:from-purple-500/30 hover:to-pink-500/20 transition-all duration-300 cursor-pointer group"
                        onClick={() => startGame(game.game_type || game.id)}
                      >
                        <div className="glass-card !rounded-[15px] relative overflow-hidden">
                          <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r ${getGameColor(game.category)} opacity-40 group-hover:opacity-100 transition-opacity`} />
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getGameColor(game.category)} flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 group-hover:shadow-lg transition-all duration-200`}>
                            {game.icon_emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold group-hover:text-familia-400 transition-colors">{game.title}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-card-hover)] text-muted group-hover:bg-purple-500/10 group-hover:text-purple-300 transition-colors">
                                {game.category}
                              </span>
                            </div>
                            <p className="text-xs text-muted mb-2">{game.description}</p>
                            <div className="flex items-center gap-3 text-[10px] text-subtle">
                              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 2 Players</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {game.estimated_minutes} min</span>
                              <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full font-medium"><Star className="w-3 h-3" /> +{game.bond_points_reward} pts</span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-subtle group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Playing (Would You Rather demo) ── */}
          {state === 'playing' && (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-8">
                <motion.div className="text-5xl mb-3" animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}>🤔</motion.div>
                <h2 className="text-2xl font-bold mb-1 gradient-text">Would You Rather</h2>
                <p className="text-sm text-muted">Question {currentQ + 1} of {WYR_QUESTIONS.length}</p>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-2 mb-8 max-w-md mx-auto">
                {WYR_QUESTIONS.map((_, i) => (
                  <motion.div
                    key={i}
                    className={`flex-1 h-2 rounded-full transition-all ${
                      i < currentQ ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                      i === currentQ ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.5)]' :
                      'bg-[var(--border-color)]'
                    }`}
                    initial={i === currentQ ? { scale: 0.8 } : {}}
                    animate={i === currentQ ? { scale: 1 } : {}}
                  />
                ))}
              </div>

              {/* Question */}
              <div className="max-w-lg mx-auto px-2 sm:px-0">
                <motion.div
                  key={`q-${currentQ}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <motion.button
                    onClick={() => !showPartnerChoice && handleChoice('a')}
                    disabled={showPartnerChoice}
                    className={`w-full p-8 sm:p-10 rounded-2xl text-center transition-all duration-300 border-2 relative overflow-hidden ${
                      showPartnerChoice && myChoices[currentQ] === 'a'
                        ? 'border-purple-500/60 bg-purple-500/10 shadow-[0_0_30px_-5px_rgba(168,85,247,0.3)]'
                        : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-purple-500/40 hover:bg-purple-500/5 hover:shadow-[0_0_20px_-5px_rgba(168,85,247,0.2)]'
                    }`}
                    whileHover={!showPartnerChoice ? { scale: 1.03, y: -2 } : {}}
                    whileTap={!showPartnerChoice ? { scale: 0.97 } : {}}
                  >
                    {showPartnerChoice && myChoices[currentQ] === 'a' && <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5" />}
                    <div className="relative z-10">
                      <div className="text-lg sm:text-xl font-semibold">{WYR_QUESTIONS[currentQ].a}</div>
                      {showPartnerChoice && partnerChoices[currentQ] === 'a' && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 inline-flex items-center gap-1.5 text-sm text-green-400 bg-green-500/10 px-3 py-1 rounded-full"
                        >
                          ✨ {partnerName} also chose this! 🎉
                        </motion.div>
                      )}
                      {showPartnerChoice && partnerChoices[currentQ] !== 'a' && myChoices[currentQ] === 'a' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-xs text-muted">Your choice</motion.div>
                      )}
                    </div>
                  </motion.button>

                  <div className="text-center">
                    <span className="text-subtle font-bold text-sm bg-[var(--bg-card-hover)] px-4 py-1.5 rounded-full">OR</span>
                  </div>

                  <motion.button
                    onClick={() => !showPartnerChoice && handleChoice('b')}
                    disabled={showPartnerChoice}
                    className={`w-full p-8 sm:p-10 rounded-2xl text-center transition-all duration-300 border-2 relative overflow-hidden ${
                      showPartnerChoice && myChoices[currentQ] === 'b'
                        ? 'border-purple-500/60 bg-purple-500/10 shadow-[0_0_30px_-5px_rgba(168,85,247,0.3)]'
                        : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-purple-500/40 hover:bg-purple-500/5 hover:shadow-[0_0_20px_-5px_rgba(168,85,247,0.2)]'
                    }`}
                    whileHover={!showPartnerChoice ? { scale: 1.03, y: -2 } : {}}
                    whileTap={!showPartnerChoice ? { scale: 0.97 } : {}}
                  >
                    {showPartnerChoice && myChoices[currentQ] === 'b' && <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5" />}
                    <div className="relative z-10">
                      <div className="text-lg sm:text-xl font-semibold">{WYR_QUESTIONS[currentQ].b}</div>
                      {showPartnerChoice && partnerChoices[currentQ] === 'b' && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 inline-flex items-center gap-1.5 text-sm text-green-400 bg-green-500/10 px-3 py-1 rounded-full"
                        >
                          ✨ {partnerName} also chose this! 🎉
                        </motion.div>
                      )}
                      {showPartnerChoice && partnerChoices[currentQ] !== 'b' && myChoices[currentQ] === 'b' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-xs text-muted">Your choice</motion.div>
                      )}
                    </div>
                  </motion.button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ── Results ──────────────────────── */}
          {state === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <motion.div
                className="text-7xl mb-6"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: [0, 1.4, 1], rotate: 0 }}
                transition={{ type: 'spring', duration: 1 }}
              >
                {matchCount >= 4 ? '🎉' : matchCount >= 3 ? '😄' : '🤝'}
              </motion.div>

              <motion.h2 className="text-3xl font-bold mb-2 gradient-text" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                {matchCount >= 4 ? 'You think alike!' : matchCount >= 3 ? 'Great connection!' : 'Interesting differences!'}
              </motion.h2>
              <motion.p className="text-muted mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                You and {partnerName} matched on {matchCount} out of {WYR_QUESTIONS.length} questions
                {relationships.length === 0 && <span className="block text-xs text-amber-400/60 mt-1">(Demo mode - find a match to play together!)</span>}
              </motion.p>

              <div className="relative max-w-sm mx-auto mb-8 rounded-2xl p-[1px] bg-gradient-to-br from-purple-500/40 via-pink-500/20 to-amber-500/40">
                <div className="glass-card !rounded-[15px]">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }}>
                    <div className="text-3xl font-bold text-purple-400">{matchCount}/{WYR_QUESTIONS.length}</div>
                    <div className="text-xs text-muted mt-1">Matches</div>
                  </motion.div>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }}>
                    <div className="text-3xl font-bold text-amber-400">+8</div>
                    <div className="text-xs text-muted mt-1">Bond Points</div>
                  </motion.div>
                </div>

                {/* Comparison */}
                <div className="mt-4 pt-4 border-t border-[var(--border-color)] space-y-2">
                  {WYR_QUESTIONS.map((q, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                        myChoices[i] === partnerChoices[i] ? 'bg-green-500/20 text-green-400' : 'bg-[var(--bg-card-hover)] text-subtle'
                      }`}>
                        {myChoices[i] === partnerChoices[i] ? '✓' : '✗'}
                      </span>
                      <span className="text-muted truncate flex-1">Q{i + 1}</span>
                      <span className="text-familia-400">{myChoices[i] === 'a' ? 'A' : 'B'}</span>
                      <span className="text-subtle">vs</span>
                      <span className="text-green-400">{partnerChoices[i] === 'a' ? 'A' : 'B'}</span>
                    </div>
                  ))}
                </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => { setState('catalog'); setSelectedGame(null); }}
                  className="btn-primary flex items-center gap-2"
                >
                  <Gamepad2 className="w-4 h-4" /> More Games
                </button>
                <Link href="/chat/rel-1">
                  <motion.button className="px-5 py-3 rounded-xl border border-[var(--border-color)] text-muted hover:text-[var(--text-secondary)] hover:border-[var(--border-hover)] transition text-sm flex items-center gap-2" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    💬 Back to Chat
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
