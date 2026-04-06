# 🌸 Veliora.AI — Complete System README

<div align="center">

```
██╗   ██╗███████╗██╗     ██╗ ██████╗ ██████╗  █████╗       █████╗ ██╗
██║   ██║██╔════╝██║     ██║██╔═══██╗██╔══██╗██╔══██╗     ██╔══██╗██║
██║   ██║█████╗  ██║     ██║██║   ██║██████╔╝███████║     ███████║██║
╚██╗ ██╔╝██╔══╝  ██║     ██║██║   ██║██╔══██╗██╔══██║     ██╔══██║██║
 ╚████╔╝ ███████╗███████╗██║╚██████╔╝██║  ██║██║  ██║     ██║  ██║██║
  ╚═══╝  ╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝     ╚═╝  ╚═╝╚═╝
```

**AI Companion Platform with Memory-Enhanced Personas & Global Human Connection**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-4285F4?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)
[![Redis](https://img.shields.io/badge/Redis_Stack-7.4+-DC382D?style=flat-square&logo=redis)](https://redis.io/docs/stack/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3.x-FF6600?style=flat-square&logo=rabbitmq)](https://www.rabbitmq.com/)

</div>

---

## 🗂️ Table of Contents

1. [Overview — Two Subprojects](#1-overview--two-subprojects)
2. [Subproject 1: Persona Bots AI](#2-subproject-1-persona-bots-ai)
   - [Architecture Overview](#21-architecture-overview)
   - [Memory System Deep Dive](#22-memory-system-deep-dive)
   - [Redis Architecture](#23-redis-architecture)
   - [RabbitMQ Worker Pipeline](#24-rabbitmq-worker-pipeline)
   - [Voice System](#25-voice-system)
   - [Image Generation](#26-image-generation)
   - [XP Gamification Engine](#27-xp-gamification-engine)
   - [All Features](#28-all-features)
3. [Subproject 2: Realtime Communication](#3-subproject-2-realtime-communication)
   - [Architecture Overview](#31-architecture-overview)
   - [Relationship Level System](#32-relationship-level-system)
   - [Chat & Translation Engine](#33-chat--translation-engine)
   - [WebRTC Calls](#34-webrtc-calls)
   - [Live Games](#35-live-games)
   - [Family Rooms](#36-family-rooms)
   - [All Features](#37-all-features)
4. [Redis Communication Flowchart](#4-redis-communication-flowchart)
5. [System Architecture Diagram](#5-system-architecture-diagram)
6. [Tech Stack](#6-tech-stack)
7. [Setup & Running](#7-setup--running)
8. [API Reference Summary](#8-api-reference-summary)

---

## 1. Overview — Two Subprojects

Veliora.AI is a **unified backend** serving two interconnected experiences:

```
┌─────────────────────────────────────────────────────────────────┐
│                        VELIORA.AI PLATFORM                      │
│                                                                  │
│  ┌──────────────────────────┐  ┌────────────────────────────┐   │
│  │   🤖 PERSONA BOTS AI     │  │  🌐 REALTIME COMMUNICATION  │   │
│  │                          │  │                            │   │
│  │  • 45+ AI Cultural &     │  │  • Human-to-Human Chat     │   │
│  │    Mythological Bots     │  │  • WebRTC Audio/Video      │   │
│  │  • Memory-Enhanced Chat  │  │  • Live Games (Pong etc.)  │   │
│  │  • Real-Time Voice Calls │  │  • Family Rooms            │   │
│  │  • AI Image Generation   │  │  • Auto-Translation        │   │
│  │  • Text & Image Games    │  │  • Contest System          │   │
│  │  • Persona Diaries       │  │  • XP & Leveling           │   │
│  │  • Multimodal AI         │  │  • Safety & Privacy        │   │
│  │                          │  │                            │   │
│  │  Base: /api/*            │  │  Base: /api/v1/*           │   │
│  └──────────────────────────┘  └────────────────────────────┘   │
│                                                                  │
│         Shared: Supabase PostgreSQL + Redis Stack + JWT          │
└─────────────────────────────────────────────────────────────────┘
```

Both subprojects run on **a single FastAPI server** (`main.py`) on port `8000`, sharing the same database and infrastructure.

---

## 2. Subproject 1: Persona Bots AI

### 2.1 Architecture Overview

```
╔══════════════════════════════════════════════════════════════════════╗
║                    PERSONA BOTS — FULL ARCHITECTURE                  ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║   ┌─────────────┐    REST / WebSocket    ┌──────────────────────┐   ║
║   │   Frontend   │ ◄──────────────────► │   FastAPI Server     │   ║
║   │  (Mobile/Web)│                      │   port :8000         │   ║
║   └─────────────┘                      └──────────┬───────────┘   ║
║                                                    │               ║
║          ┌────────────────────────────────────────┤               ║
║          │                                        │               ║
║          ▼                                        ▼               ║
║   ┌─────────────────┐              ┌───────────────────────┐      ║
║   │   REDIS STACK   │              │     RABBITMQ          │      ║
║   │   (Docker)      │              │     (Docker)          │      ║
║   │                 │              │                       │      ║
║   │ • Context Cache │◄──────────── │ • memory_queue        │      ║
║   │ • Semantic Idx  │              │ • message_log_queue   │      ║
║   │ • Game States   │              │                       │      ║
║   │ • XP Batches    │              └────────┬──────────────┘      ║
║   │ • Session Mgmt  │                       │                      ║
║   └─────────┬───────┘                       │                      ║
║             │                               ▼                      ║
║             │                    ┌──────────────────────┐          ║
║             │                    │   BACKGROUND WORKERS  │          ║
║             │                    │                      │          ║
║             │                    │ • memory_worker.py   │          ║
║             │                    │   (RFM + embedding)  │          ║
║             │                    │ • message_worker.py  │          ║
║             │                    │   (Supabase insert)  │          ║
║             │                    │ • xp_flush_worker    │          ║
║             │                    │ • diary_cron_worker  │          ║
║             │                    └──────────┬───────────┘          ║
║             │                               │                      ║
║             ▼                               ▼                      ║
║   ┌──────────────────────────────────────────────────────────┐     ║
║   │                   SUPABASE (PostgreSQL)                   │     ║
║   │                                                           │     ║
║   │  users  │  messages  │  memories  │  games  │  diary     │     ║
║   │         │            │            │         │  entries   │     ║
║   └──────────────────────────────────────────────────────────┘     ║
║                                                                      ║
║   External APIs:  Gemini 2.0 Flash  │  Deepgram  │  Cartesia       ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

### 2.2 Memory System Deep Dive

The Veliora.AI memory system is the **most sophisticated component** — a three-layer memory architecture inspired by human cognitive memory.

```
╔═══════════════════════════════════════════════════════════════╗
║              3-LAYER MEMORY ARCHITECTURE                       ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  LAYER 1: SEMANTIC MEMORY (Long-Term Episodic)                ║
║  ┌──────────────────────────────────────────────────────┐     ║
║  │  Redis RediSearch Vector Index (768-dim embeddings)  │     ║
║  │                                                      │     ║
║  │  User says: "I'm going to Paris next month"          │     ║
║  │       ↓                                              │     ║
║  │  Gemini Embedding → [0.12, -0.45, 0.88, ...]        │     ║
║  │       ↓                                              │     ║
║  │  Stored: memories:{user_id}:{bot_id}:{uuid}         │     ║
║  │       ↓                                              │     ║
║  │  3 weeks later: "How was Paris?"                    │     ║
║  │  → Vector similarity finds this exact memory!        │     ║
║  └──────────────────────────────────────────────────────┘     ║
║                                                               ║
║  LAYER 2: RFM MEMORY (Importance Scoring)                     ║
║  ┌──────────────────────────────────────────────────────┐     ║
║  │  R = Recency  (more recent = higher score)           │     ║
║  │  F = Frequency (mentioned more = more important)     │     ║
║  │  M = Magnitude (emotionally significant = higher)    │     ║
║  │                                                      │     ║
║  │  RFM Score = α×Recency + β×Frequency + γ×Magnitude  │     ║
║  │                                                      │     ║
║  │  "My mom passed away" → Magnitude=10, always recalled│     ║
║  │  "Had coffee today"   → Magnitude=1, fades quickly   │     ║
║  └──────────────────────────────────────────────────────┘     ║
║                                                               ║
║  LAYER 3: RECENT CONTEXT (Working Memory)                     ║
║  ┌──────────────────────────────────────────────────────┐     ║
║  │  Redis List: context:{user_id}:{bot_id}              │     ║
║  │  Last 50 messages (sliding window)                   │     ║
║  │  TTL: 24 hours                                       │     ║
║  │                                                      │     ║
║  │  [msg_1, msg_2, ..., msg_50] → direct context        │     ║
║  └──────────────────────────────────────────────────────┘     ║
║                                                               ║
║  RESPONSE GENERATION FLOW:                                    ║
║  ┌──────────────────────────────────────────────────────┐     ║
║  │                                                      │     ║
║  │  User Input ──→ Embedding ──→ Vector Search          │     ║
║  │                                    │                 │     ║
║  │                              Top-K Memories          │     ║
║  │                              (semantic)              │     ║
║  │                                    │                 │     ║
║  │                              RFM Re-rank             │     ║
║  │                                    │                 │     ║
║  │                              Top-8 Final Memories    │     ║
║  │                                    +                 │     ║
║  │                              Recent 20 messages      │     ║
║  │                                    │                 │     ║
║  │                         ┌──────────▼──────────┐      │     ║
║  │                         │   Gemini 2.0 Flash  │      │     ║
║  │                         │   + Bot Persona     │      │     ║
║  │                         │   + Memory Context  │      │     ║
║  │                         └──────────┬──────────┘      │     ║
║  │                                    │                 │     ║
║  │                              Response to User        │     ║
║  └──────────────────────────────────────────────────────┘     ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### 2.3 Redis Architecture

```
╔══════════════════════════════════════════════════════════════════╗
║                    REDIS STACK KEY STRUCTURE                      ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ┌─── MEMORY STORAGE ─────────────────────────────────────────┐ ║
║  │                                                             │ ║
║  │  Key Pattern:  memories:{user_id}:{bot_id}:{mem_uuid}      │ ║
║  │  Data Type:    Redis Hash (HSET)                           │ ║
║  │  Fields:       content, embedding (binary), timestamp,     │ ║
║  │                magnitude, frequency, recency_score         │ ║
║  │                                                             │ ║
║  │  Index: RediSearch vector index on 'embedding' field       │ ║
║  │  Search: KNN similarity → top-50 candidates → rerank to 8  │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                  ║
║  ┌─── CONTEXT CACHE ──────────────────────────────────────────┐ ║
║  │                                                             │ ║
║  │  Key Pattern:  context:{user_id}:{bot_id}                  │ ║
║  │  Data Type:    Redis List (RPUSH / LRANGE)                 │ ║
║  │  Content:      [{role, content}, ...] JSON strings         │ ║
║  │  Max Length:   50 messages (LTRIM auto-eviction)           │ ║
║  │  TTL:          86,400 seconds (24 hours)                   │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                  ║
║  ┌─── GAME STATE ─────────────────────────────────────────────┐ ║
║  │                                                             │ ║
║  │  Key Pattern:  game:{user_id}                              │ ║
║  │  Data Type:    Redis String (JSON)                         │ ║
║  │  Content:      {session_id, game_id, turn, max_turns, ...} │ ║
║  │  TTL:          7,200 seconds (2 hours)                     │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                  ║
║  ┌─── XP BATCH ───────────────────────────────────────────────┐ ║
║  │                                                             │ ║
║  │  Key Pattern:  xp_batch:{user_id}                          │ ║
║  │  Data Type:    Redis Hash                                  │ ║
║  │  Content:      {action: xp_amount, ...} accumulated        │ ║
║  │  Flush:        Every 60 seconds → Supabase bulk update     │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                  ║
║  ┌─── SESSION FLAGS ──────────────────────────────────────────┐ ║
║  │                                                             │ ║
║  │  Key Pattern:  session:{user_id}:{bot_id}                  │ ║
║  │  Data Type:    Redis String                                │ ║
║  │  Content:      "active" | timestamp                        │ ║
║  │  Purpose:      Track whether Supabase→Redis load happened  │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════════════════════════╝
```

### How Backend Communicates with Redis

```
╔══════════════════════════════════════════════════════════════════════╗
║              RESPONSE → QUEUE → REDIS COMPLETE FLOW                  ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  Step 1: USER SENDS MESSAGE                                          ║
║  ──────────────────────────                                          ║
║  Frontend ──POST /api/chat/send──► FastAPI                          ║
║                                        │                            ║
║                                        ▼                            ║
║  Step 2: SESSION CHECK                                               ║
║  ────────────────────                                                ║
║              ┌─── Redis GET session:{user_id}:{bot_id} ───┐         ║
║              │                                             │         ║
║           HIT (session active)              MISS (first message)    ║
║              │                                             │         ║
║              │                        Supabase SELECT messages      ║
║              │                        WHERE user_id AND bot_id      ║
║              │                                             │         ║
║              │                        Redis RPUSH context:* ───────►║
║              │                        Redis SET session:*           ║
║              │                                             │         ║
║              └────────────────────────┘                             ║
║                                        │                            ║
║                                        ▼                            ║
║  Step 3: MEMORY RETRIEVAL                                            ║
║  ────────────────────────                                            ║
║  Redis ◄── FT.SEARCH (KNN vector query) ──── embedding(user_msg)    ║
║       │                                                              ║
║       └─► Returns: top-50 memory hashes                             ║
║                │                                                     ║
║                └─► RFM Re-rank → top-8 memories                     ║
║                                        │                            ║
║                                        ▼                            ║
║  Step 4: CONTEXT RETRIEVAL                                           ║
║  ─────────────────────────                                           ║
║  Redis LRANGE context:{user_id}:{bot_id} 0 19 (last 20 messages)    ║
║                                        │                            ║
║                                        ▼                            ║
║  Step 5: LLM GENERATION                                              ║
║  ─────────────────────                                               ║
║  Gemini 2.0 Flash ← [system_prompt + memories + context + message]   ║
║                                        │                            ║
║                                        ▼ bot_response               ║
║  Step 6: CACHE RESPONSE                                              ║
║  ──────────────────────                                              ║
║  Redis RPUSH context:{user_id}:{bot_id}  ← user_message             ║
║  Redis RPUSH context:{user_id}:{bot_id}  ← bot_response             ║
║  Redis LTRIM  (keep last 50)                                         ║
║  Redis EXPIRE (24h TTL refresh)                                      ║
║                                        │                            ║
║                                        ▼ (async background)         ║
║  Step 7: RABBITMQ PUBLISH                                            ║
║  ────────────────────────                                            ║
║  RabbitMQ PUBLISH memory_queue    ← {user_id, bot_id, msgs}         ║
║  RabbitMQ PUBLISH message_log_queue ← {user_id, bot_id, msgs}       ║
║                                        │                            ║
║                                        ▼ (workers processing)       ║
║  Step 8: WORKER PROCESSING                                           ║
║  ─────────────────────────                                           ║
║                                                                      ║
║  memory_worker:                      message_worker:                ║
║  ┌────────────────────────┐          ┌────────────────────────┐     ║
║  │ • Extract facts with   │          │ • Insert to Supabase   │     ║
║  │   Gemini LLM           │          │   messages table       │     ║
║  │ • Generate embedding   │          │ • Generate embedding   │     ║
║  │   (768-dim float32)    │          │   for each message     │     ║
║  │ • Redis HSET           │          │ • Store vector in      │     ║
║  │   memories:{u}:{b}:{id}│          │   messages.embedding   │     ║
║  │ • Update RFM scores    │          └────────────────────────┘     ║
║  └────────────────────────┘                                         ║
║                                        │                            ║
║  Step 9: END SESSION SYNC                                            ║
║  ────────────────────────                                            ║
║  (on POST /api/chat/end-chat)                                        ║
║  Redis LRANGE context:* → all cached messages                        ║
║  For each: generate embedding → Supabase INSERT                      ║
║  Redis DEL context:{user_id}:{bot_id}  (clear session)              ║
║  Redis DEL session:{user_id}:{bot_id}                               ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

### 2.4 RabbitMQ Worker Pipeline

```
╔═══════════════════════════════════════════════════════════════════╗
║               RABBITMQ ASYNC PROCESSING PIPELINE                   ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  FastAPI Handler (sync, ~50ms)                                    ║
║       │                                                           ║
║       ├── Returns response to user immediately ──► Frontend       ║
║       │                                                           ║
║       └── Publishes to RabbitMQ (async, non-blocking)             ║
║                │                                                   ║
║         ┌──────┴────────┐                                         ║
║         ▼               ▼                                         ║
║  ┌─────────────┐  ┌─────────────────┐                            ║
║  │memory_queue │  │message_log_queue│                            ║
║  └──────┬──────┘  └────────┬────────┘                            ║
║         │                  │                                      ║
║         ▼                  ▼                                      ║
║  ┌───────────────────────────────────────────────────────────┐   ║
║  │                  BACKGROUND WORKERS                        │   ║
║  │                  (asyncio.Task loops)                      │   ║
║  │                                                           │   ║
║  │  ┌─ memory_worker ─────────────────────────────────────┐  │   ║
║  │  │                                                     │  │   ║
║  │  │  1. Consume from memory_queue                       │  │   ║
║  │  │  2. Call Gemini to extract memory facts:            │  │   ║
║  │  │     "User mentioned trip to Paris next month"       │  │   ║
║  │  │  3. Gemini embedding-001 → 768-dim float32 vector   │  │   ║
║  │  │  4. Redis HSET memories:{u_id}:{bot_id}:{uuid}      │  │   ║
║  │  │     {content, embedding, timestamp, magnitude}      │  │   ║
║  │  │  5. Update frequency & recency scores               │  │   ║
║  │  │  6. Consolidate similar memories (dedup)            │  │   ║
║  │  └─────────────────────────────────────────────────────┘  │   ║
║  │                                                           │   ║
║  │  ┌─ message_worker ────────────────────────────────────┐  │   ║
║  │  │                                                     │  │   ║
║  │  │  1. Consume from message_log_queue                  │  │   ║
║  │  │  2. Generate embedding for each message             │  │   ║
║  │  │  3. Supabase INSERT INTO messages:                  │  │   ║
║  │  │     {user_id, bot_id, role, content, embedding,    │  │   ║
║  │  │      activity_type, media_url, created_at}         │  │   ║
║  │  └─────────────────────────────────────────────────────┘  │   ║
║  │                                                           │   ║
║  │  ┌─ xp_flush_worker ───────────────────────────────────┐  │   ║
║  │  │                                                     │  │   ║
║  │  │  Every 60 seconds:                                  │  │   ║
║  │  │  1. Redis HGETALL xp_batch:{user_id}                │  │   ║
║  │  │  2. Sum all pending XP                              │  │   ║
║  │  │  3. Supabase UPDATE users SET total_xp += sum       │  │   ║
║  │  │  4. Redis DEL xp_batch:{user_id}                    │  │   ║
║  │  └─────────────────────────────────────────────────────┘  │   ║
║  │                                                           │   ║
║  │  ┌─ diary_cron_worker ─────────────────────────────────┐  │   ║
║  │  │                                                     │  │   ║
║  │  │  Every day at midnight (configurable):              │  │   ║
║  │  │  1. For each active bot+user pair                   │  │   ║
║  │  │  2. Load today's conversations from Supabase        │  │   ║
║  │  │  3. Gemini writes diary entry in bot's voice        │  │   ║
║  │  │  4. Supabase INSERT INTO diary_entries              │  │   ║
║  │  └─────────────────────────────────────────────────────┘  │   ║
║  │                                                           │   ║
║  │  ┌─ queue_cleanup ─────────────────────────────────────┐  │   ║
║  │  │  Every 60 seconds: Remove empty RabbitMQ queues     │  │   ║
║  │  └─────────────────────────────────────────────────────┘  │   ║
║  └───────────────────────────────────────────────────────────┘   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

### 2.5 Voice System

```
╔═══════════════════════════════════════════════════════════════════╗
║              VOICE CALL TRIPLE-STREAMING PIPELINE                  ║
║              (Target latency: < 500ms end-to-end)                  ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  USER SPEAKS                                                      ║
║       │                                                           ║
║       │  [Binary WebSocket frames]                                ║
║       │  PCM 16-bit, 16kHz, Mono                                  ║
║       ▼                                                           ║
║  ┌─────────────────────────────┐                                  ║
║  │    FastAPI WebSocket        │                                  ║
║  │    /api/voice/call          │                                  ║
║  │    ?token=JWT&bot_id=*      │                                  ║
║  └──────────────┬──────────────┘                                  ║
║                 │ Forward audio bytes                              ║
║                 ▼                                                  ║
║  ┌──────────────────────────────────────┐                         ║
║  │  DEEPGRAM NOVA-2  (STT)             │                         ║
║  │  WebSocket streaming                │                         ║
║  │                                     │                         ║
║  │  PCM Audio ──► Transcript in ~200ms │                         ║
║  └──────────────────────────┬──────────┘                         ║
║                             │ transcript text                      ║
║                             ▼                                     ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │    Frontend receives: {"type": "transcript", "text": "..."}  │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                             │                                     ║
║                             ▼                                     ║
║  ┌─────────────────────────────────────┐                         ║
║  │  GEMINI 2.0 FLASH  (LLM)           │                         ║
║  │  Streaming generation               │                         ║
║  │                                     │                         ║
║  │  [Bot Persona Prompt]               │                         ║
║  │  + [Last 10 messages context]       │                         ║
║  │  + [User transcript]                │                         ║
║  │  ──► Text stream chunks             │                         ║
║  └──────────────────────────┬──────────┘                         ║
║                             │ streaming text                       ║
║                             ▼                                     ║
║  ┌─────────────────────────────────────┐                         ║
║  │  CARTESIA SONIC-2  (TTS)           │                         ║
║  │  Streaming synthesis                │                         ║
║  │                                     │                         ║
║  │  Text chunks ──► Audio chunks       │                         ║
║  │  PCM f32le, 24kHz, Mono             │                         ║
║  └──────────────────────────┬──────────┘                         ║
║                             │ binary audio frames                  ║
║                             ▼                                     ║
║  ┌──────────────────────────────────────────────────────────┐    ║
║  │  Frontend receives binary WebSocket frames               │    ║
║  │  → Web Audio API plays audio                             │    ║
║  └──────────────────────────────────────────────────────────┘    ║
║                                                                   ║
║  Voice Note (REST alternative):                                   ║
║  ┌─────────────────────────────────────────────────────────┐     ║
║  │  POST /api/voice/note                                   │     ║
║  │       │                                                 │     ║
║  │       ├── Gemini generates text response                │     ║
║  │       ├── Cartesia converts to MP3                      │     ║
║  │       ├── Upload to Supabase Storage                    │     ║
║  │       └── Return: {text_response, audio_url, duration}  │     ║
║  └─────────────────────────────────────────────────────────┘     ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

### 2.6 Image Generation

```
╔═══════════════════════════════════════════════════════════════════╗
║              IMAGE GENERATION PIPELINE (FaceID Selfie)             ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  POST /api/images/generate-selfie                                 ║
║  { bot_id, message, username }                                    ║
║       │                                                           ║
║       ▼                                                           ║
║  ┌────────────────────────────────────────────────────────────┐   ║
║  │  Step 1: FIND BASE FACE IMAGE                              │   ║
║  │                                                            │   ║
║  │  image-generation/photos/{bot_id}.jpeg                     │   ║
║  │  (45+ high-quality portrait photos)                        │   ║
║  └──────────────────────────────────────────────────────────-─┘   ║
║       │                                                           ║
║       ▼                                                           ║
║  ┌────────────────────────────────────────────────────────────┐   ║
║  │  Step 2: BOT EMOTIONAL REACTION                            │   ║
║  │                                                            │   ║
║  │  Gemini 2.0 Flash reads user message                       │   ║
║  │  → Generates short in-character emotional response         │   ║
║  │  e.g. "OMG that's amazing! I'm SO excited!! 🎉"            │   ║
║  └────────────────────────────────────────────────────────────┘   ║
║       │                                                           ║
║       ▼                                                           ║
║  ┌────────────────────────────────────────────────────────────┐   ║
║  │  Step 3: EMOTION CONTEXT EXTRACTION                        │   ║
║  │                                                            │   ║
║  │  Gemini extracts structured context:                        │   ║
║  │  {                                                          │   ║
║  │    "emotion": "excited",                                    │   ║
║  │    "location": "Parisian cafe terrace",                     │   ║
║  │    "action": "jumping for joy with coffee in hand",         │   ║
║  │    "style": "casual chic summer"                            │   ║
║  │  }                                                          │   ║
║  └────────────────────────────────────────────────────────────┘   ║
║       │                                                           ║
║       ▼                                                           ║
║  ┌────────────────────────────────────────────────────────────┐   ║
║  │  Step 4: GRADIO FaceID GENERATION                          │   ║
║  │                                                            │   ║
║  │  InstantID / FaceAdapter on HuggingFace Spaces             │   ║
║  │                                                            │   ║
║  │  Input:  base_face.jpeg + prompt from emotion_context      │   ║
║  │  Prompt: "A photo of a person, excited, at a Parisian      │   ║
║  │           cafe terrace, jumping for joy with coffee,        │   ║
║  │           casual chic summer style, photorealistic"         │   ║
║  │                                                            │   ║
║  │  Output: New image preserving facial identity              │   ║
║  └────────────────────────────────────────────────────────────┘   ║
║       │                                                           ║
║       ▼                                                           ║
║  ┌────────────────────────────────────────────────────────────┐   ║
║  │  Step 5: SAVE & SERVE                                      │   ║
║  │                                                            │   ║
║  │  Save to: static/images/{uuid}.png                         │   ║
║  │  URL:     http://localhost:8000/static/images/{uuid}.png   │   ║
║  │  Also:    Return base64 for immediate display              │   ║
║  └────────────────────────────────────────────────────────────┘   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

### 2.7 XP Gamification Engine

```
╔═══════════════════════════════════════════════════════════════════╗
║                    XP GAMIFICATION SYSTEM                          ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Level Formula:  level = floor(√(total_xp / 100))                ║
║                                                                   ║
║  ┌─ XP EVENTS ─────────────────────────────────────────────────┐ ║
║  │                                                             │ ║
║  │  Daily Login:        1,000 XP  ──────────────────────────  │ ║
║  │  Login Streak Bonus:   200 XP × day (max 7 days = 1,400)   │ ║
║  │  Message (short):       10 XP  ─ < 100 chars               │ ║
║  │  Message (medium):      15 XP  ─ 100-300 chars             │ ║
║  │  Message (long):        25 XP  ─ > 300 chars               │ ║
║  │  Voice Note:            75 XP                              │ ║
║  │  Voice Call Start:     100 XP                              │ ║
║  │  Image Describe:        50 XP                              │ ║
║  │  Selfie Generate:      150 XP                              │ ║
║  │  URL Summarize:         50 XP                              │ ║
║  │  Weather Check:         25 XP                              │ ║
║  │  Meme Generate:        100 XP                              │ ║
║  │  Game Start:            50 XP                              │ ║
║  │  Game Action:           25 XP                              │ ║
║  │  Game Complete:        250 XP                              │ ║
║  │  Diary Read:            30 XP                              │ ║
║  │  Profile Complete:     500 XP  (one-time)                  │ ║
║  │  Avatar Upload:        100 XP  (one-time)                  │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
║  ┌─ STREAK MULTIPLIER ────────────────────────────────────────┐  ║
║  │                                                            │  ║
║  │  Day 1:   1.0× base XP                                     │  ║
║  │  Day 3:   1.2× base XP                                     │  ║
║  │  Day 7:   1.5× base XP                                     │  ║
║  │  Day 14:  1.8× base XP                                     │  ║
║  │  Day 30+: 2.0× base XP  (MAXIMUM)                          │  ║
║  └────────────────────────────────────────────────────────────┘  ║
║                                                                   ║
║  ┌─ ASYNC XP FLOW ────────────────────────────────────────────┐  ║
║  │                                                            │  ║
║  │  Action triggers XP → Redis HINCR xp_batch:{user_id}      │  ║
║  │                             │                              │  ║
║  │           (every 60 seconds)│                              │  ║
║  │                             ▼                              │  ║
║  │  xp_flush_worker → Supabase UPDATE total_xp               │  ║
║  │                    (single bulk update vs. per-message)    │  ║
║  └────────────────────────────────────────────────────────────┘  ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

### 2.8 All Features

| Feature | Description | Endpoint |
|---------|-------------|----------|
| 🔐 **Auth** | Supabase JWT (ES256/HS256), auto JWKS refresh | `/api/auth/signup`, `/login` |
| 💬 **Memory Chat** | 3-layer memory: semantic + RFM + recent context | `/api/chat/send` |
| 🗓️ **Chat History** | Paginated from Supabase | `/api/chat/history` |
| 🎙️ **Voice Note** | LLM text → Cartesia TTS → MP3 URL | `/api/voice/note` |
| 📞 **Live Voice Call** | Deepgram STT → Gemini → Cartesia streaming | `WS /api/voice/call` |
| 🖼️ **AI Selfie** | FaceID-preserved image with emotion context | `/api/images/generate-selfie` |
| 👁️ **Image Describe** | Gemini multimodal vision | `/api/multimodal/describe-image` |
| 🔗 **URL Summarize** | Fetch + Gemini summarize | `/api/multimodal/summarize-url` |
| 🌤️ **Weather** | Real-time wttr.in + persona commentary | `/api/multimodal/weather/{bot_id}` |
| 😂 **Meme Gen** | In-character cultural memes | `/api/multimodal/meme` |
| 🎮 **Games** | Turn-based games with persona as GM | `/api/games/*` |
| 📓 **Diary** | Nightly AI-generated persona diary | `/api/diary/{bot_id}` |
| 🤳 **Bot Selfie** | Context-aware HuggingFace image | `/api/selfie/generate` |
| ⭐ **XP System** | Gamification with streaks & levels | `/api/auth/xp` |
| 🌍 **45+ Personas** | 8 cultures × 6 roles + 5 mythological | All endpoints |

---

## 3. Subproject 2: Realtime Communication

### 3.1 Architecture Overview

```
╔══════════════════════════════════════════════════════════════════════╗
║                REALTIME COMMUNICATION — FULL ARCHITECTURE            ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║   ┌─────────────┐      REST + WebSocket     ┌──────────────────┐    ║
║   │   User A    │ ◄────────────────────────►│  FastAPI Server  │    ║
║   │  (Tokyo)    │                           │  port :8000      │    ║
║   └─────────────┘                           └────────┬─────────┘    ║
║                                                      │               ║
║   ┌─────────────┐      REST + WebSocket              │               ║
║   │   User B    │ ◄─────────────────────────────────┤               ║
║   │   (Delhi)   │                           ┌────────┴─────────┐    ║
║   └─────────────┘                           │    SUPABASE      │    ║
║                                             │  (PostgreSQL)    │    ║
║   ┌─────────────┐                           │                  │    ║
║   │   User C    │ ◄─────── Family Room ─────│ profiles_rt      │    ║
║   │  (Berlin)   │                           │ relationships_rt │    ║
║   └─────────────┘                           │ messages_rt      │    ║
║                                             │ family_rooms_rt  │    ║
║                                             │ game_sessions_rt │    ║
║                                             │ contests_rt      │    ║
║                                             │ xp_ledger_rt     │    ║
║                                             └──────────────────┘    ║
║                                                                      ║
║   External APIs:                                                     ║
║   • Google Translate API  (auto-translation)                         ║
║   • Gemini 2.0 Flash      (cultural analysis, idiom detection)       ║
║   • Cartesia TTS          (voice messages)                           ║
║   • Deepgram STT          (voice transcription)                      ║
║   • Firebase FCM          (push notifications)                       ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

### 3.2 Relationship Level System

```
╔═══════════════════════════════════════════════════════════════════╗
║               7-LEVEL RELATIONSHIP PROGRESSION SYSTEM              ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ╔═══════╗  ╔══════════════╗  ╔════════════════════════════════╗ ║
║  ║ LEVEL ║  ║    LABEL     ║  ║   UNLOCKS                      ║ ║
║  ╠═══════╣  ╠══════════════╣  ╠════════════════════════════════╣ ║
║  ║   1   ║  ║  Strangers   ║  ║  Text messaging                ║ ║
║  ║   2   ║  ║ Acquaintances║  ║  + Image & video sharing       ║ ║
║  ║   3   ║  ║   Bonded     ║  ║  + Audio calls (WebRTC)        ║ ║
║  ║   4   ║  ║    Close     ║  ║  + Video calls (WebRTC)        ║ ║
║  ║   5   ║  ║  Deep Bond   ║  ║  + Create Family Rooms         ║ ║
║  ║   6   ║  ║   Trusted    ║  ║  + Create Contests             ║ ║
║  ║   7   ║  ║   Lifetime   ║  ║  + All features unlocked       ║ ║
║  ╚═══════╝  ╚══════════════╝  ╚════════════════════════════════╝ ║
║                                                                   ║
║  XP Sources for Relationship:                                     ║
║  • Sending messages:      +5 shared XP                           ║
║  • Answering questions:   +20 shared XP                          ║
║  • Completing contests:   +150 shared XP                         ║
║  • Playing live games:    +50-200 shared XP                      ║
║  • Gifting XP:            XP transfers between users             ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

### 3.3 Chat & Translation Engine

```
╔═══════════════════════════════════════════════════════════════════╗
║            AUTO-TRANSLATION CHAT FLOW                              ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  User A (Tokyo) sends: "今日は大変疲れました"                        ║
║       │                                                           ║
║       ▼                                                           ║
║  POST /api/v1/chat/send                                           ║
║  { relationship_id, original_text, content_type }                ║
║       │                                                           ║
║       ▼                                                           ║
║  ┌─ Language Detection ────────────────────────────────────────┐  ║
║  │  Google Translate detect → "ja" (Japanese)                  │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║       │                                                           ║
║       ▼                                                           ║
║  ┌─ Partner Preferences ───────────────────────────────────────┐  ║
║  │  User B privacy settings → translation_language: "hi"       │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║       │                                                           ║
║       ▼                                                           ║
║  ┌─ Translation ───────────────────────────────────────────────┐  ║
║  │  Google Translate: ja → hi                                  │  ║
║  │  "आज मैं बहुत थक गया/गई"                                      │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║       │                                                           ║
║       ▼                                                           ║
║  ┌─ Cultural Analysis (Gemini) ────────────────────────────────┐  ║
║  │  • Check for idioms/expressions                             │  ║
║  │  • Add cultural_note if relevant                            │  ║
║  │  • Extract facts for relationship memory                    │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║       │                                                           ║
║       ▼                                                           ║
║  ┌─ Supabase Store ────────────────────────────────────────────┐  ║
║  │  messages_realtime:                                         │  ║
║  │  { original_text: "今日は大変...",                           │  ║
║  │    translated_text: "आज मैं बहुत...",                         │  ║
║  │    original_language: "ja",                                 │  ║
║  │    translated_language: "hi",                               │  ║
║  │    has_idiom: false,                                        │  ║
║  │    cultural_note: null }                                    │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║       │                                                           ║
║       ▼                                                           ║
║  ┌─ WebSocket Broadcast ───────────────────────────────────────┐  ║
║  │  WS /api/v1/chat/ws/{rel_id}/{user_b_id}                    │  ║
║  │  { type: "new_message", message: {...} }                    │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                   ║
║  User B (Delhi) sees: "आज मैं बहुत थक गया/गई" ✅                  ║
║  (Can toggle to see original Japanese if preferred)               ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

### 3.4 WebRTC Calls

```
╔═══════════════════════════════════════════════════════════════════╗
║               WEBRTC PEER-TO-PEER CALL FLOW                        ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  CALLER (User A)              SERVER            RECEIVER (User B) ║
║       │                         │                     │           ║
║       ├── WS Connect ──────────►│                     │           ║
║       │   /signal/{rel}/{user_a}│                     │           ║
║       │                         │◄── WS Connect ──────┤           ║
║       │                         │   /signal/{rel}/{user_b}        ║
║       │                         │                     │           ║
║       ├── {call_start: audio} ─►│                     │           ║
║       │                         │ Level check: ≥ 3?   │           ║
║       │                         ├── Notify partner ──►│           ║
║       │                         │   {incoming_call}   │           ║
║       │                         │                     │           ║
║       ├── {offer: SDP} ────────►│                     │           ║
║       │                         ├─────────────────────►           ║
║       │                         │    Relay offer SDP  │           ║
║       │                         │                     │           ║
║       │                         │◄── {answer: SDP} ───┤           ║
║       │◄── Relay answer SDP ────┤                     │           ║
║       │                         │                     │           ║
║       ├── {ice_candidate} ─────►│                     │           ║
║       │                         ├── Relay candidate ─►│           ║
║       │◄────────────────────────┤◄── {ice_candidate} ─┤           ║
║       │    Relay candidate      │                     │           ║
║       │                         │                     │           ║
║       │   ◄═══ DIRECT P2P AUDIO/VIDEO STREAM ═══►    │           ║
║       │      (No server relay — peer-to-peer)          │           ║
║       │                         │                     │           ║
║       ├── {call_end} ──────────►│                     │           ║
║       │                         ├── {call_ended} ────►│           ║
║       └─── WS Close ───────────►│◄── WS Close ────────┤           ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

### 3.5 Live Games

```
╔═══════════════════════════════════════════════════════════════════╗
║               LIVE GAME SYSTEM (WebSocket)                         ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Games:  🏓 Pong  |  🏒 Air Hockey  |  ❌ Tic-Tac-Toe            ║
║                                                                   ║
║  ┌─ Server-Side Game Loop (asyncio.Task) ───────────────────┐    ║
║  │                                                          │    ║
║  │  PONG:                                                   │    ║
║  │  ┌───────────────────────────────────────────────────┐   │    ║
║  │  │  Canvas: 800×400   Ball: starts at center          │   │    ║
║  │  │  Ball velocity:  vx=4, vy=3 (increases over time)  │   │    ║
║  │  │  Paddles:        Player A (left), Player B (right)  │   │    ║
║  │  │  Win condition:  First to 5 points                  │   │    ║
║  │  │                                                    │   │    ║
║  │  │  Server loop every 16ms (60 FPS):                   │   │    ║
║  │  │  1. Move ball by (vx, vy)                           │   │    ║
║  │  │  2. Check wall collisions → reverse vy              │   │    ║
║  │  │  3. Check paddle collisions → reverse vx            │   │    ║
║  │  │  4. Check scoring → update scores, reset ball       │   │    ║
║  │  │  5. Broadcast game_state to both players            │   │    ║
║  │  └───────────────────────────────────────────────────┘   │    ║
║  │                                                          │    ║
║  │  Player inputs: { type: "move", direction: "up"/"down" } │    ║
║  │  Server updates paddle Y based on input                  │    ║
║  └──────────────────────────────────────────────────────────┘    ║
║                                                                   ║
║  XP on completion:                                                ║
║  Winner: +200 XP   |   Loser: +50 XP   |   Relationship: +100 XP ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

### 3.6 Family Rooms

```
╔═══════════════════════════════════════════════════════════════════╗
║               GLOBAL FAMILY ROOMS                                  ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  A Family Room is a group chat for up to 20 members               ║
║  from different countries, acting as a "global family"            ║
║                                                                   ║
║  ┌── Members & Roles ────────────────────────────────────────┐   ║
║  │                                                           │   ║
║  │  👵 Keiko (JP)    — grandmother                           │   ║
║  │  👨 Arjun (IN)    — son                                   │   ║
║  │  👩 Maria (MX)    — sister                                │   ║
║  │  👦 Hans (DE)     — brother                               │   ║
║  │  ... up to 20 members                                     │   ║
║  └───────────────────────────────────────────────────────────┘   ║
║                                                                   ║
║  ┌── Features ───────────────────────────────────────────────┐   ║
║  │                                                           │   ║
║  │  ✅ Group chat with auto-translation (everyone sees        │   ║
║  │     messages in their preferred language)                 │   ║
║  │  ✅ Cultural potluck sharing (recipes + photos)            │   ║
║  │  ✅ Group polls with WhatsApp-style interface              │   ║
║  │  ✅ Join via invite code or link                           │   ║
║  │  ✅ Role-based roles (mother, father, sibling, etc.)       │   ║
║  │  ✅ Moderation (kick, mute)                                │   ║
║  │  ✅ Real-time WebSocket for instant messages               │   ║
║  └───────────────────────────────────────────────────────────┘   ║
║                                                                   ║
║  Access Requirement: Level 5 in at least one relationship         ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

### 3.7 All Features

| Feature | Description | Endpoint |
|---------|-------------|----------|
| 🔐 **Auth** | Supabase JWT signup/login with minor detection | `/api/v1/auth/*` |
| 👤 **Profiles** | Full profile + avatar + language preferences | `/api/v1/profiles/*` |
| ✅ **Verification** | Document + selfie identity verification | `/api/v1/verification/*` |
| 🔍 **Browse & Match** | Role-based browsing (mentor, friend, romantic) | `/api/v1/matching/*` |
| 🤝 **Friends** | Request, accept, search, manage connections | `/api/v1/friends/*` |
| 💬 **Chat** | Auto-translation + polls + reactions + forward | `/api/v1/chat/*` |
| 📎 **Media** | Image/video/voice upload in chat | `/api/v1/chat/upload-media` |
| 📞 **WebRTC Calls** | Peer-to-peer audio & video (level-gated) | `WS /api/v1/calls/signal/*` |
| 🏠 **Family Rooms** | Group chat + potluck + polls for 20 members | `/api/v1/rooms/*` |
| 🎮 **Turn Games** | Cultural trivia, vocabulary contests | `/api/v1/games/*` |
| 🏓 **Live Games** | Real-time Pong/Tic-Tac-Toe via WebSocket | `WS /api/v1/games/live/*` |
| 🏆 **Contests** | Competitive language/culture challenges | `/api/v1/contests/*` |
| ❓ **Questions** | Relationship-deepening question bank | `/api/v1/questions/*` |
| 🌐 **Translation** | Manual translate/detect/batch API | `/api/v1/translation/*` |
| 🛡️ **Safety** | Report, block, reliability scores | `/api/v1/safety/*` |
| 🔒 **Privacy** | Online status, message permissions | `/api/v1/privacy/*` |
| ⭐ **XP Leaderboard** | Global XP ranking, gift XP | `/api/v1/xp/*` |
| 🔔 **Notifications** | Read, delete, mark-all-read | `/api/v1/profiles/{id}/notifications` |
| 🔊 **Voice (STT/TTS)** | Transcribe audio, speak text | `/api/v1/voice/*` |

---

## 4. Redis Communication Flowchart

```
╔══════════════════════════════════════════════════════════════════════════╗
║                 COMPLETE REDIS STACK DATA FLOW                           ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  ┌────────────────────────────────────────────────────────────────────┐  ║
║  │                     REDIS STACK DOCKER                             │  ║
║  │                     localhost:6379                                 │  ║
║  │                                                                    │  ║
║  │   ┌── Modules Active ──────────────────────────────────────────┐  │  ║
║  │   │  • RedisSearch  (vector similarity search, full-text)      │  │  ║
║  │   │  • RedisJSON    (JSON document storage)                    │  │  ║
║  │   │  • RedisTimeSeries (time-series XP tracking)               │  │  ║
║  │   └────────────────────────────────────────────────────────────┘  │  ║
║  └────────────────────────────────────────────────────────────────────┘  ║
║                                                                          ║
║  DATA WRITTEN TO REDIS:                                                  ║
║  ┌────────────────────────────────────────────────────────────────────┐  ║
║  │                                                                    │  ║
║  │  [1] Chat Message Sent                                             │  ║
║  │      FastAPI ──RPUSH──► context:{user_id}:{bot_id}                │  ║
║  │                         [{role:"user", content:"Hello!"}]          │  ║
║  │                         LTRIM (keep last 50)                       │  ║
║  │                         EXPIRE 86400 (24h)                         │  ║
║  │                                                                    │  ║
║  │  [2] Bot Response Received                                         │  ║
║  │      FastAPI ──RPUSH──► context:{user_id}:{bot_id}                │  ║
║  │                         [{role:"bot", content:"Hi there!"}]        │  ║
║  │                                                                    │  ║
║  │  [3] Memory Stored (via worker)                                    │  ║
║  │      memory_worker ──HSET──► memories:{user_id}:{bot_id}:{uuid}  │  ║
║  │                              content: "User going to Paris"        │  ║
║  │                              embedding: <768 bytes binary>         │  ║
║  │                              timestamp: "2024-04-01T10:00:00Z"    │  ║
║  │                              magnitude: "7"                        │  ║
║  │                              frequency: "1"                        │  ║
║  │                                                                    │  ║
║  │  [4] Game State Set                                                │  ║
║  │      FastAPI ──SET──► game:{user_id}                              │  ║
║  │                        '{"session_id":"abc","turn":3,...}'         │  ║
║  │                        EXPIRE 7200 (2h)                            │  ║
║  │                                                                    │  ║
║  │  [5] XP Batch Accumulate                                           │  ║
║  │      FastAPI ──HINCR──► xp_batch:{user_id}                        │  ║
║  │                          message_sent: 15                          │  ║
║  │                          voice_note: 75                            │  ║
║  └────────────────────────────────────────────────────────────────────┘  ║
║                                                                          ║
║  DATA READ FROM REDIS:                                                   ║
║  ┌────────────────────────────────────────────────────────────────────┐  ║
║  │                                                                    │  ║
║  │  [1] Memory Search (KNN Vector Query)                              │  ║
║  │      FastAPI ──FT.SEARCH──► idx:memories                          │  ║
║  │      Query: "=>[KNN 50 @embedding $vec]"                           │  ║
║  │      Input: 768-dim float32 vector of user message                 │  ║
║  │      Output: top-50 memories sorted by cosine similarity           │  ║
║  │      → Re-rank by RFM score → top-8 for context                   │  ║
║  │                                                                    │  ║
║  │  [2] Context Retrieval                                             │  ║
║  │      FastAPI ──LRANGE──► context:{user_id}:{bot_id} 0 19          │  ║
║  │      Output: last 20 messages as JSON list                         │  ║
║  │                                                                    │  ║
║  │  [3] Game State Read                                               │  ║
║  │      FastAPI ──GET──► game:{user_id}                               │  ║
║  │      Output: current game state JSON                               │  ║
║  │                                                                    │  ║
║  │  [4] Session Check                                                 │  ║
║  │      FastAPI ──EXISTS──► session:{user_id}:{bot_id}               │  ║
║  │      Output: 1 (loaded) or 0 (need to load from Supabase)         │  ║
║  └────────────────────────────────────────────────────────────────────┘  ║
║                                                                          ║
║  REDIS → SUPABASE (Sync Points):                                         ║
║  ┌────────────────────────────────────────────────────────────────────┐  ║
║  │                                                                    │  ║
║  │  1. End Chat:  Redis LRANGE context:* → Supabase INSERT messages  │  ║
║  │  2. XP Flush:  Redis HGETALL xp_batch:* → Supabase UPDATE users   │  ║
║  │  3. Worker:    RabbitMQ → memory_worker → Redis HSET memories:*   │  ║
║  │  4. Worker:    RabbitMQ → message_worker → Supabase INSERT msgs   │  ║
║  └────────────────────────────────────────────────────────────────────┘  ║
║                                                                          ║
║  SUPABASE → REDIS (Load Points):                                         ║
║  ┌────────────────────────────────────────────────────────────────────┐  ║
║  │                                                                    │  ║
║  │  1. First Message: Supabase SELECT messages → Redis RPUSH context  │  ║
║  │  2. Memories:      Supabase SELECT memories → Redis HSET memories  │  ║
║  │  3. App Startup:   Redis PING → create indexes (FT.CREATE)         │  ║
║  └────────────────────────────────────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 5. System Architecture Diagram

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    VELIORA.AI — COMPLETE SYSTEM DIAGRAM                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ┌──────────────┐     ┌──────────────────────────────────────────────────┐  ║
║  │   Mobile App │     │              FASTAPI SERVER :8000                 │  ║
║  │   Web App    │────►│                                                  │  ║
║  │   Frontend   │     │  ┌─────────────────┐  ┌─────────────────────┐  │  ║
║  └──────────────┘     │  │  Persona Bots   │  │  Realtime Comms     │  │  ║
║                        │  │  Routes         │  │  Routes              │  │  ║
║  ┌──────────────┐     │  │  /api/*         │  │  /api/v1/*           │  │  ║
║  │ Admin Panel  │────►│  └────────┬────────┘  └──────────┬──────────┘  │  ║
║  └──────────────┘     │           │                       │              │  ║
║                        │  ┌────────▼───────────────────────▼──────────┐  │  ║
║                        │  │           SHARED SERVICES                  │  │  ║
║                        │  │  Supabase Client | Redis Cache | RabbitMQ  │  │  ║
║                        │  └────────┬───────────────────────┬──────────┘  │  ║
║                        │           │                        │              │  ║
║                        └───────────┼────────────────────────┼─────────────┘  ║
║                                    │                        │                  ║
║              ┌─────────────────────┤        ┌───────────────┘                  ║
║              │                     │        │                                  ║
║              ▼                     ▼        ▼                                  ║
║  ┌────────────────────┐  ┌─────────────┐  ┌───────────────────────────────┐  ║
║  │   SUPABASE         │  │ REDIS STACK │  │        RABBITMQ               │  ║
║  │   (PostgreSQL)     │  │  (Docker)   │  │        (Docker)               │  ║
║  │                    │  │             │  │                               │  ║
║  │  • users           │  │ • context:* │  │  Queues:                      │  ║
║  │  • messages        │◄─┤ • memories: │  │  • memory_queue               │  ║
║  │  • memories        │  │ • game:*    │  │  • message_log_queue          │  ║
║  │  • game_sessions   │  │ • xp_batch: │  │                               │  ║
║  │  • diary_entries   │  │ • session:* │  │  Workers:                     │  ║
║  │  • profiles_rt     │  │             │  │  • memory_worker              │  ║
║  │  • relationships_rt│  │  RediSearch │  │  • message_worker             │  ║
║  │  • messages_rt     │  │  (vector    │  │  • xp_flush_worker            │  ║
║  │  • family_rooms_rt │  │   index)    │  │  • diary_cron_worker          │  ║
║  │  • contests_rt     │  └─────────────┘  └───────────────────────────────┘  ║
║  └────────────────────┘                                                       ║
║                                                                              ║
║  External APIs:                                                               ║
║  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐  ║
║  │ Gemini 2.0   │ │  Deepgram    │ │  Cartesia    │ │  Google Translate  │  ║
║  │ Flash (LLM)  │ │  Nova-2      │ │  Sonic-2     │ │  API               │  ║
║  │ + Embedding  │ │  (STT)       │ │  (TTS)       │ │  + HuggingFace     │  ║
║  └──────────────┘ └──────────────┘ └──────────────┘ └────────────────────┘  ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 6. Tech Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Framework** | FastAPI 0.115+ | REST API + WebSocket server |
| **Language** | Python 3.11+ | All backend logic |
| **AI / LLM** | Gemini 2.0 Flash | Chat responses, content generation |
| **AI / Embeddings** | Gemini Embedding-001 | 768-dim text embeddings |
| **AI / STT** | Deepgram Nova-2 | Real-time speech transcription |
| **AI / TTS** | Cartesia Sonic-2 | Neural text-to-speech |
| **AI / Images** | HuggingFace + Gradio FaceID | Persona selfie generation |
| **Database** | Supabase (PostgreSQL) | Primary data store |
| **Cache** | Redis Stack (Docker) | Context cache + vector index |
| **Queue** | RabbitMQ (Docker) | Async memory + logging workers |
| **Auth** | Supabase JWT (ES256) | Authentication tokens |
| **Translation** | Google Translate API | Auto-translation in RT comms |
| **Calls** | WebRTC + FastAPI signaling | Peer-to-peer audio/video |
| **Notifications** | Supabase Realtime / FCM | Push notifications |
| **Image CDN** | Supabase Storage | Avatar, selfie, media storage |
| **Static Files** | FastAPI StaticFiles | Serve generated images + audio |

---

## 7. Setup & Running

### Prerequisites

```bash
# Required services (Docker)
docker run -d --name redis-stack -p 6379:6379 redis/redis-stack:latest
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management

# Install Python dependencies
pip install -r requirements.txt
```

### Environment Variables

```bash
# Copy .env file (already provided with real values)
# Key variables:

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret

REDIS_HOST=localhost
REDIS_PORT=6379

RABBITMQ_URL=amqp://guest:guest@localhost:5672/

GEMINI_API_KEY=your_gemini_key
DEEPGRAM_API_KEY=your_deepgram_key
CARTESIA_API_KEY=your_cartesia_key
```

### Running the Server

```bash
# Development
uvicorn main:app --reload --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Health Check

```bash
curl http://localhost:8000/health
# Returns: { "status": "ok", "redis_stack": "connected", "rabbitmq": "connected" }
```

### API Documentation

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## 8. API Reference Summary

### Persona Bots (prefix: `/api`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signup` | POST | Register new user |
| `/api/auth/login` | POST | Login, get JWT |
| `/api/auth/profile` | GET/PUT | Get/update profile |
| `/api/auth/profile/avatar` | POST | Upload avatar |
| `/api/auth/xp` | GET | XP status & level |
| `/api/chat/send` | POST | Send message (memory-enhanced) |
| `/api/chat/end-chat` | POST | End session, sync to DB |
| `/api/chat/history` | POST | Paginated message history |
| `/api/voice/note` | POST | Generate voice note (TTS) |
| `/api/voice/call` | WebSocket | Live voice call |
| `/api/voice/call/info` | GET | Voice call endpoint info |
| `/api/images/generate-selfie` | POST | Generate persona selfie |
| `/api/images/status` | GET | Check image service |
| `/api/multimodal/describe-image` | POST | Describe uploaded image |
| `/api/multimodal/summarize-url` | POST | Summarize URL content |
| `/api/multimodal/weather/{bot_id}` | GET | Persona's city weather |
| `/api/multimodal/meme` | POST | Generate cultural meme |
| `/api/games/catalog/{bot_id}` | GET | Available games |
| `/api/games/start` | POST | Start game session |
| `/api/games/action` | POST | Send game action |
| `/api/games/end` | POST | End game early |
| `/api/diary/{bot_id}` | GET | Get persona diary |
| `/api/selfie/generate` | POST | Context-aware bot selfie |

### Realtime Communication (prefix: `/api/v1`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/signup` | POST | RT signup |
| `/api/v1/auth/login` | POST | RT login |
| `/api/v1/profiles/me` | GET/PUT | My profile |
| `/api/v1/profiles/{id}` | GET | Any user profile |
| `/api/v1/matching/browse/{role}` | GET | Browse by role |
| `/api/v1/matching/connect/{id}` | POST | Send match request |
| `/api/v1/friends/list` | GET | My connections |
| `/api/v1/friends/request/{id}` | POST | Send friend request |
| `/api/v1/chat/send` | POST | Send message (translated) |
| `/api/v1/chat/ws/{rel_id}/{uid}` | WebSocket | Real-time chat |
| `/api/v1/calls/signal/{rel_id}/{uid}` | WebSocket | WebRTC signaling |
| `/api/v1/rooms/create` | POST | Create family room |
| `/api/v1/rooms/{id}/ws/{uid}` | WebSocket | Family room chat |
| `/api/v1/games/live/create` | POST | Create live game |
| `/api/v1/games/live/ws/{sess}/{uid}` | WebSocket | Play live game |
| `/api/v1/contests/create` | POST | Create contest |
| `/api/v1/translation/` | POST | Translate text |
| `/api/v1/safety/report` | POST | Report user |
| `/api/v1/privacy/settings` | GET/PUT | Privacy settings |
| `/api/v1/xp/me` | GET | My XP info |
| `/api/v1/xp/leaderboard` | GET | Global leaderboard |

---

<div align="center">

**Built with ❤️ by the Veliora.AI Team**

*"Connecting hearts across cultures through the magic of AI and human connection"*

</div>