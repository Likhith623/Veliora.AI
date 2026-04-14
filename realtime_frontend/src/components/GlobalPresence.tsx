'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { createPresenceWS, ManagedWebSocket } from '@/lib/websocket';
import { Gamepad2, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GlobalPresence() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [ws, setWs] = useState<ManagedWebSocket | null>(null);
  const [invite, setInvite] = useState<{
    sender_id: string;
    sender_name: string;
    game_type: string;
    session_id: string;
  } | null>(null);

  useEffect(() => {
    if (!user?.id) {
      if (ws) {
        ws.close();
        setWs(null);
      }
      return;
    }

    const socket = createPresenceWS(user.id, {
      onGameInvite: (data) => {
        setInvite(data);
      },
      onGameInviteFailed: (error) => {
        toast.error(error);
      },
      onInviteResponse: (data) => {
        if (data.accept) {
          toast.success("Game accepted! Connecting...");
          router.push(`/games/live-bond/${data.session_id}`);
        } else {
          toast.error("Invite was declined.");
        }
      }
    });

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [user?.id, router]);

  const respondToInvite = (accept: boolean) => {
    if (!ws || !invite) return;
    
    ws.send({
      type: "respond_invite",
      inviter_id: invite.sender_id,
      accept,
      session_id: invite.session_id
    });

    if (accept) {
      router.push(`/games/live-bond/${invite.session_id}`);
    }
    setInvite(null);
  };

  return (
    <AnimatePresence>
      {invite && (
        <motion.div 
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-sm pointer-events-auto"
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="glass-card shadow-[0_10px_40px_-10px_rgba(168,85,247,0.3)] ring-1 ring-familia-500/30 overflow-hidden relative p-4">
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-familia-500/10 via-transparent to-bond-500/10 z-0" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-familia-500/20 blur-[50px] rounded-full" />
            
            <div className="relative z-10 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-familia-500 to-bond-500 flex items-center justify-center shrink-0 shadow-lg shadow-familia-500/20">
                  <Gamepad2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">
                    {invite.sender_name} <span className="font-normal text-muted text-xs">wants to play</span>
                  </h4>
                  <p className="text-xs text-familia-400 font-medium">Bonding Synchrony</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <button 
                  onClick={() => respondToInvite(false)}
                  className="flex-1 py-2 px-3 rounded-xl bg-[var(--bg-card-hover)] text-xs font-semibold hover:bg-rose-500/10 hover:text-rose-400 transition flex items-center justify-center gap-1.5 ring-1 ring-[var(--border-color)]"
                >
                  <X className="w-3.5 h-3.5" /> Decline
                </button>
                <button 
                  onClick={() => respondToInvite(true)}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-familia-500 to-bond-500 text-white text-xs font-semibold hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Join Game
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
