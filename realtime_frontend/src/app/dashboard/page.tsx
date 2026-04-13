'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  Globe, Heart, Users, Trophy, Gamepad2, MessageCircle, Bell, Settings,
  Search, Star, Flame, Shield, Sparkles, ChevronRight, Home, User, LogOut,
  Sun, Moon, X
} from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import { useAuth } from '@/lib/AuthContext';
import { ROLE_EMOJIS, LEVEL_NAMES } from '@/types';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const { theme, toggleTheme } = useTheme();
  const { user, relationships, notifications, unreadCount, markNotificationRead, refreshRelationships } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        await refreshRelationships();
      } catch (e) {
        console.error('Failed to load data:', e);
      } finally {
        setIsLoading(false);
      }
    };
    if (user?.id) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [user?.id]);

  const handleNotificationClick = (notif: any) => {
    markNotificationRead(notif.id);
    if (notif.data?.relationship_id) {
      window.location.href = `/chat/${notif.data.relationship_id}`;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-familia-500 to-heart-500 animate-pulse" />
          <p className="text-muted">Loading your family...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass-card max-w-md">
          <Globe className="w-12 h-12 mx-auto mb-4 text-familia-400" />
          <h2 className="text-xl font-bold mb-2">Welcome to Familia</h2>
          <p className="text-muted mb-6">Please log in to access your dashboard</p>
          <Link href="/login">
            <button className="btn-primary w-full">Log In</button>
          </Link>
          <p className="mt-4 text-sm text-muted">
            Don't have an account? <Link href="/signup" className="text-familia-400 hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* ── Top Navigation ─────────────────── */}
      <nav className="sticky top-0 z-50 glass border-b border-themed">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-familia-500 to-heart-500 flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">Familia</span>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition"
              whileTap={{ scale: 0.9 }}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-500" />}
            </motion.button>

            <div className="relative">
              <motion.button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition"
                whileTap={{ scale: 0.9 }}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-heart-500 rounded-full text-[10px] flex items-center justify-center font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </motion.button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-80 glass-card !p-0 overflow-hidden z-50 shadow-xl"
                  >
                    <div className="p-3 border-b border-themed flex items-center justify-between">
                      <span className="font-semibold text-sm">Notifications</span>
                      <div className="flex items-center gap-2">
                        <Link href="/notifications" onClick={() => setShowNotifications(false)} className="text-xs text-familia-400 hover:underline">View All</Link>
                        <button onClick={() => setShowNotifications(false)}><X className="w-4 h-4 text-muted" /></button>
                      </div>
                    </div>
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-muted text-sm">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />No notifications yet
                      </div>
                    ) : (
                      <>
                        {notifications.slice(0, 5).map((notif) => (
                          <div key={notif.id} onClick={() => handleNotificationClick(notif)}
                            className={`p-3 border-b border-themed hover:bg-[var(--bg-card-hover)] transition cursor-pointer ${!notif.is_read ? 'bg-familia-500/5' : ''}`}>
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-sm">{notif.title}</div>
                              {!notif.is_read && <div className="w-2 h-2 rounded-full bg-familia-400" />}
                            </div>
                            <div className="text-xs text-muted mt-0.5">{notif.body}</div>
                          </div>
                        ))}
                        {notifications.length > 5 && (
                          <Link href="/notifications" onClick={() => setShowNotifications(false)}>
                            <div className="p-3 text-center text-sm text-familia-400 hover:bg-[var(--bg-card-hover)] transition cursor-pointer font-medium">
                              View all {notifications.length} notifications →
                            </div>
                          </Link>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link href="/profile" className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-familia-500 to-bond-500 flex items-center justify-center text-sm font-bold text-white">
                {user.display_name?.[0] || 'U'}
              </div>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <motion.div className="glass-card mb-8 relative overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="absolute inset-0 bg-gradient-to-r from-familia-500/10 via-transparent to-bond-500/10" />
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold mb-1">Welcome back, <span className="gradient-text">{user.display_name || 'Friend'}</span> 👋</h1>
                <p className="text-muted text-sm">Your global family is waiting</p>
              </div>
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-familia-400">{user.care_score || 0}</div>
                  <div className="text-[10px] text-muted">Care Score</div>
                </div>
                <div className="w-px h-8 bg-[var(--border-color)] hidden sm:block" />
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-bond-400">{user.total_bond_points || 0}</div>
                  <div className="text-[10px] text-muted">Bond Points</div>
                </div>
                <div className="w-px h-8 bg-[var(--border-color)] hidden sm:block" />
                <div className="text-center flex items-center gap-1.5">
                  <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-orange-400">{relationships.reduce((max, r) => Math.max(max, r.streak_days || 0), 0)}</div>
                    <div className="text-[10px] text-muted">Day Streak</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: <Search className="w-6 h-6" />, label: 'Find Match', href: '/matching', color: 'from-familia-500 to-heart-500' },
            { icon: <Trophy className="w-6 h-6" />, label: 'Contests', href: '/contests', color: 'from-amber-500 to-orange-500' },
            { icon: <Gamepad2 className="w-6 h-6" />, label: 'Games', href: '/games', color: 'from-purple-500 to-violet-500' },
            { icon: <Users className="w-6 h-6" />, label: 'Family Rooms', href: '/family-rooms', color: 'from-bond-500 to-cyan-500' },
          ].map((action, i) => (
            <motion.div key={action.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Link href={action.href}>
                <div className="glass-card !p-4 text-center card-hover cursor-pointer group">
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform text-white`}>{action.icon}</div>
                  <div className="font-medium text-sm">{action.label}</div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2"><Heart className="w-5 h-5 text-heart-400" />Your Bonds</h2>
            <Link href="/matching" className="text-sm text-familia-400 hover:text-familia-300 flex items-center gap-1">Find new <ChevronRight className="w-4 h-4" /></Link>
          </div>

          {relationships.length === 0 ? (
            <motion.div className="glass-card text-center py-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Heart className="w-12 h-12 mx-auto mb-4 text-muted opacity-30" />
              <h3 className="text-lg font-semibold mb-2">No bonds yet</h3>
              <p className="text-muted mb-6">Start your journey by finding your first match!</p>
              <Link href="/matching"><button className="btn-primary">Find Your Match</button></Link>
            </motion.div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {relationships.map((rel, i) => (
                <motion.div key={rel.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <Link href={`/chat/${rel.id}`}>
                    <div className="glass-card card-hover cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-familia-500 to-bond-500 flex items-center justify-center text-2xl">{ROLE_EMOJIS[rel.partner_role] || '🤝'}</div>
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[var(--bg-primary)] ${rel.partner?.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold truncate">{rel.partner?.display_name || 'Partner'}</span>
                            {rel.partner?.is_verified && <span className="text-green-500 text-sm">✓</span>}
                          </div>
                          <div className="text-xs text-muted flex items-center gap-2">
                            <span>Your {rel.partner_role}</span><span>•</span><span>{rel.partner?.country}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="badge-level text-[10px]">Lv.{rel.level} {LEVEL_NAMES[rel.level]}</span>
                            {rel.streak_days > 0 && <span className="text-xs text-muted flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" />{rel.streak_days}d</span>}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="relative w-12 h-12">
                            <svg className="w-12 h-12 progress-ring" viewBox="0 0 44 44">
                              <circle cx="22" cy="22" r="18" fill="none" stroke="var(--border-color)" strokeWidth="3" />
                              <circle cx="22" cy="22" r="18" fill="none" stroke={`url(#care-grad-${i})`} strokeWidth="3" strokeDasharray={`${(rel.care_score / 100) * 113} 113`} strokeLinecap="round" className="progress-ring__circle" />
                              <defs><linearGradient id={`care-grad-${i}`}><stop offset="0%" stopColor="#FF6B35" /><stop offset="100%" stopColor="#F43F5E" /></linearGradient></defs>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">{rel.care_score}</div>
                          </div>
                          <div className="text-[10px] text-muted mt-0.5">Care</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div className="glass-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="flex items-center gap-2 mb-4"><Trophy className="w-5 h-5 text-amber-400" /><h3 className="font-bold">Next Contest</h3></div>
            {relationships.length > 0 ? (
              <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
                <div className="text-sm font-medium mb-1">Weekly Bond Challenge with {relationships[0]?.partner?.display_name} 🎯</div>
                <div className="text-xs text-muted mb-3">5 questions • 10 min limit • 50 max points</div>
                <Link href="/contests"><motion.button className="btn-primary text-sm !py-2" whileHover={{ scale: 1.02 }}>Start Contest 🏆</motion.button></Link>
              </div>
            ) : (
              <div className="text-center py-6 text-muted"><Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">Find a match to unlock contests!</p></div>
            )}
          </motion.div>

          <motion.div className="glass-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="flex items-center gap-2 mb-4"><Gamepad2 className="w-5 h-5 text-purple-400" /><h3 className="font-bold">Quick Games</h3></div>
            <div className="space-y-2">
              {[
                { emoji: '🪞', name: 'Mood Mirror', desc: 'Guess their mood', points: 5 },
                { emoji: '🎭', name: 'Emotion Charades', desc: 'Express & guess', points: 10 },
                { emoji: '🤔', name: 'Would You Rather', desc: 'Quick fun round', points: 8 },
              ].map((game) => (
                <Link key={game.name} href="/games">
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition cursor-pointer">
                    <span className="text-2xl">{game.emoji}</span>
                    <div className="flex-1"><div className="text-sm font-medium">{game.name}</div><div className="text-xs text-muted">{game.desc}</div></div>
                    <span className="text-xs text-familia-400">+{game.points} pts</span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

    </div>
  );
}
