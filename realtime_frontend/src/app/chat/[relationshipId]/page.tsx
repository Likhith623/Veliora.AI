'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Send, Heart, Smile, Gamepad2, Trophy, Info,
  Sparkles, Flame, Gift, Loader2, X, CheckCheck, Phone, Video,
  Image as ImageIcon, Mic, MoreHorizontal, Reply, Forward, Trash2,
  BarChart3
} from 'lucide-react';
import { api } from '@/lib/api';
import { createChatWS, type ManagedWebSocket } from '@/lib/websocket';
import { useAuth } from '@/lib/AuthContext';
import { ROLE_EMOJIS, LEVEL_NAMES, type Message } from '@/types';
import toast from 'react-hot-toast';

interface ChatData {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status: string;
  level: number;
  level_label: string;
  shared_xp: number;
  created_at: string;
  // Enriched
  partner?: any;
  my_role?: string;
  partner_role?: string;
  relationship?: any;
  care_score?: number;
  bond_points?: number;
  streak_days?: number;
  messages_exchanged?: number;
  matched_at?: string;
  features_unlocked?: Record<string, boolean>;
}

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];

export default function ChatPage() {
  const params = useParams();
  const relationshipId = params.relationshipId as string;
  const { user, relationships, refreshUser, refreshXP, refreshRelationships, nicknames, setNickname } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [showCulturalNote, setShowCulturalNote] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null);
  const [showGiftXP, setShowGiftXP] = useState(false);
  const [giftAmount, setGiftAmount] = useState(50);
  const [giftMessage, setGiftMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<ManagedWebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [newNickname, setNewNickname] = useState('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ── Load chat data ──
  useEffect(() => {
    const loadChat = async () => {
      try {
        setIsLoading(true);
        const [relData, msgData] = await Promise.all([
          api.getRelationship(relationshipId),
          api.getMessages(relationshipId, 50),
        ]);
        const fullRelData = relData.relationship ? { ...relData.relationship, partner: relData.partner, partner_role: relData.partner_role } : relData;
        setChatData(fullRelData);
        const msgs = Array.isArray(msgData) ? msgData : msgData.messages || [];
        setMessages(msgs);
      } catch (err: any) {
        console.error('Failed to load chat:', err);
        toast.error(err.message || 'Failed to load chat');
      } finally {
        setIsLoading(false);
      }
    };
    if (relationshipId && user) loadChat();
  }, [relationshipId, user]);

  // ── Sync gamification stats from global state ──
  useEffect(() => {
    if (chatData && relationships.length > 0) {
      const updatedRel = relationships.find(r => r.id === relationshipId);
      if (updatedRel) {
        setChatData(prev => prev ? { ...prev, ...updatedRel } : null);
      }
    }
  }, [relationships, relationshipId]);

  // Load nickname
  useEffect(() => {
    if (chatData?.partner?.id) {
      const stored = localStorage.getItem(`nickname_${chatData.partner.id}`);
      if (stored) setNickname(chatData.partner.id, stored);
    }
  }, [chatData?.partner?.id, setNickname]);

  // ── WebSocket connection ──
  useEffect(() => {
    if (!relationshipId || !user?.id || isLoading) return;

    const ws = createChatWS(relationshipId, user.id, {
      onNewMessage: (message) => {
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
        scrollToBottom();
      },
      onTyping: () => setIsTyping(true),
      onStoppedTyping: () => setIsTyping(false),
      onReadReceipt: (messageId) => {
        setMessages(prev =>
          prev.map(m => (messageId ? (m.id === messageId ? { ...m, is_read: true } : m) : { ...m, is_read: true }))
        );
      },
      onReaction: (messageId, emoji) => {
        setMessages(prev =>
          prev.map(m => {
            if (m.id !== messageId) return m;
            const reactions = { ...(m.reactions || {}) };
            reactions[emoji] = (reactions[emoji] || 0) + 1;
            return { ...m, reactions };
          })
        );
      },
      onOpen: () => console.log('[Chat WS] Connected'),
      onClose: () => console.log('[Chat WS] Disconnected'),
    });

    wsRef.current = ws;
    return () => { ws.close(); wsRef.current = null; };
  }, [relationshipId, user?.id, isLoading]);

  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => { if (!isLoading) inputRef.current?.focus(); }, [isLoading]);

  // Send read receipt if we have unread messages from partner
  useEffect(() => {
    const partnerId = chatData?.partner?.id;
    if (messages.length > 0 && wsRef.current && partnerId) {
      const hasUnread = messages.some(m => m.sender_id === partnerId && !m.is_read);
      if (hasUnread) {
        wsRef.current.send({ type: 'read_receipt' });
        setMessages(prev => prev.map(m => m.sender_id === partnerId ? { ...m, is_read: true } : m));
      }
    }
  }, [messages, chatData?.partner?.id]);

  // ── Send typing indicator ──
  const handleInputChange = useCallback((text: string) => {
    setInput(text);
    if (text.trim() && wsRef.current) {
      wsRef.current.send({ type: 'typing' });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        wsRef.current?.send({ type: 'stopped_typing' });
      }, 2000);
    }
  }, []);

  // ── Send message ──
  const sendMessage = async () => {
    if (!input.trim() || isSending || !user) return;
    const text = input.trim();
    setInput('');
    setIsSending(true);
    wsRef.current?.send({ type: 'stopped_typing' });

    const temp: Message = {
      id: `temp-${Date.now()}`,
      relationship_id: relationshipId,
      sender_id: user.id,
      content_type: 'text',
      original_text: text,
      original_language: 'en',
      has_idiom: false,
      is_read: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, temp]);

    try {
      const res = await api.sendMessage({
        relationship_id: relationshipId,
        original_text: text,
        content_type: 'text',
      });
      const newMsg = res.message || res;
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) {
          return prev.filter(m => m.id !== temp.id);
        }
        return prev.map(m => m.id === temp.id ? newMsg : m);
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to send');
      setMessages(prev => prev.filter(m => m.id !== temp.id));
      setInput(text);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  // ── Upload media ──
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const mediaType = file.type.startsWith('image/') ? 'image' as const :
                      file.type.startsWith('video/') ? 'video' as const : 'voice' as const;

    try {
      toast.loading('Uploading...', { id: 'upload' });
      const uploadRes = await api.uploadMedia(file, relationshipId, mediaType);
      await api.sendMessage({
        relationship_id: relationshipId,
        original_text: '',
        content_type: mediaType,
        ...(mediaType === 'image' ? { image_url: uploadRes.url } :
            mediaType === 'video' ? { video_url: uploadRes.url } :
            { voice_url: uploadRes.url }),
      });
      toast.success('Sent!', { id: 'upload' });
    } catch (err: any) {
      toast.error(err.message || 'Upload failed', { id: 'upload' });
    }
  };

  // ── React to message ──
  const handleReaction = async (messageId: string, emoji: string) => {
    setShowReactions(null);
    try {
      await api.reactToMessage(messageId, emoji);
      setMessages(prev =>
        prev.map(m => {
          if (m.id !== messageId) return m;
          const reactions = { ...(m.reactions || {}) };
          reactions[emoji] = (reactions[emoji] || 0) + 1;
          return { ...m, reactions };
        })
      );
    } catch (err: any) {
      toast.error('Failed to react');
    }
  };

  // ── Delete message ──
  const handleDeleteMessage = async (messageId: string) => {
    setShowMessageMenu(null);
    try {
      await api.deleteMessage(messageId);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_deleted: true } : m));
    } catch (err: any) {
      toast.error('Failed to delete');
    }
  };

  // ── Gift XP ──
  const handleGiftXP = async () => {
    if (!giftAmount || giftAmount < 1) return;
    try {
      await api.giftXPInChat({
        relationship_id: relationshipId,
        amount: giftAmount,
        message: giftMessage || undefined,
      });
      toast.success(`🎁 Gifted ${giftAmount} XP!`);
      setShowGiftXP(false);
      setGiftAmount(50);
      setGiftMessage('');
      refreshUser();
      refreshXP();
      refreshRelationships();
    } catch (err: any) {
      toast.error(err.message || 'Failed to gift XP');
    }
  };

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

  const partner = chatData.partner || {};
  const my_role = chatData.my_role || '';
  const partner_role = chatData.partner_role || '';
  const level = chatData.level || 1;

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
                partner?.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
              }`} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span 
                  className="font-semibold text-[15px] truncate cursor-pointer hover:opacity-80 transition"
                  onClick={() => {
                    setNewNickname(nicknames[partner?.id] || partner?.display_name || '');
                    setShowNicknameModal(true);
                  }}
                  title="Click to set a custom name for this friend"
                >
                  {nicknames[partner?.id] || partner?.display_name || 'Partner'}
                </span>
                {partner?.country && <span className="text-[11px] text-muted">{partner.country}</span>}
              </div>
              <div className="text-[11px] text-muted flex items-center gap-1.5">
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${partner?.status === 'online' ? 'bg-green-400' : 'bg-gray-400'}`} />
                  {partner?.status === 'online' ? 'Online' : 'Offline'}
                </span>
                {partner_role && (<><span className="opacity-40">&middot;</span><span>Your {partner_role}</span></>)}
                <span className="opacity-40">&middot;</span>
                <span className="badge-level !text-[9px] !px-1.5 !py-0">
                  Lv.{level} {LEVEL_NAMES[level] || ''}
                </span>
              </div>
            </div>
          </div>

          {/* Call buttons (Level 3+ for audio, 4+ for video) */}
          <div className="flex items-center gap-1">
            {level >= 3 && (
              <Link href={`/calls?rel=${relationshipId}&type=audio`}>
                <motion.button className="p-2 rounded-lg hover:bg-white/5 transition text-green-400" whileTap={{ scale: 0.9 }}>
                  <Phone className="w-4.5 h-4.5" />
                </motion.button>
              </Link>
            )}
            {level >= 4 && (
              <Link href={`/calls?rel=${relationshipId}&type=video`}>
                <motion.button className="p-2 rounded-lg hover:bg-white/5 transition text-blue-400" whileTap={{ scale: 0.9 }}>
                  <Video className="w-4.5 h-4.5" />
                </motion.button>
              </Link>
            )}
            <motion.button
              className="p-2 rounded-lg hover:bg-white/5 transition text-muted"
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowInfo(!showInfo)}
            >
              {showInfo ? <X className="w-5 h-5" /> : <Info className="w-5 h-5" />}
            </motion.button>
          </div>

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
                    <div className="text-base font-bold text-familia-400">{chatData.care_score || 0}</div>
                    <div className="text-[9px] text-muted">Care</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-bond-400">{chatData.shared_xp || chatData.bond_points || 0}</div>
                    <div className="text-[9px] text-muted">XP</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-orange-400 flex items-center justify-center gap-1">
                      <Flame className="w-3.5 h-3.5" /> {chatData.streak_days || 0}
                    </div>
                    <div className="text-[9px] text-muted">Streak</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-muted">{chatData.messages_exchanged || messages.length}</div>
                    <div className="text-[9px] text-muted">Msgs</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* ── Messages ── */}
        <div className="chat-messages-area">
          {chatData.matched_at && (
            <div className="text-center py-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px] text-muted">
                <Heart className="w-3 h-3 text-heart-400" />
                Bond started {fmtDate(chatData.matched_at || chatData.created_at)}
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
            if (msg.is_deleted) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <span className="text-[11px] text-muted italic px-3 py-1 bg-[var(--bg-card)] rounded-full border border-[var(--border-color)]">
                    🚫 Message deleted
                  </span>
                </div>
              );
            }

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

                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${consecutive ? 'mt-[3px]' : 'mt-3'} group relative`}>
                  <div className="max-w-[80%]">
                    <div
                      className={`relative px-3 py-[7px] ${
                        isMe
                          ? 'message-sent rounded-2xl rounded-br-[5px]'
                          : 'message-received rounded-2xl rounded-bl-[5px]'
                      }`}
                      onDoubleClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)}
                    >
                      {/* Media content */}
                      {msg.content_type === 'image' && msg.image_url && (
                        <img src={msg.image_url} alt="Shared image" className="rounded-xl max-w-full mb-1" />
                      )}
                      {msg.content_type === 'voice' && msg.voice_url && (
                        <audio controls src={msg.voice_url} className="max-w-full mb-1" />
                      )}

                      {/* Text */}
                      {msg.original_text && (
                        <p className="text-[13.5px] leading-[1.4] pr-14">{msg.original_text}</p>
                      )}

                      {/* Translation preview */}
                      {msg.translated_text && msg.translated_text !== msg.original_text && (
                        <p className="text-[12px] leading-[1.3] text-muted mt-1 italic">{msg.translated_text}</p>
                      )}

                      <span className={`absolute bottom-[5px] right-2.5 flex items-center gap-0.5 text-[10px] leading-none ${
                        isMe ? 'text-white/35' : 'text-[var(--text-muted)]'
                      }`} style={{ opacity: 0.6 }}>
                        {fmtTime(msg.created_at)}
                        {isMe && (
                          <CheckCheck className={`w-3.5 h-3.5 -mr-0.5 ${msg.is_read ? 'text-blue-400' : ''}`} />
                        )}
                      </span>

                      {/* Message action button */}
                      <button
                        onClick={() => setShowMessageMenu(showMessageMenu === msg.id ? null : msg.id)}
                        className="absolute -top-1 right-0 opacity-0 group-hover:opacity-100 transition p-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm"
                      >
                        <MoreHorizontal className="w-3 h-3 text-muted" />
                      </button>

                      {msg.cultural_note && (
                        <button
                          onClick={() => setShowCulturalNote(showCulturalNote === msg.id ? null : msg.id)}
                          className="flex items-center gap-1 mt-1 text-[10px] text-amber-400/60 hover:text-amber-400 transition"
                        >
                          <Sparkles className="w-3 h-3" /> Culture tip
                        </button>
                      )}
                    </div>

                    {/* Reactions display */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {Object.entries(msg.reactions).map(([emoji, count]) => (
                          <span key={emoji} className="px-1.5 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px]">
                            {emoji} {count as number > 1 ? count : ''}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Reaction picker */}
                    <AnimatePresence>
                      {showReactions === msg.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8, y: 5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className={`flex gap-1 mt-1 p-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] shadow-lg w-fit ${isMe ? 'ml-auto' : ''}`}
                        >
                          {REACTION_EMOJIS.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg.id, emoji)}
                              className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-sm transition hover:scale-125"
                            >
                              {emoji}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Message context menu */}
                    <AnimatePresence>
                      {showMessageMenu === msg.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className={`flex gap-1 mt-1 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-lg w-fit ${isMe ? 'ml-auto' : ''}`}
                        >
                          <button
                            onClick={() => { setShowReactions(msg.id); setShowMessageMenu(null); }}
                            className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-amber-400 transition"
                            title="React"
                          >
                            <Smile className="w-3.5 h-3.5" />
                          </button>
                          {isMe && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Cultural note */}
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

        {/* ── Gift XP Modal ── */}
        <AnimatePresence>
          {showGiftXP && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-28 left-4 right-4 glass-card z-30 !p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Gift className="w-4 h-4 text-heart-400" /> Gift XP
                </h3>
                <button onClick={() => setShowGiftXP(false)} className="p-1 rounded hover:bg-white/5">
                  <X className="w-4 h-4 text-muted" />
                </button>
              </div>
              <div className="flex gap-2 mb-3">
                {[25, 50, 100, 200].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setGiftAmount(amt)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                      giftAmount === amt
                        ? 'bg-gradient-to-br from-familia-500 to-heart-500 text-white'
                        : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-muted hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
              <input
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                placeholder="Add a message (optional)..."
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-sm mb-3 outline-none focus:border-familia-500/40"
              />
              <button onClick={handleGiftXP} className="btn-primary w-full text-sm">
                🎁 Gift {giftAmount} XP
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Footer ── */}
        <footer className="chat-footer">
          <div className="chat-actions-bar">
            <Link href={`/contests?relationship=${relationshipId}`}>
              <button className="chat-action-pill bg-amber-500/10 text-amber-400 hover:bg-amber-500/20">
                <Trophy className="w-3 h-3" /> Challenge
              </button>
            </Link>
            <Link href={`/games?rel=${relationshipId}`}>
              <button className="chat-action-pill bg-purple-500/10 text-purple-400 hover:bg-purple-500/20">
                <Gamepad2 className="w-3 h-3" /> Game
              </button>
            </Link>
            <button
              className="chat-action-pill bg-heart-500/10 text-heart-400 hover:bg-heart-500/20"
              onClick={() => setShowGiftXP(!showGiftXP)}
            >
              <Gift className="w-3 h-3" /> Gift XP
            </button>
            {level >= 3 && (
              <Link href={`/live-games?rel=${relationshipId}`}>
                <button className="chat-action-pill bg-green-500/10 text-green-400 hover:bg-green-500/20">
                  <Gamepad2 className="w-3 h-3" /> Live Game
                </button>
              </Link>
            )}
          </div>

          <div className="chat-input-bar">
            {/* Media upload */}
            <label className="p-1.5 text-muted hover:text-[var(--text-primary)] transition cursor-pointer">
              <ImageIcon className="w-5 h-5" />
              <input
                type="file"
                accept="image/*,video/*,audio/*"
                className="hidden"
                onChange={handleMediaUpload}
              />
            </label>

            <motion.button className="p-1.5 text-muted hover:text-[var(--text-primary)] transition" whileTap={{ scale: 0.9 }}>
              <Smile className="w-5 h-5" />
            </motion.button>

            <div className="flex-1 relative">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Type a message..."
                className="chat-text-input"
                disabled={isSending}
              />
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

      {/* Nickname Modal */}
      {showNicknameModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm border border-themed shadow-2xl relative">
            <button onClick={() => setShowNicknameModal(false)} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-5 h-5 text-muted" />
            </button>
            <h2 className="text-xl font-bold mb-2">Edit Contact Name</h2>
            <p className="text-[11px] text-muted mb-4">This name will only be visible to you on this device, just like saving a contact in your phone.</p>
            <input 
              type="text" 
              className="input-familia w-full mb-4" 
              placeholder={partner?.display_name || "Enter name"}
              value={newNickname}
              onChange={e => setNewNickname(e.target.value)}
              autoFocus
            />
            <div className="flex items-center gap-2 mt-4">
              <button className="flex-1 py-2 rounded-xl bg-[var(--bg-card-hover)] border border-themed text-sm font-semibold transition hover:bg-white/5" onClick={() => setShowNicknameModal(false)}>Cancel</button>
              <button 
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-familia-500 to-bond-500 text-white text-sm font-semibold transition hover:shadow-lg" 
                onClick={() => {
                  if (partner?.id) {
                    setNickname(partner.id, newNickname);
                  }
                  setShowNicknameModal(false);
                  toast.success("Contact name updated!");
                }}
              >
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
