# Veliora.AI — Frontend ↔ Backend API Contract

> Base URL: `https://your-api.run.app` (or `http://localhost:8000` for local dev)

---

## Authentication

All endpoints (except signup/login) require:

```
Authorization: Bearer <supabase_jwt_token>
```

The JWT is obtained from Supabase Auth on login/signup.

---

## 1. Auth & Profile

### POST `/api/auth/signup`

Register a new user with full profile.

**Request:**
```json
{
    "email": "user@example.com",
    "password": "securepassword123",
    "name": "Likhith",
    "username": "likhith_dev",
    "age": 22,
    "gender": "male",
    "location": "Bangalore, India",
    "bio": "Tech enthusiast and AI explorer"
}
```

**Response:** `200 OK`
```json
{
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "user": {
        "id": "uuid",
        "email": "user@example.com",
        "name": "Likhith",
        "username": "likhith_dev",
        "age": 22,
        "gender": "male",
        "location": "Bangalore, India",
        "bio": "Tech enthusiast",
        "avatar_url": null,
        "total_xp": 500,
        "level": 2,
        "streak_days": 0
    }
}
```

### POST `/api/auth/login`

**Request:**
```json
{
    "email": "user@example.com",
    "password": "securepassword123"
}
```

**Response:** Same as signup. Awards `1000 XP` for daily login + streak bonuses.

### GET `/api/auth/profile`

Returns current user profile. Requires auth.

### PUT `/api/auth/profile`

Update profile fields. Only include fields you want to change.

**Request:**
```json
{
    "name": "New Name",
    "location": "New City"
}
```

### POST `/api/auth/profile/avatar`

Upload profile photo. `multipart/form-data` with field `file`.

**Response:**
```json
{
    "avatar_url": "https://supabase.co/storage/v1/object/public/avatars/...",
    "message": "Avatar uploaded successfully"
}
```

### GET `/api/auth/xp`

Get XP status, level, streak info.

**Response:**
```json
{
    "user_id": "uuid",
    "total_xp": 12500,
    "level": 11,
    "streak_days": 5,
    "streak_multiplier": 1.6,
    "next_level_xp": 14400,
    "xp_to_next_level": 1900
}
```

---

## 2. Chat

### POST `/api/chat/send`

Send a message and get a persona response.

**Request:**
```json
{
    "bot_id": "delhi_friend_male",
    "message": "Bhai, aaj ka din kaisa raha?",
    "language": "hindi",
    "custom_bot_name": "Arjun",
    "traits": "street-smart, funny"
}
```

**Response:**
```json
{
    "bot_id": "delhi_friend_male",
    "user_message": "Bhai, aaj ka din kaisa raha?",
    "bot_response": "Arre yaar, mast tha! Subah wali chai ne toh poora din set kar diya...",
    "language": "hindi",
    "xp_earned": 25,
    "semantic_memory_used": true,
    "timestamp": "2026-04-04T14:25:00Z"
}
```

### GET `/api/chat/history/{bot_id}?page=1&page_size=50`

Paginated chat history. Returns both user and bot messages in chronological order.

**Response:**
```json
{
    "messages": [
        {"id": "uuid", "role": "user", "content": "Hello!", "bot_id": "delhi_friend_male", "created_at": "..."},
        {"id": "uuid", "role": "bot", "content": "Hey bro!", "bot_id": "delhi_friend_male", "created_at": "..."}
    ],
    "total": 142,
    "page": 1,
    "page_size": 50
}
```

---

## 3. Games

### GET `/api/games/catalog/{bot_id}`

Get available games for a bot's archetype.

**Response:**
```json
{
    "games": [
        {
            "id": "friend_would_you_rather",
            "name": "Would You Rather?",
            "description": "Classic would-you-rather with wild scenarios!",
            "archetype": "friend",
            "category": "party",
            "min_turns": 5,
            "max_turns": 15,
            "xp_reward": 200
        }
    ]
}
```

### POST `/api/games/start`

**Request:**
```json
{
    "bot_id": "delhi_friend_male",
    "game_id": "friend_would_you_rather"
}
```

**Response:**
```json
{
    "session_id": "abc123hex",
    "game_name": "Would You Rather?",
    "bot_id": "delhi_friend_male",
    "opening_message": "Chal bhai, would you rather...",
    "xp_earned": 50
}
```

### POST `/api/games/action`

**Request:**
```json
{
    "bot_id": "delhi_friend_male",
    "session_id": "abc123hex",
    "action": "I'd rather have unlimited food!"
}
```

**Response:**
```json
{
    "session_id": "abc123hex",
    "bot_response": "Haha! Good choice yaar! Next one...",
    "turn_number": 3,
    "is_game_over": false,
    "result": null,
    "xp_earned": 25
}
```

### POST `/api/games/end`

End a game early.

**Request:**
```json
{
    "bot_id": "delhi_friend_male",
    "session_id": "abc123hex"
}
```

---

## 4. Voice

### POST `/api/voice/note`

Generate a TTS voice note from text.

**Request:**
```json
{
    "bot_id": "japanese_romantic_female",
    "message": "Tell me something sweet",
    "language": "english"
}
```

**Response:**
```json
{
    "bot_id": "japanese_romantic_female",
    "text_response": "Every moment with you feels like cherry blossoms...",
    "audio_url": "https://supabase.co/storage/v1/object/public/voice-notes/...",
    "duration_seconds": 4.2,
    "xp_earned": 75
}
```

### WS `/api/voice/call?token=<jwt>&bot_id=<bot_id>`

Real-time bidirectional voice call via WebSocket.

**Connection:**
```javascript
const ws = new WebSocket(
    `wss://your-api.run.app/api/voice/call?token=${jwt}&bot_id=delhi_friend_male`
);
```

**Protocol:**

| Direction | Type | Format | Description |
|-----------|------|--------|-------------|
| Client → Server | Audio | Binary (PCM/WebM) | Microphone audio chunks |
| Server → Client | Audio | Binary (PCM f32le) | TTS audio chunks for playback |
| Server → Client | Metadata | JSON | Transcript & response text |

**Server JSON Messages:**
```json
{"type": "status", "message": "ready"}
{"type": "transcript", "text": "What the user said"}
{"type": "response_text", "text": "Full bot response text"}
{"type": "status", "message": "listening"}
```

**Flow:**
1. Client opens WebSocket with JWT token and bot_id
2. Server responds with `{"type": "status", "message": "ready"}`
3. Client starts streaming microphone audio as binary frames
4. Server → Deepgram STT → detects end of utterance
5. Server sends `{"type": "transcript", "text": "..."}` 
6. Server → Gemini (streaming) → Cartesia TTS (streaming)
7. Server streams audio chunks (binary) back immediately (~500ms latency)
8. Server sends `{"type": "response_text", "text": "..."}` with full text
9. Loop continues until client disconnects

**Audio Format for Playback:**
- Container: raw
- Encoding: PCM float32 little-endian
- Sample rate: 24000 Hz
- Channels: 1 (mono)

---

## 5. Selfie

### POST `/api/selfie/generate`

**Request:**
```json
{
    "bot_id": "parisian_romantic_female",
    "include_user": false
}
```

**Response:**
```json
{
    "bot_id": "parisian_romantic_female",
    "image_url": "https://supabase.co/storage/v1/object/public/selfies/...",
    "scene_description": "A cozy Parisian café with soft golden light...",
    "xp_earned": 150
}
```

> Note: `include_user` is ignored in MVP. Composite selfie code is commented out for future use.

---

## 6. Multimodal

### POST `/api/multimodal/describe-image`

Upload an image for persona-voiced description. `multipart/form-data`.

Query params: `bot_id`, `language` (optional, default "english")
Form field: `file` (image)

**Response:**
```json
{
    "description": "Oh wow, this looks like a beautiful sunset over...",
    "bot_response": "Oh wow, this looks like a beautiful sunset over...",
    "xp_earned": 50
}
```

### POST `/api/multimodal/summarize-url`

**Request:**
```json
{
    "bot_id": "berlin_mentor_female",
    "url": "https://example.com/article",
    "language": "english"
}
```

**Response:**
```json
{
    "url": "https://example.com/article",
    "summary": "This article discusses...",
    "bot_response": "So I read through this piece...",
    "xp_earned": 50
}
```

### GET `/api/multimodal/weather/{bot_id}`

Get weather for the persona's origin city with in-character commentary.

**Response:**
```json
{
    "city": "Tokyo",
    "country": "JP",
    "temperature": 22.5,
    "description": "Partly cloudy",
    "bot_commentary": "Ah, a beautiful day in Tokyo today...",
    "xp_earned": 25
}
```

### POST `/api/multimodal/meme`

**Request:**
```json
{
    "bot_id": "delhi_friend_male",
    "topic": "coding at 3am",
    "language": "hindi"
}
```

**Response:**
```json
{
    "text_meme": "TOP: Jab code raat 3 baje finally kaam kare\nBOTTOM: Lekin subah dekhein toh variable name 'asdfgh' rakha hai",
    "xp_earned": 100
}
```

---

## 7. Diary

### GET `/api/diary/{bot_id}?limit=30`

Read the persona's diary entries.

**Response:**
```json
{
    "entries": [
        {
            "id": "uuid",
            "bot_id": "delhi_friend_male",
            "entry_date": "2026-04-04",
            "content": "Today was one of those days that reminded me why I love talking to them...",
            "mood": "joyful",
            "created_at": "2026-04-05T00:02:00Z"
        }
    ],
    "xp_earned": 30
}
```

---

## 8. System

### GET `/health`

```json
{"status": "healthy", "app": "Veliora.AI", "version": "1.0.0"}
```

### GET `/`

```json
{
    "app": "Veliora.AI",
    "version": "1.0.0",
    "docs": "/docs",
    "health": "/health",
    "endpoints": {"auth": "/api/auth", "chat": "/api/chat", ...}
}
```

---

## XP Reward Table

| Action | Base XP | Notes |
|--------|---------|-------|
| Daily Login | 1,000 | Once per calendar day |
| Streak Bonus | 200/day | Up to 7 consecutive days |
| Short Message (≤50 chars) | 10 | Per message |
| Medium Message (51-200) | 25 | Per message |
| Long Message (201-500) | 50 | Per message |
| Detailed Message (500+) | 100 | Per message |
| 10-Message Milestone | 150 | Per session |
| 25-Message Milestone | 300 | Per session |
| Game Start | 50 | Per game |
| Game Action | 25 | Per turn |
| Game Complete | 250 | Completing a game |
| Game Win | 500 | If applicable |
| Voice Note | 75 | Per request |
| Voice Call Start | 100 | Per call |
| Voice Call (per minute) | 50 | Per minute |
| Selfie Generate | 150 | Per selfie |
| Image Describe | 50 | Per image |
| URL Summarize | 50 | Per URL |
| Meme Generate | 100 | Per meme |
| Weather Check | 25 | Per check |
| Diary Read | 30 | Per read |
| Profile Complete | 500 | One-time |
| Profile Photo Upload | 200 | One-time |

**Level Formula:** `level = floor(sqrt(total_xp / 100))`  
**Streak Multiplier:** `min(1.0 + (streak_days - 1) × 0.15, 2.0)`

---

## Error Responses

All errors follow this format:
```json
{
    "detail": "Error description here"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / validation error |
| 401 | Unauthorized / invalid token |
| 404 | Resource not found |
| 409 | Conflict (e.g., active game exists) |
| 500 | Internal server error |
