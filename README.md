<p align="center">
  <img src="https://img.shields.io/badge/Veliora.AI-Persona%20%2B%20Connection%20Platform-6C63FF?style=for-the-badge&labelColor=0d0d1a" alt="Veliora Banner"/>
</p>

<h1 align="center">✦ Veliora.AI</h1>
<h3 align="center"><em>"Where Memory Meets Meaning — AI Companions That Remember, Feel, and Connect."</em></h3>

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-0.115.6-009688?style=flat-square&logo=fastapi" />
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python" />
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase" />
  <img src="https://img.shields.io/badge/Redis%20Stack-7.x-DC382D?style=flat-square&logo=redis" />
  <img src="https://img.shields.io/badge/RabbitMQ-3.x-FF6600?style=flat-square&logo=rabbitmq" />
  <img src="https://img.shields.io/badge/Gemini-2.0%20Flash-4285F4?style=flat-square&logo=google" />
  <img src="https://img.shields.io/badge/WebRTC-P2P%20Calls-333333?style=flat-square&logo=webrtc" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript" />
</p>

---

## Table of Contents

- [Project Overview](#-project-overview)
- [High-Level Architecture](#-high-level-architecture)
- [Message Processing: Sequence Diagram](#-message-processing-sequence-diagram)
- [Sub-System I — Persona Engine](#-sub-system-i--persona-engine)
  - [Neuro-Link Memory System](#neuro-link-memory-system)
  - [RFM Scoring](#rfm-scoring)
  - [Persona Catalog](#persona-catalog)
  - [Multimodal Capabilities](#multimodal-capabilities)
- [Sub-System II — Realtime Communication Hub (Familia)](#-sub-system-ii--realtime-communication-hub-familia)
  - [WebRTC Signaling](#webrtc-signaling)
  - [Relationship Progression System](#relationship-progression-system)
  - [Bonding Contests & Live Games](#bonding-contests--live-games)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [Installation Guide](#-installation-guide)
  - [Prerequisites](#prerequisites)
  - [1. Clone & Configure](#1-clone--configure)
  - [2. Infrastructure (Docker)](#2-infrastructure-docker)
  - [3. Backend (Persona Engine)](#3-backend-persona-engine)
  - [4. Realtime Frontend (Familia)](#4-realtime-frontend-familia)
- [Environment Variables Reference](#-environment-variables-reference)
- [API Documentation — Quick Reference](#-api-documentation--quick-reference)
  - [Persona Engine APIs](#persona-engine-apis)
  - [Realtime Communication APIs](#realtime-communication-apis)
- [Testing](#-testing)
- [Background Workers](#-background-workers)
- [License](#-license)

---

## 🔭 Project Overview

**Veliora.AI** is a dual-layered AI companion and human-connection ecosystem built on two tightly integrated sub-systems:

**Sub-System I — Persona Engine** is an advanced AI companion platform featuring culturally-grounded personas with distinct emotional profiles, multi-tier memory (semantic + RFM + recency), real-time voice synthesis, image generation, and gamified interaction. Personas remember who you are, how you speak, what you care about — and respond accordingly.

**Sub-System II — Realtime Communication Hub (Familia)** is a high-throughput social layer enabling verified cross-cultural human connections. It provides WebRTC peer-to-peer audio/video calls, AI-powered translation (preserving cultural idioms), relationship progression through 10 trust levels, live bonding games, family rooms, and contest leaderboards.

Both sub-systems share a single FastAPI backend, a unified Supabase PostgreSQL database, and a common authentication layer based on Supabase JWTs.

---

## 🏗 High-Level Architecture

```mermaid
graph TB
    subgraph CLIENT["Client Layer"]
        WEB["Next.js 15 / React 19<br/>Web App"]
        MOBILE["Mobile Client<br/>(iOS / Android)"]
    end

    subgraph GATEWAY["API Gateway — FastAPI 0.115.6"]
        AUTH["Auth Middleware<br/>Supabase JWT (ES256/HS256)"]
        PERSONA_ROUTES["Persona Routes<br/>/api/chat • /api/voice<br/>/api/games • /api/images<br/>/api/multimodal • /api/diary"]
        RT_ROUTES["Realtime Routes<br/>/api/v1/profiles • /api/v1/matching<br/>/api/v1/chat • /api/v1/calls<br/>/api/v1/family_rooms • /api/v1/contests"]
        STATIC["Static File Server<br/>/static/audio • /static/images"]
    end

    subgraph PERSONA["Sub-System I — Persona Engine"]
        LLM["LLM Engine<br/>Gemini 2.0 Flash"]
        MEMORY["Neuro-Link Memory<br/>Redis Stack + RediSearch"]
        VECTOR["Two-Stage Vector Search<br/>pgvector HNSW → Cross-Encoder"]
        VOICE_SVC["Voice Pipeline<br/>Deepgram STT + Cartesia TTS"]
        IMAGE_SVC["Image Service<br/>Stable Diffusion XL + FaceID"]
    end

    subgraph RT["Sub-System II — Realtime Hub (Familia)"]
        WEBSOCKET["WebSocket Server<br/>Presence & Chat"]
        WEBRTC["WebRTC Signaling<br/>P2P Audio/Video Calls"]
        TRANSLATE["Translation Service<br/>Google Cloud + Idiom Detection"]
        CONTEST["Contest Engine<br/>Live Games & Leaderboards"]
        XP_SVC["XP & Progression Service<br/>10-Level Relationship System"]
    end

    subgraph QUEUE["Message Queue Layer"]
        RABBITMQ["RabbitMQ<br/>memory_queue • message_queue"]
        MEM_WORKER["Memory Worker<br/>Async memory extraction"]
        MSG_WORKER["Message Worker<br/>Async chat logging"]
    end

    subgraph DATA["Data Layer"]
        REDIS["Redis Stack 7.x<br/>Context Cache • Game State • XP Buffer<br/>RediSearch Indexes"]
        SUPABASE["Supabase (PostgreSQL)<br/>pgvector • users • messages<br/>memories • relationships • games"]
        STORAGE["Supabase Storage<br/>Avatars • Audio Notes • Images"]
        HF["HuggingFace Serverless<br/>cross-encoder/ms-marco-MiniLM-L-6-v2"]
    end

    CLIENT --> GATEWAY
    GATEWAY --> AUTH
    AUTH --> PERSONA_ROUTES
    AUTH --> RT_ROUTES
    PERSONA_ROUTES --> LLM
    PERSONA_ROUTES --> MEMORY
    PERSONA_ROUTES --> VECTOR
    PERSONA_ROUTES --> VOICE_SVC
    PERSONA_ROUTES --> IMAGE_SVC
    RT_ROUTES --> WEBSOCKET
    RT_ROUTES --> WEBRTC
    RT_ROUTES --> TRANSLATE
    RT_ROUTES --> CONTEST
    RT_ROUTES --> XP_SVC
    LLM --> RABBITMQ
    RABBITMQ --> MEM_WORKER
    RABBITMQ --> MSG_WORKER
    MEM_WORKER --> REDIS
    MSG_WORKER --> SUPABASE
    MEMORY --> REDIS
    VECTOR --> SUPABASE
    VECTOR --> HF
    VOICE_SVC --> STORAGE
    IMAGE_SVC --> STORAGE
```

---

## 🔄 Message Processing: Sequence Diagram

The following diagram traces the lifecycle of a single user message through the full Persona Engine pipeline — from REST request to AI-generated, memory-enriched response.

```mermaid
sequenceDiagram
    autonumber
    participant U as User Client
    participant GW as FastAPI Gateway
    participant AUTH as JWT Middleware
    participant CHAT as /api/chat/send
    participant REDIS as Redis Stack
    participant RMQ as RabbitMQ
    participant BOT as Neuro-Link Chatbot
    participant RFM as RFM Scorer
    participant VEC as Vector Search
    participant LLM as Gemini 2.0 Flash
    participant PG as Supabase (pgvector)
    participant HF as HuggingFace Reranker

    U->>GW: POST /api/chat/send { bot_id, message, language }
    GW->>AUTH: Validate Supabase JWT (ES256/HS256 + JWKS cache)
    AUTH-->>GW: { user_id, name }

    GW->>CHAT: Dispatch to chat router
    CHAT->>REDIS: has_active_session(user_id, bot_id)?

    alt First message in session
        REDIS-->>CHAT: false
        CHAT->>PG: Load last N messages from Supabase
        PG-->>REDIS: Hydrate context list + memories into Redis
    end

    CHAT->>BOT: get_bot_response_combined(redis_mgr, user_id, bot_id, message)

    par Parallel memory retrieval
        BOT->>REDIS: fetch_last_10_messages (recent context)
        BOT->>REDIS: get_highest_rfm_memories (RFM-ranked long-term memory)
        BOT->>VEC: get_semantically_similar_memories (embedding cosine search)
    end

    VEC->>LLM: generate_embedding(user_message) → 768-dim vector
    LLM-->>VEC: query_embedding
    VEC->>PG: match_messages() via pgvector HNSW (top-50 candidates)
    PG-->>VEC: candidates[]
    VEC->>HF: cross-encoder rerank (query × candidates → scores)
    HF-->>VEC: top-8 semantically relevant memories

    RFM->>LLM: rate_importance(memory_text) → magnitude score 0–5
    LLM-->>RFM: magnitude
    RFM->>RFM: RFM = Recency(1–5) × Frequency × Magnitude

    BOT->>BOT: Assemble system prompt + recent + RFM block + semantic block
    BOT->>LLM: generate_content(system_instruction, conversation_contents)
    LLM-->>BOT: bot_response_text

    BOT-->>CHAT: { response, rfm_block, semantic_block }

    CHAT->>REDIS: cache_message(user, message) + cache_message(bot, response)
    CHAT->>RMQ: publish_memory_task(user_id, bot_id, message, response)
    CHAT->>RMQ: publish_message_log(user_id, bot_id, message, response)
    CHAT->>CHAT: award_xp(user_id, bot_id, "message", xp_points)

    Note over RMQ: Background Workers (async, non-blocking)
    RMQ->>REDIS: memory_worker: extract + embed + store long-term memories
    RMQ->>PG: message_worker: persist messages with embeddings to Supabase

    CHAT-->>U: { bot_response, xp_earned, language, semantic_memory_used: true }
```

---

## 🤖 Sub-System I — Persona Engine

The Persona Engine powers all AI-human interactions. It is architected around three core components: **persona identity** (culturally-grounded system prompts), **Neuro-Link memory** (multi-tier recall), and **multimodal expression** (voice, image, games).

---

### Neuro-Link Memory System

The Neuro-Link memory system is Veliora's proprietary approach to AI long-term memory. It consists of four co-operating layers, each serving a distinct temporal and semantic purpose:

**Layer 1 — Active Context Cache (Redis List)**
The most recent 50 messages per `user_id:bot_id` pair are stored in a Redis List with a 24-hour TTL. This provides the LLM with immediate conversational context, loaded from Supabase on first message and kept in Redis for the session duration.

**Layer 2 — RFM-Scored Long-Term Memory (Redis Stack / RediSearch)**
Every significant memory extracted from conversations is scored using a **Recency × Frequency × Magnitude (RFM)** model and stored as a Redis Hash with a RediSearch vector index. The highest-scoring memories are surfaced at inference time regardless of their semantic distance from the current query — ensuring that emotionally important facts (e.g., "user mentioned their mother passed away") are never buried by recency bias.

**Layer 3 — Semantic Memory (pgvector HNSW → Cross-Encoder Reranking)**
A two-stage retrieval pipeline provides precision semantic recall:
- **Stage 1:** Generate a 768-dimensional Gemini embedding for the user's current message and perform an approximate nearest-neighbor search via `pgvector`'s HNSW index in Supabase, returning the top-50 candidates.
- **Stage 2:** Pass all 50 `(query, candidate)` pairs through the `cross-encoder/ms-marco-MiniLM-L-6-v2` model on HuggingFace Serverless Inference for exact relevance scoring, returning the top-8 most contextually relevant memories.

**Layer 4 — RabbitMQ Async Write-Behind**
After every exchange, new memories are published to RabbitMQ and processed asynchronously by a `memory_worker` process. This worker extracts structured memory facts using Gemini, generates their embeddings, and persists them into both Redis Stack and Supabase — never blocking the request/response cycle.

```
┌─────────────────────────────────────────────────────────────┐
│                    Memory Retrieval at Inference             │
│                                                             │
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────────┐  │
│  │ Recent Cache  │  │  RFM Memories   │  │ Semantic Top-8│  │
│  │ (Redis List)  │  │ (RediSearch)    │  │ (pgvector +   │  │
│  │  Last 10 msgs │  │ Sorted by score │  │  Cross-Enc.)  │  │
│  └──────┬───────┘  └────────┬────────┘  └───────┬───────┘  │
│         └──────────────────┼──────────────────────┘         │
│                             ▼                                │
│              Combined Memory Context Block                   │
│              ↓ Injected into Gemini System Prompt            │
└─────────────────────────────────────────────────────────────┘
```

---

### RFM Scoring

The **Recency-Frequency-Magnitude (RFM)** model determines which memories are most important to a persona's understanding of its user.

| Dimension | Computation | Range |
|-----------|------------|-------|
| **Recency** | Exponential decay from timestamp | 1–5 |
| **Frequency** | Access count normalized | 0–5 |
| **Magnitude** | Gemini rates personal importance of memory text | 0–5 |
| **RFM Score** | `Recency × Frequency × Magnitude` | 0–125 |

Memories with scores above a configurable cutoff are always included in the inference context, acting as the persona's "core beliefs" about the user.

---

### Persona Catalog

Veliora ships with a comprehensive catalog of **culturally-grounded AI personas**, each with:

- A distinct system prompt encoding personality, communication style, and cultural background
- A dedicated **Cartesia TTS voice ID** for audio synthesis
- A language roster of supported tongues
- A persona image (used for FaceID-consistent selfie generation)

**Archetype Matrix**

| Culture | Mentor ♂ | Mentor ♀ | Friend ♂ | Friend ♀ | Romantic ♂ | Romantic ♀ |
|---------|----------|----------|---------|---------|-----------|-----------|
| **Delhi** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Japanese** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Parisian** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Berlin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Singaporean** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Mexican** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Sri Lankan** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Emirati** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Spiritual Personas** (special category): Hanuman, Krishna, Rama, Shiva — with dedicated photo references for image generation.

**Language Support:** Delhi personas support 12 Indian regional languages (Hindi, English, Punjabi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Urdu, Odia). Each persona validates the requested language at inference time against its language roster defined in `config/mappings.py`.

---

### Multimodal Capabilities

| Capability | Technology | Endpoint |
|-----------|-----------|---------|
| **Text Chat** | Gemini 2.0 Flash | `POST /api/chat/send` |
| **Streaming Voice Call** | Deepgram STT + Gemini + Cartesia TTS | `WS /api/voice/call/{bot_id}` |
| **Voice Note (TTS)** | Cartesia `sonic-2` model | `POST /api/voice/note` |
| **Persona Selfie** | Stable Diffusion XL + FaceID (Gradio) | `POST /api/selfie/generate` |
| **Image Generation** | Stable Diffusion XL via HuggingFace | `POST /api/images/generate` |
| **Multimodal Analysis** | Gemini Vision (image + text input) | `POST /api/multimodal/analyze` |
| **Interactive Games** | Gemini as Game Master + Redis state | `POST /api/games/start` |
| **Diary Generation** | Gemini CRON worker (daily) | Background task |

The **voice call pipeline** is the most latency-sensitive component. It streams STT (Deepgram WebSocket), feeds transcribed text to a streaming Gemini response, and pipes each text chunk through Cartesia TTS — minimizing the gap between speaking and hearing a response.

---

## 🌍 Sub-System II — Realtime Communication Hub (Familia)

**Familia** is the human-connection layer of Veliora. It enables verified cross-cultural relationships with a real-time infrastructure, gamified trust system, AI-powered translation, and rich social features.

> *"Real People. Real Bonds. No Borders."*

---

### WebRTC Signaling

Audio and video calls between users use **WebRTC peer-to-peer** connections. The backend provides a WebSocket-based signaling server at `/api/v1/calls/signal/{relationship_id}/{user_id}` that brokers `offer`, `answer`, and `ice_candidate` messages between peers.

The `SignalingManager` class maintains an in-memory map of `relationship_id → {user_id: WebSocket}` connections. Call capability is gated by relationship level:
- **Audio calls** require Relationship Level ≥ 3 (Bonded)
- **Video calls** require Relationship Level ≥ 4 (Close)

**Supported Signaling Events:**

| Event | Direction | Description |
|-------|-----------|-------------|
| `call_start` | Caller → Partner | Initiates call with `call_type: audio\|video` |
| `offer` | Caller → Partner | WebRTC SDP offer |
| `answer` | Callee → Caller | WebRTC SDP answer |
| `ice_candidate` | Both | ICE candidate exchange |
| `call_end` | Either | Terminates call, notifies partner |

In addition to WebRTC, the Realtime Communication Hub exposes `POST /api/v1/calls/transcribe` (Deepgram STT) and `POST /api/v1/calls/speak` (Cartesia TTS) for server-side voice processing when P2P is not available.

---

### Relationship Progression System

Every Familia connection begins at Level 1 and evolves through 10 progressive trust tiers based on interaction quality, consistency, and mutual engagement. Each level unlocks new platform capabilities.

| Level | Title | Unlocked Feature |
|-------|-------|-----------------|
| 1 | Stranger | Text messaging |
| 2 | Acquaintance | Emojis & reactions |
| 3 | Bonded | Audio calls |
| 4 | Close | Video calls |
| 5 | Family | Global Family Rooms |
| 6 | Trusted | Custom themes |
| 7 | Kindred | Priority matching |
| 8 | Soulbound | Mentor badge |
| 9 | Eternal | Cultural Ambassador status |
| 10 | Legendary | Digital Family Book (Heirloom) |

XP is accumulated through messages, calls, contest participation, and daily logins. XP awards are batched in Redis and flushed to Supabase every 60 seconds by the `xp_flush_worker`.

---

### Bonding Contests & Live Games

The contest engine (`/api/v1/contests`) powers synchronized challenges where matched pairs answer questions simultaneously to accumulate bond points. Questions span open-ended emotional prompts, cultural quizzes, and true/false formats.

The `live_games` router (`/api/v1/live_games`) enables real-time multiplayer games with WebSocket state synchronization. Game state is maintained in Redis with a 2-hour TTL, ensuring low-latency move propagation.

**Global Family Rooms** (`/api/v1/family_rooms`) are group spaces unlocked at Level 5, where multiple verified users congregate for cultural exchange. Rooms support privacy controls, membership management, and broadcast messaging.

---

## 🛠 Tech Stack

### Core Infrastructure

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Web Framework** | FastAPI | 0.115.6 | Async REST + WebSocket API |
| **ASGI Server** | Uvicorn (standard) | 0.34.0 | Production async server |
| **Frontend** | Next.js + React | 15 + 19 | Familia web client |
| **Language** | Python + TypeScript | 3.11+ / 5.0 | Backend / Frontend |
| **Data Validation** | Pydantic v2 | 2.10.4 | Schema enforcement |

### AI & Machine Learning

| Component | Technology | Model / Version | Purpose |
|-----------|-----------|----------------|---------|
| **LLM** | Google Gemini | `gemini-2.0-flash` | Chat generation, diary, scene description |
| **Embeddings** | Gemini Embedding | `gemini-embedding-001` (768-dim) | Semantic vector generation |
| **Memory Rating** | Gemini | `gemini-2.0-flash` | RFM magnitude scoring |
| **Reranker** | HuggingFace Serverless | `cross-encoder/ms-marco-MiniLM-L-6-v2` | Two-stage retrieval Stage 2 |
| **Image Generation** | Stable Diffusion | `stabilityai/stable-diffusion-xl-base-1.0` | Persona image synthesis |
| **Speech-to-Text** | Deepgram | SDK 3.9.0 | Real-time voice transcription |
| **Text-to-Speech** | Cartesia | `sonic-2` | Persona voice synthesis |
| **FaceID Selfie** | Gradio Client | FaceID pipeline | Persona-consistent selfie generation |

### Data & Caching

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Primary Database** | Supabase (PostgreSQL) | Messages, users, memories, relationships |
| **Vector Search** | pgvector (HNSW index) | Semantic memory retrieval Stage 1 |
| **Memory Cache** | Redis Stack 7.x | Active context, game state, XP buffer |
| **Full-Text + Vector Index** | RediSearch | RFM memory indexes (`memories:*:*:*`) |
| **Message Queue** | RabbitMQ | Async memory extraction + chat logging |
| **File Storage** | Supabase Storage | Avatars, voice notes, generated images |

### Services & APIs

| Service | Provider | Purpose |
|---------|---------|---------|
| **Authentication** | Supabase Auth (JWT ES256) | User identity + session |
| **Translation** | Google Cloud Translation API | Realtime message translation |
| **Idiom Detection** | Gemini + Google Translate | Cultural context preservation |
| **Push Notifications** | Supabase (Realtime) | Call alerts, contest invites |

---

## 📁 Repository Structure

```
Veliora.AI_backend/
├── main.py                          # FastAPI app factory, lifespan, router mounting
├── bot_prompt.py                    # All persona system prompts (>360KB)
├── requirements.txt                 # Python dependencies
├── .env                             # Environment configuration (never commit)
│
├── api/                             # Persona Engine HTTP routers
│   ├── auth.py                      # Signup, login, profile CRUD, JWT validation
│   ├── chat.py                      # Memory-enhanced chat send/history/end-session
│   ├── voice.py                     # Voice note (REST) + voice call (WebSocket)
│   ├── games.py                     # Interactive games (Gemini as Game Master)
│   ├── images.py                    # Stable Diffusion image generation
│   ├── multimodal.py                # Vision + text analysis (Gemini Vision)
│   ├── diary.py                     # AI-generated diary entries
│   └── selfie.py                    # FaceID-consistent persona selfies
│
├── services/                        # Persona Engine services
│   ├── llm_engine.py                # Gemini API wrapper (chat, embed, stream)
│   ├── redis_cache.py               # Redis Stack operations (context, XP, sessions)
│   ├── vector_search.py             # Two-stage retrieval (pgvector + HF reranker)
│   ├── voice_service.py             # TTS pipeline (Cartesia → Supabase Storage)
│   ├── image_service.py             # Image generation + upload to Supabase
│   ├── selfie_service.py            # FaceID selfie via Gradio client
│   ├── supabase_client.py           # Supabase DB operations + vector match RPC
│   ├── rabbitmq_service.py          # RabbitMQ publish helpers
│   └── background_tasks.py          # XP flush worker, diary CRON worker
│
├── config/
│   ├── settings.py                  # Pydantic Settings (all env vars, singleton)
│   └── mappings.py                  # Persona→language, Persona→voice, XP tables
│
├── models/
│   └── schemas.py                   # All Pydantic request/response schemas
│
├── Redis_chat/working_files/        # Neuro-Link memory subsystem
│   ├── chatbot.py                   # Combined RFM+Semantic response generation
│   ├── memory_functions.py          # Embedding, RediSearch CRUD, memory extraction
│   ├── RFM_functions.py             # Recency, Frequency, Magnitude scoring
│   ├── redis_class.py               # RedisManager: connection + index creation
│   ├── memory_worker.py             # RabbitMQ consumer: async memory persistence
│   ├── message_worker.py            # RabbitMQ consumer: async chat logging
│   ├── serialization.py             # Message serialization utilities
│   └── queue_cleanup.py             # Periodic empty-queue pruning
│
├── realtime_communication/          # Familia (human connection sub-system)
│   ├── config.py                    # Realtime-specific Settings
│   ├── models/                      # Pydantic schemas for Familia entities
│   ├── routers/
│   │   ├── calls.py                 # WebRTC signaling WS + STT/TTS endpoints
│   │   ├── chat.py                  # Human-to-human messaging
│   │   ├── profiles.py              # User profile management
│   │   ├── matching.py              # Cross-cultural user matching
│   │   ├── friends.py               # Friend requests + management
│   │   ├── family_rooms.py          # Global Family Rooms (Level 5+)
│   │   ├── contests.py              # Bonding contest creation + participation
│   │   ├── live_games.py            # Real-time multiplayer games (WS)
│   │   ├── games.py                 # Game catalog + history
│   │   ├── translation.py           # Message translation + idiom detection
│   │   ├── safety.py                # Content moderation + reporting
│   │   ├── privacy.py               # Privacy settings
│   │   ├── verification.py          # Video/voice identity verification
│   │   ├── xp.py                    # XP events + level queries
│   │   ├── questions.py             # Icebreaker question bank
│   │   └── voice.py                 # Voice features
│   └── services/
│       ├── auth_service.py          # JWT user extraction for Familia routes
│       ├── matching_service.py      # Compatibility scoring + pair selection
│       ├── xp_service.py            # XP award logic + level calculation
│       ├── contest_service.py       # Contest lifecycle management
│       ├── translation_service.py   # Google Translate + idiom-aware translation
│       ├── cartesia_tts.py          # Cartesia TTS service (Familia)
│       ├── deepgram_stt.py          # Deepgram STT service (Familia)
│       ├── notification_service.py  # Supabase push notifications
│       ├── background_tasks.py      # Familia background workers
│       └── supabase_client.py       # Supabase client (Familia-scoped)
│
├── image-generation/                # Standalone image generation microservice
│   ├── main.py                      # FastAPI app for batch image generation
│   ├── bot_prompts.py               # Image generation prompts per persona
│   └── photos/                      # Reference persona images (JPEG/PNG)
│
├── tests/                           # Test suite
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_chat_write_behind.py
│   ├── test_games.py
│   ├── test_multimodal.py
│   ├── test_vector_search.py
│   ├── test_voice_websocket.py
│   └── test_xp_gamification.py
│
└── static/
    ├── audio/                       # Cached TTS audio files (MP3)
    └── images/                      # Generated persona images (PNG)
```

---

## 🚀 Installation Guide

### Prerequisites

Ensure the following are installed and available on your `PATH`:

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| Python | 3.11+ | Backend runtime |
| Node.js | 18+ | Familia frontend |
| Docker + Docker Compose | Latest stable | Redis Stack + RabbitMQ |
| Git | Any | Clone repository |

You will also need API keys for: Google Gemini, Deepgram, Cartesia, and HuggingFace. See [Environment Variables Reference](#-environment-variables-reference).

---

### 1. Clone & Configure

```bash
git clone https://github.com/your-org/Veliora.AI_backend.git
cd Veliora.AI_backend

# Copy the environment template
cp .env.example .env
# → Fill in all required values (see Environment Variables Reference)
```

---

### 2. Infrastructure (Docker)

Veliora requires **Redis Stack** (for RediSearch + vector indexes) and **RabbitMQ** (for async worker queues). The fastest path is Docker:

```bash
# Start Redis Stack (includes RediSearch, RedisJSON, RedisBloom)
docker run -d \
  --name veliora-redis \
  -p 6379:6379 \
  -p 8001:8001 \
  redis/redis-stack:latest

# Start RabbitMQ with Management UI
docker run -d \
  --name veliora-rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management

# Verify services are healthy
docker ps
# Redis management UI: http://localhost:8001
# RabbitMQ management UI: http://localhost:15672 (guest/guest)
```

**Using Docker Compose (recommended for development):**

Create a `docker-compose.yml` at the project root:

```yaml
version: "3.9"

services:
  redis-stack:
    image: redis/redis-stack:latest
    container_name: veliora-redis
    ports:
      - "6379:6379"
      - "8001:8001"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  rabbitmq:
    image: rabbitmq:3-management
    container_name: veliora-rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    restart: unless-stopped

volumes:
  redis_data:
```

```bash
docker-compose up -d
```

---

### 3. Backend (Persona Engine)

```bash
# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # Linux/macOS
# .venv\Scripts\activate          # Windows

# Install all Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

On startup, the lifespan handler will:
1. Connect to Redis Stack and create RediSearch indexes (`memories:*`, `messages:*`)
2. Start the `memory_worker` and `message_worker` RabbitMQ consumers as background `asyncio.Task`s
3. Start the `xp_flush_worker` (flushes XP from Redis to Supabase every 60s)
4. Start the `diary_cron_worker` (triggers AI diary generation at `DIARY_CRON_HOUR`)

**Verify the server is healthy:**
```bash
curl http://localhost:8000/health
# → {"status": "ok", "redis_stack": "connected", "rabbitmq": "connected", "version": "1.0.0"}
```

Interactive API documentation is available at: `http://localhost:8000/docs`

---

### 4. Realtime Frontend (Familia)

The Familia frontend is a Next.js 15 application. Its source lives in the `realtime_communication/` directory or a separate frontend repository.

```bash
# From the frontend directory
npm install

# Configure the frontend environment
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000
# Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

# Start the development server
npm run dev
# → App available at http://localhost:3000

# Production build
npm run build && npm start
```

---

## 🔑 Environment Variables Reference

All variables are loaded by `config/settings.py` via Pydantic Settings from the `.env` file. Never commit `.env` to version control.

### Application

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `APP_NAME` | `Veliora.AI` | No | Application name |
| `APP_VERSION` | `1.0.0` | No | Semantic version |
| `DEBUG` | `false` | No | Enable debug logging |
| `CORS_ORIGINS` | `*` | No | Comma-separated allowed origins |

### Supabase

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `SUPABASE_URL` | — | **Yes** | Project URL (e.g., `https://xyz.supabase.co`) |
| `SUPABASE_KEY` | — | **Yes** | `anon` / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | — | **Yes** | Service role key (admin operations) |
| `SUPABASE_JWT_SECRET` | — | **Yes** | JWT secret for HS256 token validation |

### Redis Stack

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `REDIS_HOST` | `localhost` | No | Redis host |
| `REDIS_PORT` | `6379` | No | Redis port |
| `REDIS_DB` | `0` | No | Redis database index |
| `REDIS_CONTEXT_TTL` | `86400` | No | Context cache TTL (seconds) |
| `REDIS_CONTEXT_MAX_MESSAGES` | `50` | No | Max messages in active context |
| `REDIS_GAME_STATE_TTL` | `7200` | No | Game state TTL (seconds) |

### RabbitMQ

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `RABBITMQ_URL` | `amqp://guest:guest@localhost:5672/` | No | AMQP connection URL |
| `RABBITMQ_API_URL` | `http://localhost:15672/api/queues` | No | Management API URL |
| `RABBITMQ_API_USER` | `guest` | No | Management API username |
| `RABBITMQ_API_PASS` | `guest` | No | Management API password |
| `CLEANUP_INTERVAL_SEC` | `60` | No | Queue cleanup polling interval |

### AI / ML Services

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `GEMINI_API_KEY` | — | **Yes** | Google Gemini API key |
| `GEMINI_MODEL` | `gemini-2.0-flash` | No | Chat generation model |
| `GEMINI_EMBEDDING_MODEL` | `gemini-embedding-001` | No | Embedding model |
| `GEMINI_EMBEDDING_DIMENSIONS` | `768` | No | Embedding vector dimensions |
| `GOOGLE_API_KEY` | — | No | Falls back to `GEMINI_API_KEY` if unset |
| `GOOGLE_TRANSLATE_API_KEY` | — | No | Google Cloud Translation API key |
| `DEEPGRAM_API_KEY` | — | **Yes** | Deepgram Speech-to-Text API key |
| `CARTESIA_API_KEY` | — | **Yes** | Cartesia Text-to-Speech API key |
| `CARTESIA_MODEL` | `sonic-2` | No | Cartesia TTS model |
| `HF_API_TOKEN` | — | **Yes** | HuggingFace API token (Serverless Inference) |
| `HF_RERANKER_MODEL` | `cross-encoder/ms-marco-MiniLM-L-6-v2` | No | Cross-encoder reranker model |
| `HF_IMAGE_MODEL` | `stabilityai/stable-diffusion-xl-base-1.0` | No | Image generation model |

### Vector Search

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `VECTOR_TOP_K` | `50` | No | Stage 1: HNSW candidate count |
| `RERANK_TOP_K` | `8` | No | Stage 2: Cross-encoder top results |

### Background Workers

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `XP_FLUSH_INTERVAL` | `60` | No | Seconds between XP flushes to Supabase |
| `DIARY_CRON_HOUR` | `0` | No | UTC hour for diary CRON generation (0 = midnight) |

---

## 📡 API Documentation — Quick Reference

### Persona Engine APIs

All Persona Engine routes share the prefix convention and require a `Bearer <supabase_jwt>` Authorization header.

#### Authentication & Profile

| Method | Endpoint | Description |
|--------|---------|-------------|
| `POST` | `/api/auth/signup` | Register a new user (email, password, name, username, age, gender) |
| `POST` | `/api/auth/login` | Authenticate and receive `access_token` + `refresh_token` |
| `GET` | `/api/auth/profile` | Get the authenticated user's full profile |
| `PATCH` | `/api/auth/profile` | Update profile fields (name, bio, location, etc.) |
| `POST` | `/api/auth/avatar` | Upload avatar image (multipart/form-data) |
| `GET` | `/api/auth/xp-status` | Get current XP, level, streak, and multiplier |
| `POST` | `/api/auth/daily-login` | Claim daily login XP reward |

#### Chat (Memory-Enhanced)

| Method | Endpoint | Description |
|--------|---------|-------------|
| `POST` | `/api/chat/send` | Send a message; returns memory-enhanced bot response + XP earned |
| `POST` | `/api/chat/history` | Paginated chat history from Supabase |
| `POST` | `/api/chat/end-chat` | End session and sync Redis → Supabase (call before app close) |

**`POST /api/chat/send` — Request Body:**
```json
{
  "bot_id": "delhi_friend_female",
  "message": "I had a tough day at work today.",
  "language": "english"
}
```

**Response:**
```json
{
  "bot_id": "delhi_friend_female",
  "user_message": "I had a tough day at work today.",
  "bot_response": "Oh no, tell me everything — I'm all ears! What happened?",
  "language": "english",
  "xp_earned": 15,
  "semantic_memory_used": true
}
```

#### Voice

| Method | Endpoint | Description |
|--------|---------|-------------|
| `POST` | `/api/voice/note` | Generate a TTS voice note (LLM → Cartesia → MP3 URL) |
| `WS` | `/api/voice/call/{bot_id}` | Bidirectional voice call (Deepgram STT → Gemini → Cartesia TTS streaming) |
| `GET` | `/api/voice/call-info` | Returns available bot voice configurations |

#### Games, Images & Multimodal

| Method | Endpoint | Description |
|--------|---------|-------------|
| `POST` | `/api/games/start` | Start an interactive game session (bot acts as Game Master) |
| `POST` | `/api/games/move` | Submit a player move; returns updated game state + bot response |
| `GET` | `/api/games/state/{game_id}` | Retrieve current game state from Redis |
| `POST` | `/api/images/generate` | Generate a persona-style image via Stable Diffusion XL |
| `POST` | `/api/selfie/generate` | Generate a FaceID-consistent persona selfie |
| `POST` | `/api/multimodal/analyze` | Analyze an uploaded image + text prompt using Gemini Vision |
| `GET` | `/api/diary/today` | Retrieve AI-generated diary entry for today |

---

### Realtime Communication APIs

All Realtime routes use the prefix `/api/v1/` and reuse the same Supabase JWT authentication.

#### Profiles & Matching

| Method | Endpoint | Description |
|--------|---------|-------------|
| `GET` | `/api/v1/profiles/me` | Get current user's Familia profile |
| `PATCH` | `/api/v1/profiles/me` | Update Familia profile |
| `POST` | `/api/v1/matching/find` | Find compatible cross-cultural matches |
| `POST` | `/api/v1/matching/accept/{user_id}` | Accept a match and create relationship |
| `GET` | `/api/v1/friends` | List all friend relationships + levels |

#### Messaging & Calls

| Method | Endpoint | Description |
|--------|---------|-------------|
| `GET` | `/api/v1/chat/{relationship_id}` | Get message history for a relationship |
| `POST` | `/api/v1/chat/{relationship_id}` | Send a message (auto-translated) |
| `WS` | `/api/v1/calls/signal/{relationship_id}/{user_id}` | WebRTC signaling for P2P audio/video calls |
| `POST` | `/api/v1/calls/transcribe` | Upload audio for STT transcription (Deepgram) |
| `POST` | `/api/v1/calls/speak` | Convert text to speech (Cartesia) |

#### Social & Progression

| Method | Endpoint | Description |
|--------|---------|-------------|
| `GET` | `/api/v1/contests` | List active bonding contests |
| `POST` | `/api/v1/contests/{id}/submit` | Submit contest answer |
| `GET` | `/api/v1/family_rooms` | List available family rooms (Level 5+) |
| `POST` | `/api/v1/family_rooms/{id}/join` | Join a family room |
| `GET` | `/api/v1/xp/status` | Current XP, level, and streak for Familia |
| `POST` | `/api/v1/xp/award` | Award XP for a social action |
| `POST` | `/api/v1/translation/translate` | Translate a message with cultural idiom detection |
| `GET` | `/api/v1/verification/status` | Check video/voice verification status |
| `POST` | `/api/v1/verification/submit` | Submit verification video/audio |
| `POST` | `/api/v1/safety/report` | Report a user or content |

---

## 🧪 Testing

The test suite covers authentication, chat write-behind pipeline, games, multimodal inputs, vector search, voice WebSocket, and XP gamification.

```bash
# Install test dependencies (included in requirements.txt)
pip install pytest pytest-asyncio httpx

# Run all tests
pytest tests/ -v

# Run a specific module
pytest tests/test_chat_write_behind.py -v
pytest tests/test_voice_websocket.py -v

# Run with coverage report
pytest tests/ --cov=. --cov-report=html
```

**Test Configuration** (`tests/conftest.py`): Provides async `TestClient` fixtures, mock Supabase responses, a mock Redis Stack, and test JWT tokens for authenticated endpoint tests.

---

## ⚙️ Background Workers

Veliora runs four persistent background workers, all managed as `asyncio.Task`s within the FastAPI lifespan. They start on app startup and are gracefully cancelled on shutdown.

| Worker | Task Name | Trigger | Function |
|--------|----------|---------|---------|
| **Memory Worker** | `memory_worker` | RabbitMQ `memory_queue` | Extract structured memories from conversations, generate embeddings, write to Redis Stack + Supabase |
| **Message Worker** | `message_worker` | RabbitMQ `message_queue` | Persist raw chat messages with embeddings to Supabase `messages` table |
| **XP Flush Worker** | `xp_flush` | Every `XP_FLUSH_INTERVAL` seconds | Batch-write accumulated XP from Redis to Supabase `profiles` table |
| **Diary CRON Worker** | `diary_cron` | Daily at `DIARY_CRON_HOUR` UTC | Trigger Gemini to generate diary entries for active users |
| **Queue Cleanup** | `queue_cleanup` | Every `CLEANUP_INTERVAL_SEC` seconds | Delete empty RabbitMQ queues to prevent resource leaks |

All workers implement `asyncio.CancelledError` handling to exit cleanly on shutdown. Worker failures are caught and logged as warnings — the application continues running without the affected background capability and logs a degraded-mode warning.

---

## 📜 License

The Veliora.AI Persona Engine is proprietary software. The `Redis_chat/` memory subsystem is licensed separately (see `Redis_chat/LICENSE`). The Familia (`realtime_communication/`) sub-system documentation references team NEUTRONS and is subject to its own licensing terms.

---

<p align="center">
  Built with precision by the Veliora team. Powered by Gemini, Redis Stack, Supabase, and a belief that AI should remember what matters.
</p>