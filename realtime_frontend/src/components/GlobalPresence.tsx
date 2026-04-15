'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { createPresenceWS, ManagedWebSocket } from '@/lib/websocket';
import { Gamepad2, X, Check, PhoneIncoming } from 'lucide-react';
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

  const [callAlert, setCallAlert] = useState<{
    caller_id: string;
    caller_name: string;
    call_type: string;
    relationship_id: string;
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
          if (data.game_type === 'bonding_synchrony') {
            router.push(`/games/live-bond/${data.session_id}`);
          } else {
            router.push(`/live-games?session=${data.session_id}`);
          }
        } else {
          toast.error("Invite was declined.");
        }
      },
      onIncomingCall: (data) => {
        // If already on the calls page with that relationship, ignore the global alert
        if (window.location.pathname.includes('/calls') && window.location.search.includes(data.relationship_id)) {
          return;
        }
        setCallAlert(data);
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
      session_id: invite.session_id,
      game_type: invite.game_type
    });

    if (accept) {
      if (invite.game_type === 'bonding_synchrony') {
        router.push(`/games/live-bond/${invite.session_id}`);
      } else {
        router.push(`/live-games?session=${invite.session_id}`);
      }
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

      {callAlert && (
        <motion.div 
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-sm pointer-events-auto"
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="glass-card shadow-[0_10px_40px_-10px_rgba(74,222,128,0.3)] ring-1 ring-green-500/30 overflow-hidden relative p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-emerald-500/10 z-0" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/20 blur-[50px] rounded-full" />
            
            <div className="relative z-10 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-green-500 to-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-green-500/20">
                  <PhoneIncoming className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">
                    {callAlert.caller_name} <span className="font-normal text-muted text-xs">is calling</span>
                  </h4>
                  <p className="text-xs text-green-400 font-medium capitalize">{callAlert.call_type} call</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <button 
                  onClick={() => setCallAlert(null)}
                  className="flex-1 py-2 px-3 rounded-xl bg-[var(--bg-card-hover)] text-xs font-semibold hover:bg-rose-500/10 hover:text-rose-400 transition flex items-center justify-center gap-1.5 ring-1 ring-[var(--border-color)]"
                >
                  <X className="w-3.5 h-3.5" /> Ignore
                </button>
                <button 
                  onClick={() => {
                    router.push(`/calls?rel=${callAlert.relationship_id}&type=${callAlert.call_type}&incoming=true`);
                    setCallAlert(null);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-semibold hover:shadow-[0_0_20px_rgba(74,222,128,0.4)] transition flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Answer
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

  );
}
