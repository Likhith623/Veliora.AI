# Chapter 4: System Design

---

## 4.1 High-Level Architectural Paradigm

### 4.1.1 The Dual-Architecture Ecosystem

The Veliora.AI platform is architected as a **dual-architecture ecosystem** — two independently deployable but infrastructure-interconnected backend services that collectively deliver a unified user experience spanning AI-driven companionship and real-time human-to-human social bonding. This architectural bifurcation is a deliberate engineering decision, not an artifact of organic growth, and it directly addresses the fundamentally different computational profiles, data access patterns, and latency requirements of the two product domains.

**Architecture A — AI Persona Orchestration (Port 8000)** constitutes the intelligent core of the platform. Built on the FastAPI framework running atop Uvicorn's ASGI server (Python 3.11+), this service is responsible for the complete lifecycle of customizable AI companion interactions. Its computational profile is dominated by GPU-bound inference workloads — specifically, the execution of transformer-based neural models including Google's Gemini 2.0 Flash for large language model inference, the RoBERTa-based GoEmotions classifier for text emotion recognition across 28 discrete categories, and the HuBERT SUPERB-ER model for speech emotion recognition from raw audio waveforms. Architecture A additionally orchestrates real-time audio processing pipelines involving Deepgram's Nova-2 speech-to-text engine and Cartesia's Sonic text-to-speech synthesizer. Its data layer combines Redis Stack (with RediSearch and HNSW vector indexing) for active session state and semantic memory retrieval, Supabase PostgreSQL for durable persistence, and RabbitMQ for asynchronous message processing. The I/O profile of this service is characterised by long-lived WebSocket connections for voice streaming, burst GPU utilisation during inference, and asynchronous background task execution for memory extraction and telemetry logging.

**Architecture B — Familia Realtime Communication (Port 8001)** serves as the cross-cultural human connection platform. Also built on FastAPI but operating as a completely separate application instance, this service manages the entire social lifecycle: identity verification through multi-modal liveness scoring, role-based familial matching (across 11 defined archetypes including mother, father, mentor, student, and friend), real-time translated messaging with cultural idiom detection, bonding contests with AI-generated questions, and multi-user family rooms with audio/video conferencing via mediasoup Selective Forwarding Units. The computational profile of Architecture B is I/O-bound rather than compute-bound — dominated by WebSocket connection management, database queries against Supabase PostgreSQL, and real-time message fanout. Critically, Architecture B enforces a strict database namespace convention: every table name carries the `_realtime` suffix (e.g., `profiles_realtime`, `relationships_realtime`, `messages_realtime_comunicatio_realtime`) to maintain unambiguous schema separation from Architecture A's tables. This convention is treated as an inviolable contract; the legacy typo in the messages table name (`comunicatio` instead of `communication`) is intentionally preserved to prevent cascading breakage in dependent services.

### 4.1.2 Rationale for Separation

The decision to deploy two independent FastAPI instances rather than a monolithic application is motivated by three engineering considerations. First, **resource isolation**: Architecture A's PyTorch model inference is CPU/GPU-intensive and can momentarily monopolise the ASGI event loop if not carefully managed; isolating it prevents latency spills into the I/O-bound real-time messaging paths of Architecture B. Second, **independent scalability**: the AI persona service can be horizontally scaled based on inference demand without affecting the WebSocket connection topology of the real-time service, and vice versa. Third, **deployment independence**: each service can be updated, restarted, or rolled back without disrupting the other, which is critical for a platform where real-time voice calls and active chat sessions must not be interrupted by AI model updates.

### 4.1.3 Shared Infrastructure Layer

Despite their separation at the application layer, both architectures converge on a unified infrastructure substrate. Supabase PostgreSQL serves as the canonical data store for both services, with namespace separation achieved through table naming rather than separate database instances — a pragmatic choice that simplifies cross-service queries (e.g., the AI persona service reading user profile data written by the Familia service) while maintaining logical boundaries. Both services share credentials for Deepgram's speech-to-text API (used for voice calls in Architecture A and identity verification in Architecture B) and Cartesia's text-to-speech API (used for AI voice responses in Architecture A and voice message synthesis in Architecture B). A single root `.env` file propagates environment variables across both services, ensuring credential consistency.

---

## 4.2 Core Subsystems Breakdown

### 4.2.1 The Orchestration Layer — FastAPI Application Lifecycle

The entry point for Architecture A resides in `main.py` (296 lines), which implements the FastAPI application factory pattern with lifecycle management via Python's `@asynccontextmanager` decorator. The startup sequence is precisely ordered to respect dependency chains: Redis connection establishment precedes RabbitMQ initialisation (since message consumers depend on Redis for state), which in turn precedes the spawning of four background `asyncio.Task` workers — the Redis-to-Supabase synchronisation worker, the RabbitMQ memory extraction consumer, the XP batch flush worker, and the nightly diary CRON generator. This ordering ensures that no background task attempts to access an uninitialised resource. The shutdown sequence mirrors this in reverse: background tasks are cancelled first, then RabbitMQ channels are closed, and finally Redis connections are torn down.

Architecture A registers twelve API routers spanning authentication (`/api/auth`), chat (`/api/chat`), voice streaming (`/api/voice`), ultra-fast voice REST (`/voice-call-ultra-fast`), games (`/api/games`), multimodal features (`/api/multimodal`), selfie generation (`/api/selfie`, `/api/images`), diary management (`/api/diary`), memory vault (`/api/memory`), emotion dashboard (`/emotion-dashboard`), and frontend logging (`/api/logs`). Architecture B registers twenty routers covering authentication, profiles, matching, friends, chat with WebSocket, contests, games, live games, family rooms, presence, privacy, safety, verification, translation, voice, calls, questions, and XP management. The aggregate endpoint surface across both services exceeds 170 distinct REST and WebSocket endpoints.

CORS middleware is configured at the application level with permissive origins during development, and static file serving is mounted at `/static/images/` to serve generated selfie images and uploaded media directly from the FastAPI process without requiring a separate CDN layer.

### 4.2.2 The AI and Emotion Pipeline

The emotion subsystem constitutes a clinical-grade affective computing layer that operates as a continuous background process during both text chat and voice call sessions. It comprises four tightly coupled modules within the `emotion/` package.

**Text Emotion Classification** is performed by the RoBERTa GoEmotions model (`SamLowe/roberta-base-go_emotions`), a transformer model fine-tuned on the GoEmotions dataset to classify text across 28 emotion categories including admiration, anger, caring, curiosity, fear, grief, joy, love, and sadness. The model and tokenizer are loaded as global singletons using a double-checked locking pattern with `threading.Lock` to ensure thread-safe lazy initialisation. Inference is executed within a `torch.no_grad()` context to minimise memory allocation, and runs in a dedicated `ThreadPoolExecutor` (with `max_workers=2`) named `_emotion_executor` to prevent blocking the ASGI event loop.

**Speech Emotion Classification** employs the HuBERT SUPERB-ER model (`superb/hubert-large-superb-er`), which operates directly on raw 16kHz float32 PCM audio arrays with a minimum input requirement of 16,000 samples (one second of audio). This model classifies speech into four affective categories — angry, happy, neutral, and sad — providing a coarse but acoustically grounded emotional signal that complements the finer-grained text classification.

**Emotion Fusion** implements a confidence-weighted ensemble strategy. Each emotion label is mapped to a numerical valence on a [-1.0, +1.0] scale (e.g., joy maps to +0.9, grief to -0.9, neutral to 0.0). The fusion formula weights the text signal at 60% and the speech signal at 40%, reflecting the higher semantic richness of linguistic content over acoustic prosody. Critically, a confidence gating mechanism excludes either signal from the fusion if its confidence falls below 0.3, preventing low-quality inputs from corrupting the affective state estimate.

**The Dual-Alert Safety System** in `session_state.py` (400 lines) represents the most safety-critical component in the entire architecture. It maintains per-session emotional state in Redis using a dedicated key namespace (`emotion:{user_id}:{bot_id}:*`) and implements two intervention tiers. **Tier 1 (Acute Crisis)** is triggered when crisis keywords are detected via regex pattern matching or when the fused valence drops below -0.8 with confidence exceeding 0.7; upon activation, the system bypasses the LLM entirely and injects pre-written crisis intervention resources including hotline numbers and safety plan links, then sets a 24-hour cooldown via a Redis key with TTL. **Tier 2 (Chronic Distress)** activates when the chronic counter (tracking consecutive sessions with average valence below -0.35) reaches three or more; rather than bypassing the LLM, it appends proactive wellness nudges to the system prompt, encouraging the bot to suggest breathing exercises and mindfulness activities. Both tiers log their activations to the `emotion_telemetry` table for longitudinal analytics.

### 4.2.3 The Real-Time WebSocket Layer

The platform implements multiple distinct WebSocket subsystems, each with its own connection management topology optimised for its specific use case.

**Architecture A's Voice WebSocket** (`WS /api/voice/call/{user_id}/{bot_id}`) maintains a single long-lived connection per active voice call session. Within each connection, three concurrent `asyncio.Task` instances execute in parallel: the STT task feeds audio frames to a persistent Deepgram WebSocket connection, the LLM task streams Gemini responses token-by-token, and the TTS task feeds text chunks to a persistent Cartesia WebSocket connection. This triple-streaming architecture achieves sub-500ms end-to-end latency by overlapping the three processing stages rather than executing them sequentially.

**Architecture B's Chat WebSocket** (`WS /api/v1/chat/ws/{relationship_id}/{user_id}`) uses a `ConnectionManager` singleton that maintains an in-memory dictionary mapping relationship IDs to sets of active WebSocket connections. This enables efficient message fanout — when a user sends a message, the `broadcast()` method iterates over all connections registered for that relationship, enabling real-time delivery of messages, typing indicators, stopped-typing signals, and read receipts.

**Architecture B's Presence System** (`WS /api/v1/presence/ws/{user_id}`) maintains a global `PresenceManager` that maps user IDs to WebSocket connections, enabling real-time online/offline status tracking and cross-feature notifications such as game invitations. When a WebSocket connection is established, the user's profile status is atomically updated to "online" in the `profiles_realtime` table; upon disconnection, the status reverts to "offline" with a `last_active_at` timestamp.

**Architecture B's Call Signaling** (`WS /api/v1/calls/signal/{relationship_id}/{user_id}`) implements a `SignalingManager` for WebRTC call establishment. The signaling flow supports seven message types — `call_initiate`, `call_accept`, `call_reject`, `webrtc_offer`, `webrtc_answer`, `ice_candidate`, and `call_end` — and enforces level-based feature locks: audio calls require relationship Level 3 or above, while video calls require Level 4, ensuring that communication modality access is earned through sustained engagement.

**The Mediasoup SFU Infrastructure** comprises two Node.js servers operating in a dual-topology configuration. The Primary SFU (`mediasoup_server/index.js`, port 3016) uses Socket.IO for signaling and directly serves the Next.js frontend for 1-on-1 audio/video calls, managing WebRTC transport creation, producer/consumer pairing, and codec negotiation (VP8 for video at 500–1500 kbps, Opus for audio at 64 kbps). The Internal SFU (`sfu_server/server.js`, port 4000) exposes a REST API controlled exclusively by the FastAPI backend for multi-party family room calls, with no direct client access — the FastAPI service acts as a control plane, issuing HTTP requests to create transports and manage media flows on behalf of connected users.

### 4.2.4 Background Workers and Asynchronous Processing

The platform employs RabbitMQ as its asynchronous message broker, with two durable queues serving as the primary decoupling mechanism between the synchronous API layer and compute-intensive background operations.

**The Memory Extraction Queue** (`memory_extraction_queue`) receives messages after every conversation turn. Each message contains the user ID, bot ID, user message, and bot response. The consumer invokes Gemini to extract personal facts from the exchange, classifying each extraction with an action directive (`add`, `merge`, `override`, or `none`). For `add` actions, the system generates a 768-dimensional embedding vector via Gemini's embedding API and stores the memory in Redis with HNSW indexing for subsequent semantic retrieval. For `merge` actions, the system locates the most similar existing memory via cosine similarity search and updates its text while bumping its frequency metadata.

**The Message Log Queue** (`message_log_queue`) persists chat exchanges, media attachments, and activity metadata (e.g., selfie generation events, game actions) to Supabase for long-term storage and analytics.

Architecture B implements its own background scheduler — a 24-hour loop that executes four maintenance operations daily: streak increment/reset based on interaction recency, care score decay (reducing by 2 points for relationships with 3+ days of inactivity), automatic level-up checks across all active relationships, and seeding of 5 random personal questions for new users with empty question banks.

---

## 4.3 Data Flow Narratives

### 4.3.1 The Chat Pipeline — From JWT Validation to AI Response

The most frequently traversed data flow in the system is the text chat pipeline, exposed at `POST /api/chat/send`. The following narrative describes every processing stage from the moment an HTTP request arrives to the moment a response is returned to the client.

**Stage 1 — Authentication and Request Validation.** The incoming request carries a JWT bearer token in the `Authorization` header. The `get_current_user` dependency extracts this token and validates it against Supabase's JWKS endpoint (the public key set is cached using `@lru_cache` to avoid repeated HTTP fetches). Validation confirms the token's signature, expiration, and issuer. The Pydantic `ChatRequest` model validates the request body, enforcing the presence of `bot_id` and `message` fields.

**Stage 2 — Session Hydration.** Before any conversation logic executes, the system checks for an active Redis session by querying the `session:{user_id}:{bot_id}:active` key. If no active session exists (indicating a cold start or session expiry), the system queries Supabase's `messages` table for the last 50 messages, deserialises them via `serialization.py`, loads them into Redis list structures, and sets a session TTL. This lazy hydration strategy ensures that Redis always contains sufficient conversational context for the LLM while avoiding the overhead of pre-loading all user sessions at startup.

**Stage 3 — Text Emotion Analysis.** The user's message is submitted to the RoBERTa GoEmotions classifier via the `_emotion_executor` ThreadPoolExecutor. The model returns the highest-probability emotion label and its confidence score. This text emotion result is stored transiently for fusion and does not yet trigger any safety evaluation.

**Stage 4 — Memory Retrieval.** Two parallel memory retrieval strategies execute concurrently. The **semantic path** generates a 768-dimensional embedding of the user's message via Gemini's embedding API, then executes a RediSearch HNSW KNN query against the user's memory index to retrieve the top-3 most semantically similar memories. The **RFM path** retrieves all memories for the user/bot pair, computes a Recency-Frequency-Magnitude score for each (weighted 30% recency, 20% frequency, 50% magnitude), and returns the top-3 highest-scoring memories. The combined strategy merges both result sets, deduplicates by memory ID, and passes up to 5 unique memories to the LLM.

**Stage 5 — Prompt Construction and LLM Inference.** The `generate_chat_response()` function in `llm_engine.py` constructs a richly layered prompt. The system prompt layer contains the persona definition from `bot_prompt.py` — including the persona's cultural identity, personality archetype, behavioural constraints, and any user-selected dynamic traits (e.g., "sarcastic", "philosophical"). Below this, semantic memories are injected as "You remember: ..." prefixed strings, followed by RFM memories as "Important context: ..." prefixed strings, the current emotion state ("User's current emotional state: {emotion} with valence {valence}"), the last N messages of conversational context from Redis, and finally the user's new message. This assembled prompt is submitted to Google Gemini 2.0 Flash. Error handling wraps the call with automatic retry on HTTP 429 (rate limit exhausted) and fallback to a secondary API key (`GOOGLE_API_KEY_2`) on persistent failures.

**Stage 6 — Emotion Fusion and Safety Evaluation.** The text emotion from Stage 3 is fused with any available speech emotion data (from a concurrent voice session, if active) using the confidence-weighted ensemble formula. The fused result is passed to `evaluate_dual_alert()`, which scans for crisis keywords, evaluates valence thresholds, and checks the chronic distress counter. If a Tier 1 crisis is detected, the LLM response is discarded and replaced with pre-written intervention resources. If Tier 2 activates, a wellness nudge is appended to the response. The fused emotion state and telemetry data are persisted to Redis and to the Supabase `emotion_telemetry` table.

**Stage 7 — Context Caching and Asynchronous Dispatch.** The user's message and bot's response are appended to the Redis message list and context window. Two messages are then published to RabbitMQ via `publish_memory_task()` (for background memory extraction) and `publish_message_log()` (for Supabase persistence). XP is awarded based on the interaction type via `award_xp()`, which atomically increments the user's per-bot XP counter.

**Stage 8 — Response Delivery.** The response payload — containing the bot's text response, the detected emotion, XP earned, and any active alert state — is serialised and returned to the client.

### 4.3.2 The Triple-Streaming Voice Pipeline

The voice call pipeline, exposed at `WS /api/voice/call/{user_id}/{bot_id}`, achieves sub-500ms end-to-end latency through a triple-streaming architecture that overlaps audio decoding, speech-to-text, language model inference, and text-to-speech in a pipelined fashion.

**Audio Ingestion.** The client streams Opus/WebM audio chunks over the WebSocket connection. These arrive as binary frames and are fed into a `PersistentFFmpegDecoder` — a long-lived FFmpeg subprocess (spawned via `asyncio.create_subprocess_exec`) that persists across the entire call session, eliminating the process spawn overhead that would otherwise occur for each audio chunk. The decoder converts Opus-encoded audio to 16kHz 16-bit PCM format.

**Stream 1 — Speech-to-Text.** An `asyncio.Task` named `_stt_task` maintains a persistent WebSocket connection to Deepgram's Nova-2 real-time STT API. Decoded PCM frames are fed continuously into this connection. Deepgram returns interim and final transcript segments as they become available, accumulating into a complete utterance.

**Stream 2 — Language Model Inference.** Upon receiving a final transcript segment from Deepgram, the `_llm_task` immediately submits it to Gemini 2.0 Flash in streaming mode. Rather than waiting for the complete LLM response, each token is forwarded to the TTS stage as it arrives, enabling the synthesis to begin before the full response is generated.

**Stream 3 — Text-to-Speech.** The `_tts_task` maintains a persistent WebSocket connection to Cartesia's Sonic TTS API. As tokens arrive from the LLM stream, they are batched into phrase-level chunks and submitted for synthesis. Cartesia returns audio chunks incrementally, which are immediately forwarded back to the client over the original WebSocket connection for real-time playback.

**Parallel Emotion Processing.** Concurrently with the three primary streams, an `emotion_worker` task operates on a 4-second rolling audio buffer. Every 4 seconds, it submits the accumulated PCM audio to HuBERT for speech emotion inference, fuses the result with the latest text emotion from the transcript, and updates the Redis emotion state. This continuous affective monitoring enables the bot to dynamically adjust its tone and the safety system to intervene if emotional distress is detected during the call.

---

## 4.4 Database and Persistence Strategy

### 4.4.1 The Dual-Store Architecture

The platform employs a deliberate dual-store persistence strategy that leverages the complementary strengths of Redis Stack and Supabase PostgreSQL, with each store serving a distinct role in the data lifecycle.

**Redis Stack** functions as the **active state store** — it holds all data that must be accessed with sub-millisecond latency during real-time interactions. This includes active chat session messages (capped at 50 per session in a FIFO list), the LLM context window (last 20 messages), individual memory entries with their 768-dimensional HNSW-indexed embedding vectors, session activity flags with TTL-based expiry, active game states, pending XP accumulators, and the complete emotion state hierarchy (current emotion, rolling history window, daily valence averages, alert cooldown timers, and chronic distress counters). Redis Stack's RediSearch module enables the system to execute KNN similarity queries against memory embeddings using the HNSW (Hierarchical Navigable Small World) algorithm with cosine distance, providing the semantic memory retrieval capability that is fundamental to the AI persona's ability to recall and reference past conversations.

**Supabase PostgreSQL** functions as the **canonical persistence layer** — the single source of truth for all durable data that must survive process restarts, deployment rotations, and Redis eviction. This includes user profiles, chat message archives, extracted memories, emotion telemetry time series, XP transaction ledgers, game session histories, bot configuration, and all Familia tables. The write path from Redis to Supabase is asynchronous and batched: a `redis_sync_worker` periodically flushes accumulated messages from Redis lists to Supabase rows, while RabbitMQ consumers handle memory and message log persistence in the background. This asynchronous write-behind strategy ensures that the synchronous request path never blocks on database writes, maintaining consistent response latency.

### 4.4.2 Namespace Separation and the `_realtime` Convention

The two architectures share a single Supabase PostgreSQL instance but maintain strict logical separation through naming conventions. Architecture A's tables use unqualified names (`users`, `messages`, `memories`, `emotion_telemetry`, `games`, `user_bots`, `insight_feedbacks`). Architecture B's tables are uniformly suffixed with `_realtime` (`profiles_realtime`, `relationships_realtime`, `friend_requests_realtime`, `matching_queue_realtime`, `notifications_realtime`, `contests_realtime`, `contest_questions_realtime`, `contest_leaderboard_realtime`, `verification_records_realtime`, `privacy_settings_realtime`, `chat_facts_realtime`, `game_sessions_realtime`, `call_logs_realtime`, `family_rooms_realtime`, `family_room_members_realtime`, `family_room_messages_realtime`, `user_custom_questions_realtime`, `xp_transactions_realtime`, `realtime_xp_realtime`, `user_languages_realtime`, `user_achievements_realtime`, `achievements_realtime`, among others).

This suffix convention serves three purposes: it provides immediate visual disambiguation when inspecting the database schema; it prevents accidental cross-contamination from errant queries; and it enables independent migration management for each service. The convention is enforced at the application layer through the Supabase client wrapper — all table references in Architecture B's codebase are hardcoded with the suffix, and any deviation is treated as a defect.

A notable legacy artefact exists in the messages table: `messages_realtime_comunicatio_realtime` contains a typographical error in "comunicatio" (missing the 'n' from "communication"). This error is deliberately preserved in the schema because correcting it would require a coordinated migration across all services, views, and foreign key references that depend on the table name — a risk deemed disproportionate to the cosmetic benefit.

### 4.4.3 Redis Key Namespace Design

Redis key naming follows a hierarchical colon-separated convention that encodes entity ownership directly into the key:

| Pattern | Type | TTL | Purpose |
|---------|------|-----|---------|
| `chat:{uid}:{bid}:messages` | List | Session-based | Recent chat messages (FIFO, cap 50) |
| `chat:{uid}:{bid}:context` | List | Session-based | LLM context window (last 20) |
| `memory:{uid}:{bid}:{mem_id}` | Hash | Persistent | Individual memory with embedding vector |
| `session:{uid}:{bid}:active` | String | 30 min TTL | Session activity flag |
| `game:{uid}:state` | Hash | Session-based | Active game state |
| `xp:{uid}:{bid}:pending` | String | Until flush | Accumulated XP pending Supabase sync |
| `emotion:{uid}:{bid}:current` | Hash | Session-based | Current fused emotion state |
| `emotion:{uid}:{bid}:history` | List | Session-based | Rolling window of last 20 readings |
| `emotion:{uid}:{bid}:daily_valence` | String | 24h TTL | Day-level average valence |
| `alert:{uid}:{bid}:tier1_cooldown` | String | 24h TTL | Tier 1 crisis cooldown |
| `alert:{uid}:{bid}:tier2_cooldown` | String | 24h TTL | Tier 2 chronic distress cooldown |
| `alert:{uid}:{bid}:chronic_counter` | String | Persistent | Consecutive low-valence session count |
| `idx:memory:{uid}:{bid}` | Index | Persistent | RediSearch HNSW index for memory vectors |

This design ensures that all data for a given user-bot pair is co-located in the key namespace, enabling efficient bulk operations (e.g., session teardown via `DEL chat:{uid}:{bid}:*`) and clear ownership semantics.

### 4.4.4 Supabase Storage Integration

Beyond relational data, Supabase Storage (backed by S3-compatible object storage) is used for binary asset persistence: user avatar images (bucket: `avatars`), generated selfie images (served via the FastAPI static mount at `/static/images/` during development, uploaded to Supabase Storage for production), uploaded chat media (images, videos, voice recordings), and voice bio recordings for user profiles. Media URLs are stored as string references in the corresponding relational tables, maintaining a clean separation between structured metadata and binary content.

### 4.4.5 The XP and Relationship Progression Model

The platform implements two distinct but structurally similar XP systems, one per architecture. Architecture A uses a square-root-based levelling curve where level thresholds follow `floor(sqrt(total_xp / 100))`, producing a decelerating progression that rewards early engagement. Architecture B uses a linear threshold table with 10 named levels (Stranger at 0 points through Legendary at 3,000 points), where each level unlocks specific communication features — text messaging at Level 1, emoji reactions at Level 2, audio calls at Level 3, video calls at Level 4, family room access at Level 5, and so on through Cultural Ambassador status at Level 9 and the Digital Family Book at Level 10. The XP economy spans both systems but is tracked independently, with Architecture A awarding XP for chat interactions, selfie generation, game completion, and daily login streaks, while Architecture B awards XP for messaging, contest participation, game sessions, question answering, and XP gifting between bonded users.

---

*This system design narrative has been derived exclusively from the Veliora.AI Canonical Architectural Documentation (Parts 1, 2, and 3) and reflects the verified state of the implementation as of the most recent exhaustive codebase traversal.*
