'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from './api';
import { supabase } from './supabase';

interface User {
  id: string;
  display_name: string;
  username: string;
  email: string;
  country: string;
  city?: string;
  timezone: string;
  bio?: string;
  avatar_config: any;
  is_verified: boolean;
  care_score: number;
  reliability_score: number;
  total_bond_points: number;
  status: string;
  created_at: string;
  last_active_at: string;
  languages?: string[]; // Language names loaded separately
}

interface Relationship {
  id: string;
  partner: User;
  my_role: string;
  partner_role: string;
  level: number;
  bond_points: number;
  care_score: number;
  streak_days: number;
  messages_exchanged: number;
  last_interaction_at: string;
  status: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  data?: any;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  relationships: Relationship[];
  notifications: Notification[];
  unreadCount: number;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshRelationships: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
}

// Create context with default values to prevent undefined errors during SSR
const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  relationships: [],
  notifications: [],
  unreadCount: 0,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
  refreshUser: async () => {},
  refreshRelationships: async () => {},
  refreshNotifications: async () => {},
  markNotificationRead: () => {},
  markAllNotificationsRead: async () => {},
  deleteNotification: async () => {},
  clearAllNotifications: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

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

  useEffect(() => {
    if (user?.id) {
      refreshRelationships();
      refreshNotifications();
      
      // Set up real-time subscription for notifications
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
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

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.login({ email, password });
      setToken(response.access_token);
      localStorage.setItem('familia_token', response.access_token);
      
      // Fetch full profile
      const profileRes = await api.getProfile(response.user_id);
      const userData = profileRes.profile;
      setUser(userData);
      localStorage.setItem('familia_user', JSON.stringify(userData));
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: any) => {
    setIsLoading(true);
    try {
      const response = await api.signup(data);
      setToken(response.access_token);
      localStorage.setItem('familia_token', response.access_token);
      
      // Fetch full profile
      const profileRes = await api.getProfile(response.user_id);
      const userData = profileRes.profile;
      setUser(userData);
      localStorage.setItem('familia_user', JSON.stringify(userData));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setRelationships([]);
    setNotifications([]);
    localStorage.removeItem('familia_token');
    localStorage.removeItem('familia_user');
  };

  const refreshUser = async () => {
    if (!user?.id) return;
    try {
      const profileRes = await api.getProfile(user.id);
      setUser(profileRes.profile);
      localStorage.setItem('familia_user', JSON.stringify(profileRes.profile));
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
  };

  const refreshRelationships = async () => {
    if (!user?.id) return;
    try {
      const res = await api.getRelationships(user.id);
      setRelationships(res.relationships || []);
    } catch (e) {
      console.error('Failed to refresh relationships:', e);
    }
  };

  const refreshNotifications = async () => {
    if (!user?.id) return;
    try {
      const res = await api.getNotifications(user.id);
      setNotifications(res.notifications || []);
    } catch (e) {
      console.error('Failed to refresh notifications:', e);
    }
  };

  const markNotificationRead = async (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    // Also update in backend
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  const markAllNotificationsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    if (!user?.id) return;
    try {
      await api.markAllNotificationsRead(user.id);
    } catch (e) {
      console.error('Failed to mark all notifications as read:', e);
    }
  };

  const deleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (!user?.id) return;
    try {
      await api.deleteNotification(user.id, id);
    } catch (e) {
      console.error('Failed to delete notification:', e);
    }
  };

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
        login,
        signup,
        logout,
        refreshUser,
        refreshRelationships,
        refreshNotifications,
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
