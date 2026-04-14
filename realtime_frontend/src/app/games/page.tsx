'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  ArrowLeft, Gamepad2, Users, Loader2, Sparkles, Check
} from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface ActiveFriend {
  friend_id: string;
  display_name: string;
  avatar_url?: string;
  relationship_id: string;
}

export default function GamesPage() {
  const [activeFriends, setActiveFriends] = useState<ActiveFriend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const res = await api.getActiveFriends();
        setActiveFriends(res.active_friends || []);
      } catch (err) {
        console.error('Failed to load active friends', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFriends();
    
    // Poll for active friends every 10 seconds
    const interval = setInterval(fetchFriends, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleInvite = async (friendId: string) => {
    setInvitingId(friendId);
    try {
      const res = await api.sendGameInvite(friendId, 'bonding_synchrony');
      if (res.status === 'ok') {
        toast.loading("Invite sent! Waiting for them to accept...", { duration: 4000 });
        // The GlobalPresence provider handles auto-routing when they accept!
      } else {
        toast.error("User is offline or unreachable.");
        setInvitingId(null);
      }
    } catch (err) {
      toast.error("Failed to send invite.");
      setInvitingId(null);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 glass border-b border-[var(--border-color)] z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard">
            <motion.button className="p-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition" whileTap={{ scale: 0.95 }}>
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          </Link>
          <div>
            <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
              Bonding Games <Sparkles className="w-4 h-4 text-familia-400" />
            </h1>
            <p className="text-xs text-muted">Play live synchronously with active friends</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="glass-card p-6 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-familia-500/10 blur-[80px] rounded-full" />
          <h2 className="text-xl font-bold mb-2 text-[var(--text-primary)]">Who is online?</h2>
          <p className="text-sm text-subtle font-medium max-w-md">
            Bonding games require both you and your partner to be online. Select an active friend below to send a live invite!
          </p>
        </div>

        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-familia-400" />
          Active Friends ({activeFriends.length})
        </h3>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-familia-400" />
            <p>Scanning global network...</p>
          </div>
        ) : activeFriends.length === 0 ? (
          <div className="glass-card p-8 text-center flex flex-col items-center justify-center border-dashed">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-card-hover)] flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-muted" />
            </div>
            <h3 className="font-bold text-lg mb-2">No friends online right now</h3>
            <p className="text-sm text-subtle max-w-xs mx-auto">
              Check back later when your connections are active to play live synchronous games!
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <AnimatePresence>
              {activeFriends.map((f, i) => (
                <motion.div
                  key={f.friend_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-4 flex items-center justify-between hover:ring-1 ring-familia-500/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {f.avatar_url ? (
                        <img src={f.avatar_url} alt="avatar" className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[var(--border-color)] to-[var(--bg-card-hover)] flex items-center justify-center">
                          <Users className="w-5 h-5 text-muted" />
                        </div>
                      )}
                      {/* Active green dot */}
                      <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 ring-2 ring-[var(--bg-primary)] shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                    </div>
                    <div>
                      <div className="font-bold">{f.display_name}</div>
                      <div className="text-xs text-green-400 font-medium">Online Now</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleInvite(f.friend_id)}
                    disabled={invitingId === f.friend_id}
                    className="btn-primary py-2 px-4 shadow-lg shadow-familia-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                  >
                    {invitingId === f.friend_id ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Inviting...</>
                    ) : (
                      <><Gamepad2 className="w-4 h-4" /> Play</>
                    )}
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
