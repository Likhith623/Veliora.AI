import { supabase } from './supabase';
// Treat an explicit '*' or empty value as unset so we fall back to the default
const rawApiBase = process.env.NEXT_PUBLIC_API_URL || '';
const API_BASE = (rawApiBase && rawApiBase !== '*') ? rawApiBase : '/api/v1';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

async function request(endpoint: string, options: RequestOptions = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('familia_token') : null;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  // Attach auth header unless explicitly skipped
  if (!options.skipAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If we are intentionally skipping the Authorization header but have a stored
  // user id, include it via `X-User-ID` so the backend can identify the caller
  // without verifying a JWT (development-friendly shortcut).
  try {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('familia_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser || '{}');
        if (parsed?.id) {
          headers['X-User-ID'] = parsed.id;
        }
      }
    }
  } catch (e) {
    // ignore parse errors
  }
  
  let response: Response;
  try {
    // Do not pass our custom flag to fetch
    const { skipAuth, ...fetchOptions } = options as RequestInit & { skipAuth?: boolean };
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOptions,
      headers,
    });
  } catch (e: any) {
    // Network / CORS / server unreachable
    if (e instanceof TypeError) {
      throw new Error(`Network error or server unreachable (${API_BASE}${endpoint})`);
    }
    throw e;
  }

  try {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      throw new Error(error.detail || 'Request failed');
    }
    return response.json();
  } catch (e: any) {
    throw e;
  }
}

export const api = {
  // Auth
  signup: (data: any) => request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),
  verify: (data: any) => request('/auth/verify', { method: 'POST', body: JSON.stringify(data) }),
  
  // Profiles
  getProfile: (userId: string) => request(`/profiles/${userId}`),
  updateProfile: (userId: string, data: any) => request(`/profiles/${userId}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateAvatar: (userId: string, config: any) => request(`/profiles/${userId}/avatar`, { method: 'PUT', body: JSON.stringify(config) }),
  addLanguage: (userId: string, data: any) => request(`/profiles/${userId}/languages`, { method: 'POST', body: JSON.stringify(data) }),
  removeLanguage: (userId: string, langCode: string) => request(`/profiles/${userId}/languages/${langCode}`, { method: 'DELETE' }),
  getRelationships: (userId: string) => request(`/profiles/${userId}/relationships`),
  getNotifications: (userId: string) => request(`/profiles/${userId}/notifications`),
  markNotificationRead: (userId: string, notifId: string) => request(`/profiles/${userId}/notifications/${notifId}/read`, { method: 'PUT' }),
  markAllNotificationsRead: (userId: string) => request(`/profiles/${userId}/notifications/read-all`, { method: 'PUT' }),
  deleteNotification: (userId: string, notifId: string) => request(`/profiles/${userId}/notifications/${notifId}`, { method: 'DELETE' }),
  clearAllNotifications: (userId: string) => request(`/profiles/${userId}/notifications`, { method: 'DELETE' }),
  // Accept either a single offering_role or an array of preferred_roles
  setMyRole: (data: { offering_role?: string; seeking_role?: string; preferred_roles?: string[] }) => request('/profiles/me/role', { method: 'POST', body: JSON.stringify(data) }),
  updateMyStatus: (userId: string, status: string, message?: string) => request(`/profiles/${userId}/status?status=${status}${message ? `&status_message=${encodeURIComponent(message)}` : ''}`, { method: 'PUT' }),
  
  // Matching
  searchMatch: (data: any) => request('/matching/search', { method: 'POST', body: JSON.stringify(data) }),
  checkQueue: (userId: string) => request(`/matching/queue/${userId}`),
  cancelMatching: (userId: string) => request(`/matching/queue/${userId}`, { method: 'DELETE' }),
  getRoles: () => request('/matching/roles'),
  browseByRole: (role: string) => request(`/matching/browse-public/${role}`),
  browseByRoleAuth: (role: string) => request(`/matching/browse/${role}`),
  browseAllRoles: () => request('/matching/browse-all'),
  connectWithUser: (targetUserId: string, role: string) => request(`/matching/connect/${targetUserId}?role=${encodeURIComponent(role)}`, { method: 'POST' }),

  // Supabase-backed offering_role table helpers
  // Fetch all offered roles for a given user from the `offering_role` table
  getMyOfferedRoles: async (userId: string) => {
    if (!userId) return [];
    try {
      const { data, error } = await supabase.from('offering_role').select('role').eq('user_id', userId);
      if (error) {
        // If Supabase returns an error (RLS/unauthorized), fall back to server API
        throw error;
      }
      return (data || []).map((r: any) => r.role);
    } catch (supabaseErr) {
      // Fallback: call backend profile endpoint which already returns offering_role / matching_preferences
      try {
        const profile = await request('/profiles/me', { headers: { 'X-User-ID': userId } });
        const prefs = profile?.profile?.matching_preferences || {};
        const preferred = Array.isArray(prefs.preferred_roles) ? prefs.preferred_roles : [];
        const offering = prefs.offering_role || profile?.profile?.offering_role || profile?.profile?.role;
        const combined = [] as string[];
        if (offering) combined.push(offering);
        for (const r of preferred) if (r && !combined.includes(r)) combined.push(r);
        return combined;
      } catch (backendErr) {
        // Re-throw a clearer error for callers to handle
        const err = backendErr || supabaseErr || new Error('Failed to load offered roles');
        throw err;
      }
    }
  },

  // Replace the user's offered roles with the provided array.
  // Persist offered roles via backend endpoint (/profiles/me/role) which
  // updates the profile's `matching_preferences` and `offering_role` fields.
  setMyOfferedRoles: async (userId: string, roles: string[]) => {
    if (!userId) throw new Error('User ID required');
    const normalized = Array.isArray(roles) ? roles.filter(Boolean) : [];
    // Call backend which enforces validation and writes to profiles.matching_preferences
    const body = { preferred_roles: normalized };
    const resp = await request('/profiles/me/role', { method: 'POST', body: JSON.stringify(body), headers: { 'X-User-ID': userId } });
    return resp;
  },
  
  // Chat
  sendMessage: (data: any) => request('/chat/send', { method: 'POST', body: JSON.stringify(data) }),
  getMessages: (relationshipId: string, limit?: number) => request(`/chat/messages/${relationshipId}?limit=${limit || 50}`),
  getRelationship: (relationshipId: string) => request(`/chat/relationship/${relationshipId}`),
  
  // Contests
  createContest: (data: any) => request('/contests/create', { method: 'POST', body: JSON.stringify(data) }),
  getContests: (relationshipId: string) => request(`/contests/relationship/${relationshipId}`),
  getContest: (contestId: string) => request(`/contests/${contestId}`),
  submitAnswer: (data: any) => request('/contests/answer', { method: 'POST', body: JSON.stringify(data) }),
  completeContest: (contestId: string) => request(`/contests/${contestId}/complete`, { method: 'POST' }),
  
  // Games
  getGames: () => request('/games/'),
  startGame: (data: any) => request('/games/start', { method: 'POST', body: JSON.stringify(data) }),
  gameAction: (data: any) => request('/games/action', { method: 'POST', body: JSON.stringify(data) }),
  getGameSession: (sessionId: string) => request(`/games/session/${sessionId}`),
  getGameHistory: (relationshipId: string) => request(`/games/history/${relationshipId}`),
  
  // Family Rooms (public by default - avoid sending JWT)
  createRoom: (data: any) => request('/rooms/create', { method: 'POST', body: JSON.stringify(data), skipAuth: true }),
  getRooms: () => request('/rooms/', { skipAuth: true }),
  inviteToRoom: (roomId: string, data: any) => request(`/rooms/${roomId}/invite`, { method: 'POST', body: JSON.stringify(data), skipAuth: true }),
  joinRoom: (roomId: string, data?: any) => request(`/rooms/${roomId}/join`, { method: 'POST', body: JSON.stringify(data || {}), skipAuth: true }),
  // Join codes
  createJoinCode: (roomId: string, data?: any) => request(`/rooms/${roomId}/join-code`, { method: 'POST', body: JSON.stringify(data || {}), skipAuth: true }),
  listJoinCodes: (roomId: string) => request(`/rooms/${roomId}/join-codes`, { skipAuth: true }),
  joinWithCode: (code: string) => request('/rooms/join-by-code', { method: 'POST', body: JSON.stringify({ code }), skipAuth: true }),
  // Room messaging & potlucks
  sendRoomMessage: (roomId: string, data: any) => request(`/rooms/${roomId}/message`, { method: 'POST', body: JSON.stringify(data), skipAuth: true }),
  getRoomMessages: (roomId: string) => request(`/rooms/${roomId}/messages`, { skipAuth: true }),
  leaveRoom: (roomId: string) => request(`/rooms/${roomId}/leave`, { method: 'POST', skipAuth: true }),
  getPotlucks: (roomId: string) => request(`/rooms/${roomId}/potlucks`, { skipAuth: true }),
  createPotluck: (roomId: string, data: any) => request(`/rooms/${roomId}/potluck`, { method: 'POST', body: JSON.stringify(data), skipAuth: true }),
  
  // Safety
  reportUser: (data: any) => request('/safety/report', { method: 'POST', body: JSON.stringify(data) }),
  severBond: (data: any) => request('/safety/sever', { method: 'POST', body: JSON.stringify(data) }),
  
  // Translation
  translate: (text: string, sourceLang?: string, targetLang?: string) => 
    request(`/translate/?text=${encodeURIComponent(text)}&source_lang=${sourceLang || ''}&target_lang=${targetLang || 'en'}`, { method: 'POST' }),
  getLanguages: () => request('/translate/languages'),
};
