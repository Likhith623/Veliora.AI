'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  ArrowLeft, Trophy, Clock, CheckCircle2, XCircle, Sparkles, Star,
  Heart, Zap, Users, ChevronRight, Timer
} from 'lucide-react';
import { ROLE_EMOJIS } from '@/types';
import { api } from '@/lib/api';

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
  const [activeQuestions, setActiveQuestions] = useState<any[]>(MOCK_QUESTIONS);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(MOCK_QUESTIONS.length).fill(null));
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [score, setScore] = useState(0);
  const [eligibleFriends, setEligibleFriends] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    // Fetch eligible custom contest friends
    api.getEligibleContestFriends()
      .then(res => setEligibleFriends(res.eligible_friends || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (state === 'playing' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && state === 'playing') {
      setState('results');
    }
  }, [state, timeLeft]);

  const startCustomContest = async (friendId: string, relationshipId: string) => {
    setGenerating(true);
    try {
      const res = await api.createContest({
        relationship_id: relationshipId,
        contest_type: 'custom',
        target_user_id: friendId
      });
      console.log('Custom Contest Generated:', res);
      const customQs = (res.questions || []).map((q: any) => {
        const opts = q.options || ['A', 'B', 'C', 'D'];
        let correctIdx = opts.indexOf(q.correct_answer);
        if (correctIdx === -1) correctIdx = 0;
        return {
          id: q.id,
          question: q.question_text,
          options: opts,
          correct: correctIdx,
          source: 'Custom Question'
        };
      });
      if (customQs.length > 0) {
        setActiveQuestions(customQs);
        setAnswers(new Array(customQs.length).fill(null));
      }
      setState('playing');
    } catch (err: any) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswer = (optionIdx: number) => {
    if (showResult) return;
    const newAnswers = [...answers];
    newAnswers[currentQ] = optionIdx;
    setAnswers(newAnswers);
    setShowResult(true);

    if (optionIdx === activeQuestions[currentQ].correct) {
      setScore(s => s + 10);
    }

    setTimeout(() => {
      setShowResult(false);
      if (currentQ < activeQuestions.length - 1) {
        setCurrentQ(currentQ + 1);
      } else {
        setState('results');
      }
    }, 1500);
  };

  const totalCorrect = answers.filter((a, i) => a === activeQuestions[i]?.correct).length;

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
              
              {/* Custom Challenges Section */}
              <div className="glass-card mb-8 border border-purple-500/30">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                  <div>
                    <h3 className="font-bold flex items-center gap-2 text-lg">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      Custom Challenges
                    </h3>
                    <p className="text-sm text-muted mt-1">
                      Challenge your friends using their personalized questions!
                    </p>
                  </div>
                  <Link href="/contests/my-questions">
                    <motion.button whileHover={{ scale: 1.02 }} className="px-4 py-2 rounded-xl bg-purple-500/10 text-purple-500 font-medium text-sm border border-purple-500/20 whitespace-nowrap">
                      Edit My Questions
                    </motion.button>
                  </Link>
                </div>

                {eligibleFriends.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {eligibleFriends.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-primary)] border border-themed">
                        <div className="flex items-center gap-3">
                          <img src={f.avatar_url || 'https://via.placeholder.com/40'} alt={f.display_name} className="w-10 h-10 rounded-full object-cover" />
                          <span className="font-medium text-sm">{f.display_name}</span>
                        </div>
                        <button 
                          disabled={generating}
                          onClick={() => startCustomContest(f.friend_id, f.relationship_id)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition"
                        >
                          Challenge
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-themed text-center text-sm text-muted">
                    None of your friends have created custom questions yet.
                  </div>
                )}
              </div>


            </motion.div>
          )}

          {/* ── Playing ──────────────────────── */}
          {state === 'playing' && (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Progress */}
              <div className="flex items-center gap-2 mb-6">
                {activeQuestions.map((_, i) => (
                  <motion.div
                    key={i}
                    className={`flex-1 h-2 rounded-full transition-all ${i < currentQ ? 'bg-gradient-to-r from-familia-500 to-bond-500' :
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
                <span className="text-muted font-medium">Question {currentQ + 1} of {activeQuestions.length}</span>
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
                      {activeQuestions[currentQ].source}
                    </div>
                    <h3 className="text-lg font-semibold leading-snug">{activeQuestions[currentQ].question}</h3>
                  </div>
                </div>

                <div className="space-y-3">
                  {activeQuestions[currentQ].options.map((opt: string, i: number) => {
                    const isSelected = answers[currentQ] === i;
                    const isCorrect = i === activeQuestions[currentQ].correct;
                    const showCorrect = showResult && isCorrect;
                    const showWrong = showResult && isSelected && !isCorrect;

                    return (
                      <motion.button
                        key={i}
                        onClick={() => handleAnswer(i)}
                        disabled={showResult}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${showCorrect ? 'border-green-500/60 bg-green-500/10 shadow-[0_0_20px_-5px_rgba(34,197,94,0.3)]' :
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
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${showCorrect ? 'bg-green-500/20 text-green-400' :
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
                      <div className="text-3xl font-bold text-green-400">{totalCorrect}/{activeQuestions.length}</div>
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

              <div className="flex gap-3 max-w-sm mx-auto">
                <button
                  onClick={() => {
                    setState('overview');
                    setScore(0);
                    setTimeLeft(120);
                    setShowResult(false);
                  }}
                  className="w-full flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                >
                  Back to Contests 🏆
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
