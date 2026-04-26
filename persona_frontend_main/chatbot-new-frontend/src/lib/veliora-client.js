/**
 * veliora-client.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized API client for the new Veliora.AI backend (http://localhost:8000).
 *
 * GOLDEN RULE: This file is the ONLY place URL strings live.
 * Every component imports helpers from here — never calls fetch() with a
 * hard-coded old domain again.
 *
 * Auth: All protected calls use the JWT stored in localStorage under the key
 *       "persona_token".
 *
 * Response Adapters: Each helper converts the new backend schema → the exact
 *   object shape the existing UI components already expect.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Base URL ────────────────────────────────────────────────────────────────
const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

// ─── Token helpers ───────────────────────────────────────────────────────────
export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("persona_token");
}

export function setToken(token) {
  if (typeof window === "undefined") return;
  localStorage.setItem("persona_token", token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("persona_token");
}

// ─── Low-level fetch helpers ─────────────────────────────────────────────────

function authHeaders(includeContentType = true) {
  const h = { Authorization: `Bearer ${getToken()}` };
  if (includeContentType) h["Content-Type"] = "application/json";
  return h;
}

function handle401(res) {
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      console.warn("401 Unauthorized detected. Clearing auth tokens and redirecting to login.");
      localStorage.removeItem("persona_token");
      localStorage.removeItem("userDetails");
      window.location.href = "/";
    }
  }
}

async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: authHeaders(false),
  });
  if (!res.ok) {
    handle401(res);
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

async function apiPost(path, body, requireAuth = true) {
  const headers = { "Content-Type": "application/json" };
  if (requireAuth) headers["Authorization"] = `Bearer ${getToken()}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    handle401(res);
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

async function apiPut(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    handle401(res);
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

async function apiDelete(path, body = null) {
  const opts = {
    method: "DELETE",
    headers: authHeaders(body != null),
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  if (!res.ok) {
    handle401(res);
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. AUTHENTICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Login and store the JWT token.
 * Returns the `user` object from the backend.
 */
export async function authLogin(email, password) {
  const data = await apiPost("/api/auth/login", { email, password }, false);
  if (data.access_token) setToken(data.access_token);
  return data; // { access_token, refresh_token, user: { id, email, name, ... } }
}

/**
 * Sign up a new user.
 */
export async function authSignup(payload) {
  const data = await apiPost("/api/auth/signup", payload, false);
  if (data.access_token) setToken(data.access_token);
  return data;
}

export function authLogout() {
  clearToken();
}

export function authGetProfile() {
  return apiGet("/api/auth/profile");
}

export function authUpdateProfile(profileData) {
  return apiPut("/api/auth/profile", profileData);
}

export function authUpdatePassword(password) {
  return apiPut("/api/auth/profile/password", { password });
}

/**
 * Returns XP status: { total_xp, level, streak_days, ... }
 */
export function authGetXP() {
  return apiGet("/api/auth/xp");
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CHAT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send a chat message to the new backend.
 *
 * Old payload shape (api.veliora.com/cv/chat):
 *   { message, bot_id, custom_bot_name, user_name, user_gender, language, traits,
 *     previous_conversation, email, request_time, platform }
 *
 * New payload shape (/api/chat/send):
 *   { bot_id, message, language?, custom_bot_name?, traits? }
 *
 * OLD response shape:  { response, message_id, xp_data, reminder?, ... }
 * NEW response shape:  { bot_id, user_message, bot_response, language, xp_earned,
 *                        semantic_memory_used, timestamp }
 *
 * ADAPTER: Returns a normalised object the UI already uses.
 */
export async function chatSend(botId, message, options = {}) {
  const payload = {
    bot_id: botId,
    message,
    language: options.language || "english",
    custom_bot_name: options.customName || null,
    traits: options.traits || null,
  };

  const data = await apiPost("/api/chat/send", payload);

  // Adapt new schema → old schema expected by Dashboard/handleSend
  return {
    response: data.bot_response,
    message_id: data.id || `msg_${Date.now()}`,
    xp_data: data.xp_earned
      ? {
          xp_calculation_success: true,
          success: true,
          immediate_xp_awarded: data.xp_earned,
          current_total_xp: data.xp_earned, // component will accumulate
        }
      : null,
    // Preserve fields the UI may read
    bot_id: data.bot_id,
    timestamp: data.timestamp,
    semantic_memory_used: data.semantic_memory_used,
  };
}

/**
 * Fetch chat history for a bot.
 *
 * Old: POST api.veliora.com/sync  →  { response: [ { id, text, sender, timestamp, ... } ] }
 * New: POST /api/chat/history       →  { messages: [ { id, role, content, bot_id, created_at } ], total, page }
 *
 * ADAPTER: Converts `role/content/created_at` → `sender/text/timestamp` so the
 * existing message list rendering code works unchanged.
 */
export async function chatGetHistory(botId, page = 1, pageSize = 50) {
  try {
    const data = await apiPost("/api/chat/history", {
      bot_id: botId,
      page,
      page_size: pageSize,
    });

    const adapted = (data.messages || []).map((msg) => {
      // ── The backend now sends clean content + parsed flags ───────────
      const text = (msg.content || "").trim();

      // Trust server flags where available; fall back gracefully for legacy messages
      const isVoiceNote    = msg.is_voice_note    || false;
      const isImageMessage = msg.is_image_message || false;
      const isActivityStart = msg.is_activity_start || false;
      const isActivityEnd   = msg.is_activity_end   || false;
      const isVoiceCallStart = msg.is_voice_call_start || false;
      const isVoiceCallEnd   = msg.is_voice_call_end   || false;
      const isSystemMessage  = msg.is_system_message   ||
        isActivityStart || isActivityEnd || isVoiceCallStart || isVoiceCallEnd;

      const isActivityMessage = !!(
        msg.activity_type && msg.activity_type !== "chat" || isActivityStart || isActivityEnd
      );

      // Resolved media URLs — server already extracted these from content
      const audioUrl = msg.audio_url || (isVoiceNote ? msg.media_url : null) || null;
      const imageUrl = msg.image_url || (isImageMessage ? msg.media_url : null) || null;

      // Derive special activity_type for voice call banners
      let activity_type = msg.activity_type || null;
      if (isVoiceCallStart) activity_type = "VOICE_CALL_START";
      if (isVoiceCallEnd)   activity_type = "VOICE_CALL_END";

      return {
        id: msg.id,
        text,
        sender: msg.role === "bot" ? "bot" : "user",
        timestamp: msg.created_at ? new Date(msg.created_at) : new Date(),
        bot_id: msg.bot_id || botId,
        feedback: "",
        reaction: "",
        isImageMessage,
        imageUrl,
        audioUrl,
        isVoiceNote,
        isSystemMessage,
        isActivityMessage,
        activityId: msg.activity_type || null,
        isActivityStart,
        isActivityEnd,
        isVoiceCallStart,
        isVoiceCallEnd,
        activity_type,
      };
    });

    return { response: adapted, total: data.total };
  } catch (error) {
    console.error(`[chatGetHistory] failed for ${botId}:`, error);
    return { response: [] };
  }
}

export async function chatGetOverview() {
  try {
    const data = await apiGet("/api/chat/overview");
    return data;
  } catch (error) {
    console.error(`[chatGetOverview] failed:`, error);
    return { success: false, sessions: [] };
  }
}

/**
 * Signal end of chat session — syncs Redis → Supabase.
 * MUST be called on page unload / bot change.
 *
 * Old: navigator.sendBeacon("https://api.veliora.com/end-chat", blob)
 * New: POST /api/chat/end-chat  { bot_id, message: "", language: "english" }
 */
export function chatEndSession(botId) {
  // Use sendBeacon for beforeunload safety
  const payload = JSON.stringify({
    bot_id: botId,
    message: "",
    language: "english",
  });

  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    // sendBeacon doesn't support custom headers — use fetch as fallback for auth
    // The new backend requires auth, so we use fetch with keepalive
    return fetch(`${BASE_URL}/api/chat/end-chat`, {
      method: "POST",
      headers: authHeaders(),
      body: payload,
      keepalive: true,
    }).catch(() => {}); // fire-and-forget
  }

  return apiPost("/api/chat/end-chat", {
    bot_id: botId,
    message: "",
    language: "english",
  }).catch(() => {});
}

/**
 * Load chat session (old: POST /login to seed Redis).
 * The new backend auto-seeds on first /api/chat/send call — this is a no-op
 * kept so no call-sites break.
 */
export function chatInitSession(_email, _botId) {
  // New backend auto-initialises session on first send; nothing to do.
  return apiGet(`/api/chat/init/${encodeURIComponent(_botId)}`);
}

/**
 * Clear all chat messages for a user-bot pair (preserves memories and XP).
 * Calls DELETE /api/chat/clear?bot_id=...
 */
export async function chatClearChat(botId) {
  return apiDelete(`/api/chat/clear?bot_id=${encodeURIComponent(botId)}`);
}

/**
 * Permanently forget a friend — deletes messages, memories, and game sessions.
 * Calls DELETE /api/chat/forget?bot_id=...
 * THIS IS IRREVERSIBLE.
 */
export async function chatForgetFriend(botId) {
  return apiDelete(`/api/chat/forget?bot_id=${encodeURIComponent(botId)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. VOICE NOTE (TTS — REST)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a TTS audio URL for a text message.
 *
 * Old: POST api.veliora.com/generate-audio
 *      body: { transcript, bot_id, output_format: { container, encoding, sample_rate } }
 *      response: { audio_base64 }
 *
 * New: POST /api/voice/note
 *      body: { bot_id, message, language }
 *      response: { text_response, audio_url, duration_seconds, xp_earned }
 *
 * ADAPTER: Returns { audio_url, audio_base64: null } so PlayAudio can use the
 * URL directly instead of decoding base64.
 */
export async function voiceGenerateNote(botId, text, language = "english") {
  const data = await apiPost("/api/voice/note", {
    bot_id: botId,
    message: text,
    language,
  });

  return {
    audio_url: data.audio_url,
    audio_base64: null, // new backend returns a URL, not base64
    text_response: data.text_response,
    duration_seconds: data.duration_seconds,
    xp_earned: data.xp_earned,
  };
}

/**
 * Returns the WebSocket URL for a real-time voice call.
 * Old: wss://api.veliora.com/voice-call-ultra-fast (REST POST with FormData)
 * New: ws://localhost:8000/api/voice/call?token=<JWT>&bot_id=<BOT_ID>
 */
export function voiceGetCallUrl(botId) {
  const wsBase = BASE_URL.replace(/^https?:\/\//, "");
  const protocol = BASE_URL.startsWith("https") ? "wss" : "ws";
  return `${protocol}://${wsBase}/api/voice/call?token=${getToken()}&bot_id=${botId}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. IMAGES / SELFIE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a persona selfie.
 *
 * Old: two-step:
 *   1. GET  api.veliora.com/get-last-bot-responses-string/:email/:botId
 *   2. POST https://fastapi-imagegen-2l5aaarlka-uc.a.run.app/v1/generate_image
 *      body: { bot_id, message, email, previous_conversation, username }
 *      response: { image_url, image_base64, emotion_context }
 *
 * New: single step:
 *   POST /api/images/generate-selfie
 *   body: { bot_id, message, username }
 *   response: { image_url, image_base64, emotion_context, xp_earned }
 *
 * ADAPTER: Returns the same shape the UI already destructures.
 */
export async function imageGenerateSelfie(botId, message, username = "User") {
  const data = await apiPost("/api/images/generate-selfie", {
    bot_id: botId,
    message,
    username,
  });

  return {
    image_url: data.image_url,
    image_base64: data.image_base64,
    emotion_context: data.emotion_context,
    xp_earned: data.xp_earned,
  };
}

/**
 * Describe an uploaded image in-character.
 *
 * Old: POST https://fastapi-image-personality-233451779807.us-central1.run.app/analyze_image_with_file
 *      body: FormData { image, bot_id }
 *      response: { final_response, image_description, image_summary, bot_used }
 *
 * New: POST /api/multimodal/describe-image
 *      body: FormData { file, bot_id, language }
 *      response: { description, bot_response, xp_earned }
 *
 * ADAPTER: Returns the shape the handleImageUpload function expects.
 */
export async function imageDescribe(botId, imageFile, language = "english") {
  const fd = new FormData();
  fd.append("file", imageFile);
  fd.append("bot_id", botId);
  fd.append("language", language);

  const res = await fetch(`${BASE_URL}/api/multimodal/describe-image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` }, // no Content-Type for multipart
    body: fd,
  });

  if (!res.ok) throw new Error(`Image describe failed: ${res.status}`);
  const data = await res.json();

  // Adapt new → old shape
  return {
    final_response: data.bot_response || data.description,
    image_description: data.description,
    image_summary: data.description,
    bot_used: botId,
    xp_earned: data.xp_earned,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. MULTIMODAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Weather + News — old frontend called an external agent.
 *
 * New: GET /api/multimodal/weather/{bot_id}
 *
 * ADAPTER: Returns { response } to match what the UI already renders.
 */
export async function multimodalWeather(botId) {
  const data = await apiGet(`/api/multimodal/weather/${botId}`);
  return {
    response: data.bot_commentary,
    city: data.city,
    temperature: data.temperature,
    description: data.description,
  };
}

/**
 * Generate a meme.
 * New: POST /api/multimodal/meme  { bot_id, topic, language }
 * response: { text_meme, xp_earned }
 *
 * ADAPTER: Returns { response } shape.
 */
export async function multimodalMeme(botId, topic = null, language = "english") {
  const data = await apiPost("/api/multimodal/meme", { bot_id: botId, topic, language });
  return {
    response: data.text_meme,
    xp_earned: data.xp_earned,
  };
}

/**
 * Summarize a URL.
 */
export async function multimodalSummarizeURL(botId, url, language = "english") {
  const data = await apiPost("/api/multimodal/summarize-url", {
    bot_id: botId,
    url,
    language,
  });
  return {
    response: data.bot_response || data.summary,
    summary: data.summary,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. GAMES / ACTIVITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get game catalog for a bot.
 * New: GET /api/games/catalog/{bot_id}
 * response: { games: [ { id, name, description, archetype, xp_reward, ... } ] }
 */
export function gameGetCatalog(botId) {
  return apiGet(`/api/games/catalog/${botId}`);
}

/**
 * Start a game session.
 * New: POST /api/games/start  { bot_id, game_id }
 * response: { session_id, game_name, bot_id, opening_message, xp_earned }
 *
 * ADAPTER: Returns { reply: { raw: opening_message }, session_id, xp_status }
 * to match what handleActivityMessage currently expects.
 */
export async function gameStart(botId, gameId) {
  const data = await apiPost("/api/games/start", { bot_id: botId, game_id: gameId });
  return {
    session_id: data.session_id,
    game_name: data.game_name,
    reply: { raw: data.opening_message },
    response: data.opening_message,
    xp_status: data.xp_earned
      ? {
          xp_calculation_success: true,
          success: true,
          immediate_xp_awarded: data.xp_earned,
          current_total_xp: data.xp_earned,
        }
      : null,
  };
}

/**
 * Send a game action (user turn).
 * New: POST /api/games/action  { bot_id, session_id, action }
 * response: { session_id, bot_response, turn_number, is_game_over, result, xp_earned }
 *
 * Old callsite expected: { reply: { raw }, xp_status }
 */
export async function gameSendAction(botId, sessionId, action) {
  const data = await apiPost("/api/games/action", {
    bot_id: botId,
    session_id: sessionId,
    action,
  });
  return {
    session_id: data.session_id,
    reply: { raw: data.bot_response },
    response: data.bot_response,
    turn_number: data.turn_number,
    is_game_over: data.is_game_over,
    result: data.result,
    xp_status: data.xp_earned
      ? {
          xp_calculation_success: true,
          success: true,
          immediate_xp_awarded: data.xp_earned,
          current_total_xp: data.xp_earned,
        }
      : null,
  };
}

/**
 * End a game early.
 */
export function gameEnd(botId, sessionId) {
  return apiPost("/api/games/end", { bot_id: botId, session_id: sessionId });
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. DIARY / SUMMARIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the persona's diary for a user.
 *
 * Old: GET api.veliora.com/get-summaries/:email/:botId
 *      response: { summaries: [ { summary_date, generated_summary } ] }
 *
 * New: GET /api/diary/{bot_id}?limit=30
 *      response: { entries: [ { id, bot_id, entry_date, content, mood, created_at } ] }
 *
 * ADAPTER: Returns the format groupByMonth() already expects.
 */
export async function diaryGetEntries(botId, limit = 30) {
  const data = await apiGet(`/api/diary/${botId}?limit=${limit}`);

  // Convert new schema → old schema
  const summaries = (data.entries || []).map((entry) => ({
    summary_date: entry.entry_date || entry.created_at,
    generated_summary: entry.content,
    mood: entry.mood,
  }));

  return { summaries };
}

/**
 * Add a manual diary note explicitly.
 * New: POST /api/diary/add
 */
export async function diaryAddNote(_email, botId, text) {
  return apiPost("/api/diary/add", {
    bot_id: botId,
    content: text
  });
}

/**
 * Delete a diary entry.
 * Old: DELETE api.veliora.com/delete-summary  body: { email, bot_id, summary_date }
 * New backend has no direct delete-diary endpoint; this is a no-op placeholder
 * that silently succeeds so the UI doesn't break.
 */
export async function diaryDeleteEntry(_botId, _summaryDate) {
  // The new backend auto-manages diary entries via nightly CRON.
  // Client-side deletion is not yet exposed. Silently succeed.
  console.warn("[veliora-client] diaryDeleteEntry: no-op on new backend");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. MEMORIES (PERSONA)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch persona memories.
 * Old: GET api.veliora.com/get_persona?email=...&bot_id=...
 *      response: [ { id, memory, category, relation_id, created_at } ]
 *
 * New backend doesn't expose a direct persona-memories CRUD endpoint in the
 * integration spec. We keep the OLD endpoint call here so Memories.jsx
 * continues to work — these older calls to api.veliora.com for memories
 * remain unchanged (they aren't covered by the integration spec migration).
 *
 * For now, this is a transparent pass-through to the old endpoint.
 */
export function memoriesGet(_email, botId) {
  // Use unified auth wrapper instead of raw fetch
  // Ignore email parameter since the backend infers user from the JWT
  return apiGet(`/api/memory/get?bot_id=${encodeURIComponent(botId)}`);
}

export function memoriesAdd(payload) {
  return apiPost("/api/memory/add", payload);
}

export function memoriesUpdate(id, payload) {
  return apiPut(`/api/memory/update?id=${id}`, payload);
}

export function memoriesDelete(id) {
  return apiDelete(`/api/memory/delete?id=${id}`);
}

/**
 * Auto-extract memories from a conversation turn using Gemini.
 * Called after each successful chat message.
 * POST /api/memory/extract
 * Non-fatal: errors are swallowed so they never block the chat flow.
 */
export async function memoriesExtract(botId, userName, userMessage, botResponse) {
  try {
    return await apiPost("/api/memory/extract", {
      bot_id: botId,
      user_name: userName,
      user_message: userMessage,
      bot_response: botResponse,
    });
  } catch (err) {
    console.warn("[memoriesExtract] non-fatal extraction error:", err);
    return { success: false, extracted: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. XP (component-level)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get XP for the current user on a specific bot.
 *
 * Old: GET api.veliora.com/user-xp-current/:email/:botId
 *      response: { success, current_total_xp, magnitude }
 *
 * New: GET /api/auth/xp
 *      response: { total_xp, level, streak_days, streak_multiplier, ... }
 *
 * ADAPTER: Returns the shape XPSystem.jsx already expects.
 */
export async function xpGetCurrent(_email, _botId) {
  // The new backend returns global XP (not per-bot). We adapt it to the
  // per-bot shape the component expects.
  const data = await authGetXP();
  return {
    success: true,
    current_total_xp: data.total_xp || 0,
    magnitude: data.level || 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. REMINDER (legacy — unchanged endpoint)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reminder response — not in new integration spec, keep old endpoint.
 */
export async function reminderGetResponse(payload) {
  const res = await fetch(`${BASE_URL}/api/reminders/response`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Reminder API error");
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. FEEDBACK (message like/dislike — legacy)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Not in new spec — keep old endpoint.
 */
export async function messageFeedback(msgId, feedback) {
  const res = await fetch(
    `${BASE_URL}/api/chat/feedback/${msgId}/${feedback}`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error("Feedback API error");
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. FESTIVAL GREETING (external — unchanged)
// ─────────────────────────────────────────────────────────────────────────────

export async function festivalGetGreeting(payload) {
  const res = await fetch(
    "https://festival-agent-233451779807.asia-south1.run.app/festivals/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) return null;
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. STORE ACTIVITY MESSAGE (legacy endpoint — kept for backward compat)
// ─────────────────────────────────────────────────────────────────────────────

export async function storeActivityMessage(payload) {
  // The new backend doesn't expose this separately; it is handled internally
  // by /api/games/action. This is a silent no-op.
  console.warn("[veliora-client] storeActivityMessage: proxied internally by /api/games");
  return { status: "ok" };
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. STORE MESSAGE (legacy — new backend handles internally)
// ─────────────────────────────────────────────────────────────────────────────

export async function storeMessage(_payload) {
  // New backend handles all storage internally on /api/chat/send.
  return { status: "ok" };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT: Singleton client for use by hooks
// ─────────────────────────────────────────────────────────────────────────────

export const velioraClient = {
  // Auth
  login: authLogin,
  signup: authSignup,
  logout: authLogout,
  getProfile: authGetProfile,
  updateProfile: authUpdateProfile,
  updatePassword: authUpdatePassword,
  getXP: authGetXP,

  // Chat
  sendMessage: chatSend,
  getHistory: chatGetHistory,
  getOverview: chatGetOverview,
  endChat: chatEndSession,
  initSession: chatInitSession,

  // Voice
  generateVoiceNote: voiceGenerateNote,
  getVoiceCallUrl: voiceGetCallUrl,

  // Images
  generateSelfie: imageGenerateSelfie,
  describeImage: imageDescribe,

  // Multimodal
  getWeather: multimodalWeather,
  generateMeme: multimodalMeme,
  summarizeURL: multimodalSummarizeURL,

  // Games
  getGameCatalog: gameGetCatalog,
  startGame: gameStart,
  sendGameAction: gameSendAction,
  endGame: gameEnd,

  // Diary
  getDiaryEntries: diaryGetEntries,
  addDiaryNote: diaryAddNote,
  deleteDiaryEntry: diaryDeleteEntry,

  // Memories
  getMemories: memoriesGet,
  addMemory: memoriesAdd,
  updateMemory: memoriesUpdate,
  deleteMemory: memoriesDelete,

  // XP
  getBotXP: xpGetCurrent,

  // Misc
  getToken,
};

export default velioraClient;
