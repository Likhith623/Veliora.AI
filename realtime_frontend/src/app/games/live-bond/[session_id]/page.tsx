'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { createBondGameWS, ManagedWebSocket } from '@/lib/websocket';
import { Loader2, Heart, Sparkles, X, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LiveBondGame() {
  const { session_id } = useParams();
  const router = useRouter();
  const { user, refreshUser, refreshXP, refreshRelationships } = useAuth();
  
  const [ws, setWs] = useState<ManagedWebSocket | null>(null);
  const [status, setStatus] = useState<'waiting' | 'playing' | 'round_result' | 'finished'>('waiting');
  const [gameState, setGameState] = useState<any>(null);
  const [roundData, setRoundData] = useState<any>(null);
  const [myAnswer, setMyAnswer] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !session_id) return;

    const socket = createBondGameWS(session_id as string, user.id, {
      onWaitingForOpponent: () => setStatus('waiting'),
      onGameStart: (state) => {
        setGameState(state);
        setStatus('playing');
        setMyAnswer(null);
      },
      onState: (state) => {
        setGameState((prev: any) => {
          // If we transitioned to a new question, clear things up
          if (state.status === 'finished') {
            setStatus('finished');
          } else if (!prev || prev.current_q !== state.current_q) {
            setStatus('playing');
            // If the question advanced, clear my local answer tracking if it's no longer in state
            if (!state.answers[user.id]) setMyAnswer(null);
          }
          return state;
        });
      },
      onRoundResult: (data) => {
        setRoundData(data);
        setStatus('round_result');
      },
      onGameOver: (winner, scores) => {
        setGameState((prev: any) => ({ ...prev, scores, winner, status: 'finished' }));
        setStatus('finished');
        refreshUser();
        refreshXP();
        refreshRelationships();
      },
      onOpponentDisconnected: () => {
        toast.error("Your partner disconnected.");
        router.back();
      },
      onOpen: () => {
        // Auto-ready exactly when the socket connects!
        socket.send({ type: "ready" });
      }
    });

    setWs(socket);

    return () => socket.close();
  }, [user?.id, session_id, router]);

  const handleSelect = (idx: string) => {
    if (myAnswer || status !== 'playing') return;
    setMyAnswer(idx);
    ws?.send({ type: "move", data: { answer: idx } });
  };

  const getPartnerId = () => {
    if (!gameState) return null;
    return gameState.player_a === user?.id ? gameState.player_b : gameState.player_a;
  };

  if (status === 'waiting' || !gameState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="absolute inset-0 bg-gradient-to-b from-familia-500/10 to-[var(--bg-primary)] -z-10" />
        <div className="glass-card p-12 text-center max-w-sm relative">
          <div className="w-16 h-16 rounded-full bg-familia-500/20 flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-8 h-8 text-familia-400 animate-spin" />
          </div>
          <h2 className="text-xl font-bold mb-2">Waiting for Partner</h2>
          <p className="text-subtle text-sm">They must accept the invite to join the room</p>
        </div>
      </div>
    );
  }

  if (status === 'finished') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <motion.div 
          className="glass-card p-8 text-center max-w-md w-full relative overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-amber-500/20 to-transparent -z-10 blur-3xl" />
          <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Game Complete!</h2>
          <p className="text-sm text-subtle mb-6">You earned +{gameState.scores[user!.id]} Bond Points!</p>
          
          <button onClick={() => router.back()} className="btn-primary w-full py-3">
            Return to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  const currentQ = gameState.questions[gameState.current_q];
  const partnerId = getPartnerId();
  const partnerHasAnswered = partnerId && gameState.answers[partnerId] !== null;

  return (
    <div className="min-h-screen flex flex-col pt-12 pb-24 px-4 overflow-hidden relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-2xl max-h-2xl rounded-full bg-familia-500/10 blur-[100px] -z-10" />
      
      {/* Header */}
      <div className="flex items-center justify-between max-w-2xl mx-auto w-full mb-8 z-10 relative">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-[var(--bg-card)] ring-1 ring-[var(--border-color)]">
          <X className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h3 className="font-bold text-lg flex items-center justify-center gap-2">
            Synchrony <Sparkles className="w-4 h-4 text-familia-400" />
          </h3>
          <span className="text-xs font-medium text-amber-400">Score: {gameState.scores[user!.id]}</span>
        </div>
        <div className="p-2 rounded-full bg-[var(--bg-card)] ring-1 ring-[#00000000] invisible">
          <X className="w-5 h-5" />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full z-10">
        
        {/* The Game Area */}
        <AnimatePresence mode="wait">
          {status === 'playing' ? (
            <motion.div
              key={`q-${gameState.current_q}`}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -20 }}
              className="w-full relative"
            >
              <div className="text-center mb-8">
                <span className="px-3 py-1 bg-[var(--bg-card)] ring-1 ring-[var(--border-color)] rounded-full text-xs font-bold text-muted uppercase tracking-widest mb-4 inline-block">
                  Question {gameState.current_q + 1} of {gameState.questions.length}
                </span>
                <h2 className="text-2xl font-bold leading-snug">{currentQ.q}</h2>
              </div>

              <div className="flex flex-col gap-4">
                {['a', 'b'].map((opt) => {
                  const isSelected = myAnswer === opt;
                  return (
                    <motion.button
                      key={opt}
                      onClick={() => handleSelect(opt)}
                      whileHover={{ scale: myAnswer ? 1 : 1.02 }}
                      whileTap={{ scale: myAnswer ? 1 : 0.98 }}
                      className={`relative p-5 rounded-2xl border-2 text-lg font-bold transition-all text-left overflow-hidden ${
                        isSelected 
                          ? 'border-familia-500 bg-familia-500/20 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                          : myAnswer 
                            ? 'border-[var(--border-color)] bg-[var(--bg-card)] opacity-50' 
                            : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-familia-500/50'
                      }`}
                    >
                      <span className="relative z-10">{opt === 'a' ? currentQ.opt_a : currentQ.opt_b}</span>
                      {isSelected && (
                        <motion.div 
                          className="absolute inset-0 bg-gradient-to-r from-familia-500/10 to-bond-500/10 pointer-events-none"
                          layoutId="selected-bg"
                        />
                      )}
                    </motion.button>
                  )
                })}
              </div>

              {/* Status display */}
              <div className="h-12 mt-6 flex items-center justify-center">
                {myAnswer && !partnerHasAnswered && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-sm text-familia-400 bg-familia-500/10 px-4 py-2 rounded-full">
                    <Loader2 className="w-4 h-4 animate-spin" /> Waiting for partner...
                  </motion.div>
                )}
                {!myAnswer && partnerHasAnswered && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-green-400 bg-green-500/10 px-4 py-2 rounded-full">
                    Partner has locked in! Your turn.
                  </motion.div>
                )}
              </div>
            </motion.div>

          ) : status === 'round_result' && roundData ? (
            <motion.div
              key="result"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-center flex flex-col items-center justify-center relative"
            >
             {roundData.match ? (
               <>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1], rotate: [0, -10, 10, 0] }}
                  transition={{ type: "spring", duration: 0.6 }}
                  className="w-24 h-24 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(2fb,113,133,0.5)] z-20"
                >
                  <Heart className="w-12 h-12 text-white fill-white" />
                </motion.div>
                <h2 className="text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-500">
                  Perfect Match!
                </h2>
                <p className="text-muted">You both chose <span className="font-bold text-white">{roundData.ans_a === 'a' ? currentQ.opt_a : currentQ.opt_b}</span>!</p>
               </>
             ) : (
               <>
                 <div className="w-24 h-24 bg-[var(--bg-card)] rounded-full flex items-center justify-center border-4 border-[var(--border-color)] mb-6 z-20">
                   <span className="text-3xl">🙃</span>
                 </div>
                 <h2 className="text-2xl font-bold mb-2">So Close!</h2>
                 <p className="text-muted">You chose <span className="font-bold text-white">{roundData.ans_a === 'a' ? currentQ.opt_a : currentQ.opt_b}</span></p>
                 <p className="text-muted">They chose <span className="font-bold text-white">{roundData.ans_b === 'a' ? currentQ.opt_a : currentQ.opt_b}</span></p>
               </>
             )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
