'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  ArrowLeft, Zap, Star, Trophy, Gift, TrendingUp, Clock,
  ChevronRight, Flame, Sparkles, Loader2, Send, Crown,
  Heart, User
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { LEVEL_NAMES, type XPInfo, type XPTransaction, type LeaderboardEntry } from '@/types';
import toast from 'react-hot-toast';

type XPTab = 'overview' | 'transactions' | 'leaderboard' | 'gift';

export default function XPPage() {
  const { user, xp, refreshXP, relationships } = useAuth();
  const [tab, setTab] = useState<XPTab>('overview');
  const [transactions, setTransactions] = useState<XPTransaction[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [giftRecipient, setGiftRecipient] = useState('');
  const [giftAmount, setGiftAmount] = useState(50);
  const [giftMessage, setGiftMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Load data
  useEffect(() => {
    const load = async () => {
      try {
        await refreshXP();
        const [txRes, lbRes] = await Promise.all([
          api.getXPTransactions().catch(() => ({ transactions: [] })),
          api.getXPLeaderboard().catch(() => ({ leaderboard: [] })),
        ]);
        setTransactions(Array.isArray(txRes) ? txRes : txRes.transactions || []);
        setLeaderboard(Array.isArray(lbRes) ? lbRes : lbRes.leaderboard || []);
      } catch (e) {
        console.error('Failed to load XP data:', e);
      } finally {
        setIsLoading(false);
      }
    };
    if (user) load();
  }, [user?.id]);

  const handleGiftXP = async () => {
    if (!giftRecipient || !giftAmount) return;
    setIsSending(true);
    try {
      await api.giftXP({
        recipient_id: giftRecipient,
        amount: giftAmount,
        message: giftMessage || undefined,
      });
      toast.success(`🎁 Gifted ${giftAmount} XP successfully!`);
      setGiftAmount(50);
      setGiftMessage('');
      setGiftRecipient('');
      refreshXP();
    } catch (err: any) {
      toast.error(err.message || 'Failed to gift XP');
    } finally {
      setIsSending(false);
    }
  };

  const levelProgress = xp
    ? Math.min(100, (xp.total_xp / (xp.total_xp + xp.xp_to_next_level)) * 100)
    : 0;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass-card max-w-md">
          <Zap className="w-12 h-12 mx-auto mb-4 text-amber-400" />
          <h2 className="text-xl font-bold mb-2">XP Dashboard</h2>
          <p className="text-muted mb-6">Please log in to view XP</p>
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
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            XP Dashboard
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-4" />
            <p className="text-muted">Loading XP data...</p>
          </div>
        ) : (
          <>
            {/* ── XP Overview Card ── */}
            <motion.div
              className="glass-card relative overflow-hidden mb-6 ring-1 ring-amber-500/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/10" />
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-amber-500/5 blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-500/30">
                    <span className="text-2xl font-bold text-white">{xp?.level || 1}</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{LEVEL_NAMES[xp?.level || 1] || 'Level ' + (xp?.level || 1)}</h2>
                    <p className="text-sm text-muted">{xp?.total_xp?.toLocaleString() || 0} total XP</p>
                  </div>
                  {(xp?.streak_days || 0) > 0 && (
                    <div className="ml-auto text-center">
                      <div className="flex items-center gap-1 text-orange-400">
                        <Flame className="w-5 h-5" />
                        <span className="text-lg font-bold">{xp?.streak_days}</span>
                      </div>
                      <div className="text-[10px] text-muted">Day Streak</div>
                      {(xp?.streak_multiplier || 1) > 1 && (
                        <div className="text-[10px] text-amber-400 mt-0.5">
                          ×{xp?.streak_multiplier} multiplier
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Level progress */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs text-muted mb-1">
                    <span>Level {xp?.level || 1}</span>
                    <span>{xp?.xp_to_next_level?.toLocaleString() || '—'} XP to next level</span>
                    <span>Level {(xp?.level || 1) + 1}</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-[var(--bg-card)] border border-themed overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${levelProgress}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── Tab Bar ── */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {([
                { id: 'overview' as XPTab, label: 'Stats', icon: <Star className="w-3.5 h-3.5" /> },
                { id: 'transactions' as XPTab, label: 'History', icon: <Clock className="w-3.5 h-3.5" /> },
                { id: 'leaderboard' as XPTab, label: 'Rankings', icon: <Trophy className="w-3.5 h-3.5" /> },
                { id: 'gift' as XPTab, label: 'Gift XP', icon: <Gift className="w-3.5 h-3.5" /> },
              ]).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition whitespace-nowrap ${
                    tab === t.id
                      ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/20'
                      : 'bg-[var(--bg-card)] text-muted border border-themed hover:text-[var(--text-primary)]'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* ── Stats Overview ── */}
              {tab === 'overview' && (
                <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {[
                      { label: 'Total XP', value: xp?.total_xp?.toLocaleString() || '0', icon: <Zap className="w-4 h-4" />, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                      { label: 'Level', value: xp?.level || 1, icon: <Star className="w-4 h-4" />, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                      { label: 'Streak', value: `${xp?.streak_days || 0} days`, icon: <Flame className="w-4 h-4" />, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                      { label: 'Multiplier', value: `×${xp?.streak_multiplier || 1}`, icon: <TrendingUp className="w-4 h-4" />, color: 'text-green-400', bg: 'bg-green-500/10' },
                    ].map((stat, i) => (
                      <motion.div
                        key={stat.label}
                        className="glass-card !p-4 text-center"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                      >
                        <div className={`w-10 h-10 mx-auto mb-2 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                          {stat.icon}
                        </div>
                        <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                        <div className="text-[10px] text-muted">{stat.label}</div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Friends / Bonds */}
                  {relationships?.length > 0 && (
                    <div className="glass-card mb-6">
                      <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-heart-400 fill-heart-400" /> Individual Friend XP
                      </h3>
                      <div className="space-y-2">
                        {relationships.map(rel => (
                          <div key={rel.id} className="p-3 rounded-xl bg-gradient-to-r from-bond-500/5 to-familia-500/5 border border-themed flex items-center justify-between transition hover:bg-bond-500/10">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--bg-card)] border border-themed flex-shrink-0 flex items-center justify-center">
                                {rel.partner_avatar_config?.image_url ? (
                                  <img src={rel.partner_avatar_config.image_url} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-5 h-5 text-muted" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-semibold">{rel.partner_display_name || 'Friend'} <span>{rel.partner_country}</span></div>
                                <div className="text-[10px] uppercase tracking-wider text-muted font-bold text-bond-400">{rel.level_label || 'Bond Level'}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-familia-400 flex items-center justify-end gap-1"><Zap className="w-3 h-3"/> {rel.shared_xp?.toLocaleString() || '0'}</div>
                              <div className="text-[10px] text-muted">Lvl {rel.level}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Level unlock features */}
                  <div className="glass-card">
                    <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-familia-400" /> Level Rewards
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(LEVEL_NAMES).map(([lvl, name]) => {
                        const level = parseInt(lvl);
                        const isUnlocked = (xp?.level || 1) >= level;
                        return (
                          <div
                            key={lvl}
                            className={`flex items-center gap-3 p-3 rounded-xl transition ${
                              isUnlocked ? 'bg-amber-500/5 border border-amber-500/10' : 'opacity-40'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                              isUnlocked ? 'bg-amber-500/20 text-amber-400' : 'bg-[var(--bg-card)] text-muted'
                            }`}>
                              {level}
                            </div>
                            <div className="flex-1">
                              <span className="text-sm font-medium">{name}</span>
                            </div>
                            {isUnlocked ? (
                              <span className="text-xs text-green-400">✅ Unlocked</span>
                            ) : (
                              <span className="text-xs text-muted">🔒 Locked</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Transactions ── */}
              {tab === 'transactions' && (
                <motion.div key="transactions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="glass-card">
                    <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted" /> XP History
                    </h3>
                    {transactions.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="w-8 h-8 mx-auto mb-2 text-muted opacity-30" />
                        <p className="text-muted text-sm">No transactions yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {transactions.map((tx, i) => (
                          <motion.div
                            key={tx.id}
                            className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-card-hover)] border border-themed"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                              tx.xp_earned > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {tx.xp_earned > 0 ? '+' : ''}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{tx.action}</p>
                              <p className="text-[10px] text-muted">
                                {new Date(tx.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className={`text-sm font-bold ${tx.xp_earned > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {tx.xp_earned > 0 ? '+' : ''}{tx.xp_earned}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── Leaderboard ── */}
              {tab === 'leaderboard' && (
                <motion.div key="leaderboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="glass-card !p-0 overflow-hidden relative">
                    <div className="p-4 border-b border-themed bg-[var(--bg-card-hover)] flex items-center justify-between">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-400" /> Global Leaderboard
                      </h3>
                      <div className="text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded-md font-bold tracking-widest">WORLDWIDE</div>
                    </div>
                    {leaderboard.length === 0 ? (
                      <div className="text-center py-12">
                        <Trophy className="w-10 h-10 mx-auto mb-3 text-muted opacity-30" />
                        <p className="text-muted text-sm font-medium">No Rankings Yet</p>
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {leaderboard.map((entry, i) => {
                          const isTop3 = i < 3;
                          const bgColors = ['bg-gradient-to-r from-amber-500/20 to-yellow-500/5 border-amber-500/30', 'bg-gradient-to-r from-gray-300/20 to-gray-400/5 border-gray-400/30', 'bg-gradient-to-r from-orange-600/20 to-orange-500/5 border-orange-500/30'];
                          
                          return (
                            <motion.div
                              key={entry.user_id}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                                entry.user_id === user?.id
                                  ? 'bg-bond-500/10 border-bond-500/30 ring-1 ring-bond-500/50'
                                  : isTop3 ? bgColors[i] : 'bg-[var(--bg-card)] border-transparent hover:bg-[var(--bg-card-hover)]'
                              }`}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                            >
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shadow-inner ${
                                i === 0 ? 'bg-gradient-to-br from-yellow-300 to-amber-500 text-black shadow-amber-500/50' :
                                i === 1 ? 'bg-gradient-to-br from-gray-200 to-gray-400 text-black shadow-gray-400/50' :
                                i === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-orange-500/50' :
                                'bg-[var(--bg-card-hover)] text-muted font-bold text-sm border border-themed'
                              }`}>
                                {i <= 2 ? ['🥇', '🥈', '🥉'][i] : entry.rank}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate flex items-center gap-1.5">
                                  {entry.display_name} 
                                  <span className="text-xs opacity-80">{entry.country}</span>
                                  {entry.user_id === user?.id && <span className="text-[10px] bg-bond-500 text-white px-1.5 py-0.5 rounded ml-1 tracking-wider uppercase">You</span>}
                                </p>
                                <p className="text-[10px] text-muted font-medium mt-0.5 tracking-wider uppercase">Level {entry.level || 1}</p>
                              </div>
                              <div className="text-right">
                                <div className={`text-base font-black tracking-tight ${isTop3 ? 'textPrimary' : 'text-muted'}`}>
                                  {(entry.total_xp || 0).toLocaleString()} <span className="text-[10px] uppercase font-bold opacity-60">XP</span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── Gift XP ── */}
              {tab === 'gift' && (
                <motion.div key="gift" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="glass-card">
                    <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                      <Gift className="w-4 h-4 text-heart-400" /> Gift XP
                    </h3>

                    <label className="text-xs text-muted mb-2 block">To:</label>
                    <select
                      value={giftRecipient}
                      onChange={(e) => setGiftRecipient(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-themed text-sm mb-4 outline-none focus:border-familia-500/50"
                    >
                      <option value="">Select a recipient...</option>
                      {relationships.filter(r => r.status === 'active').map(r => (
                        <option key={r.partner_id || r.id} value={r.partner_id || r.partner?.id || ''}>
                          {r.partner?.display_name || r.partner_display_name || 'Partner'}
                        </option>
                      ))}
                    </select>

                    <label className="text-xs text-muted mb-2 block">Amount:</label>
                    <div className="flex gap-2 mb-4">
                      {[25, 50, 100, 250, 500].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setGiftAmount(amt)}
                          className={`flex-1 py-2 rounded-xl text-xs font-medium transition border ${
                            giftAmount === amt
                              ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400'
                              : 'border-themed text-muted hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {amt}
                        </button>
                      ))}
                    </div>

                    <label className="text-xs text-muted mb-2 block">Message (optional):</label>
                    <input
                      value={giftMessage}
                      onChange={(e) => setGiftMessage(e.target.value)}
                      placeholder="You're awesome!"
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-themed text-sm mb-4 outline-none focus:border-familia-500/50"
                    />

                    <button
                      onClick={handleGiftXP}
                      disabled={!giftRecipient || isSending}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                      Gift {giftAmount} XP
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
