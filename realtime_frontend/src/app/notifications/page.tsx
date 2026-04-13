'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import {
  Bell, BellOff, Check, CheckCheck, ChevronLeft, Trash2, Heart,
  MessageCircle, Users, Trophy, Gamepad2, Shield, Sparkles, Globe,
  Star, AlertTriangle, Gift, X, Filter, Clock
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { ROLE_EMOJIS } from '@/types';

/* ─── Notification type config ─────────────────────────── */
const NOTIF_CONFIG: Record<string, { icon: React.ReactNode; color: string; gradient: string; label: string }> = {
  message: {
    icon: <MessageCircle className="w-5 h-5" />,
    color: 'text-blue-400',
    gradient: 'from-blue-500/20 to-blue-600/10',
    label: 'Messages',
  },
  match: {
    icon: <Heart className="w-5 h-5" />,
    color: 'text-rose-400',
    gradient: 'from-rose-500/20 to-pink-600/10',
    label: 'Matches',
  },
  match_found: {
    icon: <Heart className="w-5 h-5" />,
    color: 'text-rose-400',
    gradient: 'from-rose-500/20 to-pink-600/10',
    label: 'Matches',
  },
  bond: {
    icon: <Users className="w-5 h-5" />,
    color: 'text-cyan-400',
    gradient: 'from-cyan-500/20 to-teal-600/10',
    label: 'Bonds',
  },
  bond_level_up: {
    icon: <Star className="w-5 h-5" />,
    color: 'text-amber-400',
    gradient: 'from-amber-500/20 to-yellow-600/10',
    label: 'Milestones',
  },
  contest: {
    icon: <Trophy className="w-5 h-5" />,
    color: 'text-amber-400',
    gradient: 'from-amber-500/20 to-orange-600/10',
    label: 'Contests',
  },
  game: {
    icon: <Gamepad2 className="w-5 h-5" />,
    color: 'text-purple-400',
    gradient: 'from-purple-500/20 to-violet-600/10',
    label: 'Games',
  },
  achievement: {
    icon: <Sparkles className="w-5 h-5" />,
    color: 'text-yellow-400',
    gradient: 'from-yellow-500/20 to-amber-600/10',
    label: 'Achievements',
  },
  system: {
    icon: <Globe className="w-5 h-5" />,
    color: 'text-familia-400',
    gradient: 'from-familia-500/20 to-orange-600/10',
    label: 'System',
  },
  safety: {
    icon: <Shield className="w-5 h-5" />,
    color: 'text-green-400',
    gradient: 'from-green-500/20 to-emerald-600/10',
    label: 'Safety',
  },
  welcome: {
    icon: <Gift className="w-5 h-5" />,
    color: 'text-familia-400',
    gradient: 'from-familia-500/20 to-heart-500/10',
    label: 'Welcome',
  },
};

function getConfig(type: string) {
  return NOTIF_CONFIG[type] || NOTIF_CONFIG.system;
}

/* ─── Time formatting ──────────────────────────────────── */
function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupByDate(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'This Week';
  if (days < 30) return 'This Month';
  return 'Earlier';
}

/* ─── Filter tabs ──────────────────────────────────────── */
type FilterTab = 'all' | 'unread' | 'messages' | 'matches' | 'system';

const FILTER_TABS: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: <Bell className="w-4 h-4" /> },
  { key: 'unread', label: 'Unread', icon: <AlertTriangle className="w-4 h-4" /> },
  { key: 'messages', label: 'Messages', icon: <MessageCircle className="w-4 h-4" /> },
  { key: 'matches', label: 'Matches', icon: <Heart className="w-4 h-4" /> },
  { key: 'system', label: 'System', icon: <Globe className="w-4 h-4" /> },
];

/* ═══════════════════════════════════════════════════════════
   NOTIFICATIONS PAGE
   ═══════════════════════════════════════════════════════════ */
export default function NotificationsPage() {
  const {
    user, notifications, unreadCount,
    markNotificationRead, markAllNotificationsRead,
    deleteNotification, clearAllNotifications, refreshNotifications,
  } = useAuth();

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [swipedId, setSwipedId] = useState<string | null>(null);

  /* ─── Filtering ──────────────────────────────────────── */
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];
    switch (activeFilter) {
      case 'unread':
        filtered = filtered.filter(n => !n.is_read);
        break;
      case 'messages':
        filtered = filtered.filter(n => n.type === 'message');
        break;
      case 'matches':
        filtered = filtered.filter(n => ['match', 'match_found', 'bond', 'bond_level_up'].includes(n.type));
        break;
      case 'system':
        filtered = filtered.filter(n => ['system', 'safety', 'welcome', 'achievement'].includes(n.type));
        break;
    }
    return filtered;
  }, [notifications, activeFilter]);

  /* ─── Grouped by date ────────────────────────────────── */
  const grouped = useMemo(() => {
    const groups: Record<string, typeof filteredNotifications> = {};
    filteredNotifications.forEach(n => {
      const group = groupByDate(n.created_at);
      if (!groups[group]) groups[group] = [];
      groups[group].push(n);
    });
    return groups;
  }, [filteredNotifications]);

  const groupOrder = ['Today', 'Yesterday', 'This Week', 'This Month', 'Earlier'];

  /* ─── Notification click handler ─────────────────────── */
  const handleClick = (notif: any) => {
    if (!notif.is_read) markNotificationRead(notif.id);
    // Navigate based on notification type
    if (notif.data?.relationship_id) {
      window.location.href = `/chat/${notif.data.relationship_id}`;
    } else if (notif.type === 'match' || notif.type === 'match_found') {
      window.location.href = '/matching';
    } else if (notif.type === 'contest') {
      window.location.href = '/contests';
    } else if (notif.type === 'game') {
      window.location.href = '/games';
    }
  };

  /* ─── Loading / auth guard ───────────────────────────── */
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass-card max-w-md">
          <Bell className="w-12 h-12 mx-auto mb-4 text-familia-400" />
          <h2 className="text-xl font-bold mb-2">Notifications</h2>
          <p className="text-muted mb-6">Please log in to view notifications</p>
          <Link href="/login"><button className="btn-primary w-full">Log In</button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="sticky top-0 z-50 glass border-b border-themed">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="p-2 -ml-2 rounded-xl hover:bg-[var(--bg-card-hover)] transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </motion.button>
              </Link>
              <div>
                <h1 className="text-lg font-bold flex items-center gap-2">
                  <Bell className="w-5 h-5 text-familia-400" />
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <p className="text-xs text-muted">{unreadCount} unread</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <motion.button
                  onClick={() => markAllNotificationsRead()}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-xl hover:bg-[var(--bg-card-hover)] transition text-familia-400"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-5 h-5" />
                </motion.button>
              )}
              {notifications.length > 0 && (
                <motion.button
                  onClick={() => setShowClearConfirm(true)}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-xl hover:bg-[var(--bg-card-hover)] transition text-muted hover:text-heart-400"
                  title="Clear all"
                >
                  <Trash2 className="w-5 h-5" />
                </motion.button>
              )}
            </div>
          </div>

          {/* ── Filter Tabs ────────────────────────────── */}
          <div className="flex gap-1 mt-3 overflow-x-auto no-scrollbar pb-1">
            {FILTER_TABS.map(tab => {
              const isActive = activeFilter === tab.key;
              const count = tab.key === 'unread' ? unreadCount :
                tab.key === 'all' ? notifications.length :
                tab.key === 'messages' ? notifications.filter(n => n.type === 'message').length :
                tab.key === 'matches' ? notifications.filter(n => ['match','match_found','bond','bond_level_up'].includes(n.type)).length :
                notifications.filter(n => ['system','safety','welcome','achievement'].includes(n.type)).length;

              return (
                <motion.button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all
                    ${isActive
                      ? 'text-white'
                      : 'text-muted hover:text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                    }
                  `}
                >
                  {isActive && (
                    <motion.div
                      layoutId="notif-filter-pill"
                      className="absolute inset-0 bg-gradient-to-r from-familia-500 to-heart-500 rounded-full"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    {tab.icon}
                    {tab.label}
                    {count > 0 && (
                      <span className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1 ${
                        isActive ? 'bg-white/20' : 'bg-[var(--bg-card-hover)]'
                      }`}>
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Notification List ───────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {filteredNotifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-familia-500/10 to-heart-500/10 rounded-full animate-pulse" />
              <div className="absolute inset-2 bg-[var(--bg-card)] rounded-full flex items-center justify-center">
                <BellOff className="w-10 h-10 text-muted opacity-40" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {activeFilter === 'unread' ? 'All caught up!' : 'No notifications'}
            </h3>
            <p className="text-muted text-sm max-w-xs mx-auto">
              {activeFilter === 'unread'
                ? "You've read all your notifications. Great job staying connected!"
                : activeFilter === 'all'
                  ? "When you get messages, matches, or updates, they'll appear here."
                  : `No ${activeFilter} notifications yet.`
              }
            </p>
            {activeFilter === 'all' && (
              <Link href="/matching">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-primary mt-6"
                >
                  Find Your First Match
                </motion.button>
              </Link>
            )}
          </motion.div>
        ) : (
          <div className="space-y-6">
            {groupOrder.map(groupName => {
              const items = grouped[groupName];
              if (!items || items.length === 0) return null;

              return (
                <div key={groupName}>
                  {/* Date group header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                      {groupName}
                    </span>
                    <div className="flex-1 h-px bg-[var(--border-color)]" />
                    <span className="text-xs text-muted">
                      {items.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {items.map((notif, idx) => {
                        const config = getConfig(notif.type);
                        const isExpanded = swipedId === notif.id;

                        return (
                          <motion.div
                            key={notif.id}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 100, height: 0, marginBottom: 0 }}
                            transition={{ delay: idx * 0.03, type: 'spring', stiffness: 300, damping: 30 }}
                            className="relative group"
                          >
                            <div
                              onClick={() => handleClick(notif)}
                              className={`
                                relative flex items-start gap-3 p-3.5 rounded-2xl cursor-pointer transition-all
                                border border-transparent
                                ${!notif.is_read
                                  ? 'bg-gradient-to-r ' + config.gradient + ' border-[var(--border-color)] shadow-sm'
                                  : 'hover:bg-[var(--bg-card-hover)]'
                                }
                              `}
                            >
                              {/* Icon */}
                              <div className={`
                                flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                                ${!notif.is_read ? 'bg-[var(--bg-card)]' : 'bg-[var(--bg-card-hover)]'}
                                ${config.color}
                              `}>
                                {config.icon}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm leading-snug ${!notif.is_read ? 'font-semibold' : 'font-medium'}`}>
                                      {notif.title}
                                    </p>
                                    {notif.body && (
                                      <p className="text-xs text-muted mt-0.5 line-clamp-2">
                                        {notif.body}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-[10px] text-muted whitespace-nowrap flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {timeAgo(notif.created_at)}
                                    </span>
                                    {!notif.is_read && (
                                      <div className="w-2.5 h-2.5 rounded-full bg-familia-400 animate-pulse flex-shrink-0" />
                                    )}
                                  </div>
                                </div>

                                {/* Action hint based on type */}
                                {notif.data?.relationship_id && (
                                  <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-familia-400 font-medium">
                                    <MessageCircle className="w-3 h-3" />
                                    Tap to open chat
                                  </div>
                                )}
                                {(notif.type === 'match' || notif.type === 'match_found') && !notif.data?.relationship_id && (
                                  <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-rose-400 font-medium">
                                    <Heart className="w-3 h-3" />
                                    Tap to view matches
                                  </div>
                                )}
                              </div>

                              {/* Quick actions on hover */}
                              <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!notif.is_read && (
                                  <motion.button
                                    whileTap={{ scale: 0.8 }}
                                    onClick={(e) => { e.stopPropagation(); markNotificationRead(notif.id); }}
                                    className="p-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition"
                                    title="Mark as read"
                                  >
                                    <Check className="w-3.5 h-3.5 text-green-400" />
                                  </motion.button>
                                )}
                                <motion.button
                                  whileTap={{ scale: 0.8 }}
                                  onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                                  className="p-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-heart-500/10 transition"
                                  title="Delete"
                                >
                                  <X className="w-3.5 h-3.5 text-muted hover:text-heart-400" />
                                </motion.button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Stats footer ──────────────────────────────── */}
        {notifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center text-xs text-muted"
          >
            <div className="flex items-center justify-center gap-4">
              <span>{notifications.length} total</span>
              <span>•</span>
              <span>{unreadCount} unread</span>
              <span>•</span>
              <span>{notifications.length - unreadCount} read</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Clear All Confirmation Modal ────────────────── */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={() => setShowClearConfirm(false)}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative glass-card !p-6 max-w-sm w-full text-center"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-heart-500/10 flex items-center justify-center">
                <Trash2 className="w-7 h-7 text-heart-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">Clear All Notifications?</h3>
              <p className="text-muted text-sm mb-6">
                This will permanently delete all your notifications. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 btn-secondary py-2.5"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    clearAllNotifications();
                    setShowClearConfirm(false);
                  }}
                  className="flex-1 bg-heart-500 hover:bg-heart-600 text-white font-semibold py-2.5 rounded-xl transition"
                >
                  Clear All
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
