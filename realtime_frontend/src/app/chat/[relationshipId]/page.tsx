'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Send, Heart, Smile, Gamepad2, Trophy, Info,
  Sparkles, Flame, Gift, Loader2, X, CheckCheck
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { ROLE_EMOJIS, LEVEL_NAMES, LEVEL_FEATURES, Message, Relationship, Profile } from '@/types';
import toast from 'react-hot-toast';

interface ChatData {
  relationship: Relationship;
  partner: Profile;
  my_role: string;
  partner_role: string;
  features_unlocked: Record<string, boolean>;
}

export default function ChatPage() {
  const params = useParams();
  const relationshipId = params.relationshipId as string;
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [showCulturalNote, setShowCulturalNote] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const loadChat = async () => {
      try {
        setIsLoading(true);
        const [relData, msgData] = await Promise.all([
          api.getRelationship(relationshipId),
          api.getMessages(relationshipId, 50)
        ]);
        setChatData(relData);
        setMessages(msgData.messages || []);
      } catch (err: any) {
        console.error('Failed to load chat:', err);
        toast.error(err.message || 'Failed to load chat');
      } finally {
        setIsLoading(false);
      }
    };
    if (relationshipId && user) loadChat();
  }, [relationshipId, user]);

  useEffect(() => {
    if (!relationshipId || !user || isLoading) return;
    const poll = async () => {
      try {
        const msgData = await api.getMessages(relationshipId, 50);
        const fresh = msgData.messages || [];
        setMessages(prev => {
          if (fresh.length !== prev.length ||
              (fresh.length > 0 && prev.length > 0 &&
               fresh[fresh.length - 1]?.id !== prev[prev.length - 1]?.id)) {
            return fresh;
          }
          return prev;
        });
      } catch { /* silent */ }
    };
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [relationshipId, user, isLoading]);

  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => { if (!isLoading) inputRef.current?.focus(); }, [isLoading]);

  // (translation feature removed from chat page)

  const sendMessage = async () => {
    if (!input.trim() || isSending || !user) return;
    const text = input.trim();
    setInput('');
    setIsSending(true);

    const temp: Message = {
      id: `temp-${Date.now()}`,
      relationship_id: relationshipId,
      sender_id: user.id,
      content_type: 'text',
      original_text: text,
      original_language: 'en',
      has_idiom: false,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, temp]);

    try {
      const res = await api.sendMessage({
        relationship_id: relationshipId,
        original_text: text,
        content_type: 'text',
      });
      setMessages(prev => prev.map(m => m.id === temp.id ? res.message : m));
    } catch (err: any) {
      toast.error(err.message || 'Failed to send');
      setMessages(prev => prev.filter(m => m.id !== temp.id));
      setInput(text);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  // (translation functions removed)

  const fmtTime = (s: string) => new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (s: string) => {
    const d = new Date(s), now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="chat-page-container">
        <div className="chat-wrapper items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-familia-400 mb-3" />
            <p className="text-muted text-sm">Loading conversation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!chatData) {
    return (
      <div className="chat-page-container">
        <div className="chat-wrapper items-center justify-center px-4">
          <div className="text-center glass-card max-w-sm p-6">
            <Heart className="w-10 h-10 mx-auto mb-3 text-muted opacity-30" />
            <h2 className="text-lg font-bold mb-1">Not Found</h2>
            <p className="text-muted text-sm mb-4">This conversation doesn&apos;t exist.</p>
            <Link href="/chat"><button className="btn-primary text-sm">Back</button></Link>
          </div>
        </div>
      </div>
    );
  }

  const { relationship, partner, my_role, partner_role } = chatData;

  const isConsecutive = (i: number) => {
    if (i === 0) return false;
    return messages[i].sender_id === messages[i - 1].sender_id;
  };

  return (
    <div className="chat-page-container">
      <div className="chat-wrapper">

        {/* ── Header ── */}
        <header className="chat-header">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Link href="/chat">
              <motion.button className="p-1.5 -ml-1 rounded-lg hover:bg-white/5 transition" whileTap={{ scale: 0.9 }}>
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
            </Link>

            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-familia-500 to-bond-500 flex items-center justify-center text-lg shadow-md">
                {ROLE_EMOJIS[partner_role] || '\u{1F91D}'}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--bg-primary)] ${
                partner?.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
              }`} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[15px] truncate">{partner?.display_name || 'Partner'}</span>
                {partner?.country && <span className="text-[11px] text-muted">{partner.country}</span>}
              </div>
              <div className="text-[11px] text-muted flex items-center gap-1.5">
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${partner?.status === 'active' ? 'bg-green-400' : 'bg-gray-400'}`} />
                  {partner?.status === 'active' ? 'Online' : 'Offline'}
                </span>
                <span className="opacity-40">&middot;</span>
                <span>Your {partner_role}</span>
                <span className="opacity-40">&middot;</span>
                <span className="badge-level !text-[9px] !px-1.5 !py-0">
                  Lv.{relationship.level} {LEVEL_NAMES[relationship.level]}
                </span>
              </div>
            </div>
          </div>

          <motion.button
            className="p-2 rounded-lg hover:bg-white/5 transition text-muted"
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowInfo(!showInfo)}
          >
            {showInfo ? <X className="w-5 h-5" /> : <Info className="w-5 h-5" />}
          </motion.button>

          <AnimatePresence>
            {showInfo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="absolute left-0 right-0 top-full overflow-hidden border-t border-[var(--border-color)] bg-[var(--bg-card)] backdrop-blur-xl z-30"
              >
                <div className="grid grid-cols-4 gap-3 px-4 py-3 text-center">
                  <div>
                    <div className="text-base font-bold text-familia-400">{relationship.care_score || 0}</div>
                    <div className="text-[9px] text-muted">Care</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-bond-400">{relationship.bond_points || 0}</div>
                    <div className="text-[9px] text-muted">Bond</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-orange-400 flex items-center justify-center gap-1">
                      <Flame className="w-3.5 h-3.5" /> {relationship.streak_days || 0}
                    </div>
                    <div className="text-[9px] text-muted">Streak</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-muted">{relationship.messages_exchanged || messages.length}</div>
                    <div className="text-[9px] text-muted">Msgs</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* ── Messages ── */}
        <div className="chat-messages-area">
          {relationship.matched_at && (
            <div className="text-center py-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px] text-muted">
                <Heart className="w-3 h-3 text-heart-400" />
                Bond started {fmtDate(relationship.matched_at)} &middot; {ROLE_EMOJIS[my_role]} {my_role} & {ROLE_EMOJIS[partner_role]} {partner_role}
              </span>
            </div>
          )}

          {messages.length === 0 && (
            <div className="text-center py-12 px-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-familia-500/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-familia-400 opacity-60" />
              </div>
              <h3 className="text-base font-semibold mb-1">Start chatting!</h3>
              <p className="text-muted text-xs">Say hello to your new family member</p>
            </div>
          )}

          {messages.map((msg, i) => {
            const isMe = msg.sender_id === user?.id;
            const consecutive = isConsecutive(i);
            const prevMsg = i > 0 ? messages[i - 1] : null;
            const showDate = !prevMsg || fmtDate(msg.created_at) !== fmtDate(prevMsg.created_at);

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center py-2 mt-1">
                    <span className="px-3 py-0.5 rounded-full bg-[var(--bg-card)] text-[10px] text-muted border border-[var(--border-color)]">
                      {fmtDate(msg.created_at)}
                    </span>
                  </div>
                )}

                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${consecutive ? 'mt-[3px]' : 'mt-3'}`}>
                  <div className="max-w-[80%]">
                    <div className={`relative px-3 py-[7px] ${
                      isMe
                        ? 'message-sent rounded-2xl rounded-br-[5px]'
                        : 'message-received rounded-2xl rounded-bl-[5px]'
                    }`}>
                      <p className="text-[13.5px] leading-[1.4] pr-14">{msg.original_text}</p>

                      <span className={`absolute bottom-[5px] right-2.5 flex items-center gap-0.5 text-[10px] leading-none ${
                        isMe ? 'text-white/35' : 'text-[var(--text-muted)]'
                      }`} style={{ opacity: 0.6 }}>
                        {fmtTime(msg.created_at)}
                        {isMe && (
                          <CheckCheck className={`w-3.5 h-3.5 -mr-0.5 ${msg.is_read ? 'text-blue-400' : ''}`} />
                        )}
                      </span>

                                {/* translation removed from message UI */}

                      {msg.cultural_note && (
                        <button
                          onClick={() => setShowCulturalNote(showCulturalNote === msg.id ? null : msg.id)}
                          className="flex items-center gap-1 mt-1 text-[10px] text-amber-400/60 hover:text-amber-400 transition"
                        >
                          <Sparkles className="w-3 h-3" /> Culture tip
                        </button>
                      )}
                    </div>

                    <AnimatePresence>
                      {showCulturalNote === msg.id && msg.cultural_note && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="mt-1 mx-0.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] leading-relaxed"
                        >
                          <div className="flex items-center gap-1 font-semibold text-amber-300 mb-0.5 text-[10px]">
                            <Sparkles className="w-3 h-3" /> Cultural Note
                          </div>
                          <span className="text-amber-200/70">{msg.cultural_note}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {msg.has_idiom && msg.idiom_explanation && (
                      <div className="mt-1 mx-0.5 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300">
                        {msg.idiom_explanation}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-end gap-1.5 mt-2"
              >
                <div className="typing-indicator !py-2 !px-3">
                  <span /><span /><span />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} className="h-1" />
        </div>

        {/* ── Footer ── */}
        <footer className="chat-footer">
          <div className="chat-actions-bar">
            <Link href={`/contests?relationship=${relationshipId}`}>
              <button className="chat-action-pill bg-amber-500/10 text-amber-400 hover:bg-amber-500/20">
                <Trophy className="w-3 h-3" /> Challenge
              </button>
            </Link>
            <Link href="/games">
              <button className="chat-action-pill bg-purple-500/10 text-purple-400 hover:bg-purple-500/20">
                <Gamepad2 className="w-3 h-3" /> Game
              </button>
            </Link>
            <button
              className="chat-action-pill bg-heart-500/10 text-heart-400 hover:bg-heart-500/20"
              onClick={() => toast('Coming soon!', { icon: '\u{1F381}' })}
            >
              <Gift className="w-3 h-3" /> Gift
            </button>
            {/* translation feature removed from actions */}
          </div>

          <div className="chat-input-bar">
            <motion.button className="p-1.5 text-muted hover:text-[var(--text-primary)] transition" whileTap={{ scale: 0.9 }}>
              <Smile className="w-5 h-5" />
            </motion.button>

            <div className="flex-1 relative">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Type a message..."
                className="chat-text-input"
                disabled={isSending}
              />
              {/* translation indicator removed */}
            </div>

            <motion.button
              onClick={sendMessage}
              disabled={!input.trim() || isSending}
              className={`p-2.5 rounded-full transition-all ${
                input.trim() && !isSending
                  ? 'bg-gradient-to-br from-familia-500 to-heart-500 text-white shadow-lg shadow-familia-500/30'
                  : 'bg-white/5 text-muted'
              }`}
              whileTap={{ scale: 0.85 }}
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </motion.button>
          </div>
        </footer>
      </div>
    </div>
  );
}
