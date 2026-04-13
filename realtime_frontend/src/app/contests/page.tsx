'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  ArrowLeft, Trophy, Clock, CheckCircle2, XCircle, Sparkles, Star,
  Heart, Zap, Users, ChevronRight, Timer
} from 'lucide-react';
import { ROLE_EMOJIS } from '@/types';

const MOCK_QUESTIONS = [
  { id: 'q1', question: "What is Maria's favorite Brazilian dish she likes to cook on Sundays?", options: ['Feijoada', 'Pão de queijo', 'Coxinha', 'Brigadeiro'], correct: 0, source: 'From your conversation on Day 5' },
  { id: 'q2', question: "Which city in Brazil did Maria grow up in?", options: ['São Paulo', 'Rio de Janeiro', 'Salvador', 'Belo Horizonte'], correct: 2, source: 'From your conversation on Day 8' },
  { id: 'q3', question: "What does Maria say 'Saudades' means to her?", options: ['Missing someone deeply', 'A type of dance', 'A cooking style', 'A family name'], correct: 0, source: 'From your cultural exchange on Day 12' },
  { id: 'q4', question: "How many children does Maria have?", options: ['1', '2', '3', '4'], correct: 2, source: 'From your first conversation' },
  { id: 'q5', question: "What hobby did Maria share she picked up during the pandemic?", options: ['Painting', 'Gardening', 'Singing', 'Yoga'], correct: 1, source: 'From your conversation on Day 15' },
];

type ContestState = 'overview' | 'playing' | 'results';

export default function ContestsPage() {
  const [state, setState] = useState<ContestState>('overview');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(MOCK_QUESTIONS.length).fill(null));
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (state === 'playing' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && state === 'playing') {
      setState('results');
    }
  }, [state, timeLeft]);

  const handleAnswer = (optionIdx: number) => {
    if (showResult) return;
    const newAnswers = [...answers];
    newAnswers[currentQ] = optionIdx;
    setAnswers(newAnswers);
    setShowResult(true);

    if (optionIdx === MOCK_QUESTIONS[currentQ].correct) {
      setScore(s => s + 10);
    }

    setTimeout(() => {
      setShowResult(false);
      if (currentQ < MOCK_QUESTIONS.length - 1) {
        setCurrentQ(currentQ + 1);
      } else {
        setState('results');
      }
    }, 1500);
  };

  const totalCorrect = answers.filter((a, i) => a === MOCK_QUESTIONS[i].correct).length;

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
            <Trophy className="w-5 h-5 text-amber-400" />
            Bond Contests
          </h1>
          {state === 'playing' && (
            <div className="ml-auto flex items-center gap-2">
              <div className="relative w-10 h-10">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15" fill="none"
                    stroke={timeLeft < 30 ? '#f87171' : '#c084fc'}
                    strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${(timeLeft / 120) * 94.2} 94.2`}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${timeLeft < 30 ? 'text-red-400' : 'text-muted'}`}>
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
              {timeLeft < 30 && (
                <motion.span
                  className="text-[10px] text-red-400 font-medium"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  Hurry!
                </motion.span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* ── Overview ─────────────────────── */}
          {state === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Active contest */}
              <motion.div
                className="glass-card relative overflow-hidden mb-8 ring-1 ring-amber-500/20 shadow-[0_0_30px_-5px_rgba(245,158,11,0.15)]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/10" />
                <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-amber-500/5 blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-6 h-6 text-amber-400" />
                    <span className="font-bold text-lg">Weekly Bond Challenge</span>
                    <motion.span className="ml-auto text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full ring-1 ring-green-500/20 font-medium" animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}>● Ready!</motion.span>
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-familia-500 to-bond-500 flex items-center justify-center text-lg">
                        {ROLE_EMOJIS['son']}
                      </div>
                      <span className="text-sm">You</span>
                    </div>
                    <div className="text-subtle">VS</div>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-lg">
                        {ROLE_EMOJIS['mother']}
                      </div>
                      <span className="text-sm">Maria Santos 🇧🇷</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-5 text-center text-sm">
                    <div className="bg-[var(--bg-card-hover)] rounded-xl p-3 ring-1 ring-[var(--border-color)]">
                      <div className="text-lg font-bold text-amber-400">5</div>
                      <div className="text-[10px] text-muted mt-0.5">Questions</div>
                    </div>
                    <div className="bg-[var(--bg-card-hover)] rounded-xl p-3 ring-1 ring-[var(--border-color)]">
                      <div className="text-lg font-bold text-amber-400">2:00</div>
                      <div className="text-[10px] text-muted mt-0.5">Time Limit</div>
                    </div>
                    <div className="bg-[var(--bg-card-hover)] rounded-xl p-3 ring-1 ring-[var(--border-color)]">
                      <div className="text-lg font-bold text-amber-400">50</div>
                      <div className="text-[10px] text-muted mt-0.5">Max Points</div>
                    </div>
                  </div>

                  <p className="text-xs text-muted mb-4">
                    Questions are generated from your real conversations. How well do you know each other?
                  </p>

                  <motion.button
                    onClick={() => setState('playing')}
                    className="btn-primary w-full flex items-center justify-center gap-2 text-base font-semibold shadow-lg shadow-familia-500/20"
                    whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(168, 85, 247, 0.3)' }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Trophy className="w-5 h-5" />
                    Start Challenge!
                  </motion.button>
                </div>
              </motion.div>

              {/* Past contests */}
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted" />
                Past Results
              </h3>
              <div className="space-y-3">
                {[
                  { partner: 'Maria Santos', date: '3 days ago', yourScore: 40, partnerScore: 35, synchrony: 75 },
                  { partner: 'Kenji Tanaka', date: '1 week ago', yourScore: 30, partnerScore: 30, synchrony: 90 },
                ].map((result, i) => (
                  <motion.div
                    key={i}
                    className="rounded-xl p-[1px] bg-gradient-to-r from-[var(--border-color)] via-[var(--border-color)] to-[var(--border-color)] hover:from-familia-500/30 hover:to-bond-500/30 transition-all duration-300"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="glass-card !p-4 !rounded-[11px]">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{result.partner}</div>
                          <div className="text-xs text-muted">{result.date}</div>
                        </div>
                        <div className="flex items-center gap-4 text-center">
                          <div>
                            <div className="font-bold text-familia-400">{result.yourScore}</div>
                            <div className="text-[10px] text-muted">You</div>
                          </div>
                          <div className="text-subtle">vs</div>
                          <div>
                            <div className="font-bold text-green-400">{result.partnerScore}</div>
                            <div className="text-[10px] text-muted">Partner</div>
                          </div>
                          <div className="ml-2 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-400 text-xs font-medium ring-1 ring-amber-500/20">
                            {result.synchrony}% sync
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Playing ──────────────────────── */}
          {state === 'playing' && (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Progress */}
              <div className="flex items-center gap-2 mb-6">
                {MOCK_QUESTIONS.map((_, i) => (
                  <motion.div
                    key={i}
                    className={`flex-1 h-2 rounded-full transition-all ${
                      i < currentQ ? 'bg-gradient-to-r from-familia-500 to-bond-500' :
                      i === currentQ ? 'bg-familia-400 shadow-[0_0_8px_rgba(168,85,247,0.5)]' :
                      'bg-[var(--border-color)]'
                    }`}
                    initial={i <= currentQ ? { scaleX: 0 } : {}}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between mb-3 text-sm">
                <span className="text-muted font-medium">Question {currentQ + 1} of {MOCK_QUESTIONS.length}</span>
                <motion.span className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-full" key={score} initial={{ scale: 1.2 }} animate={{ scale: 1 }}>
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold text-amber-400 text-xs">{score} pts</span>
                </motion.span>
              </div>

              {/* Question card */}
              <motion.div
                key={`q-${currentQ}`}
                className="glass-card mb-6 ring-1 ring-[var(--border-color)] relative overflow-hidden"
                initial={{ opacity: 0, x: 50, rotateY: 15 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                exit={{ opacity: 0, x: -50, rotateY: -15 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-familia-500 via-bond-500 to-heart-500 rounded-t-xl" />
                <div className="flex items-start gap-3 mb-5 mt-1">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-familia-500 to-bond-500 flex items-center justify-center text-xs font-bold shadow-lg shadow-familia-500/20">
                    {currentQ + 1}
                  </span>
                  <div>
                    <div className="text-[10px] text-subtle mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {MOCK_QUESTIONS[currentQ].source}
                    </div>
                    <h3 className="text-lg font-semibold leading-snug">{MOCK_QUESTIONS[currentQ].question}</h3>
                  </div>
                </div>

                <div className="space-y-3">
                  {MOCK_QUESTIONS[currentQ].options.map((opt, i) => {
                    const isSelected = answers[currentQ] === i;
                    const isCorrect = i === MOCK_QUESTIONS[currentQ].correct;
                    const showCorrect = showResult && isCorrect;
                    const showWrong = showResult && isSelected && !isCorrect;

                    return (
                      <motion.button
                        key={i}
                        onClick={() => handleAnswer(i)}
                        disabled={showResult}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                          showCorrect ? 'border-green-500/60 bg-green-500/10 shadow-[0_0_20px_-5px_rgba(34,197,94,0.3)]' :
                          showWrong ? 'border-red-500/60 bg-red-500/10 shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)]' :
                          isSelected ? 'border-familia-500/50 bg-familia-500/10' :
                          'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-familia-500/30 hover:bg-[var(--bg-card-hover)] hover:shadow-lg hover:shadow-familia-500/5'
                        }`}
                        whileHover={!showResult ? { scale: 1.02, x: 4 } : {}}
                        whileTap={!showResult ? { scale: 0.98 } : {}}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${
                            showCorrect ? 'bg-green-500/20 text-green-400' :
                            showWrong ? 'bg-red-500/20 text-red-400' :
                            'bg-[var(--bg-card-hover)] text-muted'
                          }`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="text-sm font-medium">{opt}</span>
                          {showCorrect && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto"><CheckCircle2 className="w-5 h-5 text-green-400" /></motion.div>}
                          {showWrong && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto"><XCircle className="w-5 h-5 text-red-400" /></motion.div>}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ── Results ──────────────────────── */}
          {state === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <motion.div
                className="text-7xl mb-6"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: [0, 1.4, 1], rotate: 0 }}
                transition={{ type: 'spring', duration: 1 }}
              >
                {totalCorrect >= 4 ? '🏆' : totalCorrect >= 3 ? '⭐' : '💪'}
              </motion.div>

              <motion.h2 className="text-3xl font-bold mb-2 gradient-text" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                {totalCorrect >= 4 ? 'Amazing!' : totalCorrect >= 3 ? 'Great job!' : 'Keep bonding!'}
              </motion.h2>
              <motion.p className="text-muted mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>You really know Maria! Your bond is growing stronger</motion.p>

              <div className="relative max-w-sm mx-auto mb-8 rounded-2xl p-[1px] bg-gradient-to-br from-amber-500/50 via-familia-500/30 to-bond-500/50">
                <div className="glass-card !rounded-[15px]">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }}>
                      <div className="text-3xl font-bold text-amber-400">{score}</div>
                      <div className="text-xs text-muted mt-1">Your Score</div>
                    </motion.div>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }}>
                      <div className="text-3xl font-bold text-green-400">{totalCorrect}/{MOCK_QUESTIONS.length}</div>
                      <div className="text-xs text-muted mt-1">Correct</div>
                    </motion.div>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7 }}>
                      <div className="text-3xl font-bold text-familia-400">85%</div>
                      <div className="text-xs text-muted mt-1">Synchrony</div>
                    </motion.div>
                  </div>

                  <motion.div className="mt-5 pt-4 border-t border-[var(--border-color)]" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
                    <div className="text-xs text-muted mb-2">Bond Points Earned:</div>
                    <div className="flex items-center justify-center gap-2 bg-amber-500/5 rounded-xl py-2.5">
                      <Zap className="w-5 h-5 text-amber-400" />
                      <span className="font-bold text-lg text-amber-400">+{score + 5}</span>
                      <span className="text-xs text-muted">points (+5 synchrony bonus)</span>
                    </div>
                  </motion.div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                <Link href="/chat/rel-1">
                  <motion.button className="btn-primary" whileHover={{ scale: 1.05 }}>
                    Back to Chat 💬
                  </motion.button>
                </Link>
                <button
                  onClick={() => {
                    setState('overview');
                    setCurrentQ(0);
                    setAnswers(new Array(MOCK_QUESTIONS.length).fill(null));
                    setScore(0);
                    setTimeLeft(120);
                    setShowResult(false);
                  }}
                  className="px-4 py-3 rounded-xl border border-[var(--border-color)] text-muted hover:text-[var(--text-secondary)] transition text-sm"
                >
                  Try Again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
