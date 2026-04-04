# Veliora.AI Backend — Implementation Plan

## Goal

Build a production-grade, modular FastAPI backend for a real-time multimodal persona chat application. All AI processing uses free external APIs (Gemini, HuggingFace Serverless). Database is Supabase PostgreSQL with pgvector. Caching via Upstash Redis. Voice via Cartesia API. Hosted on GCP free tier.

---

## Proposed File Structure

```
Veliora.AI_backend./
├── main.py                          # FastAPI app, lifespan, CORS, router includes
├── bot_prompts.py                   # ✅ EXISTS — persona system prompts (2930 lines)
├── config/
│   ├── __init__.py
│   ├── settings.py                  # Pydantic Settings from .env
│   └── mappings.py                  # BOT_LANGUAGE_MAP, VOICE_MAPPING, constants
├── api/
│   ├── __init__.py
│   ├── chat.py                      # POST /chat/send, GET /chat/history
│   ├── games.py                     # POST /games/start, POST /games/action, GET /games/catalog
│   ├── voice.py                     # POST /voice/note, WS /voice/call
│   ├── selfie.py                    # POST /selfie/generate
│   ├── multimodal.py                # POST /multimodal/describe-image, /summarize-url, /weather, /meme
│   └── diary.py                     # GET /diary/{bot_id} (read persona diaries)
├── services/
│   ├── __init__.py
│   ├── redis_cache.py               # Upstash Redis client, context load/append, game state, XP batching
│   ├── llm_engine.py                # Gemini API calls (chat, embeddings, scene description, diary)
│   ├── vector_search.py             # Two-stage RAG: pgvector HNSW → HuggingFace cross-encoder reranking
│   ├── voice_service.py             # Cartesia TTS (generate audio, stream audio chunks)
│   ├── selfie_service.py            # HuggingFace IP-Adapter compositing
│   ├── supabase_client.py           # Supabase client init, storage helpers
│   └── background_tasks.py          # Embedding generation, DB sync, XP flush, diary CRON
├── models/
│   ├── __init__.py
│   └── schemas.py                   # Pydantic request/response models
├── .env                             # Environment variables template
├── requirements.txt
├── database.md                      # Complete Supabase SQL schema
└── integration.md                   # Frontend ↔ Backend API contract
```

---

## Proposed Changes

### Component 1: Configuration

#### [NEW] [settings.py](file:///Users/likhith./Veliora.AI_backend./config/settings.py)
- Pydantic `Settings` class loading from `.env`
- All API keys: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`, `CARTESIA_API_KEY`, `HF_API_TOKEN`
- Config constants: `REDIS_CONTEXT_TTL`, `XP_FLUSH_INTERVAL`, `VECTOR_TOP_K`, `RERANK_TOP_K`

#### [NEW] [mappings.py](file:///Users/likhith./Veliora.AI_backend./config/mappings.py)
- `BOT_LANGUAGE_MAP` — exact map from user spec
- `VOICE_MAPPING` — exact Cartesia voice IDs from user spec
- Helper functions: `get_voice_id(bot_id)`, `get_supported_languages(bot_id)`, `validate_language(bot_id, lang)`

---

### Component 2: Database Schema (Supabase PostgreSQL)

#### [NEW] [database.md](file:///Users/likhith./Veliora.AI_backend./database.md)

**Tables:**

| Table | Purpose |
|-------|---------|
| `users` | Auth profiles synced from Supabase Auth |
| `personas` | Bot metadata (id, archetype, origin, gender, avatar_url, face_image_url) |
| `messages` | Chat messages with `embedding vector(768)` + HNSW index |
| `diaries` | Nightly persona diary entries |
| `games` | Game catalog linked to persona archetypes |
| `user_game_sessions` | Active/completed game sessions |
| `user_xp` | Gamification XP + level tracking |
| `selfies` | Generated selfie composites stored in Supabase Storage |

**Key indexes:**
- HNSW index on `messages.embedding` using `vector_cosine_ops` (for O(log N) ANN search)
- Composite index on `messages(user_id, bot_id, created_at)` for context loading
- Index on `user_xp(user_id, bot_id)` for leaderboard queries

**RLS policies:** Row-level security on all user-facing tables scoped to `auth.uid()`.

---

### Component 3: Core Services

#### [NEW] [supabase_client.py](file:///Users/likhith./Veliora.AI_backend./services/supabase_client.py)
- Initialize `supabase.Client` from settings
- Helpers: `upload_to_storage(bucket, file_bytes, path)`, `get_public_url(bucket, path)`
- DB query wrappers for messages, diaries, games

#### [NEW] [redis_cache.py](file:///Users/likhith./Veliora.AI_backend./services/redis_cache.py)
- Upstash Redis via `httpx` (REST API, no `redis-py` dependency for serverless)
- **Context Cache**: `load_context(user_id, bot_id)` → fetch recent messages from Redis List, fallback to Supabase
- **Write-Behind**: `append_message(user_id, bot_id, msg)` → `RPUSH` to Redis List, TTL 24h
- **Game State**: `set_game_state(user_id, game_data)`, `get_game_state(user_id)` → Redis Hash
- **XP Micro-Batching**: `increment_xp(user_id, bot_id, amount)` → `HINCRBY`, flushed every 60s

#### [NEW] [llm_engine.py](file:///Users/likhith./Veliora.AI_backend./services/llm_engine.py)
- `generate_chat_response(system_prompt, context, user_msg, game_state?)` → Gemini 1.5 Flash
- `generate_embedding(text)` → Gemini Embedding API (`models/text-embedding-004`, 768-dim)
- `generate_scene_description(context, bot_id)` → scene prompt for selfie compositing
- `generate_diary_entry(bot_id, day_messages)` → first-person diary from Gemini
- `detect_language(text)` → use Gemini to classify input language
- All calls via `httpx.AsyncClient` to `generativelanguage.googleapis.com`

#### [NEW] [vector_search.py](file:///Users/likhith./Veliora.AI_backend./services/vector_search.py)
- **Stage 1**: Call Supabase RPC `match_messages(query_embedding, top_k=50)` → pgvector HNSW cosine search
- **Stage 2**: Send top 50 `(user_query, message_text)` pairs to HuggingFace Serverless API (`cross-encoder/ms-marco-MiniLM-L-6-v2`) for reranking
- Return top 5-10 reranked results as "semantic memory"

#### [NEW] [voice_service.py](file:///Users/likhith./Veliora.AI_backend./services/voice_service.py)
- `generate_voice_note(text, voice_id)` → Cartesia TTS API → returns audio bytes (WAV/MP3)
- `stream_voice_chunks(text, voice_id)` → Cartesia streaming TTS → yields audio chunks for WebSocket
- Upload generated audio to Supabase Storage, return public URL

#### [NEW] [selfie_service.py](file:///Users/likhith./Veliora.AI_backend./services/selfie_service.py)
- `generate_selfie(bot_face_url, scene_description)` → HuggingFace Serverless API (IP-Adapter / Stable Diffusion)
- Upload composite to Supabase Storage
- Return public URL

#### [NEW] [background_tasks.py](file:///Users/likhith./Veliora.AI_backend./services/background_tasks.py)
- `sync_message_to_db(msg_data)` → generate embedding via `llm_engine`, insert into `messages` table
- `flush_xp_to_db()` → read all pending XP from Redis, batch `UPSERT` into `user_xp`
- `run_diary_cron()` → nightly: fetch today's messages per persona, generate diary via Gemini, insert into `diaries`

---

### Component 4: API Routes

#### [NEW] [chat.py](file:///Users/likhith./Veliora.AI_backend./api/chat.py)
- `POST /api/chat/send` — Main chat endpoint
  1. Validate language against `BOT_LANGUAGE_MAP`
  2. Load context from Redis (fallback Supabase)
  3. Retrieve semantic memory via two-stage vector search
  4. Check game state from Redis
  5. Build system prompt from `bot_prompts.py` + traits + game context
  6. Call Gemini → return response
  7. `BackgroundTask`: append to Redis + sync to Supabase with embedding
- `GET /api/chat/history/{bot_id}` — paginated message history

#### [NEW] [games.py](file:///Users/likhith./Veliora.AI_backend./api/games.py)
- `GET /api/games/catalog/{archetype}` — list games for a persona archetype
- `POST /api/games/start` — start a game session, set Redis state
- `POST /api/games/action` — send game action, Gemini acts as Game Master
- `POST /api/games/end` — end session, award XP, clear Redis state

#### [NEW] [voice.py](file:///Users/likhith./Veliora.AI_backend./api/voice.py)
- `POST /api/voice/note` — generate TTS voice note, upload to storage, return URL
- `WS /api/voice/call` — bidirectional WebSocket:
  - Client sends audio chunks (speech)
  - Server: speech-to-text (Gemini) → generate response → Cartesia streaming TTS → send audio chunks back
  - Maintain conversation context in Redis during call

#### [NEW] [selfie.py](file:///Users/likhith./Veliora.AI_backend./api/selfie.py)
- `POST /api/selfie/generate` — contextual selfie generation

#### [NEW] [multimodal.py](file:///Users/likhith./Veliora.AI_backend./api/multimodal.py)
- `POST /api/multimodal/describe-image` — Gemini vision: describe uploaded image
- `POST /api/multimodal/summarize-url` — fetch URL content, summarize contextually via Gemini
- `GET /api/multimodal/weather/{bot_id}` — fetch weather for persona's origin city
- `POST /api/multimodal/meme` — semantic meme generation via Gemini + image gen

#### [NEW] [diary.py](file:///Users/likhith./Veliora.AI_backend./api/diary.py)
- `GET /api/diary/{bot_id}` — read persona diary entries for user

---

### Component 5: Application Entry Point

#### [NEW] [main.py](file:///Users/likhith./Veliora.AI_backend./main.py)
- FastAPI app with `lifespan` handler (init Redis, start XP flush worker, start diary CRON)
- CORS middleware (configurable origins)
- Include all APIRouters from `api/`
- Health check endpoint `GET /health`

#### [MODIFY] [bot_prompts.py](file:///Users/likhith./Veliora.AI_backend./bot_prompts.py)
- No content changes — the existing 2930-line file is preserved as-is
- The `get_bot_prompt()` function is already defined and will be imported by services

---

### Component 6: Models & Documentation

#### [NEW] [schemas.py](file:///Users/likhith./Veliora.AI_backend./models/schemas.py)
- Pydantic models: `ChatRequest`, `ChatResponse`, `GameStartRequest`, `GameActionRequest`, `VoiceNoteRequest`, `SelfieRequest`, etc.

#### [NEW] [.env](file:///Users/likhith./Veliora.AI_backend./.env)
- Template with all required environment variables

#### [NEW] [integration.md](file:///Users/likhith./Veliora.AI_backend./integration.md)
- Complete API contract: REST endpoints + WebSocket protocol
- Request/response schemas
- Authentication flow (Supabase JWT)
- WebSocket message format for voice calls

#### [NEW] [database.md](file:///Users/likhith./Veliora.AI_backend./database.md)
- Complete SQL schema with `CREATE TABLE`, `CREATE INDEX`, RLS policies
- Supabase RPC functions for vector search
- Storage bucket setup

#### [NEW] [requirements.txt](file:///Users/likhith./Veliora.AI_backend./requirements.txt)
- `fastapi`, `uvicorn`, `httpx`, `supabase`, `pydantic`, `pydantic-settings`, `python-dotenv`, `python-multipart`
- No PyTorch, no sentence-transformers, no heavy ML libraries

---

## User Review Required

> [!IMPORTANT]
> **Authentication Strategy**: The plan uses Supabase Auth JWTs. The frontend must send `Authorization: Bearer <supabase_jwt>` on every request. The backend validates tokens via Supabase's JWT secret. Is this your intended auth flow?

> [!IMPORTANT]
> **Voice Call Architecture**: The WebSocket voice call uses Gemini for speech-to-text (via audio input to Gemini multimodal). Gemini's free tier has rate limits (~15 RPM for Flash). For sustained real-time calls, this may hit limits. Should we implement a queue/throttle or is this acceptable for MVP?

> [!WARNING]
> **HuggingFace Serverless Rate Limits**: The free HuggingFace Inference API has cold-start delays (~20-60s first call) and rate limits. The cross-encoder reranking and IP-Adapter selfie generation may be slow on first request. Is this acceptable?

> [!IMPORTANT]
> **Diary CRON**: The nightly diary cron needs a persistent process. On GCP Cloud Run (serverless), this won't work natively. Options:
> 1. GCP Cloud Scheduler + Cloud Run job (recommended)
> 2. In-process `asyncio` loop (works only if server runs continuously)
> Which approach do you prefer?

---

## Open Questions

1. **User avatars / profile photos**: Does the user upload a profile photo for selfie compositing, or is it only the bot's face image?
2. **Game types**: You mentioned games tailored to persona archetypes. Do you have specific game mechanics in mind, or should I design generic text-adventure / quiz / scenario-based game templates?
3. **Meme generation**: Should memes use Gemini to generate text + a template image, or should it generate full images via an image generation API?
4. **Bot face images**: Where are the bot face images stored? Should I seed them in Supabase Storage, or will they be uploaded separately?
5. **XP leveling formula**: Any specific formula for levels (e.g., `level = floor(sqrt(xp / 100))`) or should I use a standard RPG curve?

---

## Verification Plan

### Automated Tests
- `python -m pytest tests/` — unit tests for services (mocked external APIs)
- `uvicorn main:app --reload` — verify server starts without errors
- `curl` / `httpx` test scripts for each endpoint

### Manual Verification
- Test chat flow end-to-end with a real Gemini API key
- Verify pgvector HNSW search returns relevant results
- Test WebSocket voice call connection
- Verify Redis write-behind pattern (message appears in Supabase after ~5s)
- Test game start → action → end flow with XP accumulation
