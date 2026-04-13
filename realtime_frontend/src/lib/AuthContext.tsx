'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from './api';
import { supabase } from './supabase';
import type { Profile, Relationship, Notification, XPInfo } from '@/types';

// ── Context Interface ──────────────────────────────────────────

interface AuthContextType {
  user: Profile | null;
  token: string | null;
  isLoading: boolean;
  relationships: Relationship[];
  notifications: Notification[];
  unreadCount: number;
  xp: XPInfo | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshRelationships: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshXP: () => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
}

// ── Default context ────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  relationships: [],
  notifications: [],
  unreadCount: 0,
  xp: null,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
  refreshUser: async () => {},
  refreshRelationships: async () => {},
  refreshNotifications: async () => {},
  refreshXP: async () => {},
  markNotificationRead: () => {},
  markAllNotificationsRead: async () => {},
  deleteNotification: async () => {},
  clearAllNotifications: async () => {},
});

// ── Provider ───────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [xp, setXP] = useState<XPInfo | null>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // ── Restore session from localStorage ──
  useEffect(() => {
    const storedToken = localStorage.getItem('familia_token');
    const storedUser = localStorage.getItem('familia_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user');
      }
    }
    setIsLoading(false);
  }, []);

  // ── Load data when user is set ──
  useEffect(() => {
    if (user?.id) {
      refreshRelationships();
      refreshNotifications();
      refreshXP();

      // Supabase real-time subscription for instant push notifications
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setNotifications(prev => [payload.new as Notification, ...prev]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  // ── Login ──
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.login({ email, password });
      setToken(response.access_token);
      localStorage.setItem('familia_token', response.access_token);

      // Fetch full profile via GET /profiles/me
      try {
        const profileData = await api.getMyProfile();
        // Response could be { ...profile } directly or { profile: { ... } }
        const userData = profileData.profile || profileData;
        setUser(userData);
        localStorage.setItem('familia_user', JSON.stringify(userData));
      } catch (profileErr) {
        // Fallback: try GET /profiles/{user_id}
        const profileData = await api.getProfile(response.user_id);
        const userData = profileData.profile || profileData;
        setUser(userData);
        localStorage.setItem('familia_user', JSON.stringify(userData));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Signup ──
  const signup = async (data: any) => {
    setIsLoading(true);
    try {
      const response = await api.signup(data);

      if (response.access_token) {
        setToken(response.access_token);
        localStorage.setItem('familia_token', response.access_token);

        try {
          const profileData = await api.getMyProfile();
          const userData = profileData.profile || profileData;
          setUser(userData);
          localStorage.setItem('familia_user', JSON.stringify(userData));
        } catch (profileErr) {
          const profileData = await api.getProfile(response.user_id);
          const userData = profileData.profile || profileData;
          setUser(userData);
          localStorage.setItem('familia_user', JSON.stringify(userData));
        }
      }
      // If access_token is empty, email confirmation pending
    } finally {
      setIsLoading(false);
    }
  };

  // ── Logout ──
  const logout = () => {
    setUser(null);
    setToken(null);
    setRelationships([]);
    setNotifications([]);
    setXP(null);
    localStorage.removeItem('familia_token');
    localStorage.removeItem('familia_user');
  };

  // ── Refresh user profile ──
  const refreshUser = async () => {
    if (!user?.id) return;
    try {
      const profileData = await api.getMyProfile();
      const userData = profileData.profile || profileData;
      setUser(userData);
      localStorage.setItem('familia_user', JSON.stringify(userData));
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
  };

  // ── Refresh relationships ──
  const refreshRelationships = async () => {
    if (!user?.id) return;
    try {
      const res = await api.getRelationships(user.id);
      // Could be an array or { relationships: [...] }
      setRelationships(Array.isArray(res) ? res : res.relationships || []);
    } catch (e) {
      console.error('Failed to refresh relationships:', e);
    }
  };

  // ── Refresh notifications (REST API — Section 2.10) ──
  const refreshNotifications = async () => {
    if (!user?.id) return;
    try {
      const res = await api.getNotifications(user.id);
      setNotifications(Array.isArray(res) ? res : res.notifications || []);
    } catch (e) {
      console.error('Failed to refresh notifications:', e);
    }
  };

  // ── Refresh XP (Section 16) ──
  const refreshXP = async () => {
    try {
      const xpData = await api.getMyXP();
      setXP(xpData);
    } catch (e) {
      console.error('Failed to refresh XP:', e);
    }
  };

  // ── Mark notification read (REST API) ──
  const markNotificationRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
    if (!user?.id) return;
    try {
      await api.markNotificationRead(user.id, id);
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  // ── Mark all read ──
  const markAllNotificationsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    if (!user?.id) return;
    try {
      await api.markAllNotificationsRead(user.id);
    } catch (e) {
      console.error('Failed to mark all notifications as read:', e);
    }
  };

  // ── Delete notification ──
  const deleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (!user?.id) return;
    try {
      await api.deleteNotification(user.id, id);
    } catch (e) {
      console.error('Failed to delete notification:', e);
    }
  };

  // ── Clear all ──
  const clearAllNotifications = async () => {
    setNotifications([]);
    if (!user?.id) return;
    try {
      await api.clearAllNotifications(user.id);
    } catch (e) {
      console.error('Failed to clear all notifications:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        relationships,
        notifications,
        unreadCount,
        xp,
        login,
        signup,
        logout,
        refreshUser,
        refreshRelationships,
        refreshNotifications,
        refreshXP,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        clearAllNotifications,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
