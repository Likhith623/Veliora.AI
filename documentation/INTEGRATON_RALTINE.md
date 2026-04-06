# 🌐 Veliora.AI — Realtime Communication: Complete Frontend Integration Guide

> **Base URL**: `http://localhost:8000/api/v1`  
> **Auth**: All protected endpoints require `Authorization: Bearer <JWT_TOKEN>` in headers  
> **WebSocket Auth**: Pass token as query parameter `?token=<JWT>` or `user_id` in URL path  
> **Content-Type**: `application/json` for all REST endpoints unless otherwise noted

---

## 📋 Table of Contents

1. [Authentication Flow](#1-authentication-flow)  
2. [Profiles](#2-profiles)  
3. [Verification](#3-verification)  
4. [Matching & Browse](#4-matching--browse)  
5. [Friends](#5-friends)  
6. [Chat (REST + WebSocket)](#6-chat-rest--websocket)  
7. [Calls — WebRTC Signaling + STT/TTS](#7-calls--webrtc-signaling--stttts)  
8. [Family Rooms](#8-family-rooms)  
9. [Games (Turn-Based)](#9-games-turn-based)  
10. [Live Games (Real-Time WebSocket)](#10-live-games-real-time-websocket)  
11. [Contests](#11-contests)  
12. [Questions](#12-questions)  
13. [Translation](#13-translation)  
14. [Safety](#14-safety)  
15. [Privacy Settings](#15-privacy-settings)  
16. [XP System](#16-xp-system)  
17. [Voice (STT / TTS standalone)](#17-voice-stt--tts-standalone)  
18. [WebSocket Reference Card](#18-websocket-reference-card)  
19. [Error Codes Reference](#19-error-codes-reference)

---

## 1. Authentication Flow

> **Router prefix**: `/api/v1/auth`

### 1.1 Sign Up

**POST** `/api/v1/auth/signup`

**Headers**: None required (public endpoint)

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "display_name": "Arjun Sharma",
  "username": "arjun_s",
  "date_of_birth": "1995-06-15",
  "gender": "male",
  "country": "IN",
  "city": "Hyderabad",
  "timezone": "Asia/Kolkata"
}
```

**Field Rules**:
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `email` | string | ✅ | Valid email format |
| `password` | string | ✅ | Min 6 characters |
| `display_name` | string | ✅ | Full display name |
| `username` | string | ✅ | Unique across platform |
| `date_of_birth` | string | ❌ | ISO format `YYYY-MM-DD`. Age < 18 → `is_minor: true` |
| `gender` | string | ❌ | Free text or enum |
| `country` | string | ✅ | ISO 2-letter country code |
| `city` | string | ❌ | City name |
| `timezone` | string | ❌ | IANA timezone string |

**Success Response** `200 OK`:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
```

> ⚠️ **Important**: `access_token` may be empty string `""` if Supabase email confirmation is pending. In that case, prompt user to verify email and then call `/login`.

**Error Responses**:
```json
{ "detail": "Username already taken" }           // 400
{ "detail": "An account with this email already exists" }  // 400
{ "detail": "Password must be at least 6 characters" }    // 400
```

---

### 1.2 Login

**POST** `/api/v1/auth/login`

**Headers**: None required

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Success Response** `200 OK`:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
```

> 🔑 **Store the `access_token` securely** — use it as `Bearer` token for all subsequent calls.

---

### 1.3 Frontend Auth Helper (JavaScript)

```javascript
// auth.js — Reuse this throughout your app

const BASE_URL = "http://localhost:8000/api/v1";

// Store token after login
function saveToken(token) {
  localStorage.setItem("rt_token", token);
}

function getToken() {
  return localStorage.getItem("rt_token");
}

// Use in every authenticated request
function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getToken()}`
  };
}

// Generic fetch wrapper with auth
async function apiFetch(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {})
    }
  });
  
  if (response.status === 401) {
    // Token expired — redirect to login
    localStorage.removeItem("rt_token");
    window.location.href = "/login";
    return;
  }
  
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "API Error");
  }
  
  return response.json();
}

// ── Signup ──────────────────────────────────────
async function signup(data) {
  const res = await fetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.detail);
  if (body.access_token) saveToken(body.access_token);
  return body;
}

// ── Login ───────────────────────────────────────
async function login(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.detail);
  saveToken(body.access_token);
  return body;
}
```

---

## 2. Profiles

> **Router prefix**: `/api/v1/profiles`

### 2.1 Get My Profile

**GET** `/api/v1/profiles/me`  
**Auth**: Required

**Response** `200 OK`:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "arjun_s",
  "display_name": "Arjun Sharma",
  "email": "user@example.com",
  "bio": "Love connecting across cultures!",
  "city": "Hyderabad",
  "country": "IN",
  "timezone": "Asia/Kolkata",
  "gender": "male",
  "avatar_config": { "skin": "#FDBCB4", "hair": "black" },
  "is_verified": false,
  "is_minor": false,
  "is_banned": false,
  "care_score": 4.8,
  "matching_preferences": {
    "offering_role": "mentor",
    "preferred_roles": ["mentor", "friend"],
    "seeking_role": "student"
  },
  "total_xp": 2400,
  "level": 3,
  "status": "online",
  "status_message": "Exploring the world!",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### 2.2 Get Any User's Profile

**GET** `/api/v1/profiles/{user_id}`  
**Auth**: Optional

**Path Param**: `user_id` — UUID of target user

**Response**: Same shape as above.

---

### 2.3 Update My Profile

**PUT** `/api/v1/profiles/me`  
**Auth**: Required

**Request Body** (all fields optional):
```json
{
  "display_name": "Arjun Kumar Sharma",
  "bio": "Tech mentor from Hyderabad",
  "city": "Bangalore",
  "timezone": "Asia/Kolkata",
  "gender": "male",
  "avatar_config": { "skin": "#FDBCB4", "hair": "black", "outfit": "casual" },
  "status": "online",
  "status_message": "Available for mentoring!",
  "matching_preferences": {
    "offering_role": "mentor",
    "preferred_roles": ["mentor", "friend"],
    "seeking_role": "student"
  }
}
```

> ⚠️ `status` valid values: `"online"`, `"offline"`, `"busy"`, `"away"`

---

### 2.4 Update Avatar

**PUT** `/api/v1/profiles/{user_id}/avatar`  
**Auth**: Required (must be own user_id)

**Request Body**:
```json
{
  "avatar_config": {
    "skin": "#F5CBA7",
    "hair": "curly",
    "hair_color": "brown",
    "outfit": "traditional",
    "accessories": ["glasses"]
  }
}
```

> 💡 `avatar_config` is a free-form JSON object — store any avatar system data you need.

---

### 2.5 Set My Role (for Matching)

**POST** `/api/v1/profiles/me/role`  
**Auth**: Required

**Request Body**:
```json
{
  "offering_role": "mentor",
  "preferred_roles": ["mentor", "friend"],
  "seeking_role": "student"
}
```

**Valid Roles**: `mother`, `father`, `son`, `daughter`, `mentor`, `student`, `brother`, `sister`, `friend`, `grandparent`, `grandchild`, `sibling`, `penpal`

> Use `preferred_roles: []` to clear all roles.

---

### 2.6 Add Language

**POST** `/api/v1/profiles/{user_id}/languages`  
**Auth**: Required

**Request Body**:
```json
{
  "language_code": "hi",
  "language_name": "Hindi",
  "proficiency": "native",
  "is_primary": true,
  "show_original": false
}
```

**`proficiency` values**: `"native"`, `"fluent"`, `"intermediate"`, `"beginner"`

---

### 2.7 Remove Language

**DELETE** `/api/v1/profiles/{user_id}/languages/{language_code}`  
**Auth**: Required

---

### 2.8 Update Status

**PUT** `/api/v1/profiles/{user_id}/status`  
**Auth**: Required

**Request Body**:
```json
{
  "status": "online",
  "status_message": "Studying Japanese today!"
}
```

---

### 2.9 Get Relationships

**GET** `/api/v1/profiles/{user_id}/relationships`  
**Auth**: Required

**Response**:
```json
[
  {
    "id": "rel-uuid",
    "user_a_id": "user-uuid-1",
    "user_b_id": "user-uuid-2",
    "status": "active",
    "level": 3,
    "level_label": "Bonded",
    "shared_xp": 1800,
    "created_at": "2024-02-01T00:00:00Z"
  }
]
```

---

### 2.10 Notifications

**GET** `/api/v1/profiles/{user_id}/notifications`  
**Auth**: Required

**Response**:
```json
[
  {
    "id": "notif-uuid",
    "type": "incoming_call",
    "data": { "relationship_id": "rel-uuid", "call_type": "audio" },
    "is_read": false,
    "created_at": "2024-04-01T10:00:00Z"
  }
]
```

**Mark One Read**: `PUT /api/v1/profiles/{user_id}/notifications/{notification_id}/read`  
**Mark All Read**: `PUT /api/v1/profiles/{user_id}/notifications/read-all`  
**Delete One**: `DELETE /api/v1/profiles/{user_id}/notifications/{notification_id}`  
**Delete All**: `DELETE /api/v1/profiles/{user_id}/notifications`

---

## 3. Verification

> **Router prefix**: `/api/v1/verification`

### 3.1 Submit Verification

**POST** `/api/v1/verification/submit`  
**Auth**: Required

**Request Body**:
```json
{
  "document_type": "passport",
  "document_url": "https://storage.example.com/docs/passport.jpg",
  "selfie_url": "https://storage.example.com/selfies/selfie.jpg"
}
```

**Response**:
```json
{
  "status": "pending",
  "submitted_at": "2024-04-01T10:00:00Z",
  "message": "Verification submitted. Review takes 24-48 hours."
}
```

---

### 3.2 Check Verification Status

**GET** `/api/v1/verification/status`  
**Auth**: Required

**Response**:
```json
{
  "is_verified": false,
  "status": "pending",
  "submitted_at": "2024-04-01T10:00:00Z",
  "reviewed_at": null,
  "rejection_reason": null
}
```

---

## 4. Matching & Browse

> **Router prefix**: `/api/v1/matching`

### 4.1 Browse by Role (Main Search)

**GET** `/api/v1/matching/browse/{role}`  
**Auth**: Not required (public)

**Path Param**: `role` — one of the valid roles  
**Example**: `GET /api/v1/matching/browse/mentor`

**Response**:
```json
[
  {
    "id": "user-uuid",
    "display_name": "Keiko Tanaka",
    "country": "JP",
    "city": "Tokyo",
    "avatar_config": { "skin": "#F4D0B5" },
    "is_verified": true,
    "care_score": 4.9,
    "bio": "Japanese language teacher, love cultural exchange"
  }
]
```

> ℹ️ This endpoint searches BOTH the `role` column AND `matching_preferences` JSONB. It's the recommended main search endpoint.

---

### 4.2 Browse Public (Alternate)

**GET** `/api/v1/matching/browse-public/{role}`  
**Auth**: Not required

Same response format as 4.1.

---

### 4.3 Browse All Profiles

**GET** `/api/v1/matching/browse-all`  
**Auth**: Not required

Returns all non-banned profiles without role filtering.

---

### 4.4 Connect / Send Match Request

**POST** `/api/v1/matching/connect/{target_user_id}`  
**Auth**: Required

**Request Body**:
```json
{
  "seeking_role": "student",
  "offering_role": "mentor",
  "preferred_age_min": 20,
  "preferred_age_max": 40,
  "preferred_countries": ["JP", "KR"],
  "language_priority": "japanese"
}
```

**Response**:
```json
{
  "relationship_id": "rel-uuid",
  "status": "pending",
  "message": "Connection request sent!"
}
```

---

### 4.5 Advanced Search

**POST** `/api/v1/matching/search`  
**Auth**: Required

**Request Body**:
```json
{
  "seeking_role": "friend",
  "offering_role": "friend",
  "preferred_age_min": 18,
  "preferred_age_max": 30,
  "preferred_countries": ["IN", "US", "GB"],
  "language_priority": "english"
}
```

---

### 4.6 Get Match Queue

**GET** `/api/v1/matching/queue/{user_id}`  
**Auth**: Required

Returns pending match requests for the user.

---

### 4.7 Delete from Match Queue

**DELETE** `/api/v1/matching/queue/{user_id}`  
**Auth**: Required

Clears the user from the queue.

---

### 4.8 List Valid Roles

**GET** `/api/v1/matching/roles`  
**Auth**: Not required

**Response**:
```json
{
  "roles": ["mother", "father", "son", "daughter", "mentor", "student",
            "brother", "sister", "friend", "grandparent", "grandchild",
            "sibling", "penpal"]
}
```

---

## 5. Friends

> **Router prefix**: `/api/v1/friends`

### 5.1 Search Friends

**GET** `/api/v1/friends/search?q=keiko`  
**Auth**: Required

**Query Params**: `q` — search term (name or username)

**Response**:
```json
[
  {
    "user_id": "user-uuid",
    "display_name": "Keiko Tanaka",
    "username": "keiko_t",
    "country": "JP",
    "is_verified": true,
    "relationship_status": "none"  // "none" | "pending" | "active"
  }
]
```

---

### 5.2 Send Friend Request

**POST** `/api/v1/friends/request/{target_id}`  
**Auth**: Required

**No request body needed.**

**Response**:
```json
{
  "request_id": "req-uuid",
  "status": "pending",
  "message": "Friend request sent to Keiko Tanaka"
}
```

---

### 5.3 Respond to Friend Request

**POST** `/api/v1/friends/respond/{request_id}`  
**Auth**: Required

**Request Body**:
```json
{
  "action": "accept"
}
```

`action` values: `"accept"` or `"reject"`

**Response** (on accept):
```json
{
  "relationship_id": "rel-uuid",
  "status": "active",
  "message": "You are now connected with Keiko Tanaka!"
}
```

---

### 5.4 Get Pending Requests

**GET** `/api/v1/friends/requests`  
**Auth**: Required

**Response**:
```json
[
  {
    "id": "req-uuid",
    "from_user_id": "user-uuid",
    "from_display_name": "Keiko Tanaka",
    "from_country": "JP",
    "created_at": "2024-04-01T10:00:00Z",
    "status": "pending"
  }
]
```

---

### 5.5 List My Friends / Connections

**GET** `/api/v1/friends/list`  
**Auth**: Required

**Response**:
```json
[
  {
    "relationship_id": "rel-uuid",
    "partner_id": "partner-uuid",
    "partner_display_name": "Keiko Tanaka",
    "partner_country": "JP",
    "partner_avatar_config": {},
    "level": 2,
    "level_label": "Growing",
    "status": "active",
    "last_message_at": "2024-04-01T12:00:00Z"
  }
]
```

---

### 5.6 Get Friend's Profile

**GET** `/api/v1/friends/{friend_id}/profile`  
**Auth**: Required

Returns detailed profile of friend including relationship level.

---

### 5.7 Remove / Disconnect

**DELETE** `/api/v1/friends/{relationship_id}`  
**Auth**: Required

Removes the relationship. Returns `{ "message": "Relationship ended" }`.

---

## 6. Chat (REST + WebSocket)

> **Router prefix**: `/api/v1/chat`

### 6.1 Send Message

**POST** `/api/v1/chat/send`  
**Auth**: Required

**Request Body**:
```json
{
  "relationship_id": "rel-uuid",
  "original_text": "Hello! How are you today? 😊",
  "content_type": "text",
  "original_language": "en",
  "reply_to_id": null
}
```

**`content_type` values**: `"text"`, `"image"`, `"video"`, `"voice"`

**For media messages**, include the URL fields:
```json
{
  "relationship_id": "rel-uuid",
  "original_text": "",
  "content_type": "image",
  "image_url": "https://storage.supabase.co/images/photo.jpg"
}
```

**Response**:
```json
{
  "id": "msg-uuid",
  "relationship_id": "rel-uuid",
  "sender_id": "user-uuid",
  "original_text": "Hello! How are you today? 😊",
  "translated_text": "こんにちは！今日はいかがですか？😊",
  "original_language": "en",
  "translated_language": "ja",
  "content_type": "text",
  "has_idiom": false,
  "idiom_explanation": null,
  "cultural_note": null,
  "created_at": "2024-04-01T10:00:00Z"
}
```

> 🌐 Translation happens **automatically** — the backend detects the source language and translates to the partner's preferred language.

---

### 6.2 Upload Media File

**POST** `/api/v1/chat/upload-media`  
**Auth**: Required  
**Content-Type**: `multipart/form-data`

**Form Fields**:
- `file`: The media file (image, video, or audio)
- `relationship_id`: The relationship ID (string)
- `media_type`: `"image"`, `"video"`, or `"voice"`

**Response**:
```json
{
  "url": "https://storage.supabase.co/bucket/path/filename.jpg",
  "media_type": "image",
  "size_bytes": 102400
}
```

> 📤 Upload media first, then pass the URL in `send` endpoint.

**Complete Media Send Flow (Frontend)**:
```javascript
async function sendImageMessage(relationshipId, imageFile) {
  // Step 1: Upload
  const formData = new FormData();
  formData.append("file", imageFile);
  formData.append("relationship_id", relationshipId);
  formData.append("media_type", "image");
  
  const uploadRes = await fetch(`${BASE_URL}/chat/upload-media`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${getToken()}` },
    body: formData
  });
  const { url } = await uploadRes.json();
  
  // Step 2: Send message with URL
  return apiFetch("/chat/send", {
    method: "POST",
    body: JSON.stringify({
      relationship_id: relationshipId,
      original_text: "",
      content_type: "image",
      image_url: url
    })
  });
}
```

---

### 6.3 Get Messages (History)

**GET** `/api/v1/chat/messages/{relationship_id}?limit=50&before=<timestamp>`  
**Auth**: Required

**Query Params**:
- `limit` (int, default 50) — number of messages
- `before` (ISO timestamp, optional) — for pagination (get messages before this time)

**Response**:
```json
[
  {
    "id": "msg-uuid",
    "sender_id": "user-uuid",
    "original_text": "Hello!",
    "translated_text": "こんにちは！",
    "content_type": "text",
    "voice_url": null,
    "image_url": null,
    "video_url": null,
    "reply_to_id": null,
    "reactions": { "❤️": 1, "😂": 2 },
    "created_at": "2024-04-01T10:00:00Z",
    "is_deleted": false
  }
]
```

---

### 6.4 Get Relationship Info

**GET** `/api/v1/chat/relationship/{relationship_id}`  
**Auth**: Required

**Response**:
```json
{
  "id": "rel-uuid",
  "user_a_id": "user-uuid-1",
  "user_b_id": "user-uuid-2",
  "status": "active",
  "level": 3,
  "level_label": "Bonded",
  "shared_xp": 2400,
  "created_at": "2024-02-01T00:00:00Z"
}
```

---

### 6.5 Create Poll

**POST** `/api/v1/chat/poll/create`  
**Auth**: Required

**Request Body**:
```json
{
  "question": "Where should we meet next?",
  "options": ["Tokyo", "Seoul", "Singapore", "Bangkok"],
  "relationship_id": "rel-uuid",
  "allow_multiple": false,
  "is_anonymous": false,
  "expires_at": "2024-04-02T10:00:00Z"
}
```

**Response**:
```json
{
  "poll_id": "poll-uuid",
  "question": "Where should we meet next?",
  "options": ["Tokyo", "Seoul", "Singapore", "Bangkok"],
  "created_at": "2024-04-01T10:00:00Z"
}
```

---

### 6.6 Vote on Poll

**POST** `/api/v1/chat/poll/{poll_id}/vote`  
**Auth**: Required

**Request Body**:
```json
{
  "selected_option": 0
}
```

> `selected_option` is the 0-based index of the chosen option.

---

### 6.7 Get Poll Results

**GET** `/api/v1/chat/poll/{poll_id}`  
**Auth**: Required

**Response**:
```json
{
  "poll_id": "poll-uuid",
  "question": "Where should we meet next?",
  "options": ["Tokyo", "Seoul", "Singapore", "Bangkok"],
  "votes": [3, 5, 2, 1],
  "total_votes": 11,
  "user_vote": 1,
  "expires_at": "2024-04-02T10:00:00Z"
}
```

---

### 6.8 React to Message

**POST** `/api/v1/chat/message/{message_id}/react`  
**Auth**: Required

**Request Body**:
```json
{
  "emoji": "❤️"
}
```

> Sending the same emoji again **removes** the reaction (toggle behavior).

---

### 6.9 Delete Message

**DELETE** `/api/v1/chat/message/{message_id}`  
**Auth**: Required

Soft-deletes the message (`is_deleted: true`).

---

### 6.10 Forward Message

**POST** `/api/v1/chat/message/{message_id}/forward`  
**Auth**: Required

**Request Body**:
```json
{
  "target_relationship_id": "other-rel-uuid"
}
```

---

### 6.11 Gift XP

**POST** `/api/v1/chat/gift-xp`  
**Auth**: Required

**Request Body**:
```json
{
  "relationship_id": "rel-uuid",
  "amount": 100,
  "message": "Thanks for being an amazing mentor! 🙏"
}
```

**Response**:
```json
{
  "gifted_xp": 100,
  "relationship_id": "rel-uuid",
  "message": "XP gift sent!"
}
```

---

### 6.12 Chat WebSocket (Real-Time)

**WS** `ws://localhost:8000/api/v1/chat/ws/{relationship_id}/{user_id}`

> ⚠️ **No token in URL** — auth is by presence; ensure the user is part of this relationship.

**Connect**:
```javascript
const ws = new WebSocket(
  `ws://localhost:8000/api/v1/chat/ws/${relationshipId}/${userId}`
);
```

**Incoming Messages** (from server → client):
```json
// New message from partner
{
  "type": "new_message",
  "message": {
    "id": "msg-uuid",
    "sender_id": "partner-uuid",
    "original_text": "Hello!",
    "translated_text": "नमस्ते!",
    "content_type": "text",
    "created_at": "2024-04-01T10:00:00Z"
  }
}

// Partner is typing
{ "type": "typing", "user_id": "partner-uuid" }

// Partner stopped typing
{ "type": "stopped_typing", "user_id": "partner-uuid" }

// Read receipt
{ "type": "read_receipt", "message_id": "msg-uuid", "reader_id": "partner-uuid" }

// New reaction
{ "type": "reaction", "message_id": "msg-uuid", "emoji": "❤️", "user_id": "partner-uuid" }
```

**Outgoing Messages** (client → server):
```json
// Indicate typing
{ "type": "typing" }

// Stop typing
{ "type": "stopped_typing" }

// Mark messages as read
{ "type": "read", "message_id": "msg-uuid" }
```

**Full WebSocket Example**:
```javascript
class ChatWebSocket {
  constructor(relationshipId, userId, onMessage) {
    this.ws = new WebSocket(
      `ws://localhost:8000/api/v1/chat/ws/${relationshipId}/${userId}`
    );
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };
    
    this.ws.onerror = (err) => console.error("Chat WS error:", err);
    this.ws.onclose = () => console.log("Chat WS closed");
  }
  
  sendTyping() {
    this.ws.send(JSON.stringify({ type: "typing" }));
  }
  
  stopTyping() {
    this.ws.send(JSON.stringify({ type: "stopped_typing" }));
  }
  
  markRead(messageId) {
    this.ws.send(JSON.stringify({ type: "read", message_id: messageId }));
  }
  
  close() {
    this.ws.close();
  }
}
```

---

## 7. Calls — WebRTC Signaling + STT/TTS

> **Router prefix**: `/api/v1/calls`

### 7.1 WebRTC Signaling WebSocket

**WS** `ws://localhost:8000/api/v1/calls/signal/{relationship_id}/{user_id}`

> 🔐 Level requirement: **Audio calls ≥ Level 3**, **Video calls ≥ Level 4**

**Connect**:
```javascript
const signalingWs = new WebSocket(
  `ws://localhost:8000/api/v1/calls/signal/${relationshipId}/${userId}`
);
```

**Messages Sent by Client**:
```json
// Initiate a call
{ "type": "call_start", "call_type": "audio" }  // or "video"

// WebRTC offer (from caller)
{ "type": "offer", "sdp": "<SDP_STRING>" }

// WebRTC answer (from receiver)
{ "type": "answer", "sdp": "<SDP_STRING>" }

// ICE candidate exchange
{
  "type": "ice_candidate",
  "candidate": {
    "candidate": "candidate:...",
    "sdpMLineIndex": 0,
    "sdpMid": "0"
  }
}

// End call
{ "type": "call_end" }
```

**Messages Received from Server**:
```json
// Incoming call notification
{
  "type": "incoming_call",
  "call_type": "audio",
  "caller_id": "caller-uuid",
  "relationship_id": "rel-uuid"
}

// Partner's SDP offer relayed to you
{ "type": "offer", "sdp": "<SDP_STRING>" }

// Partner's SDP answer relayed to you
{ "type": "answer", "sdp": "<SDP_STRING>" }

// Partner's ICE candidate relayed to you
{ "type": "ice_candidate", "candidate": { ... } }

// Call ended
{ "type": "call_ended", "by": "partner-uuid" }

// Error (e.g., level too low)
{ "type": "error", "message": "Audio calls require Level 3 (Bonded). Current: Level 2." }
```

**Complete WebRTC Flow (Frontend)**:
```javascript
class VelioraWebRTCCall {
  constructor(relationshipId, myUserId, onRemoteStream) {
    this.relationshipId = relationshipId;
    this.myUserId = myUserId;
    this.onRemoteStream = onRemoteStream;
    this.pc = null;
    this.ws = null;
    this.localStream = null;
  }
  
  async startCall(callType = "audio") {
    // 1. Open signaling WS
    this.ws = new WebSocket(
      `ws://localhost:8000/api/v1/calls/signal/${this.relationshipId}/${this.myUserId}`
    );
    
    this.ws.onopen = async () => {
      // 2. Get local media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video"
      });
      
      // 3. Create RTCPeerConnection
      this.pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });
      
      // 4. Add tracks
      this.localStream.getTracks().forEach(track =>
        this.pc.addTrack(track, this.localStream)
      );
      
      // 5. Handle ICE candidates
      this.pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          this.ws.send(JSON.stringify({
            type: "ice_candidate",
            candidate
          }));
        }
      };
      
      // 6. Handle remote stream
      this.pc.ontrack = ({ streams }) => {
        this.onRemoteStream(streams[0]);
      };
      
      // 7. Signal call start
      this.ws.send(JSON.stringify({ type: "call_start", call_type: callType }));
      
      // 8. Create offer
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.ws.send(JSON.stringify({ type: "offer", sdp: offer.sdp }));
    };
    
    this.ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      
      if (msg.type === "answer") {
        await this.pc.setRemoteDescription({
          type: "answer", sdp: msg.sdp
        });
      } else if (msg.type === "ice_candidate") {
        await this.pc.addIceCandidate(msg.candidate);
      } else if (msg.type === "call_ended") {
        this.endCall();
      } else if (msg.type === "error") {
        console.error("Call error:", msg.message);
        this.endCall();
      }
    };
  }
  
  // Called by the RECEIVER to accept an incoming call
  async acceptCall(offerSdp) {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
    
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.localStream.getTracks().forEach(t => this.pc.addTrack(t, this.localStream));
    
    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.ws.send(JSON.stringify({ type: "ice_candidate", candidate }));
    };
    
    this.pc.ontrack = ({ streams }) => this.onRemoteStream(streams[0]);
    
    await this.pc.setRemoteDescription({ type: "offer", sdp: offerSdp });
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    
    this.ws.send(JSON.stringify({ type: "answer", sdp: answer.sdp }));
  }
  
  endCall() {
    if (this.ws) this.ws.send(JSON.stringify({ type: "call_end" }));
    if (this.pc) this.pc.close();
    if (this.localStream) this.localStream.getTracks().forEach(t => t.stop());
    if (this.ws) this.ws.close();
  }
}
```

---

### 7.2 Transcribe Audio (STT)

**POST** `/api/v1/calls/transcribe`  
**Auth**: Required  
**Content-Type**: `multipart/form-data`

**Form Fields**:
- `audio`: Audio file (WAV, MP3, M4A, WEBM)

**Response**:
```json
{
  "transcript": "Hello, how are you today?",
  "language_detected": "en",
  "confidence": 0.97
}
```

---

### 7.3 Text to Speech (TTS)

**POST** `/api/v1/calls/speak`  
**Auth**: Required

**Request Body**:
```json
{
  "text": "Hello, welcome to Veliora!",
  "language": "en"
}
```

**Response**: Raw audio bytes (`audio/mpeg`)  
> Use `response.blob()` in JavaScript and create an audio URL: `URL.createObjectURL(blob)`

```javascript
async function textToSpeech(text, language = "en") {
  const res = await fetch(`${BASE_URL}/calls/speak`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ text, language })
  });
  const blob = await res.blob();
  const audioUrl = URL.createObjectURL(blob);
  const audio = new Audio(audioUrl);
  audio.play();
}
```

---

### 7.4 List Available Voices

**GET** `/api/v1/calls/voices`  
**Auth**: Required

**Response**:
```json
{
  "voices": [
    { "voice_id": "en-US-1", "name": "Emma", "language": "en", "gender": "female" },
    { "voice_id": "ja-JP-1", "name": "Yuki", "language": "ja", "gender": "female" }
  ]
}
```

---

### 7.5 Call Logs

**GET** `/api/v1/calls/logs/{relationship_id}`  
**Auth**: Required

**Response**:
```json
[
  {
    "id": "log-uuid",
    "relationship_id": "rel-uuid",
    "call_type": "audio",
    "started_at": "2024-04-01T10:00:00Z",
    "ended_at": "2024-04-01T10:15:00Z",
    "duration_seconds": 900
  }
]
```

---

## 8. Family Rooms

> **Router prefix**: `/api/v1/rooms`

### 8.1 Create Room

**POST** `/api/v1/rooms/create`  
**Auth**: Required

**Request Body**:
```json
{
  "room_name": "The Singh Family",
  "description": "Our global family chat room",
  "room_type": "family",
  "max_members": 20
}
```

> 💡 Creating a room requires Level 5 in at least one relationship.

**Response**:
```json
{
  "room": {
    "id": "room-uuid",
    "room_name": "The Singh Family",
    "description": "Our global family chat room",
    "room_type": "family",
    "max_members": 20,
    "created_by": "user-uuid",
    "created_at": "2024-04-01T10:00:00Z"
  }
}
```

---

### 8.2 Get My Rooms

**GET** `/api/v1/rooms/`  
**Auth**: Required

**Response**: Array of room objects with member count and recent activity.

---

### 8.3 Invite to Room

**POST** `/api/v1/rooms/{room_id}/invite`  
**Auth**: Required

**Request Body**:
```json
{
  "target_user_id": "user-uuid",
  "role_in_room": "daughter"
}
```

---

### 8.4 Join Room

**POST** `/api/v1/rooms/{room_id}/join`  
**Auth**: Required

**Request Body**:
```json
{
  "join_code": "ABC123",
  "role_in_room": "friend"
}
```

---

### 8.5 Join By Code

**POST** `/api/v1/rooms/join-by-code`  
**Auth**: Required

**Request Body**:
```json
{
  "code": "FAMILY2024"
}
```

---

### 8.6 Generate Join Code

**POST** `/api/v1/rooms/{room_id}/join-code`  
**Auth**: Required

**Request Body**:
```json
{
  "expires_in_hours": 48,
  "max_uses": 10
}
```

**Response**:
```json
{
  "code": "FAMILY2024",
  "expires_at": "2024-04-03T10:00:00Z",
  "max_uses": 10
}
```

---

### 8.7 Get Join Codes

**GET** `/api/v1/rooms/{room_id}/join-codes`  
**Auth**: Required

---

### 8.8 Send Room Message

**POST** `/api/v1/rooms/{room_id}/message`  
**Auth**: Required

**Request Body**:
```json
{
  "content": "Hello family! 🎉",
  "content_type": "text",
  "media_url": null
}
```

---

### 8.9 Get Room Messages

**GET** `/api/v1/rooms/{room_id}/messages?limit=50`  
**Auth**: Required

---

### 8.10 Leave Room

**POST** `/api/v1/rooms/{room_id}/leave`  
**Auth**: Required

---

### 8.11 Cultural Potluck

**POST** `/api/v1/rooms/{room_id}/potluck`  
**Auth**: Required

**Request Body**:
```json
{
  "dish_name": "Butter Chicken",
  "description": "A classic North Indian curry",
  "recipe_url": "https://example.com/recipe",
  "culture_origin": "IN",
  "image_url": "https://storage.example.com/dish.jpg"
}
```

---

### 8.12 Get Potlucks

**GET** `/api/v1/rooms/{room_id}/potlucks`  
**Auth**: Required

---

### 8.13 Room Poll - Create

**POST** `/api/v1/rooms/{room_id}/poll/create`  
**Auth**: Required

**Request Body**:
```json
{
  "question": "What should we cook for our cultural potluck?",
  "options": ["Sushi", "Biryani", "Tacos", "Crepes"],
  "allow_multiple": true,
  "expires_at": "2024-04-02T18:00:00Z"
}
```

---

### 8.14 Room Poll - Vote

**POST** `/api/v1/rooms/{room_id}/poll/{poll_id}/vote`  
**Auth**: Required

**Request Body**:
```json
{ "selected_option": 1 }
```

---

### 8.15 Room Message Reaction

**POST** `/api/v1/rooms/{room_id}/message/{message_id}/react`  
**Auth**: Required

**Request Body**:
```json
{ "emoji": "🎉" }
```

---

### 8.16 Delete Room Message

**DELETE** `/api/v1/rooms/{room_id}/message/{message_id}`  
**Auth**: Required

---

### 8.17 Family Room WebSocket

**WS** `ws://localhost:8000/api/v1/rooms/{room_id}/ws/{user_id}`

**Incoming from Server**:
```json
// New message
{
  "type": "new_message",
  "message": {
    "id": "msg-uuid",
    "sender_id": "user-uuid",
    "sender_name": "Keiko",
    "content": "Hello family!",
    "translated_content": "नमस्ते परिवार!",
    "created_at": "2024-04-01T10:00:00Z"
  }
}

// Member joined
{ "type": "member_joined", "user_id": "user-uuid", "display_name": "Keiko" }

// Member left
{ "type": "member_left", "user_id": "user-uuid" }

// New poll
{ "type": "new_poll", "poll": { ... } }

// Poll vote
{ "type": "poll_vote", "poll_id": "poll-uuid", "votes": [3, 5, 2] }
```

**Outgoing from Client**:
```json
// Send message via WS (alternative to REST)
{
  "type": "message",
  "content": "Hello everyone!",
  "content_type": "text"
}

// Typing indicator
{ "type": "typing" }
```

---

## 9. Games (Turn-Based)

> **Router prefix**: `/api/v1/games`

### 9.1 List Available Games

**GET** `/api/v1/games/`  
**Auth**: Required

**Response**:
```json
[
  {
    "id": "trivia_world_cultures",
    "name": "World Cultures Trivia",
    "description": "Test knowledge about each other's cultures",
    "category": "trivia",
    "min_players": 2,
    "max_players": 2,
    "xp_reward": 200
  }
]
```

---

### 9.2 Start Game

**POST** `/api/v1/games/start`  
**Auth**: Required

**Request Body**:
```json
{
  "game_id": "trivia_world_cultures",
  "relationship_id": "rel-uuid"
}
```

**Response**:
```json
{
  "session_id": "session-uuid",
  "game_id": "trivia_world_cultures",
  "relationship_id": "rel-uuid",
  "status": "waiting_for_partner",
  "current_turn": null
}
```

---

### 9.3 Game Action

**POST** `/api/v1/games/action`  
**Auth**: Required

**Request Body**:
```json
{
  "action": "answer",
  "data": {
    "question_id": "q-uuid",
    "answer": "B"
  }
}
```

**Response**:
```json
{
  "session_id": "session-uuid",
  "result": "correct",
  "score": { "player_a": 3, "player_b": 2 },
  "next_question": {
    "id": "q-uuid-2",
    "question": "What is the capital of Japan?",
    "options": ["Tokyo", "Osaka", "Kyoto", "Hiroshima"]
  },
  "is_game_over": false,
  "xp_earned": 25
}
```

---

### 9.4 Get Game Session

**GET** `/api/v1/games/session/{session_id}`  
**Auth**: Required

Returns full session state.

---

### 9.5 Get Game History

**GET** `/api/v1/games/history/{relationship_id}`  
**Auth**: Required

Returns past game sessions for a relationship.

---

## 10. Live Games (Real-Time WebSocket)

> **Router prefix**: `/api/v1/games/live`

### 10.1 List Available Live Games

**GET** `/api/v1/games/live/available`  
**Auth**: Required

**Response**:
```json
{
  "games": [
    {
      "id": "pong",
      "name": "Pong",
      "description": "Classic ping-pong game",
      "min_level": 1
    },
    {
      "id": "air_hockey",
      "name": "Air Hockey",
      "description": "Fast-paced air hockey",
      "min_level": 2
    },
    {
      "id": "tic_tac_toe",
      "name": "Tic-Tac-Toe",
      "description": "Classic strategy game",
      "min_level": 1
    }
  ]
}
```

---

### 10.2 Create Live Game Session

**POST** `/api/v1/games/live/create`  
**Auth**: Required

**Request Body**:
```json
{
  "game_id": "pong",
  "relationship_id": "rel-uuid"
}
```

**Response**:
```json
{
  "session_id": "live-session-uuid",
  "game_id": "pong",
  "status": "waiting",
  "player_a": "user-uuid",
  "player_b": null
}
```

---

### 10.3 Live Game WebSocket

**WS** `ws://localhost:8000/api/v1/games/live/ws/{session_id}/{user_id}`

#### Pong Protocol

**Game State** (received continuously from server):
```json
{
  "type": "game_state",
  "ball": { "x": 400, "y": 200, "vx": 4, "vy": 3, "radius": 8 },
  "paddles": {
    "player-a-uuid": { "y": 170, "x": 20, "height": 60, "width": 10 },
    "player-b-uuid": { "y": 200, "x": 770, "height": 60, "width": 10 }
  },
  "scores": { "player-a-uuid": 3, "player-b-uuid": 2 },
  "canvas": { "width": 800, "height": 400 }
}
```

**Player Move** (sent by client):
```json
{ "type": "move", "direction": "up" }   // or "down"
```

**Game Events** (received from server):
```json
// Game started
{ "type": "game_start", "your_side": "left" }

// Score update
{ "type": "score", "scores": { "player-a-uuid": 3, "player-b-uuid": 2 } }

// Game over
{
  "type": "game_over",
  "winner": "player-a-uuid",
  "final_scores": { "player-a-uuid": 5, "player-b-uuid": 3 },
  "xp_earned": 150
}

// Partner disconnected
{ "type": "partner_disconnected" }
```

#### Tic-Tac-Toe Protocol

**Move** (sent by client):
```json
{ "type": "move", "cell": 4 }  // 0-8, left-to-right, top-to-bottom
```

**State** (received from server):
```json
{
  "type": "game_state",
  "board": ["X", null, "O", null, "X", null, null, null, null],
  "current_turn": "player-a-uuid",
  "your_symbol": "X"
}
```

**Full Pong Implementation**:
```javascript
class PongGame {
  constructor(sessionId, myUserId, canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.myUserId = myUserId;
    this.state = null;
    
    this.ws = new WebSocket(
      `ws://localhost:8000/api/v1/games/live/ws/${sessionId}/${myUserId}`
    );
    
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "game_state") {
        this.state = msg;
        this.render();
      } else if (msg.type === "game_over") {
        alert(`Game Over! Winner: ${msg.winner}. XP earned: ${msg.xp_earned}`);
        this.ws.close();
      }
    };
    
    // Keyboard input
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp") this.sendMove("up");
      if (e.key === "ArrowDown") this.sendMove("down");
    });
  }
  
  sendMove(direction) {
    this.ws.send(JSON.stringify({ type: "move", direction }));
  }
  
  render() {
    if (!this.state) return;
    const { ball, paddles, canvas } = this.state;
    
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw ball
    this.ctx.beginPath();
    this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = "white";
    this.ctx.fill();
    
    // Draw paddles
    Object.values(paddles).forEach(paddle => {
      this.ctx.fillStyle = "white";
      this.ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    });
  }
}
```

---

## 11. Contests

> **Router prefix**: `/api/v1/contests`

### 11.1 Create Contest

**POST** `/api/v1/contests/create`  
**Auth**: Required

**Request Body**:
```json
{
  "relationship_id": "rel-uuid",
  "contest_type": "vocabulary"
}
```

**`contest_type` values**: `"vocabulary"`, `"culture_trivia"`, `"language_challenge"`, `"riddle"`

**Response**:
```json
{
  "contest_id": "contest-uuid",
  "contest_type": "vocabulary",
  "first_question": {
    "id": "q-uuid",
    "question": "What does 'arigatou' mean in Japanese?",
    "options": ["Hello", "Thank you", "Goodbye", "Sorry"],
    "time_limit_seconds": 30
  }
}
```

---

### 11.2 Get Contest (Current Questions)

**GET** `/api/v1/contests/relationship/{relationship_id}`  
**Auth**: Required

---

### 11.3 Get Contest by ID

**GET** `/api/v1/contests/{contest_id}`  
**Auth**: Required

---

### 11.4 Answer Contest Question

**POST** `/api/v1/contests/answer`  
**Auth**: Required

**Request Body**:
```json
{
  "question_id": "q-uuid",
  "answer": "Thank you"
}
```

**Response**:
```json
{
  "is_correct": true,
  "correct_answer": "Thank you",
  "explanation": "'Arigatou' (ありがとう) is Japanese for 'thank you'",
  "points_earned": 10,
  "next_question": { ... }
}
```

---

### 11.5 Complete Contest

**POST** `/api/v1/contests/{contest_id}/complete`  
**Auth**: Required

**Response**:
```json
{
  "winner": "user-uuid",
  "scores": {
    "user-uuid-1": 80,
    "user-uuid-2": 70
  },
  "xp_earned": 200,
  "relationship_xp_earned": 150
}
```

---

### 11.6 Leaderboard

**GET** `/api/v1/contests/leaderboard/{period}`  
**Auth**: Required

`period` values: `"daily"`, `"weekly"`, `"monthly"`, `"all_time"`

**Response**:
```json
[
  {
    "rank": 1,
    "user_id": "user-uuid",
    "display_name": "Keiko Tanaka",
    "country": "JP",
    "total_points": 1500,
    "contests_won": 12
  }
]
```

---

### 11.7 Contest Schedule Configuration

**GET** `/api/v1/contests/schedule/configuration`  
**Auth**: Required

Returns current contest schedule settings.

---

## 12. Questions

> **Router prefix**: `/api/v1/questions`

### 12.1 Create My Question

**POST** `/api/v1/questions/mine`  
**Auth**: Required

**Request Body**:
```json
{
  "question_text": "What's your favorite childhood memory?",
  "category": "personal",
  "is_public": true
}
```

---

### 12.2 Get My Questions

**GET** `/api/v1/questions/mine`  
**Auth**: Required

---

### 12.3 Update Question

**PUT** `/api/v1/questions/{question_id}`  
**Auth**: Required

**Request Body**:
```json
{
  "question_text": "Updated question text",
  "is_public": false
}
```

---

### 12.4 Delete Question

**DELETE** `/api/v1/questions/{question_id}`  
**Auth**: Required

---

### 12.5 Get Friend's Questions

**GET** `/api/v1/questions/friend/{friend_id}`  
**Auth**: Required

Returns questions the friend wants to be asked.

---

### 12.6 Answer Question

**POST** `/api/v1/questions/answer`  
**Auth**: Required

**Request Body**:
```json
{
  "question_id": "q-uuid",
  "answer": "My favorite memory is climbing the hill behind our house at sunset.",
  "target_user_id": "friend-uuid"
}
```

**Response**:
```json
{
  "answer_id": "ans-uuid",
  "question_id": "q-uuid",
  "xp_earned": 30,
  "relationship_xp": 20
}
```

---

### 12.7 Get Random Question

**GET** `/api/v1/questions/random`  
**Auth**: Required

Returns a random conversation-starter question.

---

## 13. Translation

> **Router prefix**: `/api/v1/translation`

### 13.1 Translate Text

**POST** `/api/v1/translation/`  
**Auth**: Required

**Request Body**:
```json
{
  "text": "Hello, how are you?",
  "source_language": "en",
  "target_language": "ja"
}
```

**Response**:
```json
{
  "translated_text": "こんにちは、お元気ですか？",
  "source_language": "en",
  "target_language": "ja",
  "has_idiom": false,
  "idiom_explanation": null,
  "cultural_note": null
}
```

---

### 13.2 Batch Translate

**POST** `/api/v1/translation/batch`  
**Auth**: Required

**Request Body**:
```json
{
  "texts": ["Hello", "Thank you", "How are you?"],
  "source_language": "en",
  "target_language": "ja"
}
```

**Response**:
```json
{
  "translations": [
    "こんにちは",
    "ありがとうございます",
    "お元気ですか？"
  ]
}
```

---

### 13.3 Detect Language

**POST** `/api/v1/translation/detect`  
**Auth**: Required

**Request Body**:
```json
{ "text": "Bonjour, comment allez-vous?" }
```

**Response**:
```json
{
  "detected_language": "fr",
  "language_name": "French",
  "confidence": 0.99
}
```

---

### 13.4 List Supported Languages

**GET** `/api/v1/translation/languages`  
**Auth**: Not required

**Response**:
```json
{
  "languages": [
    { "code": "en", "name": "English" },
    { "code": "ja", "name": "Japanese" },
    { "code": "hi", "name": "Hindi" },
    { "code": "fr", "name": "French" },
    { "code": "de", "name": "German" },
    { "code": "ar", "name": "Arabic" },
    { "code": "es", "name": "Spanish" }
  ]
}
```

---

### 13.5 Toggle Show Original

**PATCH** `/api/v1/translation/languages/{language_code}/show-original`  
**Auth**: Required

Toggles whether the user sees the original text alongside translation for a specific language.

---

## 14. Safety

> **Router prefix**: `/api/v1/safety`

### 14.1 Report User

**POST** `/api/v1/safety/report`  
**Auth**: Required

**Request Body**:
```json
{
  "reported_user_id": "bad-user-uuid",
  "reason": "harassment",
  "description": "User sent inappropriate messages repeatedly",
  "relationship_id": "rel-uuid",
  "message_id": "msg-uuid"
}
```

`reason` values: `"harassment"`, `"spam"`, `"inappropriate_content"`, `"underage"`, `"scam"`, `"other"`

**Response**:
```json
{
  "report_id": "report-uuid",
  "status": "submitted",
  "message": "Report submitted. We'll review within 24 hours."
}
```

---

### 14.2 Sever / Block Relationship

**POST** `/api/v1/safety/sever`  
**Auth**: Required

**Request Body**:
```json
{
  "relationship_id": "rel-uuid",
  "reason": "harassment"
}
```

Immediately blocks all communication. Returns confirmation.

---

### 14.3 Exit Survey

**POST** `/api/v1/safety/exit-survey`  
**Auth**: Required

**Request Body**:
```json
{
  "relationship_id": "rel-uuid",
  "reason": "natural_end",
  "feedback": "We completed our language exchange goals!",
  "would_recommend": true
}
```

---

### 14.4 Reliability Score

**GET** `/api/v1/safety/reliability/{user_id}`  
**Auth**: Required

**Response**:
```json
{
  "user_id": "user-uuid",
  "reliability_score": 4.8,
  "total_interactions": 145,
  "reports_received": 0,
  "positive_feedback": 142,
  "is_trusted": true
}
```

---

### 14.5 Minor Protection Check

**GET** `/api/v1/safety/minor-protection/{user_id}`  
**Auth**: Required

**Response**:
```json
{
  "user_id": "user-uuid",
  "is_minor": false,
  "restrictions": [],
  "allowed_call_types": ["audio", "video"],
  "max_relationship_level": 7
}
```

---

## 15. Privacy Settings

> **Router prefix**: `/api/v1/privacy`

### 15.1 Get My Privacy Settings

**GET** `/api/v1/privacy/settings`  
**Auth**: Required

**Response**:
```json
{
  "show_online_status": true,
  "allow_messages_from": "connections",
  "show_last_seen": true,
  "allow_calls_from": "connections",
  "translation_language": "hi",
  "show_original_text": false,
  "blocked_users": []
}
```

---

### 15.2 Update Privacy Settings

**PUT** `/api/v1/privacy/settings`  
**Auth**: Required

**Request Body**:
```json
{
  "show_online_status": false,
  "allow_messages_from": "connections",
  "show_last_seen": true,
  "allow_calls_from": "connections",
  "translation_language": "hi",
  "show_original_text": false
}
```

---

### 15.3 Get Another User's Privacy Settings

**GET** `/api/v1/privacy/settings/{user_id}`  
**Auth**: Required

Returns public-facing privacy settings for a given user.

---

## 16. XP System

> **Router prefix**: `/api/v1/xp`

### 16.1 Get My XP

**GET** `/api/v1/xp/me`  
**Auth**: Required

**Response**:
```json
{
  "user_id": "user-uuid",
  "total_xp": 5400,
  "level": 7,
  "level_label": "Growing",
  "xp_to_next_level": 600,
  "streak_days": 5,
  "streak_multiplier": 1.5
}
```

**Relationship Level Labels**:
| Level | Label | Unlocks |
|-------|-------|---------|
| 1 | Strangers | Messaging |
| 2 | Acquaintances | Media sharing |
| 3 | Bonded | Audio calls |
| 4 | Close | Video calls |
| 5 | Deep Bond | Family Rooms |
| 6 | Trusted | Contest creation |
| 7 | Lifetime | All features |

---

### 16.2 Gift XP to User

**POST** `/api/v1/xp/gift`  
**Auth**: Required

**Request Body**:
```json
{
  "recipient_id": "user-uuid",
  "amount": 200,
  "message": "Thank you for teaching me Japanese!",
  "relationship_id": "rel-uuid"
}
```

**Response**:
```json
{
  "gifted": 200,
  "recipient_new_total": 5600,
  "xp_used": 200,
  "your_new_total": 5200
}
```

---

### 16.3 XP Leaderboard

**GET** `/api/v1/xp/leaderboard`  
**Auth**: Required

**Response**:
```json
[
  {
    "rank": 1,
    "user_id": "user-uuid",
    "display_name": "Keiko Tanaka",
    "total_xp": 15400,
    "level": 12,
    "country": "JP"
  }
]
```

---

### 16.4 XP Transaction History

**GET** `/api/v1/xp/transactions`  
**Auth**: Required

**Response**:
```json
[
  {
    "id": "txn-uuid",
    "action": "message_sent",
    "xp_earned": 15,
    "total_after": 5415,
    "created_at": "2024-04-01T10:00:00Z"
  }
]
```

---

### 16.5 Get User's XP

**GET** `/api/v1/xp/{user_id}`  
**Auth**: Required

Returns public XP info for any user.

---

## 17. Voice (STT / TTS standalone)

> **Router prefix**: `/api/v1/voice` (standalone voice service)

### 17.1 Transcribe Audio

**POST** `/api/v1/voice/transcribe`  
**Auth**: Required  
**Content-Type**: `multipart/form-data`

**Form Fields**: `audio` (file)

**Response**:
```json
{ "transcript": "Hello, nice to meet you!" }
```

---

### 17.2 Text to Speech

**POST** `/api/v1/voice/speak`  
**Auth**: Required

**Request Body**:
```json
{
  "text": "Namaste! Aap kaise hain?",
  "language": "hi"
}
```

**Response**: Audio binary (`audio/mpeg`)

---

### 17.3 List Voices

**GET** `/api/v1/voice/voices`  
**Auth**: Required

---

## 18. WebSocket Reference Card

| WebSocket Endpoint | Purpose | Auth Method |
|---|---|---|
| `/api/v1/chat/ws/{relationship_id}/{user_id}` | Real-time chat | URL path user_id |
| `/api/v1/calls/signal/{relationship_id}/{user_id}` | WebRTC signaling | URL path user_id |
| `/api/v1/rooms/{room_id}/ws/{user_id}` | Family room chat | URL path user_id |
| `/api/v1/games/live/ws/{session_id}/{user_id}` | Live games (Pong etc.) | URL path user_id |

**WebSocket Best Practices**:
```javascript
// Always handle reconnect
function createWsWithReconnect(url, handlers, maxRetries = 5) {
  let retries = 0;
  let ws;
  
  function connect() {
    ws = new WebSocket(url);
    ws.onopen = handlers.onOpen;
    ws.onmessage = (e) => handlers.onMessage(JSON.parse(e.data));
    ws.onerror = handlers.onError;
    ws.onclose = () => {
      if (retries < maxRetries) {
        retries++;
        setTimeout(connect, 1000 * retries); // Exponential backoff
      }
    };
  }
  
  connect();
  return {
    send: (data) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(data)),
    close: () => { maxRetries = 0; ws.close(); }
  };
}
```

---

## 19. Error Codes Reference

| HTTP Code | Meaning | Common Fix |
|---|---|---|
| `400` | Bad Request | Check request body fields |
| `401` | Unauthorized | Token expired — re-login |
| `403` | Forbidden | User not part of relationship |
| `404` | Not Found | Wrong ID passed |
| `409` | Conflict | Already exists (duplicate username, active game) |
| `422` | Validation Error | Missing required field |
| `500` | Server Error | Backend issue — retry |

**WebSocket Close Codes**:

| Code | Reason |
|------|--------|
| `4001` | Authentication failed |
| `4002` | Bot/voice not found |
| `4003` | Not in relationship |
| `4004` | Relationship not found or inactive |
| `4005` | Level requirement not met |

---

## 🔧 Complete Integration Setup (React / JavaScript)

```javascript
// veliora-rt-client.js — Full client library for Realtime Communication

const BASE = "http://localhost:8000/api/v1";

class VelioraRTClient {
  constructor() {
    this.token = localStorage.getItem("rt_token");
  }
  
  // ── Auth ────────────────────────────────────────────
  async signup(data) {
    const r = await fetch(`${BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const body = await r.json();
    if (!r.ok) throw new Error(body.detail);
    if (body.access_token) {
      this.token = body.access_token;
      localStorage.setItem("rt_token", this.token);
    }
    return body;
  }
  
  async login(email, password) {
    const r = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const body = await r.json();
    if (!r.ok) throw new Error(body.detail);
    this.token = body.access_token;
    localStorage.setItem("rt_token", this.token);
    return body;
  }
  
  // ── Generic ─────────────────────────────────────────
  get headers() {
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.token}`
    };
  }
  
  async get(path) {
    const r = await fetch(`${BASE}${path}`, { headers: this.headers });
    if (!r.ok) throw new Error((await r.json()).detail);
    return r.json();
  }
  
  async post(path, body) {
    const r = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error((await r.json()).detail);
    return r.json();
  }
  
  // ── Profile ─────────────────────────────────────────
  getProfile() { return this.get("/profiles/me"); }
  updateProfile(data) { return this.post("/profiles/me", data); }
  setRole(data) { return this.post("/profiles/me/role", data); }
  
  // ── Matching ────────────────────────────────────────
  browse(role) { return this.get(`/matching/browse/${role}`); }
  connect(userId, data) { return this.post(`/matching/connect/${userId}`, data); }
  
  // ── Friends ─────────────────────────────────────────
  getFriends() { return this.get("/friends/list"); }
  sendRequest(userId) { return this.post(`/friends/request/${userId}`, {}); }
  respondRequest(id, action) { return this.post(`/friends/respond/${id}`, { action }); }
  
  // ── Chat ────────────────────────────────────────────
  sendMessage(relId, text, type = "text") {
    return this.post("/chat/send", {
      relationship_id: relId,
      original_text: text,
      content_type: type
    });
  }
  
  getMessages(relId, limit = 50) {
    return this.get(`/chat/messages/${relId}?limit=${limit}`);
  }
  
  chatWebSocket(relId, userId) {
    const WS_BASE = BASE.replace("http", "ws");
    return new WebSocket(`${WS_BASE}/chat/ws/${relId}/${userId}`);
  }
  
  // ── Calls ───────────────────────────────────────────
  signalingWebSocket(relId, userId) {
    const WS_BASE = BASE.replace("http", "ws");
    return new WebSocket(`${WS_BASE}/calls/signal/${relId}/${userId}`);
  }
  
  // ── Live Games ──────────────────────────────────────
  createLiveGame(gameId, relId) {
    return this.post("/games/live/create", { game_id: gameId, relationship_id: relId });
  }
  
  liveGameWebSocket(sessionId, userId) {
    const WS_BASE = BASE.replace("http", "ws");
    return new WebSocket(`${WS_BASE}/games/live/ws/${sessionId}/${userId}`);
  }
  
  // ── XP ──────────────────────────────────────────────
  getMyXP() { return this.get("/xp/me"); }
  getLeaderboard() { return this.get("/xp/leaderboard"); }
}

export default new VelioraRTClient();
```

---

*This document covers every endpoint in the `realtime_communication` subproject. For the Persona/Bot AI subproject, see `INTEGRATION_persona.md`.*