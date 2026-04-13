'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ArrowLeft, MessageCircle, Search, Flame, Clock } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { ROLE_EMOJIS, LEVEL_NAMES } from '@/types';

export default function ChatListPage() {
  const { user, relationships, refreshRelationships } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        await refreshRelationships();
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    if (user?.id) load();
    else setIsLoading(false);
  }, [user?.id]);

  const filteredRelationships = relationships.filter(rel => 
    rel.partner?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rel.partner_role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass-card max-w-md">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-familia-400" />
          <h2 className="text-xl font-bold mb-2">Start Chatting</h2>
          <p className="text-muted mb-6">Please log in to see your conversations</p>
          <Link href="/login"><button className="btn-primary w-full">Log In</button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 glass border-b border-themed">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard">
            <motion.button className="p-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition" whileTap={{ scale: 0.95 }}>
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          </Link>
          <h1 className="font-bold text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-familia-400" />
            Conversations
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-familia pl-12 w-full"
          />
        </div>

        {/* Conversations List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[var(--bg-card-hover)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[var(--bg-card-hover)] rounded w-1/3" />
                    <div className="h-3 bg-[var(--bg-card-hover)] rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredRelationships.length === 0 ? (
          <motion.div 
            className="glass-card text-center py-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted opacity-30" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </h3>
            <p className="text-muted mb-6">
              {searchQuery 
                ? 'Try a different search term' 
                : 'Find your first match to start chatting!'}
            </p>
            {!searchQuery && (
              <Link href="/matching">
                <button className="btn-primary">Find Your Match</button>
              </Link>
            )}
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filteredRelationships.map((rel, i) => (
              <motion.div
                key={rel.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/chat/${rel.id}`}>
                  <div className="glass-card card-hover cursor-pointer !p-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-familia-500 to-bond-500 flex items-center justify-center text-2xl">
                          {ROLE_EMOJIS[rel.partner_role] || '🤝'}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[var(--bg-primary)] ${
                          rel.partner?.status === 'active' ? 'bg-green-500' : 
                          rel.partner?.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'
                        }`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold truncate">{rel.partner?.display_name || 'Partner'}</span>
                            {rel.partner?.is_verified && (
                              <span className="text-green-500 text-sm">✓</span>
                            )}
                          </div>
                          <span className="text-xs text-muted flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(rel.last_interaction_at)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted truncate flex items-center gap-2">
                            <span>Your {rel.partner_role}</span>
                            <span>•</span>
                            <span>{rel.partner?.country}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {rel.streak_days > 0 && (
                              <span className="text-xs flex items-center gap-1 text-orange-400">
                                <Flame className="w-3 h-3" />
                                {rel.streak_days}
                              </span>
                            )}
                            <span className="badge-level text-[10px]">
                              Lv.{rel.level}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
