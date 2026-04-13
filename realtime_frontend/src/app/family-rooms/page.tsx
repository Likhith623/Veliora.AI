'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Users, Globe, Heart, Plus, MessageCircle, Loader2,
  Sparkles, Crown, Send
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import toast from 'react-hot-toast';

interface FamilyRoom {
  id: string;
  room_name: string;
  description: string;
  room_type: string;
  max_members: number;
  created_by: string;
  created_at: string;
  my_role?: string;
  is_moderator?: boolean;
  members?: any[];
  member_count?: number;
}

interface RoomMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content_type: string;
  original_text: string;
  original_language: string;
  translations: Record<string, string>;
  created_at: string;
  profiles?: {
    display_name: string;
    avatar_config: any;
    country: string;
  };
}

type RoomView = 'list' | 'chat' | 'create';

const ROOM_THEMES: Record<string, { icon: string; color: string }> = {
  cooking: { icon: '🍳', color: 'from-orange-500/20 to-red-500/20' },
  language: { icon: '📚', color: 'from-blue-500/20 to-purple-500/20' },
  music: { icon: '🎵', color: 'from-pink-500/20 to-purple-500/20' },
  stories: { icon: '📖', color: 'from-amber-500/20 to-yellow-500/20' },
  general: { icon: '💬', color: 'from-familia-500/20 to-bond-500/20' },
};

export default function FamilyRoomsPage() {
  const { user } = useAuth();
  const [view, setView] = useState<RoomView>('list');
  const [rooms, setRooms] = useState<FamilyRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<FamilyRoom | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomType, setNewRoomType] = useState('general');
  const [newRoomMaxMembers, setNewRoomMaxMembers] = useState(8);
  // Join codes UI
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoiningCode, setIsJoiningCode] = useState(false);
  const [showCodesModal, setShowCodesModal] = useState(false);
  const [roomCodes, setRoomCodes] = useState<any[]>([]);
  const [isCreatingCode, setIsCreatingCode] = useState(false);
  const [newCodeMaxUses, setNewCodeMaxUses] = useState<number | null>(null);
  const [newCodeExpiresAt, setNewCodeExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    const loadRooms = async () => {
      try {
        setIsLoading(true);
        const data = await api.getRooms();
        setRooms(data.rooms || []);
      } catch (err: any) {
        console.error('Failed to load rooms:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadRooms();
  }, []);

  const joinWithCode = async (code: string) => {
    if (!code.trim()) return;
    setIsJoiningCode(true);
    try {
      const resp = await api.joinWithCode(code.trim());
      toast.success('Joined room successfully');
      // Refresh rooms list
      const data = await api.getRooms();
      setRooms(data.rooms || []);
      setJoinCodeInput('');
    } catch (err: any) {
      console.error('Failed to join with code:', err);
      toast.error(err.message || 'Failed to join with code');
    } finally {
      setIsJoiningCode(false);
    }
  };

  const openCodesModal = async (room: FamilyRoom) => {
    setSelectedRoom(room);
    setShowCodesModal(true);
    try {
      const res = await api.listJoinCodes(room.id);
      setRoomCodes(res.codes || []);
    } catch (err: any) {
      console.error('Failed to load join codes:', err);
      toast.error(err.message || 'Failed to load join codes');
    }
  };

  const createCode = async () => {
    if (!selectedRoom) return;
    setIsCreatingCode(true);
    try {
      const payload: any = {};
      if (newCodeMaxUses) payload.max_uses = newCodeMaxUses;
      if (newCodeExpiresAt) payload.expires_at = newCodeExpiresAt;
      const res = await api.createJoinCode(selectedRoom.id, payload);
      toast.success('Join code created');
      setRoomCodes(prev => [res.join_code, ...prev]);
      setNewCodeMaxUses(null);
      setNewCodeExpiresAt(null);
    } catch (err: any) {
      console.error('Failed to create join code:', err);
      toast.error(err.message || 'Failed to create join code');
    } finally {
      setIsCreatingCode(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (e) {
      toast.error('Copy failed');
    }
  };

  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedRoom) return;
      try {
        const data = await api.getRoomMessages(selectedRoom.id);
        setMessages(data.messages || []);
      } catch (err: any) {
        console.error('Failed to load messages:', err);
      }
    };
    if (view === 'chat' && selectedRoom) {
      loadMessages();
    }
  }, [view, selectedRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createRoom = async () => {
    if (!newRoomName.trim()) {
      toast.error('Please enter a room name');
      return;
    }
    
    setIsCreating(true);
    try {
      const result = await api.createRoom({
        room_name: newRoomName.trim(),
        description: newRoomDesc.trim(),
        room_type: newRoomType,
        max_members: newRoomMaxMembers,
      });
      
      toast.success('Room created successfully!');
      setRooms(prev => [...prev, { ...result.room, my_role: 'mother', is_moderator: true, member_count: 1 }]);
      setNewRoomName('');
      setNewRoomDesc('');
      setNewRoomType('general');
      setView('list');
    } catch (err: any) {
      console.error('Failed to create room:', err);
      toast.error(err.message || 'Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  const sendMessage = async () => {
    if (!msgInput.trim() || !selectedRoom || isSending) return;
    
    const messageText = msgInput.trim();
    setMsgInput('');
    setIsSending(true);
    
    const optimisticMsg: RoomMessage = {
      id: `temp-${Date.now()}`,
      room_id: selectedRoom.id,
      sender_id: user?.id || '',
      content_type: 'text',
      original_text: messageText,
      original_language: 'en',
      translations: { en: messageText },
      created_at: new Date().toISOString(),
      profiles: {
        display_name: user?.display_name || 'You',
        avatar_config: user?.avatar_config,
        country: user?.country || '',
      },
    };
    setMessages(prev => [...prev, optimisticMsg]);
    
    try {
      const result = await api.sendRoomMessage(selectedRoom.id, {
        original_text: messageText,
        content_type: 'text',
      });
      setMessages(prev => 
        prev.map(m => m.id === optimisticMsg.id ? { ...result.message, profiles: optimisticMsg.profiles } : m)
      );
    } catch (err: any) {
      console.error('Failed to send message:', err);
      toast.error(err.message || 'Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setMsgInput(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const leaveRoom = async () => {
    if (!selectedRoom) return;
    if (!confirm('Are you sure you want to leave this room?')) return;
    
    try {
      await api.leaveRoom(selectedRoom.id);
      toast.success('You have initiated leaving the room');
      setRooms(prev => prev.filter(r => r.id !== selectedRoom.id));
      setSelectedRoom(null);
      setView('list');
    } catch (err: any) {
      toast.error(err.message || 'Failed to leave room');
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`;
    return d.toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass-card max-w-md">
          <Users className="w-12 h-12 mx-auto mb-4 text-familia-400" />
          <h2 className="text-xl font-bold mb-2">Family Rooms</h2>
          <p className="text-muted mb-6">Please log in to access family rooms</p>
          <Link href="/login"><button className="btn-primary w-full">Log In</button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-20 glass border-b border-themed">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          {view !== 'list' ? (
            <motion.button
              className="p-2 rounded-xl hover:bg-[var(--bg-card-hover)] border border-themed transition"
              onClick={() => { setView('list'); setSelectedRoom(null); }}
              whileTap={{ scale: 0.92 }}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          ) : (
            <Link href="/dashboard">
              <motion.button className="p-2 rounded-xl hover:bg-[var(--bg-card-hover)] border border-themed transition" whileTap={{ scale: 0.92 }}>
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
            </Link>
          )}
          <div className="flex-1">
            <h1 className="font-bold text-lg flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-bond-500/20 to-familia-500/20">
                <Users className="w-4 h-4 text-bond-400" />
              </div>
              {view === 'chat' && selectedRoom ? selectedRoom.room_name : view === 'create' ? 'Create Room' : 'Family Rooms'}
            </h1>
          </div>
          {view === 'list' && (
            <motion.button
              onClick={() => setView('create')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-familia-500/20 to-bond-500/20 text-familia-300 border border-familia-500/20 transition text-xs font-medium"
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create</span>
            </motion.button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {view === 'list' && (
            <motion.div key="list" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <div className="glass-card mb-4">
                <div className="flex items-center gap-2">
                  <input
                    placeholder="Join with invite code"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value)}
                    className="input-familia flex-1"
                  />
                  <button
                    onClick={() => joinWithCode(joinCodeInput)}
                    disabled={isJoiningCode || !joinCodeInput.trim()}
                    className={`px-4 py-2 rounded-xl text-sm ${joinCodeInput.trim() ? 'bg-gradient-to-br from-familia-500 to-heart-500 text-white' : 'bg-[var(--bg-card)] text-muted'}`}
                  >
                    {isJoiningCode ? 'Joining...' : 'Join'}
                  </button>
                </div>
                <div className="text-[11px] text-muted mt-2">Have an invite code? Paste it here to join a room instantly.</div>
              </div>
              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-familia-400 mb-4" />
                  <p className="text-muted">Loading rooms...</p>
                </div>
              ) : rooms.length === 0 ? (
                <div className="text-center py-12 glass-card">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted opacity-30" />
                  <h3 className="text-lg font-semibold mb-2">No Family Rooms Yet</h3>
                  <p className="text-muted mb-6">Create your first room to start sharing!</p>
                  <button onClick={() => setView('create')} className="btn-primary">
                    <Plus className="w-4 h-4 mr-2" /> Create Room
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-heart-400" />
                    My Rooms ({rooms.length})
                  </h3>
                  {rooms.map((room, i) => {
                    const theme = ROOM_THEMES[room.room_type] || ROOM_THEMES.general;
                    return (
                      <motion.div
                        key={room.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="glass-card card-hover cursor-pointer"
                        onClick={() => { setSelectedRoom(room); setView('chat'); }}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${theme.color} border border-themed flex items-center justify-center text-xl`}>
                            {theme.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm flex items-center gap-2">
                              {room.room_name}
                              {room.is_moderator && <Crown className="w-3 h-3 text-amber-400" />}
                            </div>
                            <div className="text-xs text-muted truncate mt-0.5">{room.description || 'No description'}</div>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted">
                              <Users className="w-3 h-3" /> {room.member_count || 1} members
                            </div>
                          </div>
                          <ArrowLeft className="w-4 h-4 text-muted rotate-180" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {view === 'create' && (
            <motion.div key="create" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <div className="glass-card space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Room Name *</label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g., World Kitchen"
                    className="input-familia w-full"
                    maxLength={50}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Description</label>
                  <textarea
                    value={newRoomDesc}
                    onChange={(e) => setNewRoomDesc(e.target.value)}
                    placeholder="What is this room about?"
                    className="input-familia w-full h-24 resize-none"
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Room Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(ROOM_THEMES).map(([type, { icon }]) => (
                      <button
                        key={type}
                        onClick={() => setNewRoomType(type)}
                        className={`p-3 rounded-xl border transition flex items-center gap-2 ${
                          newRoomType === type 
                            ? 'border-familia-500 bg-familia-500/10' 
                            : 'border-themed bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]'
                        }`}
                      >
                        <span className="text-xl">{icon}</span>
                        <span className="text-sm capitalize">{type}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Max Members: {newRoomMaxMembers}</label>
                  <input
                    type="range"
                    min="4"
                    max="20"
                    value={newRoomMaxMembers}
                    onChange={(e) => setNewRoomMaxMembers(parseInt(e.target.value))}
                    className="w-full accent-familia-500"
                  />
                </div>
                <button
                  onClick={createRoom}
                  disabled={isCreating || !newRoomName.trim()}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> Create Room</>}
                </button>
              </div>
            </motion.div>
          )}

          {view === 'chat' && selectedRoom && (
            <motion.div key="chat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex flex-col h-[calc(100vh-200px)]">
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {selectedRoom.is_moderator && (
                  <div className="flex justify-end mb-2">
                    <button onClick={() => openCodesModal(selectedRoom)} className="text-xs px-3 py-1 rounded-lg bg-[var(--bg-card)] border border-themed hover:bg-[var(--bg-card-hover)]">Manage Invite Codes</button>
                  </div>
                )}
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted opacity-30" />
                    <h3 className="text-lg font-semibold mb-2">Start the Conversation!</h3>
                    <p className="text-muted text-sm">Be the first to send a message</p>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className="max-w-[80%]">
                          {!isMe && (
                            <div className="text-xs text-muted mb-1">
                              {msg.profiles?.display_name || 'Member'} {msg.profiles?.country}
                            </div>
                          )}
                          <div className={`rounded-2xl p-3 ${
                            isMe
                              ? 'bg-gradient-to-br from-familia-500/80 to-bond-500/80 text-white rounded-br-md'
                              : 'bg-[var(--bg-card)] border border-themed rounded-bl-md'
                          }`}>
                            <p className="text-sm">{msg.original_text}</p>
                          </div>
                          <div className={`text-[10px] text-muted mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                            {formatTime(msg.created_at)}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-themed">
                <input
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Type a message..."
                  className="input-familia flex-1"
                  disabled={isSending}
                />
                <motion.button
                  onClick={sendMessage}
                  disabled={!msgInput.trim() || isSending}
                  className={`p-3 rounded-xl transition ${
                    msgInput.trim() && !isSending
                      ? 'bg-gradient-to-br from-familia-500 to-heart-500 text-white'
                      : 'bg-[var(--bg-card)] text-muted'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </motion.button>
              </div>
              <button onClick={leaveRoom} className="mt-4 text-xs text-red-400 hover:text-red-300 transition">
                Leave this room
              </button>
              {/* Invite Codes Modal */}
              {showCodesModal && selectedRoom && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setShowCodesModal(false)} />
                  <div className="relative w-full max-w-2xl mx-4">
                    <div className="glass-card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">Invite Codes — {selectedRoom.room_name}</h3>
                        <button className="text-sm text-muted" onClick={() => setShowCodesModal(false)}>Close</button>
                      </div>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input type="number" placeholder="Max uses (optional)" value={newCodeMaxUses ?? ''} onChange={(e) => setNewCodeMaxUses(e.target.value ? parseInt(e.target.value) : null)} className="input-familia" />
                          <input type="datetime-local" value={newCodeExpiresAt ?? ''} onChange={(e) => setNewCodeExpiresAt(e.target.value || null)} className="input-familia" />
                          <button onClick={createCode} disabled={isCreatingCode} className="btn-primary">{isCreatingCode ? 'Creating...' : 'Create'}</button>
                        </div>
                        <div className="text-[12px] text-muted">Active codes for this room:</div>
                        <div className="space-y-2">
                          {roomCodes.length === 0 ? (
                            <div className="text-sm text-muted">No codes yet</div>
                          ) : roomCodes.map((c) => (
                            <div key={c.id} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <div className="font-mono text-sm">{c.code}</div>
                                <div className="text-[11px] text-muted">uses: {c.uses}/{c.max_uses ?? '∞'} · {c.expires_at ? new Date(c.expires_at).toLocaleString() : 'no expiry'}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => copyToClipboard(c.code)} className="px-3 py-1 text-sm bg-[var(--bg-card)] border rounded">Copy</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
