//api.ts
// ═══════════════════════════════════════════════════════════════
// Veliora.AI — Realtime Communication API Client
// Synced to: INTEGRATON_RALTINE.md (all 19 sections)
// ═══════════════════════════════════════════════════════════════

const API_BASE = 'http://localhost:8000/api/v1';
export const WS_BASE = 'ws://localhost:8000/api/v1';

// ── Token helpers ──────────────────────────────────────────────
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('familia_token');
}

function saveToken(token: string) {
  localStorage.setItem('familia_token', token);
}

function clearToken() {
  localStorage.removeItem('familia_token');
  localStorage.removeItem('familia_user');
}

// ── Auth headers ───────────────────────────────────────────────
function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function authHeadersOnly(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ── Generic request helpers ────────────────────────────────────

async function handleResponse(response: Response) {
  if (response.status === 401) {
    clearToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Session expired — please log in again');
  }
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
    throw new Error(err.detail || 'Request failed');
  }
  // Some endpoints return 204 No Content
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

async function get(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  return handleResponse(res);
}

async function post(path: string, body?: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse(res);
}

async function put(path: string, body?: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse(res);
}

async function patch(path: string, body?: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse(res);
}

async function del(path: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

async function postFormData(path: string, formData: FormData) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: authHeadersOnly(), // No Content-Type for multipart
    body: formData,
  });
  return handleResponse(res);
}

async function postForBlob(path: string, body: any): Promise<Blob> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.blob();
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — Authentication
// ═══════════════════════════════════════════════════════════════
export const api = {

  // 1.1 Sign Up — POST /auth/signup (public)
  signup: (data: {
    email: string;
    password: string;
    display_name: string;
    username: string;
    date_of_birth?: string;
    gender?: string;
    country: string;
    city?: string;
    timezone?: string;
  }) =>
    fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(async (r) => {
      const body = await r.json();
      if (!r.ok) throw new Error(body.detail || 'Signup failed');
      if (body.access_token) saveToken(body.access_token);
      return body;
    }),

  // 1.2 Login — POST /auth/login (public)
  login: (data: { email: string; password: string }) =>
    fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(async (r) => {
      const body = await r.json();
      if (!r.ok) throw new Error(body.detail || 'Login failed');
      saveToken(body.access_token);
      return body;
    }),

  // ═════════════════════════════════════════════════════════════
  // SECTION 2 — Profiles
  // ═════════════════════════════════════════════════════════════

  // 2.1 Get My Profile — GET /profiles/me
  getMyProfile: () => get('/profiles/me'),

  // 2.2 Get Any User's Profile — GET /profiles/{user_id}
  getProfile: (userId: string) => get(`/profiles/${userId}`),

  // 2.3 Update My Profile — PUT /profiles/me
  updateMyProfile: (data: {
    display_name?: string;
    bio?: string;
    city?: string;
    timezone?: string;
    gender?: string;
    avatar_config?: any;
    status?: string;
    status_message?: string;
    matching_preferences?: any;
  }) => put('/profiles/me', data),

  // 2.4 Update Avatar — PUT /profiles/{user_id}/avatar
  updateAvatar: (userId: string, config: { avatar_config: any }) =>
    put(`/profiles/${userId}/avatar`, config),

  // 2.5 Set My Role — POST /profiles/me/role
  setMyRole: (data: {
    offering_role: string;
    preferred_roles: string[];
    seeking_role: string;
  }) => post('/profiles/me/role', data),

  // 2.6 Add Language — POST /profiles/{user_id}/languages
  addLanguage: (userId: string, data: {
    language_code: string;
    language_name: string;
    proficiency: 'native' | 'fluent' | 'intermediate' | 'beginner';
    is_primary?: boolean;
    show_original?: boolean;
  }) => post(`/profiles/${userId}/languages`, data),

  // 2.7 Remove Language — DELETE /profiles/{user_id}/languages/{code}
  removeLanguage: (userId: string, langCode: string) =>
    del(`/profiles/${userId}/languages/${langCode}`),

  // 2.8 Update Status — PUT /profiles/{user_id}/status
  updateStatus: (userId: string, data: {
    status: 'online' | 'offline' | 'busy' | 'away';
    status_message?: string;
  }) => put(`/profiles/${userId}/status`, data),

  // 2.9 Get Relationships — GET /profiles/{user_id}/relationships
  getRelationships: (userId: string) => get(`/profiles/${userId}/relationships`),

  // 2.10 Notifications
  getNotifications: (userId: string) => get(`/profiles/${userId}/notifications`),
  markNotificationRead: (userId: string, notifId: string) =>
    put(`/profiles/${userId}/notifications/${notifId}/read`),
  markAllNotificationsRead: (userId: string) =>
    put(`/profiles/${userId}/notifications/read-all`),
  deleteNotification: (userId: string, notifId: string) =>
    del(`/profiles/${userId}/notifications/${notifId}`),
  clearAllNotifications: (userId: string) =>
    del(`/profiles/${userId}/notifications`),

  // ═════════════════════════════════════════════════════════════
  // SECTION 3 — Verification
  // ═════════════════════════════════════════════════════════════

  // 3.1 Submit Verification — POST /verification/submit
  submitVerification: (data: {
    document_type: string;
    document_url: string;
    selfie_url: string;
  }) => post('/verification/submit', data),

  // 3.2 Check Status — GET /verification/status
  getVerificationStatus: () => get('/verification/status'),

  // ═════════════════════════════════════════════════════════════
  // SECTION 4 — Matching & Browse
  // ═════════════════════════════════════════════════════════════

  // 4.1 Browse by Role — GET /matching/browse/{role} (public)
  browseByRole: (role: string) => get(`/matching/browse/${role}`),

  // 4.2 Browse Public — GET /matching/browse-public/{role} (public)
  browsePublic: (role: string) => get(`/matching/browse-public/${role}`),

  // 4.3 Browse All — GET /matching/browse-all (public)
  browseAll: () => get('/matching/browse-all'),

  // 4.4 Connect — POST /matching/connect/{target_user_id}
  connectWithUser: (targetUserId: string, data: {
    seeking_role: string;
    offering_role: string;
    preferred_age_min?: number;
    preferred_age_max?: number;
    preferred_countries?: string[];
    language_priority?: string;
  }) => post(`/matching/connect/${targetUserId}`, data),

  // 4.5 Advanced Search — POST /matching/search
  searchMatch: (data: {
    seeking_role: string;
    offering_role: string;
    preferred_age_min?: number;
    preferred_age_max?: number;
    preferred_countries?: string[];
    language_priority?: string;
  }) => post('/matching/search', data),

  // 4.6 Get Queue — GET /matching/queue/{user_id}
  getMatchQueue: (userId: string) => get(`/matching/queue/${userId}`),

  // 4.7 Delete from Queue — DELETE /matching/queue/{user_id}
  cancelMatching: (userId: string) => del(`/matching/queue/${userId}`),

  // 4.8 List Valid Roles — GET /matching/roles
  getRoles: () => get('/matching/roles'),

  // ═════════════════════════════════════════════════════════════
  // SECTION 5 — Friends
  // ═════════════════════════════════════════════════════════════

  // 5.1 Search — GET /friends/search?q=...
  searchFriends: (query: string) => get(`/friends/search?q=${encodeURIComponent(query)}`),

  // 5.2 Send Request — POST /friends/request/{target_id}
  sendFriendRequest: (targetId: string) => post(`/friends/request/${targetId}`, {}),

  // 5.3 Respond — POST /friends/respond/{request_id}
  respondToFriendRequest: (requestId: string, action: 'accept' | 'reject') =>
    post(`/friends/respond/${requestId}`, { action }),

  // 5.4 Get Pending — GET /friends/requests
  getPendingRequests: () => get('/friends/requests'),

  // 5.5 List Friends — GET /friends/list
  getFriends: () => get('/friends/list'),

  // 5.6 Get Friend Profile — GET /friends/{friend_id}/profile
  getFriendProfile: (friendId: string) => get(`/friends/${friendId}/profile`),

  // 5.7 Remove Friend — DELETE /friends/{relationship_id}
  removeFriend: (relationshipId: string) => del(`/friends/${relationshipId}`),

  // ═════════════════════════════════════════════════════════════
  // SECTION 6 — Chat (REST + WebSocket)
  // ═════════════════════════════════════════════════════════════

  // 6.1 Send Message — POST /chat/send
  sendMessage: (data: {
    relationship_id: string;
    original_text: string;
    content_type: 'text' | 'image' | 'video' | 'voice';
    original_language?: string;
    reply_to_id?: string | null;
    image_url?: string;
    video_url?: string;
    voice_url?: string;
  }) => post('/chat/send', data),

  // 6.2 Upload Media — POST /chat/upload-media (multipart)
  uploadMedia: (file: File, relationshipId: string, mediaType: 'image' | 'video' | 'voice') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('relationship_id', relationshipId);
    formData.append('media_type', mediaType);
    return postFormData('/chat/upload-media', formData);
  },

  // 6.3 Get Messages — GET /chat/messages/{relationship_id}
  getMessages: (relationshipId: string, limit: number = 50, before?: string) => {
    let path = `/chat/messages/${relationshipId}?limit=${limit}`;
    if (before) path += `&before=${encodeURIComponent(before)}`;
    return get(path);
  },

  // 6.4 Get Relationship Info — GET /chat/relationship/{relationship_id}
  getRelationship: (relationshipId: string) =>
    get(`/chat/relationship/${relationshipId}`),

  // 6.5 Create Poll — POST /chat/poll/create
  createPoll: (data: {
    question: string;
    options: string[];
    relationship_id: string;
    allow_multiple?: boolean;
    is_anonymous?: boolean;
    expires_at?: string;
  }) => post('/chat/poll/create', data),

  // 6.6 Vote on Poll — POST /chat/poll/{poll_id}/vote
  votePoll: (pollId: string, selectedOption: number) =>
    post(`/chat/poll/${pollId}/vote`, { selected_option: selectedOption }),

  // 6.7 Get Poll Results — GET /chat/poll/{poll_id}
  getPollResults: (pollId: string) => get(`/chat/poll/${pollId}`),

  // 6.8 React to Message — POST /chat/message/{message_id}/react
  reactToMessage: (messageId: string, emoji: string) =>
    post(`/chat/message/${messageId}/react`, { emoji }),

  // 6.9 Delete Message — DELETE /chat/message/{message_id}
  deleteMessage: (messageId: string) => del(`/chat/message/${messageId}`),

  // 6.10 Forward Message — POST /chat/message/{message_id}/forward
  forwardMessage: (messageId: string, targetRelationshipId: string) =>
    post(`/chat/message/${messageId}/forward`, { target_relationship_id: targetRelationshipId }),

  // 6.11 Gift XP — POST /chat/gift-xp
  giftXPInChat: (data: {
    relationship_id: string;
    amount: number;
    message?: string;
  }) => post('/chat/gift-xp', data),

  // ═════════════════════════════════════════════════════════════
  // SECTION 7 — Calls (WebRTC + STT/TTS)
  // ═════════════════════════════════════════════════════════════

  // 7.2 Transcribe Audio — POST /calls/transcribe (multipart)
  transcribeAudio: (audioFile: File) => {
    const formData = new FormData();
    formData.append('audio', audioFile);
    return postFormData('/calls/transcribe', formData);
  },

  // 7.3 Text to Speech — POST /calls/speak (returns audio blob)
  textToSpeech: (text: string, language: string = 'en') =>
    postForBlob('/calls/speak', { text, language }),

  // 7.4 List Voices — GET /calls/voices
  getVoices: () => get('/calls/voices'),

  // 7.5 Call Logs — GET /calls/logs/{relationship_id}
  getCallLogs: (relationshipId: string) => get(`/calls/logs/${relationshipId}`),

  // ═════════════════════════════════════════════════════════════
  // SECTION 8 — Family Rooms
  // ═════════════════════════════════════════════════════════════

  // 8.1 Create Room — POST /rooms/create
  createRoom: (data: {
    room_name: string;
    description?: string;
    room_type?: string;
    max_members?: number;
  }) => post('/rooms/create', data),

  // 8.2 Get My Rooms — GET /rooms/
  getRooms: () => get('/rooms/'),

  // 8.3 Invite — POST /rooms/{room_id}/invite
  inviteToRoom: (roomId: string, data: {
    target_user_id: string;
    role_in_room?: string;
  }) => post(`/rooms/${roomId}/invite`, data),

  // 8.4 Join Room — POST /rooms/{room_id}/join
  joinRoom: (roomId: string, data?: {
    join_code?: string;
    role_in_room?: string;
  }) => post(`/rooms/${roomId}/join`, data || {}),

  // 8.5 Join By Code — POST /rooms/join-by-code
  joinByCode: (code: string) => post('/rooms/join-by-code', { code }),

  // 8.6 Generate Join Code — POST /rooms/{room_id}/join-code
  generateJoinCode: (roomId: string, data?: {
    expires_in_hours?: number;
    max_uses?: number;
  }) => post(`/rooms/${roomId}/join-code`, data || {}),

  // 8.7 Get Join Codes — GET /rooms/{room_id}/join-codes
  getJoinCodes: (roomId: string) => get(`/rooms/${roomId}/join-codes`),

  // 8.8 Send Room Message — POST /rooms/{room_id}/message
  sendRoomMessage: (roomId: string, data: {
    content: string;
    content_type: 'text' | 'image' | 'video' | 'voice';
    media_url?: string | null;
  }) => post(`/rooms/${roomId}/message`, {
    original_text: data.content,
    content_type: data.content_type,
    image_url: data.content_type === 'image' ? data.media_url : undefined,
    video_url: data.content_type === 'video' ? data.media_url : undefined,
  }),

  // 8.9 Get Room Messages — GET /rooms/{room_id}/messages
  getRoomMessages: (roomId: string, limit: number = 50) =>
    get(`/rooms/${roomId}/messages?limit=${limit}`),

  // 8.10 Leave Room — POST /rooms/{room_id}/leave
  leaveRoom: (roomId: string) => post(`/rooms/${roomId}/leave`, {}),

  // 8.11 Cultural Potluck — POST /rooms/{room_id}/potluck
  createPotluck: (roomId: string, data: {
    dish_name: string;
    description?: string;
    recipe_url?: string;
    culture_origin?: string;
    image_url?: string;
  }) => post(`/rooms/${roomId}/potluck`, data),

  // 8.12 Get Potlucks — GET /rooms/{room_id}/potlucks
  getPotlucks: (roomId: string) => get(`/rooms/${roomId}/potlucks`),

  // 8.13 Room Poll - Create
  createRoomPoll: (roomId: string, data: {
    question: string;
    options: string[];
    allow_multiple?: boolean;
    expires_at?: string;
  }) => post(`/rooms/${roomId}/poll/create`, data),

  // 8.14 Room Poll - Vote
  voteRoomPoll: (roomId: string, pollId: string, selectedOption: number) =>
    post(`/rooms/${roomId}/poll/${pollId}/vote`, { selected_option: selectedOption }),

  // 8.15 Room Message Reaction
  reactToRoomMessage: (roomId: string, messageId: string, emoji: string) =>
    post(`/rooms/${roomId}/message/${messageId}/react`, { emoji }),

  // 8.16 Delete Room Message
  deleteRoomMessage: (roomId: string, messageId: string) =>
    del(`/rooms/${roomId}/message/${messageId}`),

  // ═════════════════════════════════════════════════════════════
  // SECTION 9 — Games (Turn-Based)
  // ═════════════════════════════════════════════════════════════

  // 9.1 List Available Games — GET /games/
  getGames: () => get('/games/'),

  // 9.2 Start Game — POST /games/start
  startGame: (data: {
    game_id: string;
    relationship_id: string;
  }) => post('/games/start', data),

  // 9.3 Game Action — POST /games/action
  gameAction: (data: {
    action: string;
    data: any;
  }) => post('/games/action', data),

  // 9.4 Get Session — GET /games/session/{session_id}
  getGameSession: (sessionId: string) => get(`/games/session/${sessionId}`),

  // 9.5 Get History — GET /games/history/{relationship_id}
  getGameHistory: (relationshipId: string) => get(`/games/history/${relationshipId}`),

  // ═════════════════════════════════════════════════════════════
  // SECTION 10 — Live Games (Real-Time WebSocket)
  // ═════════════════════════════════════════════════════════════

  // 10.1 List Available Live Games — GET /games/live/available
  getLiveGames: () => get('/games/live/available'),

  // 10.2 Create Live Game Session — POST /games/live/create
  createLiveGame: (data: {
    game_type: string;
    relationship_id: string;
  }) => post('/games/live/create', data),

  // ═════════════════════════════════════════════════════════════
  // SECTION 11 — Contests
  // ═════════════════════════════════════════════════════════════

  // 11.1 Create Contest — POST /contests/create
  createContest: (data: {
    relationship_id: string;
    contest_type: string;
    target_user_id?: string;
  }) => post('/contests/create', data),

  // 11.2 Get Contests for Relationship — GET /contests/relationship/{rel_id}
  getContests: (relationshipId: string) => get(`/contests/relationship/${relationshipId}`),

  // 11.3 Get Contest by ID — GET /contests/{contest_id}
  getContest: (contestId: string) => get(`/contests/${contestId}`),

  // 11.4 Answer Contest Question — POST /contests/answer
  answerContest: (data: {
    question_id: string;
    answer: string;
  }) => post('/contests/answer', data),

  // 11.5 Complete Contest — POST /contests/{contest_id}/complete
  completeContest: (contestId: string) => post(`/contests/${contestId}/complete`, {}),

  // 11.6 Leaderboard — GET /contests/leaderboard/{period}
  getContestLeaderboard: (period: 'daily' | 'weekly' | 'monthly' | 'all_time') =>
    get(`/contests/leaderboard/${period}`),

  // 11.7 Contest Schedule — GET /contests/schedule/configuration
  getContestSchedule: () => get('/contests/schedule/configuration'),

  // 11.8 Save Custom Contest Questions
  saveCustomQuestions: (questions: Array<{
    question_text: string;
    options: string[];
    correct_option_index: number;
  }>) => post('/contests/custom/questions', questions),

  // 11.9 Get My Custom Contest Questions
  getMyCustomQuestions: () => get('/contests/custom/questions'),

  // 11.10 Get Eligible Friends for Custom Contests
  getEligibleContestFriends: () => get('/contests/custom/eligibility'),

  // 11.11 Global Presence & Invites
  getActiveFriends: () => get('/presence/active-friends'),
  sendGameInvite: (target_user_id: string, game_type: string) => post('/presence/invite', { target_user_id, game_type }),

  // ═════════════════════════════════════════════════════════════
  // SECTION 12 — Questions
  // ═════════════════════════════════════════════════════════════

  // 12.1 Create Question — POST /questions/mine
  createQuestion: (data: {
    question_text: string;
    category?: string;
    is_public?: boolean;
    options?: string[];
    correct_option_index?: number;
  }) => post('/questions/mine', data),

  // 12.2 Get My Questions — GET /questions/mine
  getMyQuestions: () => get('/questions/mine'),

  // 12.3 Update Question — PUT /questions/{question_id}
  updateQuestion: (questionId: string, data: {
    question_text?: string;
    is_public?: boolean;
    options?: string[];
    correct_option_index?: number;
  }) => put(`/questions/${questionId}`, data),

  // 12.4 Delete Question — DELETE /questions/{question_id}
  deleteQuestion: (questionId: string) => del(`/questions/${questionId}`),

  // 12.5 Get Random Question — GET /questions/random
  getRandomQuestion: () => get('/questions/random?count=1').then(res => res.questions?.[0]),

  // 12.6 Get Friend's Questions — GET /questions/friend/{friend_id}
  getFriendQuestions: (friendId: string) => get(`/questions/friend/${friendId}`),

  // 12.7 Answer Friend's Question — POST /questions/answer
  answerFriendQuestion: (questionId: string, answer: string) => 
    post('/questions/answer', { question_id: questionId, answer }),

  // 12.8 Generate AI Question — POST /questions/generate-ai
  generateQuestionAI: () => post('/questions/generate-ai', {}),



  // ═════════════════════════════════════════════════════════════
  // SECTION 13 — Translation
  // ═════════════════════════════════════════════════════════════

  // 13.1 Translate Text — POST /translate/
  translate: (data: {
    text: string;
    source_language: string;
    target_language: string;
  }) => post('/translate/', data),

  // 13.2 Batch Translate — POST /translate/batch
  batchTranslate: (data: {
    texts: string[];
    source_language: string;
    target_language: string;
  }) => post('/translate/batch', data),

  // 13.3 Detect Language — POST /translate/detect
  detectLanguage: (text: string) => post('/translate/detect', { text }),

  // 13.4 List Supported Languages — GET /translate/languages (public)
  getLanguages: () => get('/translate/languages'),

  // 13.5 Toggle Show Original — PATCH /translate/languages/{code}/show-original
  toggleShowOriginal: (languageCode: string) =>
    patch(`/translate/languages/${languageCode}/show-original`),

  // ═════════════════════════════════════════════════════════════
  // SECTION 14 — Safety
  // ═════════════════════════════════════════════════════════════

  // 14.1 Report User — POST /safety/report
  reportUser: (data: {
    reported_user_id: string;
    reason: 'harassment' | 'spam' | 'inappropriate_content' | 'underage' | 'scam' | 'other';
    description?: string;
    relationship_id?: string;
    message_id?: string;
  }) => post('/safety/report', data),

  // 14.2 Sever / Block — POST /safety/sever
  severRelationship: (data: {
    relationship_id: string;
    reason: string;
  }) => post('/safety/sever', data),

  // 14.3 Exit Survey — POST /safety/exit-survey
  exitSurvey: (data: {
    relationship_id: string;
    reason: string;
    feedback?: string;
    would_recommend?: boolean;
  }) => post('/safety/exit-survey', data),

  // 14.4 Reliability Score — GET /safety/reliability/{user_id}
  getReliability: (userId: string) => get(`/safety/reliability/${userId}`),

  // 14.5 Minor Protection — GET /safety/minor-protection/{user_id}
  getMinorProtection: (userId: string) => get(`/safety/minor-protection/${userId}`),

  // ═════════════════════════════════════════════════════════════
  // SECTION 15 — Privacy Settings
  // ═════════════════════════════════════════════════════════════

  // 15.1 Get My Privacy — GET /privacy/settings
  getPrivacySettings: () => get('/privacy/settings'),

  // 15.2 Update Privacy — PUT /privacy/settings
  updatePrivacySettings: (data: {
    show_online_status?: boolean;
    allow_messages_from?: string;
    show_last_seen?: boolean;
    allow_calls_from?: string;
    translation_language?: string;
    show_original_text?: boolean;
  }) => put('/privacy/settings', data),

  // 15.3 Get User Privacy — GET /privacy/settings/{user_id}
  getUserPrivacy: (userId: string) => get(`/privacy/settings/${userId}`),

  // ═════════════════════════════════════════════════════════════
  // SECTION 16 — XP System
  // ═════════════════════════════════════════════════════════════

  // 16.1 Get My XP — GET /xp/me
  getMyXP: () => get('/xp/me').then(res => {
    const data = res.xp || res;
    return {
      user_id: data.user_id,
      total_xp: data.current_xp ?? data.total_xp ?? 0,
      level: Math.floor((data.current_xp ?? 0) / 100) + 1,
      level_label: 'Level ' + (Math.floor((data.current_xp ?? 0) / 100) + 1),
      xp_to_next_level: 100 - ((data.current_xp ?? 0) % 100),
      streak_days: data.streak_days || 0,
      streak_multiplier: 1.0,
      care_score: data.care_score || 0
    };
  }),

  // 16.2 Gift XP — POST /xp/gift
  giftXP: (data: {
    recipient_id: string;
    amount: number;
    message?: string;
  }) => post('/xp/gift', {
    receiver_id: data.recipient_id,
    amount: data.amount
  }),

  // 16.3 XP Leaderboard — GET /xp/leaderboard
  getXPLeaderboard: () => get('/xp/leaderboard'),

  // 16.4 XP Transactions — GET /xp/transactions
  getXPTransactions: () => get('/xp/transactions').then(res => {
    const txs = res.transactions || res;
    return {
      count: res.count || txs.length,
      transactions: txs.map((tx: any) => ({
        ...tx,
        xp_earned: tx.transaction_type === 'gifted_out' ? -tx.amount : tx.amount,
        action: (tx.transaction_type.replace(/_/g, ' ') + ' (' + tx.source + ')').toUpperCase()
      }))
    };
  }),

  // 16.5 Get User XP — GET /xp/{user_id}
  getUserXP: (userId: string) => get(`/xp/${userId}`),

  // ═════════════════════════════════════════════════════════════
  // SECTION 17 — Voice (STT/TTS — merged into /calls router)
  // ═════════════════════════════════════════════════════════════

  // 17.1 Transcribe — POST /calls/transcribe (multipart)
  voiceTranscribe: (audioFile: File) => {
    const formData = new FormData();
    formData.append('audio', audioFile);
    return postFormData('/calls/transcribe', formData);
  },

  // 17.2 TTS — POST /calls/speak (returns audio blob)
  voiceSpeak: (text: string, language: string = 'en') =>
    postForBlob('/calls/speak', { text, language }),

  // 17.3 List Voices — GET /calls/voices
  getVoicesList: () => get('/calls/voices'),
};
