# 🤖 Veliora.AI — Persona Bots: Complete Frontend Integration Guide

> **Base URL**: `http://localhost:8000`  
> **Auth**: All protected endpoints require `Authorization: Bearer <JWT_TOKEN>`  
> **WebSocket Voice Call**: `ws://localhost:8000/api/voice/call?token=<JWT>&bot_id=<BOT_ID>`  
> **Static Files**: Images at `/static/images/`, Audio at `/static/audio/`

---

## 📋 Table of Contents

1. [Authentication (Persona/Bot Project)](#1-authentication-personabot-project)
2. [All Available Bot IDs](#2-all-available-bot-ids)
3. [Chat — Memory-Enhanced Messaging](#3-chat--memory-enhanced-messaging)
4. [Voice Note (REST — TTS)](#4-voice-note-rest--tts)
5. [Voice Call (WebSocket — Real-Time Streaming)](#5-voice-call-websocket--real-time-streaming)
6. [Image Sampling — Persona Selfie Generation](#6-image-sampling--persona-selfie-generation)
7. [Audio Sampling — Multimodal Interactions](#7-audio-sampling--multimodal-interactions)
8. [Multimodal — Image Describe, URL Summarize, Weather, Meme](#8-multimodal--image-describe-url-summarize-weather-meme)
9. [Games with Persona](#9-games-with-persona)
10. [Diary — Persona Diary Entries](#10-diary--persona-diary-entries)
11. [Selfie Compositing](#11-selfie-compositing)
12. [XP Status](#12-xp-status)
13. [Complete Integration Flow Diagrams](#13-complete-integration-flow-diagrams)
14. [Axios / Fetch Complete Client](#14-axios--fetch-complete-client)
15. [React Hooks Examples](#15-react-hooks-examples)

---

## 1. Authentication (Persona/Bot Project)

> **Router prefix**: `/api/auth`  
> **Important**: This is a **separate auth system** from the Realtime Communication subproject. Same Supabase backend, but different prefix.

### 1.1 Sign Up

**POST** `/api/auth/signup`

**Headers**: None (public)

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "Priya Sharma",
  "username": "priya_s",
  "age": 24,
  "gender": "female",
  "location": "Mumbai, India",
  "bio": "Love exploring different cultures!"
}
```

**Field Rules**:
| Field | Type | Required | Constraint |
|-------|------|----------|------------|
| `email` | string | ✅ | Valid email |
| `password` | string | ✅ | Min 6 chars |
| `name` | string | ✅ | Display name |
| `username` | string | ✅ | Unique |
| `age` | integer | ✅ | `13 ≤ age ≤ 120` |
| `gender` | string | ✅ | Free text |
| `location` | string | ❌ | City/Country |
| `bio` | string | ❌ | Max ~500 chars |

**Success Response** `200 OK`:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "Priya Sharma",
    "username": "priya_s",
    "age": 24,
    "gender": "female",
    "location": "Mumbai, India",
    "bio": "Love exploring different cultures!",
    "avatar_url": null,
    "total_xp": 0,
    "level": 0,
    "streak_days": 0
  }
}
```

> 💡 On signup with all required fields filled, user automatically gets **profile_complete XP** bonus.

---

### 1.2 Login

**POST** `/api/auth/login`

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
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-...",
    "email": "user@example.com",
    "name": "Priya Sharma",
    "username": "priya_s",
    "age": 24,
    "gender": "female",
    "location": "Mumbai, India",
    "bio": "Love exploring different cultures!",
    "avatar_url": "https://storage.supabase.co/avatars/user.jpg",
    "total_xp": 2450,
    "level": 4,
    "streak_days": 7
  }
}
```

> 🏆 Login automatically awards **daily login XP (1000 XP)** and updates streak if it's a new calendar day.

---

### 1.3 Get Profile

**GET** `/api/auth/profile`  
**Auth**: Required (`Authorization: Bearer <token>`)

**Response**: Same `user` object as login response.

---

### 1.4 Update Profile

**PUT** `/api/auth/profile`  
**Auth**: Required

**Request Body** (all optional):
```json
{
  "name": "Priya Kumar Sharma",
  "username": "priya_ks",
  "age": 25,
  "gender": "female",
  "location": "Bangalore, India",
  "bio": "Tech enthusiast who loves languages!"
}
```

---

### 1.5 Upload Avatar

**POST** `/api/auth/profile/avatar`  
**Auth**: Required  
**Content-Type**: `multipart/form-data`

**Form Fields**:
- `file`: Image file (JPEG, PNG, WebP — max 5MB)

**Response**:
```json
{
  "avatar_url": "https://storage.supabase.co/avatars/user_id/avatar.jpg",
  "message": "Avatar uploaded successfully"
}
```

> 🏆 Awards **profile_photo_upload XP (100 XP)** automatically.

**Frontend Upload Example**:
```javascript
async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await fetch("http://localhost:8000/api/auth/profile/avatar", {
    method: "POST",
    headers: { "Authorization": `Bearer ${getToken()}` },
    // ⚠️ Do NOT set Content-Type — let browser set multipart boundary
    body: formData
  });
  
  return response.json();
}
```

---

### 1.6 Get XP Status

**GET** `/api/auth/xp`  
**Auth**: Required

**Response**:
```json
{
  "user_id": "550e8400-...",
  "total_xp": 2450,
  "level": 4,
  "streak_days": 7,
  "streak_multiplier": 1.7,
  "next_level_xp": 2500,
  "xp_to_next_level": 50
}
```

**Level Formula**: `level = floor(sqrt(total_xp / 100))`

| Level | Total XP Required |
|-------|-------------------|
| 1 | 100 |
| 5 | 2,500 |
| 10 | 10,000 |
| 20 | 40,000 |
| 50 | 250,000 |

---

## 2. All Available Bot IDs

The `bot_id` parameter is used in **every** chat, voice, image, game, and diary endpoint.

### Cultural Personas

| `bot_id` | Culture | Archetype | Languages |
|----------|---------|-----------|-----------|
| `delhi_mentor_male` | Delhi, India | Mentor | Hindi, English + 10 Indian languages |
| `delhi_mentor_female` | Delhi, India | Mentor | Hindi, English + 10 Indian languages |
| `delhi_friend_male` | Delhi, India | Friend | Hindi, English + 10 Indian languages |
| `delhi_friend_female` | Delhi, India | Friend | Hindi, English + 10 Indian languages |
| `delhi_romantic_male` | Delhi, India | Romantic | Hindi, English + 10 Indian languages |
| `delhi_romantic_female` | Delhi, India | Romantic | Hindi, English + 10 Indian languages |
| `japanese_mentor_male` | Tokyo, Japan | Mentor | Japanese, English |
| `japanese_mentor_female` | Tokyo, Japan | Mentor | Japanese, English |
| `japanese_friend_male` | Tokyo, Japan | Friend | Japanese, English |
| `japanese_friend_female` | Tokyo, Japan | Friend | Japanese, English |
| `japanese_romantic_male` | Tokyo, Japan | Romantic | Japanese, English |
| `japanese_romantic_female` | Tokyo, Japan | Romantic | Japanese, English |
| `parisian_mentor_male` | Paris, France | Mentor | French, English |
| `parisian_mentor_female` | Paris, France | Mentor | French, English |
| `parisian_friend_male` | Paris, France | Friend | French, English |
| `parisian_friend_female` | Paris, France | Friend | French, English |
| `parisian_romantic_female` | Paris, France | Romantic | French, English |
| `berlin_mentor_male` | Berlin, Germany | Mentor | German, English |
| `berlin_mentor_female` | Berlin, Germany | Mentor | German, English |
| `berlin_friend_male` | Berlin, Germany | Friend | German, English |
| `berlin_friend_female` | Berlin, Germany | Friend | German, English |
| `berlin_romantic_male` | Berlin, Germany | Romantic | German, English |
| `berlin_romantic_female` | Berlin, Germany | Romantic | German, English |
| `singapore_mentor_male` | Singapore | Mentor | English, Mandarin, Malay, Tamil |
| `singapore_mentor_female` | Singapore | Mentor | English, Mandarin, Malay, Tamil |
| `singapore_friend_male` | Singapore | Friend | English, Mandarin, Malay, Tamil |
| `singapore_friend_female` | Singapore | Friend | English, Mandarin, Malay, Tamil |
| `singapore_romantic_male` | Singapore | Romantic | English, Mandarin, Malay, Tamil |
| `singapore_romantic_female` | Singapore | Romantic | English, Mandarin, Malay, Tamil |
| `mexican_mentor_male` | Mexico City | Mentor | Spanish, English |
| `mexican_mentor_female` | Mexico City | Mentor | Spanish, English |
| `mexican_friend_male` | Mexico City | Friend | Spanish, English |
| `mexican_friend_female` | Mexico City | Friend | Spanish, English |
| `mexican_romantic_male` | Mexico City | Romantic | Spanish, English |
| `mexican_romantic_female` | Mexico City | Romantic | Spanish, English |
| `srilankan_mentor_male` | Colombo, Sri Lanka | Mentor | Sinhala, Tamil, English |
| `srilankan_mentor_female` | Colombo, Sri Lanka | Mentor | Sinhala, Tamil, English |
| `srilankan_friend_male` | Colombo, Sri Lanka | Friend | Sinhala, Tamil, English |
| `srilankan_friend_female` | Colombo, Sri Lanka | Friend | Sinhala, Tamil, English |
| `srilankan_romantic_male` | Colombo, Sri Lanka | Romantic | Sinhala, Tamil, English |
| `srilankan_romantic_female` | Colombo, Sri Lanka | Romantic | Sinhala, Tamil, English |
| `emirati_mentor_male` | Dubai, UAE | Mentor | Arabic, English |
| `emirati_mentor_female` | Dubai, UAE | Mentor | Arabic, English |
| `emirati_friend_male` | Dubai, UAE | Friend | Arabic, English |
| `emirati_friend_female` | Dubai, UAE | Friend | Arabic, English |
| `emirati_romantic_male` | Dubai, UAE | Romantic | Arabic, English |
| `emirati_romantic_female` | Dubai, UAE | Romantic | Arabic, English |

### Mythological Personas

| `bot_id` | Description | Voice |
|----------|-------------|-------|
| `Krishna` | Lord Krishna — divine wisdom and guidance | Available |
| `Rama` | Lord Rama — dharma and righteousness | Available |
| `Hanuman` | Lord Hanuman — devotion and strength | Available |
| `Shiva` | Lord Shiva — cosmic consciousness | Available |
| `Trimurti` | The Divine Trinity (Brahma, Vishnu, Mahesh) | Available |

### Language Reference

| Language | Code for `language` param |
|----------|--------------------------|
| English | `english` |
| Hindi | `hindi` |
| Japanese | `japanese` |
| French | `french` |
| German | `german` |
| Spanish | `spanish` |
| Arabic | `arabic` |
| Mandarin | `mandarin` |
| Malay | `malay` |
| Tamil | `tamil` |
| Telugu | `telugu` |
| Punjabi | `punjabi` |
| Bengali | `bengali` |
| Marathi | `marathi` |
| Gujarati | `gujarati` |
| Kannada | `kannada` |
| Malayalam | `malayalam` |
| Urdu | `urdu` |
| Odia | `odia` |
| Sinhala | `sinhala` |

---

## 3. Chat — Memory-Enhanced Messaging

> **Router prefix**: `/api/chat`  
> **Auth**: Required for all endpoints

### 3.1 Send Message

**POST** `/api/chat/send`

This is the **core chat endpoint**. It uses a sophisticated 3-layer memory system:
- **Semantic Memory**: Vector-similarity search on past conversations
- **RFM Memory**: Recency-Frequency-Magnitude scoring
- **Recent Context**: Last N messages from Redis cache

**Request Body**:
```json
{
  "bot_id": "delhi_friend_female",
  "message": "I had such a rough day at work today, I don't know what to do.",
  "language": "english",
  "custom_bot_name": null,
  "traits": null
}
```

**Field Details**:
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `bot_id` | string | ✅ | Any valid bot_id from Section 2 |
| `message` | string | ✅ | User's message text |
| `language` | string | ❌ | Default `"english"`. Must be a language the bot supports |
| `custom_bot_name` | string | ❌ | Override bot's name in persona (e.g., "Priya" instead of default) |
| `traits` | string | ❌ | Additional personality traits to inject |

**Success Response** `200 OK`:
```json
{
  "bot_id": "delhi_friend_female",
  "user_message": "I had such a rough day at work today, I don't know what to do.",
  "bot_response": "Ugh, rough days are the worst! 😔 What happened? Did your manager say something again or was it the project deadline stress? Remember last week when you were worried about the presentation? You nailed it then — you've got this! Tell me everything 💙",
  "language": "english",
  "xp_earned": 15,
  "semantic_memory_used": true,
  "timestamp": "2024-04-01T10:00:00.000Z"
}
```

> ✅ `semantic_memory_used: true` means the bot used past conversation memory to personalize this response.

**What Happens Internally (for debugging)**:
```
1. First message? → Auto-load past Supabase messages into Redis (session init)
2. Semantic search → Find top 8 similar past memories via vector similarity
3. RFM scoring → Rank memories by Recency, Frequency, Magnitude
4. Gemini 2.0 Flash → Generate response with full memory context
5. Cache message → Redis context list (last 50 messages)
6. RabbitMQ → Async memory extraction + Supabase logging
7. Award XP → Based on message length
```

**Frontend Usage**:
```javascript
async function sendChatMessage(botId, message, language = "english") {
  const response = await fetch("http://localhost:8000/api/chat/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getToken()}`
    },
    body: JSON.stringify({ bot_id: botId, message, language })
  });
  
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail);
  }
  
  return response.json();
}

// Usage:
const reply = await sendChatMessage("delhi_friend_female", "How are you today?");
console.log(reply.bot_response); // The AI's response
console.log(reply.xp_earned);    // XP gained from this message
```

---

### 3.2 End Chat Session (Sync to DB)

**POST** `/api/chat/end-chat`  
**Auth**: Required

> ⚠️ **IMPORTANT**: Always call this when the user closes/leaves a chat. It syncs all new messages from Redis → Supabase so memory persists between sessions.

**Request Body**:
```json
{
  "bot_id": "delhi_friend_female",
  "message": "",
  "language": "english"
}
```

> Only `bot_id` matters here. `message` can be empty string.

**Success Response**:
```json
{
  "status": "success",
  "message": "Session ended. Synced 12 messages to database.",
  "details": {
    "synced_messages": 12,
    "embeddings_created": 12,
    "session_cleared": true
  }
}
```

**When to call this**:
- User navigates away from chat screen
- App goes to background (use `beforeunload` event on web)
- User explicitly hits "End Chat" button

```javascript
// Call on page unload / app background
window.addEventListener("beforeunload", async () => {
  await fetch("http://localhost:8000/api/chat/end-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getToken()}`
    },
    body: JSON.stringify({ bot_id: currentBotId, message: "", language: "english" })
  });
});
```

---

### 3.3 Get Chat History

**POST** `/api/chat/history`  
**Auth**: Required

**Request Body**:
```json
{
  "bot_id": "delhi_friend_female",
  "page": 1,
  "page_size": 50
}
```

**Success Response**:
```json
{
  "messages": [
    {
      "id": "msg-uuid",
      "role": "user",
      "content": "I had such a rough day at work today...",
      "bot_id": "delhi_friend_female",
      "created_at": "2024-04-01T10:00:00Z"
    },
    {
      "id": "msg-uuid-2",
      "role": "bot",
      "content": "Ugh, rough days are the worst! 😔 What happened?...",
      "bot_id": "delhi_friend_female",
      "created_at": "2024-04-01T10:00:01Z"
    }
  ],
  "total": 145,
  "page": 1,
  "page_size": 50
}
```

**`role` values**: `"user"` | `"bot"` | `"system"`

---

## 4. Voice Note (REST — TTS)

> **Router prefix**: `/api/voice`  
> **Auth**: Required

### 4.1 Generate Voice Note

**POST** `/api/voice/note`

The bot generates a **text response + audio file** (MP3). Audio is stored in Supabase Storage and a URL is returned.

**Request Body**:
```json
{
  "bot_id": "japanese_friend_female",
  "message": "I'm feeling homesick today, can you tell me something comforting?",
  "language": "japanese",
  "custom_bot_name": null,
  "traits": null
}
```

**Success Response**:
```json
{
  "bot_id": "japanese_friend_female",
  "text_response": "あなたのことが心配です。ホームシックは本当につらいですね。でも、あなたは一人じゃないよ！今日は好きな日本料理を作ってみたらどう？家の味が恋しくなったら、私がいつでも話を聞くよ🌸",
  "audio_url": "https://storage.supabase.co/audio/user_id/timestamp_abc123.mp3",
  "duration_seconds": 8.5,
  "xp_earned": 75
}
```

> 🎵 **Audio Format**: MP3, stored in Supabase Storage. Use `audio_url` directly in `<audio>` HTML tag or `Audio()` JS object.

**Frontend Playback**:
```javascript
async function getVoiceNote(botId, message, language = "english") {
  const response = await fetch("http://localhost:8000/api/voice/note", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getToken()}`
    },
    body: JSON.stringify({ bot_id: botId, message, language })
  });
  
  const data = await response.json();
  
  // Play the audio
  const audio = new Audio(data.audio_url);
  audio.play();
  
  // Also display the text
  console.log("Bot said:", data.text_response);
  
  return data;
}
```

---

### 4.2 Voice Call Info (REST)

**GET** `/api/voice/call/info`  
**Auth**: Not required

Returns metadata about the WebSocket voice call endpoint.

**Response**:
```json
{
  "endpoint": "ws://<host>/api/voice/call",
  "protocol": "WebSocket",
  "auth": "Pass JWT token as query parameter: ?token=YOUR_TOKEN&bot_id=BOT_ID",
  "input_format": {
    "encoding": "pcm_s16le",
    "sample_rate": 16000,
    "channels": 1,
    "description": "Send raw PCM audio bytes from microphone"
  },
  "output_format": {
    "encoding": "pcm_f32le",
    "sample_rate": 24000,
    "channels": 1,
    "description": "Receive raw PCM audio bytes for speaker playback"
  },
  "commands": {
    "end_call": "{\"type\": \"end\"}"
  },
  "features": [
    "Real-time speech-to-text via Deepgram Nova-2",
    "AI response generation via Gemini 2.0 Flash",
    "Text-to-speech via Cartesia Sonic-2",
    "Triple-streaming pipeline for <500ms latency"
  ]
}
```

---

## 5. Voice Call (WebSocket — Real-Time Streaming)

**WS** `ws://localhost:8000/api/voice/call?token=<JWT>&bot_id=<BOT_ID>`

> 🎙️ This is the **real-time voice call** with the AI persona. Triple-streaming pipeline: Deepgram STT → Gemini LLM → Cartesia TTS.

### 5.1 Connection Parameters

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| `token` | Query string | ✅ | JWT access token |
| `bot_id` | Query string | ✅ | The persona to call |

**Example URL**: `ws://localhost:8000/api/voice/call?token=eyJhbGciOi...&bot_id=delhi_friend_female`

> ⚠️ **Only bots with voice configured** work for calls. Check `VOICE_MAPPING` — all cultural and mythological bots have voices.

---

### 5.2 Audio Format Requirements

| Direction | Encoding | Sample Rate | Channels |
|-----------|----------|-------------|----------|
| **Send** (microphone → server) | PCM 16-bit signed integer (`pcm_s16le`) | 16,000 Hz | 1 (Mono) |
| **Receive** (server → speaker) | PCM 32-bit float (`pcm_f32le`) | 24,000 Hz | 1 (Mono) |

---

### 5.3 Message Protocol

**Sending Audio** (binary WebSocket frames):
```
Send raw PCM bytes (captured from microphone at 16kHz, 16-bit, mono)
```

**Sending Commands** (text WebSocket frames):
```json
// End the call
{ "type": "end" }
```

**Receiving Audio** (binary frames from server):
```
Raw PCM bytes (32-bit float, 24kHz, mono) → play directly via Web Audio API
```

**Receiving JSON Events** (text frames from server):
```json
// User's speech transcribed
{
  "type": "transcript",
  "text": "How are you today?",
  "role": "user"
}

// Bot finished responding
{
  "type": "response_complete",
  "text": "I'm doing great! How about you, my friend?",
  "role": "bot"
}

// Error
{
  "type": "error",
  "message": "Speech-to-text service unavailable"
}
```

---

### 5.4 Complete Voice Call Implementation

```javascript
class VelioraVoiceCall {
  constructor(token, botId) {
    this.token = token;
    this.botId = botId;
    this.ws = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.scriptProcessor = null;
    this.audioQueue = [];
    this.isPlaying = false;
    
    // Callbacks
    this.onTranscript = null;     // (text, role) => void
    this.onResponseComplete = null; // (text) => void
    this.onError = null;           // (message) => void
    this.onConnected = null;       // () => void
    this.onEnded = null;           // () => void
  }
  
  async start() {
    // 1. Connect WebSocket
    const wsUrl = `ws://localhost:8000/api/voice/call?token=${this.token}&bot_id=${this.botId}`;
    this.ws = new WebSocket(wsUrl);
    this.ws.binaryType = "arraybuffer";
    
    this.ws.onopen = async () => {
      console.log("Voice call connected");
      await this._startMicrophone();
      if (this.onConnected) this.onConnected();
    };
    
    this.ws.onmessage = async (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Binary = audio chunk from bot (PCM f32le, 24kHz)
        await this._playAudioChunk(event.data);
      } else {
        // Text = JSON event
        const msg = JSON.parse(event.data);
        
        if (msg.type === "transcript") {
          if (this.onTranscript) this.onTranscript(msg.text, msg.role);
        } else if (msg.type === "response_complete") {
          if (this.onResponseComplete) this.onResponseComplete(msg.text);
        } else if (msg.type === "error") {
          if (this.onError) this.onError(msg.message);
        }
      }
    };
    
    this.ws.onclose = () => {
      this._stopMicrophone();
      if (this.onEnded) this.onEnded();
    };
    
    this.ws.onerror = (err) => {
      console.error("Voice call WS error:", err);
      if (this.onError) this.onError("Connection error");
    };
  }
  
  async _startMicrophone() {
    // Get microphone access
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Set up Web Audio API to capture PCM
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    
    // ScriptProcessor to capture PCM s16le
    this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);
    
    this.scriptProcessor.onaudioprocess = (event) => {
      if (this.ws?.readyState !== WebSocket.OPEN) return;
      
      const float32Data = event.inputBuffer.getChannelData(0);
      
      // Convert float32 → int16 (PCM s16le)
      const int16Data = new Int16Array(float32Data.length);
      for (let i = 0; i < float32Data.length; i++) {
        int16Data[i] = Math.max(-32768, Math.min(32767, float32Data[i] * 32768));
      }
      
      // Send to server
      this.ws.send(int16Data.buffer);
    };
  }
  
  async _playAudioChunk(arrayBuffer) {
    // Server sends PCM f32le at 24kHz
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
    }
    
    const float32Array = new Float32Array(arrayBuffer);
    const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);
    
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    source.start();
  }
  
  _stopMicrophone() {
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
  
  end() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "end" }));
    }
    this._stopMicrophone();
    this.ws?.close();
  }
}

// ─── Usage Example ──────────────────────────────────
const call = new VelioraVoiceCall(getToken(), "delhi_friend_female");

call.onTranscript = (text, role) => {
  console.log(`${role}: ${text}`);
  displayTranscript(text, role);
};

call.onResponseComplete = (text) => {
  console.log("Bot finished:", text);
};

call.onError = (msg) => {
  alert("Call error: " + msg);
};

call.onConnected = () => {
  updateUI("call_active");
};

call.onEnded = () => {
  updateUI("call_ended");
};

// Start call
await call.start();

// End call (user presses hang up)
document.getElementById("hangup").addEventListener("click", () => call.end());
```

---

## 6. Image Sampling — Persona Selfie Generation

> **Router prefix**: `/api/images`  
> **Auth**: Required

### 6.1 Generate Selfie (FaceID-Based)

**POST** `/api/images/generate-selfie`

This generates a **realistic selfie of the persona** using FaceID technology via Gradio. The bot first analyzes the user's message to determine emotional context (emotion, location, action), then generates an image maintaining the bot's facial identity.

**Request Body**:
```json
{
  "bot_id": "parisian_romantic_female",
  "message": "I just got some amazing news today! I'm so happy!",
  "username": "Priya"
}
```

**Success Response**:
```json
{
  "bot_id": "parisian_romantic_female",
  "image_url": "http://localhost:8000/static/images/550e8400-e29b-41d4-a716-446655440000.png",
  "image_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
  "status": "success",
  "emotion_context": {
    "emotion": "happy",
    "location": "Parisian cafe",
    "action": "smiling and celebrating",
    "style": "casual chic"
  },
  "xp_earned": 150
}
```

**How to Display the Image**:
```javascript
async function generatePersonaSelfie(botId, message, username) {
  const response = await fetch("http://localhost:8000/api/images/generate-selfie", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getToken()}`
    },
    body: JSON.stringify({ bot_id: botId, message, username })
  });
  
  const data = await response.json();
  
  // Option 1: Use image URL directly
  document.getElementById("personaPhoto").src = data.image_url;
  
  // Option 2: Use base64 (no CORS issues)
  document.getElementById("personaPhoto").src = `data:image/png;base64,${data.image_base64}`;
  
  // Display emotion context
  console.log(`Emotion: ${data.emotion_context.emotion}`);
  console.log(`Setting: ${data.emotion_context.location}`);
  
  return data;
}
```

**Emotion Context Fields**:
| Field | Example Values |
|-------|---------------|
| `emotion` | `"happy"`, `"sad"`, `"excited"`, `"thoughtful"`, `"playful"`, `"romantic"` |
| `location` | `"Parisian cafe"`, `"Tokyo park"`, `"Delhi market"`, `"bedroom"` |
| `action` | `"smiling"`, `"reading"`, `"dancing"`, `"cooking"` |
| `style` | `"casual"`, `"formal"`, `"traditional"` |

> ⏱️ **Note**: Image generation can take 10-30 seconds (Gradio API processing). Show a loading spinner while waiting.

---

### 6.2 Check Image Service Status

**GET** `/api/images/status`  
**Auth**: Not required

**Response**:
```json
{
  "available": true,
  "current_space": "InstantID-FaceAdapter",
  "error_count": 0
}
```

> Use this to show "Image generation unavailable" UI state when `available: false`.

---

### 6.3 Detect Emotion (Utility)

**POST** `/api/images/detect-emotion?message=<text>`  
**Auth**: Required

**Query Param**: `message` — the text to analyze

**Response**:
```json
{
  "emotion_context": {
    "emotion": "excited",
    "location": "home",
    "action": "jumping for joy"
  },
  "status": "success"
}
```

---

## 7. Audio Sampling — Multimodal Interactions

> **Router prefix**: `/api/multimodal`  
> **Auth**: Required

### 7.1 Describe Uploaded Image

**POST** `/api/multimodal/describe-image`  
**Auth**: Required  
**Content-Type**: `multipart/form-data`

**Form Fields**:
- `file`: Image file (JPEG, PNG, WebP — max 10MB)
- `bot_id`: The persona bot ID (string)
- `language`: Response language (string, default `"english"`)

**Response**:
```json
{
  "description": "Oh wow, Priya! That sunset photo you took is absolutely breathtaking! 🌅 The way the golden light reflects off the ocean surface... reminds me of the beautiful evenings by the Seine here in Paris. What beach is this? I'm already daydreaming about visiting!",
  "bot_response": "Oh wow, Priya! That sunset photo...",
  "xp_earned": 50
}
```

**Frontend Implementation**:
```javascript
async function describeImage(botId, imageFile, language = "english") {
  const formData = new FormData();
  formData.append("file", imageFile);
  formData.append("bot_id", botId);
  formData.append("language", language);
  
  const response = await fetch("http://localhost:8000/api/multimodal/describe-image", {
    method: "POST",
    headers: {
      // ⚠️ No Content-Type header — let browser set multipart boundary
      "Authorization": `Bearer ${getToken()}`
    },
    body: formData
  });
  
  return response.json();
}
```

> ✅ Bot describes the image **in character** — a Parisian bot will comment from a French perspective, a Japanese bot will use Japanese cultural references.

---

### 7.2 Summarize URL

**POST** `/api/multimodal/summarize-url`  
**Auth**: Required

**Request Body**:
```json
{
  "bot_id": "japanese_mentor_male",
  "url": "https://www.bbc.com/news/technology/ai-article",
  "language": "japanese"
}
```

**Response**:
```json
{
  "url": "https://www.bbc.com/news/technology/ai-article",
  "summary": "このBBC記事では、AI技術の最新動向について詳しく説明しています...",
  "bot_response": "このBBC記事では、AI技術の最新動向について...",
  "xp_earned": 50
}
```

---

### 7.3 Get Weather (Persona's City)

**GET** `/api/multimodal/weather/{bot_id}`  
**Auth**: Required

The bot reports the **real-time weather in their origin city** with in-character commentary.

| Bot ID prefix | City | Country |
|--------------|------|---------|
| `delhi_*` | New Delhi | India |
| `japanese_*` | Tokyo | Japan |
| `parisian_*` | Paris | France |
| `berlin_*` | Berlin | Germany |
| `singapore_*` | Singapore | Singapore |
| `mexican_*` | Mexico City | Mexico |
| `srilankan_*` | Colombo | Sri Lanka |
| `emirati_*` | Dubai | UAE |

**Example**: `GET /api/multimodal/weather/delhi_friend_male`

**Response**:
```json
{
  "city": "New Delhi",
  "country": "IN",
  "temperature": 38.5,
  "description": "Sunny",
  "bot_commentary": "Yaar, Delhi mein aaj toh garmi ki hadd hai! 🥵 38 degrees! AC chal raha hai mera toh full speed. Teri taraf kaisa mausam hai? I'm literally melting here but still having chai... typical Delhi na! 😄",
  "xp_earned": 25
}
```

---

### 7.4 Generate Meme

**POST** `/api/multimodal/meme`  
**Auth**: Required

**Request Body**:
```json
{
  "bot_id": "berlin_friend_male",
  "topic": "Monday mornings",
  "language": "english"
}
```

**Response**:
```json
{
  "text_meme": "Me on Sunday night: 'This week I'll be organized and productive!'\n\nMe on Monday morning: *stares at wall for 20 minutes* *makes 3rd coffee* *forgets what productivity means*\n\n— Sent with love from Berlin, where we also suffer Mondays 😂🇩🇪",
  "xp_earned": 100
}
```

---

## 8. Multimodal — Complete Frontend Pattern

```javascript
// multimodal.js — All multimodal endpoint helpers

const MULTIMODAL_BASE = "http://localhost:8000/api/multimodal";

// Describe uploaded image
async function describeImage(botId, imageFile, language = "english") {
  const fd = new FormData();
  fd.append("file", imageFile);
  fd.append("bot_id", botId);
  fd.append("language", language);
  
  const r = await fetch(`${MULTIMODAL_BASE}/describe-image`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${getToken()}` },
    body: fd
  });
  return r.json();
}

// Summarize any URL
async function summarizeURL(botId, url, language = "english") {
  const r = await fetch(`${MULTIMODAL_BASE}/summarize-url`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ bot_id: botId, url, language })
  });
  return r.json();
}

// Get weather for bot's city
async function getWeather(botId) {
  const r = await fetch(`${MULTIMODAL_BASE}/weather/${botId}`, {
    headers: authHeaders()
  });
  return r.json();
}

// Generate a meme
async function generateMeme(botId, topic, language = "english") {
  const r = await fetch(`${MULTIMODAL_BASE}/meme`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ bot_id: botId, topic, language })
  });
  return r.json();
}

// Helper
function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${localStorage.getItem("token")}`
  };
}
```

---

## 9. Games with Persona

> **Router prefix**: `/api/games`  
> **Auth**: Required

### 9.1 Get Game Catalog

**GET** `/api/games/catalog/{bot_id}`

Returns games available for the bot's archetype.

**Example**: `GET /api/games/catalog/delhi_mentor_male`

**Response**:
```json
{
  "games": [
    {
      "id": "mentor_wisdom_quest",
      "name": "Wisdom Quest",
      "description": "Answer life's big questions. The mentor poses philosophical dilemmas and you reason through them together.",
      "archetype": "mentor",
      "category": "philosophy",
      "min_turns": 5,
      "max_turns": 10,
      "xp_reward": 250
    },
    {
      "id": "mentor_culture_trivia",
      "name": "Culture Compass",
      "description": "Test your knowledge about the mentor's home city and culture.",
      "archetype": "mentor",
      "category": "trivia",
      "min_turns": 5,
      "max_turns": 12,
      "xp_reward": 200
    },
    {
      "id": "mentor_life_simulator",
      "name": "Life Crossroads",
      "description": "Face real-life dilemmas and make choices.",
      "archetype": "mentor",
      "category": "simulation",
      "min_turns": 5,
      "max_turns": 10,
      "xp_reward": 300
    }
  ]
}
```

**Games by Archetype**:

| Archetype | Games |
|-----------|-------|
| `mentor` | Wisdom Quest, Culture Compass, Life Crossroads |
| `friend` | Would You Rather?, Story Chain, Two Truths & A Lie, Song Lyrics Battle |
| `romantic` | Dream Date Planner, Love Language Quiz, 20 Flirty Questions |

**How to get archetype from bot_id**:
```javascript
// bot_id format: "{origin}_{archetype}_{gender}"
function getArchetype(botId) {
  const parts = botId.split("_");
  return parts[parts.length - 2]; // "mentor", "friend", or "romantic"
}
```

---

### 9.2 Start Game

**POST** `/api/games/start`  
**Auth**: Required

**Request Body**:
```json
{
  "bot_id": "delhi_friend_male",
  "game_id": "friend_would_you_rather"
}
```

**Success Response**:
```json
{
  "session_id": "abc123def456",
  "game_name": "Would You Rather?",
  "bot_id": "delhi_friend_male",
  "opening_message": "Yaar, let's play Would You Rather! 🎮 I'll start easy and then get WILD. Ready?\n\nWould you rather:\nA) Have the ability to speak any language fluently but never understand your mother tongue again\nB) Always understand everyone but only be able to speak in riddles?\n\nChoose wisely! 😂",
  "xp_earned": 50
}
```

> ⚠️ **Only one active game per user at a time.** Starting a new game while one is active returns `409 Conflict`.

---

### 9.3 Send Game Action

**POST** `/api/games/action`  
**Auth**: Required

**Request Body**:
```json
{
  "bot_id": "delhi_friend_male",
  "session_id": "abc123def456",
  "action": "I'd choose A — I love languages, but losing my mother tongue would be heartbreaking! Still, option A."
}
```

**Success Response**:
```json
{
  "session_id": "abc123def456",
  "bot_response": "Ooh interesting choice! That's actually really deep, yaar. Losing the mother tongue... it's like losing a piece of your soul, na? I'd choose B — because speaking in riddles sounds like poetry! 😂\n\nOkay next one — HARDER now:\nWould you rather:\nA) Live in your favorite country but never taste food from your home country again\nB) Eat all your favorite foods but never be able to travel?\n\nThink carefully! 🤔",
  "turn_number": 2,
  "is_game_over": false,
  "result": null,
  "xp_earned": 25
}
```

**When `is_game_over: true`**:
```json
{
  "session_id": "abc123def456",
  "bot_response": "🎉 Game over, champion! That was so much fun! You really made me think with some of those answers. Your final score: 7/10 amazing answers! Come back anytime for another round — I'll have even wilder questions ready! 😂🏆",
  "turn_number": 10,
  "is_game_over": true,
  "result": "completed",
  "xp_earned": 275
}
```

---

### 9.4 End Game Early

**POST** `/api/games/end`  
**Auth**: Required

**Request Body**:
```json
{
  "bot_id": "delhi_friend_male",
  "session_id": "abc123def456"
}
```

**Response**:
```json
{
  "session_id": "abc123def456",
  "total_xp_earned": 125,
  "summary": "Game 'Would You Rather?' ended on turn 5."
}
```

---

### 9.5 Complete Game Flow (Frontend)

```javascript
class PersonaGame {
  constructor(botId) {
    this.botId = botId;
    this.sessionId = null;
    this.turnNumber = 0;
  }
  
  async getGames() {
    const r = await fetch(`http://localhost:8000/api/games/catalog/${this.botId}`, {
      headers: authHeaders()
    });
    const { games } = await r.json();
    return games;
  }
  
  async start(gameId) {
    const r = await fetch("http://localhost:8000/api/games/start", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ bot_id: this.botId, game_id: gameId })
    });
    
    const data = await r.json();
    this.sessionId = data.session_id;
    this.turnNumber = 1;
    return data;
  }
  
  async sendAction(actionText) {
    const r = await fetch("http://localhost:8000/api/games/action", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        bot_id: this.botId,
        session_id: this.sessionId,
        action: actionText
      })
    });
    
    const data = await r.json();
    this.turnNumber = data.turn_number;
    
    if (data.is_game_over) {
      this.sessionId = null;
    }
    
    return data;
  }
  
  async end() {
    if (!this.sessionId) return null;
    
    const r = await fetch("http://localhost:8000/api/games/end", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ bot_id: this.botId, session_id: this.sessionId })
    });
    
    this.sessionId = null;
    return r.json();
  }
}

// Usage
const game = new PersonaGame("delhi_friend_male");
const games = await game.getGames();
const session = await game.start("friend_would_you_rather");
console.log(session.opening_message); // Display first question

// User answers
const turn = await game.sendAction("I'd choose option A!");
console.log(turn.bot_response); // Display next question
if (turn.is_game_over) console.log("Game finished!");
```

---

## 10. Diary — Persona Diary Entries

> **Router prefix**: `/api/diary`  
> **Auth**: Required

### 10.1 Get Bot's Diary

**GET** `/api/diary/{bot_id}?limit=30`  
**Auth**: Required

The persona's diary is **auto-generated nightly** by a background CRON job. It contains first-person reflections on the day's conversations with the user.

**Example**: `GET /api/diary/japanese_friend_female?limit=10`

**Response**:
```json
{
  "entries": [
    {
      "id": "diary-uuid-1",
      "bot_id": "japanese_friend_female",
      "entry_date": "2024-04-01",
      "content": "Dear diary... Today I had such a meaningful conversation with Priya-chan! 🌸 She was feeling a bit homesick, and it reminded me of when I first moved to Tokyo for university. I told her about how I used to eat convenience store onigiri and pretend they were my mom's cooking. She laughed so hard! I think we really connected today. I hope she feels better tomorrow. Sometimes just talking helps, doesn't it? 💙\n\n— Yuki",
      "mood": "warm",
      "created_at": "2024-04-02T00:05:00Z"
    }
  ],
  "xp_earned": 30
}
```

> 📓 Diary entries are **user-specific** — Yuki's diary only contains reflections on YOUR conversations.

**`mood` values**: `"happy"`, `"warm"`, `"thoughtful"`, `"nostalgic"`, `"excited"`, `"peaceful"`, `"concerned"`

---

## 11. Selfie Compositing

> **Router prefix**: `/api/selfie`  
> **Auth**: Required

### 11.1 Generate Bot Selfie

**POST** `/api/selfie/generate`

Generates a **contextual AI selfie** of the bot, based on the current chat mood/context.

**Request Body**:
```json
{
  "bot_id": "singapore_friend_female",
  "include_user": false
}
```

> 💡 `include_user: true` is planned but not yet active (code commented out). Always pass `false` for now.

**Response**:
```json
{
  "bot_id": "singapore_friend_female",
  "image_url": "https://storage.supabase.co/selfies/user_id/selfie_uuid.jpg",
  "scene_description": "A cheerful Singaporean girl at a hawker centre, surrounded by colorful food stalls, wearing a casual floral dress, warm afternoon light",
  "xp_earned": 150
}
```

---

## 12. XP Status

> **Router prefix**: `/api/auth`

**GET** `/api/auth/xp`  
**Auth**: Required

**Complete XP Table**:

| Action | XP |
|--------|-----|
| `daily_login` | 1,000 |
| `daily_login_streak_bonus` | 200 per consecutive day |
| `message_short` | 10 |
| `message_medium` | 15 |
| `message_long` | 25 |
| `voice_note_request` | 75 |
| `voice_call_start` | 100 |
| `image_describe` | 50 |
| `selfie_generate` | 150 |
| `url_summarize` | 50 |
| `weather_check` | 25 |
| `meme_generate` | 100 |
| `game_start` | 50 |
| `game_action` | 25 |
| `game_complete` | 250 |
| `diary_read` | 30 |
| `profile_complete` | 500 |
| `profile_photo_upload` | 100 |

**Streak Multiplier**:
| Streak Days | Multiplier |
|-------------|------------|
| 1 | 1.0x |
| 3 | 1.2x |
| 7 | 1.5x |
| 14 | 1.8x |
| 30+ | 2.0x (max) |

---

## 13. Complete Integration Flow Diagrams

### Chat Session Flow

```
User Opens Chat with Bot
         │
         ▼
POST /api/chat/send (first message)
         │
         ├─── Backend: has_active_session? ────NO──── load_session_from_supabase()
         │                                              (Supabase → Redis)
         │
         ▼
Backend: get_bot_response_combined()
  ├── Semantic search (vector similarity on Redis memories)
  ├── RFM scoring (Recency × Frequency × Magnitude)
  ├── Combine top memories + recent context
  └── Gemini 2.0 Flash generates response
         │
         ▼
Backend: cache_message (Redis context list)
         │
         ▼
Backend: RabbitMQ queue
  ├── memory_worker: extract & store new memories
  └── message_worker: log to Supabase messages table
         │
         ▼
Response → Frontend (bot_response + xp_earned)
         │
         ▼ (user closes chat)
POST /api/chat/end-chat
  └── Redis context → Supabase (persist all new messages)
```

### Voice Call Flow

```
Frontend                          Backend                    External APIs
   │                                │                             │
   ├── WS Connect (token + bot_id) ─►                             │
   │                                ├── Validate JWT              │
   │                                ├── Load chat session         │
   │◄── WS Accept ─────────────────┤                             │
   │                                ├── Connect to Deepgram ─────►│
   │                                │◄── STT WebSocket ready ─────┤
   │                                │                             │
   ├── [binary] PCM audio ─────────►│                             │
   │   (16kHz, s16le, mono)        ├── Forward audio to Deepgram ►│
   │                                │◄── Transcript ──────────────┤
   │                                │                             │
   │◄── {"type":"transcript"} ─────┤                             │
   │                                ├── Gemini streaming LLM ─────►│
   │                                │◄── Text stream ─────────────┤
   │                                │                             │
   │                                ├── Cartesia TTS ─────────────►│
   │                                │◄── Audio chunks ────────────┤
   │◄── [binary] PCM audio ────────┤                             │
   │   (24kHz, f32le, mono)        │                             │
   │                                ├── {"type":"response_complete"}
   │◄── JSON event ────────────────┤                             │
   │                                │                             │
   ├── {"type": "end"} ────────────►│                             │
   │                                ├── Close Deepgram connection  │
   │                                ├── Award voice_call XP        │
   │◄── WS Close ───────────────────┤                             │
```

---

## 14. Axios / Fetch Complete Client

```javascript
// veliora-persona-client.js — Complete SDK

class VelioraPersonaClient {
  constructor(baseUrl = "http://localhost:8000") {
    this.base = baseUrl;
    this.token = localStorage.getItem("persona_token") || null;
  }
  
  // ── Auth ────────────────────────────────────────
  async signup({ email, password, name, username, age, gender, location, bio }) {
    const r = await this._post("/api/auth/signup", { email, password, name, username, age, gender, location, bio }, false);
    this.token = r.access_token;
    localStorage.setItem("persona_token", this.token);
    return r;
  }
  
  async login(email, password) {
    const r = await this._post("/api/auth/login", { email, password }, false);
    this.token = r.access_token;
    localStorage.setItem("persona_token", this.token);
    return r;
  }
  
  logout() {
    this.token = null;
    localStorage.removeItem("persona_token");
  }
  
  getProfile() { return this._get("/api/auth/profile"); }
  updateProfile(data) { return this._put("/api/auth/profile", data); }
  getXPStatus() { return this._get("/api/auth/xp"); }
  
  async uploadAvatar(file) {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(`${this.base}/api/auth/profile/avatar`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${this.token}` },
      body: fd
    });
    return r.json();
  }
  
  // ── Chat ────────────────────────────────────────
  sendMessage(botId, message, language = "english", options = {}) {
    return this._post("/api/chat/send", {
      bot_id: botId,
      message,
      language,
      custom_bot_name: options.customName || null,
      traits: options.traits || null
    });
  }
  
  endChat(botId) {
    return this._post("/api/chat/end-chat", { bot_id: botId, message: "", language: "english" });
  }
  
  getChatHistory(botId, page = 1, pageSize = 50) {
    return this._post("/api/chat/history", { bot_id: botId, page, page_size: pageSize });
  }
  
  // ── Voice ───────────────────────────────────────
  generateVoiceNote(botId, message, language = "english") {
    return this._post("/api/voice/note", { bot_id: botId, message, language });
  }
  
  getVoiceCallInfo() { return this._get("/api/voice/call/info"); }
  
  createVoiceCall(botId) {
    return `ws://${this.base.replace(/^https?:\/\//, "")}/api/voice/call?token=${this.token}&bot_id=${botId}`;
  }
  
  // ── Images ──────────────────────────────────────
  generateSelfie(botId, message, username = "User") {
    return this._post("/api/images/generate-selfie", { bot_id: botId, message, username });
  }
  
  getImageServiceStatus() { return this._get("/api/images/status"); }
  
  // ── Multimodal ──────────────────────────────────
  async describeImage(botId, imageFile, language = "english") {
    const fd = new FormData();
    fd.append("file", imageFile);
    fd.append("bot_id", botId);
    fd.append("language", language);
    const r = await fetch(`${this.base}/api/multimodal/describe-image`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${this.token}` },
      body: fd
    });
    return r.json();
  }
  
  summarizeURL(botId, url, language = "english") {
    return this._post("/api/multimodal/summarize-url", { bot_id: botId, url, language });
  }
  
  getWeather(botId) { return this._get(`/api/multimodal/weather/${botId}`); }
  
  generateMeme(botId, topic = null, language = "english") {
    return this._post("/api/multimodal/meme", { bot_id: botId, topic, language });
  }
  
  // ── Games ───────────────────────────────────────
  getGameCatalog(botId) { return this._get(`/api/games/catalog/${botId}`); }
  startGame(botId, gameId) { return this._post("/api/games/start", { bot_id: botId, game_id: gameId }); }
  sendGameAction(botId, sessionId, action) {
    return this._post("/api/games/action", { bot_id: botId, session_id: sessionId, action });
  }
  endGame(botId, sessionId) {
    return this._post("/api/games/end", { bot_id: botId, session_id: sessionId });
  }
  
  // ── Diary ───────────────────────────────────────
  getDiary(botId, limit = 30) { return this._get(`/api/diary/${botId}?limit=${limit}`); }
  
  // ── Selfie ──────────────────────────────────────
  generateBotSelfie(botId) {
    return this._post("/api/selfie/generate", { bot_id: botId, include_user: false });
  }
  
  // ── Internal HTTP helpers ───────────────────────
  async _get(path) {
    const r = await fetch(`${this.base}${path}`, {
      headers: { "Authorization": `Bearer ${this.token}` }
    });
    if (!r.ok) throw new Error((await r.json()).detail);
    return r.json();
  }
  
  async _post(path, body, auth = true) {
    const headers = { "Content-Type": "application/json" };
    if (auth) headers["Authorization"] = `Bearer ${this.token}`;
    const r = await fetch(`${this.base}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error((await r.json()).detail);
    return r.json();
  }
  
  async _put(path, body) {
    const r = await fetch(`${this.base}${path}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.token}`
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error((await r.json()).detail);
    return r.json();
  }
}

// Export singleton
export const veliora = new VelioraPersonaClient();
```

---

## 15. React Hooks Examples

```javascript
// hooks/useVelioraChat.js

import { useState, useCallback, useRef } from "react";
import { veliora } from "./veliora-persona-client";

export function useVelioraChat(botId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [xpTotal, setXpTotal] = useState(0);
  
  const sendMessage = useCallback(async (text, language = "english") => {
    // Optimistic update
    const userMsg = { role: "user", content: text, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    
    try {
      const response = await veliora.sendMessage(botId, text, language);
      const botMsg = {
        role: "bot",
        content: response.bot_response,
        id: Date.now() + 1,
        xp: response.xp_earned
      };
      setMessages(prev => [...prev, botMsg]);
      setXpTotal(prev => prev + response.xp_earned);
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setLoading(false);
    }
  }, [botId]);
  
  const loadHistory = useCallback(async (page = 1) => {
    const { messages: history } = await veliora.getChatHistory(botId, page);
    setMessages(history.map(m => ({ role: m.role, content: m.content, id: m.id })));
  }, [botId]);
  
  const endChat = useCallback(() => {
    veliora.endChat(botId).catch(console.error);
  }, [botId]);
  
  return { messages, loading, xpTotal, sendMessage, loadHistory, endChat };
}

// hooks/useVelioraVoiceCall.js

import { useState, useRef, useCallback } from "react";

export function useVelioraVoiceCall(token, botId) {
  const [status, setStatus] = useState("idle"); // idle | connecting | active | ended
  const [transcript, setTranscript] = useState([]);
  const callRef = useRef(null);
  
  const startCall = useCallback(async () => {
    setStatus("connecting");
    
    const { VelioraVoiceCall } = await import("./VelioraVoiceCall");
    const call = new VelioraVoiceCall(token, botId);
    
    call.onConnected = () => setStatus("active");
    call.onEnded = () => setStatus("ended");
    call.onTranscript = (text, role) => {
      setTranscript(prev => [...prev, { text, role, ts: Date.now() }]);
    };
    call.onError = (msg) => {
      console.error(msg);
      setStatus("ended");
    };
    
    await call.start();
    callRef.current = call;
  }, [token, botId]);
  
  const endCall = useCallback(() => {
    callRef.current?.end();
    setStatus("ended");
  }, []);
  
  return { status, transcript, startCall, endCall };
}

// hooks/usePersonaSelfie.js

import { useState, useCallback } from "react";
import { veliora } from "./veliora-persona-client";

export function usePersonaSelfie(botId) {
  const [imageUrl, setImageUrl] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [emotionContext, setEmotionContext] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const generate = useCallback(async (message, username) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await veliora.generateSelfie(botId, message, username);
      setImageUrl(data.image_url);
      setImageBase64(data.image_base64);
      setEmotionContext(data.emotion_context);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [botId]);
  
  return { imageUrl, imageBase64, emotionContext, loading, error, generate };
}
```

---

## ⚠️ Common Mistakes & Fixes

| ❌ Wrong | ✅ Correct |
|---------|-----------|
| `Content-Type: multipart/form-data` on file upload | Let browser set it automatically (omit header) |
| Sending binary audio as text frames | Always use binary WebSocket frames for audio |
| Not calling `/api/chat/end-chat` | Always call on session end to persist memory |
| Using `bot_id: "Delhi Friend"` | Must use exact format: `"delhi_friend_female"` |
| Passing `token` in WS URL as header | Pass as query param: `?token=<JWT>&bot_id=<BOT_ID>` |
| Parsing voice response as JSON | `/api/voice/speak` returns raw audio bytes, not JSON |
| Skipping language validation | Pass only supported languages for the chosen bot |
| Not handling `image_base64` fallback | If CORS blocks `image_url`, use `data:image/png;base64,...` |

---

*This document covers every endpoint for the Persona/Bot AI subproject. For the Realtime Communication subproject, see `INTEGRATION_REALTIME.md`.*