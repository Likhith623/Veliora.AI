'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  ArrowLeft, Search, UserPlus, Users, UserCheck, UserX, Heart,
  MessageCircle, Loader2, Clock, ChevronRight, XCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import toast from 'react-hot-toast';

type FriendsTab = 'list' | 'requests' | 'search';

interface Friend {
  id: string;
  user_id?: string;
  display_name: string;
  username?: string;
  country?: string;
  status?: string;
  avatar_url?: string;
  relationship_id?: string;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  sender_display_name?: string;
  sender_username?: string;
  sender_country?: string;
  created_at: string;
}

export default function FriendsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<FriendsTab>('list');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Load friends + requests
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [friendsRes, reqRes] = await Promise.all([
          api.getFriends().catch(() => ({ friends: [] })),
          api.getPendingRequests().catch(() => ({ requests: [] })),
        ]);
        const rawFriends = Array.isArray(friendsRes) ? friendsRes : friendsRes.friends || [];
        const mappedFriends = rawFriends.map((f: any) => ({
          id: f.profile?.id || f.relationship_id || f.id || Math.random().toString(),
          user_id: f.profile?.id,
          display_name: f.profile?.display_name || f.display_name || 'Unknown',
          username: f.profile?.username || f.username,
          country: f.profile?.country || f.country,
          status: f.profile?.status || f.status,
          avatar_url: f.profile?.profile_photo_url || f.avatar_url,
          relationship_id: f.relationship_id || f.id
        }));
        setFriends(mappedFriends);
        setRequests(Array.isArray(reqRes) ? reqRes : reqRes.requests || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await api.searchFriends(searchQuery.trim());
      setSearchResults(Array.isArray(res) ? res : res.results || res.users || []);
    } catch (e: any) {
      toast.error(e.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const sendRequest = async (targetId: string) => {
    try {
      await api.sendFriendRequest(targetId);
      toast.success('Friend request sent!');
      setSearchResults(prev => prev.filter(u => u.id !== targetId && u.user_id !== targetId));
    } catch (e: any) {
      toast.error(e.message || 'Failed to send request');
    }
  };

  const respondRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      await api.respondToFriendRequest(requestId, action);
      toast.success(action === 'accept' ? 'Friend added!' : 'Request declined');
      setRequests(prev => prev.filter(r => r.id !== requestId));
      if (action === 'accept') {
        // Refresh friends list
        const res = await api.getFriends().catch(() => ({ friends: [] }));
        const rawFriends = Array.isArray(res) ? res : res.friends || [];
        const mappedFriends = rawFriends.map((f: any) => ({
          id: f.profile?.id || f.relationship_id || f.id || Math.random().toString(),
          user_id: f.profile?.id,
          display_name: f.profile?.display_name || f.display_name || 'Unknown',
          username: f.profile?.username || f.username,
          country: f.profile?.country || f.country,
          status: f.profile?.status || f.status,
          avatar_url: f.profile?.profile_photo_url || f.avatar_url,
          relationship_id: f.relationship_id || f.id
        }));
        setFriends(mappedFriends);
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to respond');
    }
  };

  const removeFriend = async (relId: string) => {
    try {
      await api.removeFriend(relId);
      toast.success('Friend removed');
      setFriends(prev => prev.filter(f => f.relationship_id !== relId && f.id !== relId));
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass-card max-w-md">
          <Users className="w-12 h-12 mx-auto mb-4 text-blue-400" />
          <h2 className="text-xl font-bold mb-2">Friends</h2>
          <p className="text-muted mb-6">Please log in</p>
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
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20">
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            Friends
          </h1>
          {requests.length > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="ml-auto bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
            >
              {requests.length}
            </motion.div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tab bar */}
        <div className="flex gap-2 mb-6">
          {([
            { id: 'list' as FriendsTab, label: 'My Friends', icon: <Users className="w-3.5 h-3.5" />, count: friends.length },
            { id: 'requests' as FriendsTab, label: 'Requests', icon: <UserPlus className="w-3.5 h-3.5" />, count: requests.length },
            { id: 'search' as FriendsTab, label: 'Find People', icon: <Search className="w-3.5 h-3.5" /> },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium transition whitespace-nowrap ${
                tab === t.id
                  ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-400 border border-blue-500/20'
                  : 'bg-[var(--bg-card)] text-muted border border-themed hover:text-[var(--text-primary)]'
              }`}
            >
              {t.icon} {t.label}
              {'count' in t && t.count! > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  t.id === 'requests' && t.count! > 0 ? 'bg-red-500/20 text-red-400' : 'bg-[var(--bg-card-hover)] text-subtle'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── Friends List ── */}
          {tab === 'list' && (
            <motion.div key="list" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {isLoading ? (
                <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto" /></div>
              ) : friends.length === 0 ? (
                <div className="text-center py-16 glass-card">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted opacity-20" />
                  <h3 className="font-bold text-lg mb-2">No friends yet</h3>
                  <p className="text-muted text-sm mb-4">Search for people to connect with!</p>
                  <button onClick={() => setTab('search')} className="btn-primary text-sm">
                    <Search className="w-4 h-4 mr-1 inline" /> Find People
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((f, i) => (
                    <motion.div
                      key={f.id}
                      className="flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-card)] border border-themed hover:border-blue-500/20 transition group"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center text-lg font-bold text-blue-400 border border-blue-500/20 shrink-0">
                        {f.display_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{f.display_name}</p>
                        <p className="text-xs text-muted flex items-center gap-1">
                          {f.country && <span>{f.country}</span>}
                          {f.status && (
                            <span className={`w-1.5 h-1.5 rounded-full ml-1 ${
                              f.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                            }`} />
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                        <Link href={`/chat/${f.relationship_id || f.id}`}>
                          <button className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-400 transition" title="Chat">
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => removeFriend(f.relationship_id || f.id)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition"
                          title="Remove"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Friend Requests ── */}
          {tab === 'requests' && (
            <motion.div key="requests" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {requests.length === 0 ? (
                <div className="text-center py-16 glass-card">
                  <Heart className="w-12 h-12 mx-auto mb-4 text-muted opacity-20" />
                  <h3 className="font-bold text-lg mb-2">No pending requests</h3>
                  <p className="text-muted text-sm">When someone sends you a request, it will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((req, i) => (
                    <motion.div
                      key={req.id}
                      className="glass-card flex items-center gap-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-lg font-bold text-purple-400 border border-purple-500/20 shrink-0">
                        {req.sender_display_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{req.sender_display_name || req.sender_username || 'Unknown'}</p>
                        <p className="text-xs text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(req.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button
                          onClick={() => respondRequest(req.id, 'accept')}
                          className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-medium hover:bg-green-500/20 transition"
                          whileTap={{ scale: 0.95 }}
                        >
                          <UserCheck className="w-3.5 h-3.5 inline mr-1" /> Accept
                        </motion.button>
                        <motion.button
                          onClick={() => respondRequest(req.id, 'reject')}
                          className="p-1.5 rounded-lg text-red-400 border border-red-500/20 hover:bg-red-500/10 transition"
                          whileTap={{ scale: 0.95 }}
                        >
                          <XCircle className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Search ── */}
          {tab === 'search' && (
            <motion.div key="search" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="glass-card mb-6">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Search by name or username..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-themed text-sm outline-none focus:border-blue-500/50 transition"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="btn-primary px-5 flex items-center gap-1.5"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Search
                  </button>
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((person, i) => (
                    <motion.div
                      key={person.id || person.user_id}
                      className="flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-card)] border border-themed hover:border-blue-500/20 transition"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center text-lg font-bold text-blue-400 border border-blue-500/20 shrink-0">
                        {person.display_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{person.display_name}</p>
                        {person.username && <p className="text-xs text-muted">@{person.username}</p>}
                      </div>
                      <motion.button
                        onClick={() => sendRequest(person.user_id || person.id)}
                        className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium hover:bg-blue-500/20 transition flex items-center gap-1"
                        whileTap={{ scale: 0.95 }}
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Add
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              )}

              {searchResults.length === 0 && searchQuery && !isSearching && (
                <div className="text-center py-12">
                  <Search className="w-8 h-8 mx-auto mb-2 text-muted opacity-20" />
                  <p className="text-muted text-sm">No results found</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
