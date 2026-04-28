# Data Flow Mechanics — Veliora.AI Nervous System

> Every major feature lifecycle documented as a 4-step mechanical breakdown showing exactly how data moves across FastAPI, Redis, Supabase, RabbitMQ, WebSockets, and external APIs.

---

## 1. Core Chat & Memory Extraction Pipeline
**Logic: (FastAPI ↔ Redis ↔ RabbitMQ ↔ Supabase ↔ Gemini)**

### Trigger
- **Client sends:** `POST /api/chat/send` with JSON body `{bot_id, message}` and JWT bearer token in `Authorization` header.
- **Receiver:** `api/chat.py` router. The `get_current_user` dependency extracts and validates the JWT against Supabase's JWKS endpoint (public keys cached via `@lru_cache`). Pydantic `ChatRequest` model enforces field presence.

### Processing / State
1. **Session Hydration:** Check Redis key `session:{user_id}:{bot_id}:active`. If missing (cold start), query Supabase `messages` table for last 50 messages → deserialise via `serialization.py` → load into Redis list `chat:{uid}:{bid}:messages` → set TTL (30 min).
2. **Text Emotion Analysis:** User message submitted to RoBERTa GoEmotions classifier via `_emotion_executor` (`ThreadPoolExecutor(max_workers=2)`). Returns `{label, score}` from 28 categories. Runs in thread to avoid blocking ASGI loop.
3. **Dual Memory Retrieval (parallel):**
   - **Semantic path:** `generate_embedding()` → Gemini embeds message to 768-dim vector → `FT.SEARCH idx:memory:{uid}:{bid} "*=>[KNN 3 @embedding $vec AS score]"` via RediSearch HNSW → top-3 cosine-similar memories.
   - **RFM path:** Fetch all memories → compute `rfm = recency*0.3 + frequency*0.2 + magnitude*0.5` for each → sort descending → top-3.
   - **Merge:** Deduplicate by memory ID → pass up to 5 unique memories to LLM.
4. **Prompt Assembly:** `llm_engine.py` → `generate_chat_response()` constructs layered prompt: `[System Prompt from bot_prompt.py] + [Semantic Memories: "You remember: ..."] + [RFM Memories: "Important context: ..."] + [Emotion: "User's emotional state: {emotion}"] + [Last N context messages] + [User message]`.

### External / Background Action
5. **Gemini 2.0 Flash Inference:** Assembled prompt → `google.genai.Client` → response text. On HTTP 429: auto-retry. On persistent failure: fallback to `GOOGLE_API_KEY_2`. Total failure: return empty string gracefully.
6. **Emotion Fusion & Safety:** Text emotion fused with any active speech emotion via weighted formula: `fused = (text_valence * text_conf * 0.6 + speech_valence * speech_conf * 0.4) / (text_weight + speech_weight)`. Confidence < 0.3 excluded. Then `evaluate_dual_alert()`:
   - Crisis keyword regex match OR fused_valence < -0.8 with confidence > 0.7 → **Tier 1**: LLM response discarded, pre-written crisis resources injected, 24h cooldown set via Redis TTL key `alert:{uid}:{bid}:tier1_cooldown`.
   - chronic_counter ≥ 3 → **Tier 2**: Wellness nudge appended to response, cooldown set.
7. **RabbitMQ Dispatch (async, non-blocking):** `BackgroundTasks.add_task()` publishes two messages:
   - `publish_memory_task(user_id, bot_id, user_msg, bot_response)` → `memory_extraction_queue` (durable).
   - `publish_message_log(user_id, bot_id, user_msg, bot_response, activity_type="chat")` → `message_log_queue` (durable).
8. **Memory Extraction Consumer (background worker):** `memory_worker.py` (aio_pika) consumes from `memory_extraction_queue` → constructs Gemini prompt requesting JSON: `[{"memory": "...", "category": "...", "action": "add|merge|override|none"}]` → for `add`: `generate_embedding()` → store in Redis HNSW index; for `merge`: KNN find similar → update text + bump frequency; for `override`: replace text, preserve metadata.
9. **Message Log Consumer:** `message_worker.py` persists the exchange to Supabase `messages` table via `log_message()`.

### Resolution
10. **Context Update:** User message + bot response appended to Redis lists `chat:{uid}:{bid}:messages` and `chat:{uid}:{bid}:context`.
11. **XP Award:** `award_xp(user_id, bot_id, "chat_message")` → atomically increments `xp:{uid}:{bid}:pending` in Redis.
12. **Emotion Telemetry:** Fused emotion persisted to Redis hash `emotion:{uid}:{bid}:current` and appended to Supabase `emotion_telemetry` table.
13. **HTTP Response:** `{bot_response, emotion, xp_earned, alert_state?}` returned to client.

---

## 2. Triple-Streaming Voice Pipeline
**Logic: (WebSocket ↔ FFmpeg ↔ Deepgram ↔ Gemini ↔ Cartesia)**

### Trigger
- **Client opens:** `WS /api/voice/call/{user_id}/{bot_id}` with JWT in query params.
- **Receiver:** `api/voice.py` WebSocket handler. JWT validated on connection accept. Session hydrated from Redis/Supabase.

### Processing / State
1. **PersistentFFmpegDecoder:** On WebSocket accept, spawn a long-lived FFmpeg subprocess via `asyncio.create_subprocess_exec("ffmpeg", "-i", "pipe:0", "-f", "s16le", "-ar", "16000", ...)`. This process persists for the entire call session — zero spawn overhead per audio chunk. Client streams Opus/WebM binary frames → piped into FFmpeg stdin → 16kHz 16-bit PCM output read from stdout.
2. **Three concurrent `asyncio.Task` instances spawned:**
   - `_stt_task`: Opens persistent WebSocket to Deepgram Nova-2 (`wss://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&smart_format=true`). Decoded PCM frames fed continuously. Deepgram returns interim + final transcript segments.
   - `_llm_task`: On receiving final transcript from Deepgram → immediately submits to Gemini 2.0 Flash in **streaming mode**. Each token forwarded to TTS stage as it arrives (no wait for full response).
   - `_tts_task`: Opens persistent WebSocket to Cartesia Sonic (`wss://api.cartesia.ai/tts/websocket`). Tokens from LLM batched into phrase-level chunks → submitted for synthesis. Audio chunks returned incrementally → forwarded to client WebSocket for real-time playback.

### External / Background Action
3. **Parallel Emotion Worker:** `emotion_worker` task operates on 4-second rolling PCM buffer:
   - Every 4s: submit buffer to HuBERT SUPERB-ER in thread executor → `{label, score}` from 4 categories (angry, happy, neutral, sad).
   - Fuse with latest text emotion from transcript via confidence-weighted formula.
   - Write to Redis: `emotion:{uid}:{bid}:current` (hash), append to `emotion:{uid}:{bid}:history` (list, cap 20).
   - Run `evaluate_dual_alert()` — if Tier 1 triggers mid-call, inject crisis audio via TTS stream.

### Resolution
4. **On WebSocket close:** Cancel all three streaming tasks + emotion worker. Close Deepgram/Cartesia WebSocket connections. Kill FFmpeg subprocess. Flush final transcript to RabbitMQ (`publish_memory_task` + `publish_message_log` with `activity_type="voice_call"`). Award XP for call duration. Persist call metadata to Supabase.

---

## 3. Dual-Alert Emotion Safety System
**Logic: (RoBERTa ↔ HuBERT ↔ Redis State Machine ↔ LLM Bypass)**

### Trigger
- **Implicit trigger:** Every chat message (`POST /api/chat/send`) and every 4-second voice call audio window automatically invoke the emotion pipeline. No explicit client action required.

### Processing / State
1. **Text Signal:** RoBERTa GoEmotions (`SamLowe/roberta-base-go_emotions`) classifies user text → 28-category softmax → argmax → `{label, score}`. Each label mapped to valence [-1.0, +1.0] (joy→+0.9, grief→-0.9, neutral→0.0).
2. **Speech Signal (voice calls only):** HuBERT SUPERB-ER processes 16kHz PCM from 4s rolling buffer → 4-category softmax → `{label, score}`.
3. **Fusion:** `fuse_emotions()`: text weighted 60%, speech 40%. If either confidence < 0.3, that signal excluded. Output: `{dominant_emotion, fused_valence, text_emotion, speech_emotion, text_confidence, speech_confidence}`.
4. **Redis State Update:**
   - Write `emotion:{uid}:{bid}:current` hash with all fusion fields.
   - LPUSH to `emotion:{uid}:{bid}:history` (capped at 20 via LTRIM).
   - Compute session average valence from history window. If avg < -0.35: increment `alert:{uid}:{bid}:chronic_counter`. Else: reset to 0.

### External / Background Action
5. **`evaluate_dual_alert()` decision tree:**
   - **Crisis keyword scan:** Regex patterns for self-harm, suicide, hopelessness indicators against raw user text.
   - **Tier 1 check:** Crisis keyword detected OR (fused_valence < -0.8 AND confidence > 0.7) AND no active `alert:{uid}:{bid}:tier1_cooldown` key → **ACUTE CRISIS**.
   - **Tier 2 check:** `chronic_counter` ≥ 3 AND no active `alert:{uid}:{bid}:tier2_cooldown` key → **CHRONIC DISTRESS**.
6. **Tier 1 Action:** LLM response **bypassed entirely**. Pre-written crisis resources injected (hotline numbers, safety plan links). Set `alert:{uid}:{bid}:tier1_cooldown` with 24h TTL. Log to `emotion_telemetry` with `tier1` flag.
7. **Tier 2 Action:** LLM response **preserved** but proactive wellness nudge appended to system prompt ("Gently suggest breathing exercises, wellness activities"). Set `alert:{uid}:{bid}:tier2_cooldown` with 24h TTL. Log with `tier2` flag.

### Resolution
8. **Telemetry Persistence:** Full emotion state + alert tier + valence written to Supabase `emotion_telemetry` table with timestamp. Available for dashboard queries at `GET /emotion-dashboard/{user_id}` and `GET /emotion-dashboard/{user_id}/analytics` (risk level, negative streak days, time-of-day breakdown, bot comparison).

---

## 4. Gamification, XP, and Level-Up Loop
**Logic: (Redis Pending ↔ Background Flush Worker ↔ Supabase ↔ Level Thresholds)**

### Trigger
- **Multiple triggers:** Any XP-earning action: `POST /api/chat/send` (chat_message: 10 XP), `POST /api/selfie/generate` (selfie_generate: 150 XP), game completion, daily login (`POST /api/auth/daily-login`: 20 XP + 50 XP streak bonus), voice call completion.

### Processing / State
1. **Immediate (in-request):** `award_xp(user_id, bot_id, action_type)` → looks up XP value from `XP_ACTIONS` mapping in `config/mappings.py` → atomically increments Redis key `xp:{uid}:{bid}:pending` via `INCRBY`. **Zero Supabase writes on the hot path** — all XP accumulates in Redis.
2. **Architecture B (Familia):** `xp_service.py` → `award_xp(user_id, amount, source)` → upsert `realtime_xp_realtime` row (increment `current_xp` + `total_xp_earned`) → log to `xp_transactions_realtime` with full metadata → send notification via `notification_service.py`.

### External / Background Action
3. **`xp_flush_worker()` (Architecture A):** Background `asyncio.Task` running on configurable interval:
   - Scan all `xp:*:pending` keys in Redis.
   - For each non-zero key: batch UPDATE Supabase `user_bots` table (`xp += pending_value`) → DEL Redis key.
   - Recalculate level: `level = floor(sqrt(total_xp / 100))` (Architecture A's sqrt curve).
4. **`check_and_level_up()` (Architecture B):** Called after XP award:
   - Fetch current `bond_points` and `level` from `relationships_realtime`.
   - Apply linear threshold table (L1=0, L2=50, L3=150, L4=300, L5=500, L6=750, L7=1000, L8=1500, L9=2000, L10=3000).
   - If level increased: UPDATE relationship row → create milestone → notify both users → unlock new features (L3=audio calls, L4=video calls, L5=family rooms).

### Resolution
5. **Client receives:** `{xp_earned, new_level?, total_xp}` in the originating response. Level-up notifications delivered via Presence WebSocket (`send_to_user()`) or push notification fallback.

---

## 5. Dual-Layer Translation & Fact Extraction
**Logic: (Google Translate API v2 ↔ Gemini Cultural Context ↔ chat_facts_realtime)**

### Trigger
- **Client sends:** `POST /chat/send` in Architecture B with message text in any language. Also triggered by `POST /translate/` (on-demand), `POST /translate/batch` (history dump), `POST /translate/detect`.

### Processing / State
1. **Language Detection:** `detect_language(text)` → Google Cloud Translation API v2 → returns ISO language code. Script variant normalisation applied (e.g., `te-Latn` → `te`).
2. **Primary Translation:** `_translate_with_google(text, source_lang, target_lang)` → Google Translate REST API → translated text. For message history: `_batch_translate_google(texts[], target_lang)` handles arrays.
3. **User Language Lookup:** Query `user_languages_realtime` for recipient's primary language. If sender and receiver share a language, translation skipped. If `show_original` flag set, both original and translated text included.

### External / Background Action
4. **Gemini Cultural Context Overlay:** `_get_cultural_context_gemini(source_text, source_lang)` → Gemini 2.0 Flash prompt: "Analyze this text for cultural idioms, slang, or context that would be lost in translation" → returns `{has_idiom: bool, idiom_explanation: str, cultural_note: str}`. Example: Japanese "空気を読む" → "This means 'read the room' — sensing unspoken social cues".
5. **Fact Extraction (parallel):** `extract_facts_from_message(text)` → regex-based pattern matching:
   - `favorite_food` patterns: "my favorite food is...", "I love eating..."
   - `hobby` patterns: "my hobby is...", "I enjoy ... in my free time"
   - Birthday, location, occupation patterns.

### Resolution
6. **Message stored with translation metadata:** Original text, translated text, cultural context note (if any) all saved to `messages_realtime_comunicatio_realtime` table.
7. **Facts persisted:** Extracted facts written to `chat_facts_realtime` table with `{user_id, relationship_id, fact_type, fact_value, source_message_id, is_used}`. These facts are consumed by the Contest Service (§7) for generating personalised bond challenge questions.
8. **WebSocket broadcast:** Translated message broadcast to all connections in `ConnectionManager.active_connections[relationship_id]`, excluding sender.

---

## 6. Multi-Modal Identity Verification Flow
**Logic: (Deepgram STT ↔ Keyword Intent Analysis ↔ Liveness Score ↔ Profile Update)**

### Trigger
- **Client sends:** `POST /verification/submit` with `VerificationRequest{verification_type, photo_url, video_url, voice_url, intent_voice_url, gov_id_url}`. JWT required.

### Processing / State
1. **Duplicate Check:** Query `verification_records_realtime` for existing `pending` or `approved` records for user. If `approved` exists → 400 error "already verified".
2. **Audio Fetch:** If `intent_voice_url` or `voice_url` provided → `_fetch_audio_bytes(url)` via `httpx.AsyncClient` with 15s timeout → raw audio bytes.
3. **Intent Transcript:** Audio bytes → `transcribe_audio_auto_detect(bytes)` via Deepgram Nova-2 with `detect_language=true` → `{transcript, confidence, language}`.

### External / Background Action
4. **NLP Intent Validation:** If Deepgram confidence ≥ 0.65:
   - Check transcript for target keywords: `"veliora"`, `"familia"`, `"i want to join"`, `"my name is"`, `"real person"` → `has_valid_intent = true`.
   - Fallback: If transcript has ≥ 4 words (broad conversational buffer) → `has_valid_intent = true`.
5. **Liveness Score Calculation** (`calculate_liveness_score()`):
   - `government_id` mode: Gov ID parsed (45 pts) + face match (40 pts) + intent bonus (14.9 pts) = **99.9 max**.
   - `voice_photo` mode: Live photo depth/blink (55 pts) + intent bonus (44.9 pts) = **99.9 max**.
   - `video` mode: Full anti-spoofing/deepfake analysis (85 pts) + intent bonus (14.9 pts) = **99.9 max**.
   - Hard cap at 99.9% (ML continuous learning constraint).

### Resolution
6. **Threshold Decision:** Score ≥ 80.0 → `status = "approved"`, `is_real_human = true`. Below 80 → `status = "pending"` for manual moderator review.
7. **Database Writes:**
   - INSERT into `verification_records_realtime` with full audit trail (user_id, type, URLs, transcript, liveness_score, status).
   - If approved: UPDATE `profiles_realtime` SET `is_verified = true`, `status = "active"`.
8. **Response:** `{success, is_real_human, liveness_score, status, transcript, message}`.

---

## 7. Bonding Contests & Streak Mutation Logic
**Logic: (CRON Scheduler ↔ Custom Questions ↔ Gemini Generation ↔ XP Multipliers ↔ Leaderboard)**

### Trigger
- **Client sends:** `POST /contests/create` with `ContestRequest{relationship_id, contest_type}` (daily/weekly/monthly/custom). JWT required.
- **Secondary triggers:** `POST /contests/answer` for individual answers, `POST /contests/{id}/complete` for finalization.

### Processing / State
1. **Relationship Authorization:** Query `relationships_realtime` by ID, verify `status = "active"`, confirm requesting user is either `user_a_id` or `user_b_id`. Reject with 403 if unauthorized.
2. **Question Generation Strategy (`contest_service.py`):**
   - **Custom contests** (`contest_type = "custom"`): Query `user_custom_questions_realtime` for the target user's MCQ bank. Pull questions they authored. Eligibility check: `GET /contests/custom/eligibility` → only friends with ≥1 custom question qualify.
   - **Standard contests**: Query `chat_facts_realtime` for unused facts (`is_used = false`) → map facts to question templates (e.g., fact `{type: "favorite_food", value: "sushi"}` → "What is your partner's favorite food?") → if insufficient facts: fallback to generic relationship-building templates.
   - **AI Generation (`POST /questions/generate-ai`):** Gemini 2.0 Flash with `responseMimeType: "application/json"` → structured MCQ output `{question_text, options[], correct_option_index}`.
3. **Contest Row Created:** INSERT into `contests_realtime` with `{relationship_id, contest_type, status: "active", questions_count}`. Questions inserted into `contest_questions_realtime` with `{contest_id, question_text, options, points, question_order, question_about_user}`.

### External / Background Action
4. **Answer Scoring (`submit_answer()`):** Exact match = full points. Partial match (substring) = half points. Each answer INSERT into response tracking. Notification sent to question owner.
5. **Contest Completion (`finish_contest()`):** Calculate total scores per participant. Determine winner.
6. **Streak Mutation (`update_user_streak()`):**
   - Daily contests: streak increments if last contest was ≤1 day ago. Resets on gap.
   - Weekly: streak valid if ≤7 day gap. Monthly: ≤31 day gap.
   - Streak milestones at 7, 14, 30, 60, 100 days → bonus XP awards.
7. **Leaderboard Update (`_update_leaderboard()`):** Upsert into `contest_leaderboard_realtime` — increment score for `{user_id, contest_type, period}`. O(1) check-and-upsert pattern.

### Resolution
8. **XP Distribution:** Winner receives full XP (configurable per tier: daily=30, weekly=50, monthly=100). Streak multiplier applied. Both participants receive participation XP. `award_xp()` + `check_and_level_up()` called.
9. **Leaderboard Query:** `GET /contests/leaderboard/{period}` → query `contest_leaderboard_realtime` with profile JOIN, ordered by score DESC, limit configurable.
10. **Background CRON (`background_scheduler()`):** Daily 24h loop: `update_streaks()` → increment/reset across all relationships; `decay_care_scores()` → reduce by 2 for 3+ day inactivity; `check_all_level_ups()` → batch level recalculation; `generate_random_questions_for_new_users()` → seed 5 questions for empty profiles.

---

## 8. Image/Selfie Generation Pipeline
**Logic: (Gemini Scene Gen ↔ HuggingFace/Gradio FaceID ↔ Supabase Storage ↔ Memory Pipeline)**

### Trigger
- **Path A (HuggingFace):** `POST /api/selfie/generate` with `SelfieRequest{bot_id}`. JWT required.
- **Path B (Gradio FaceID):** `POST /api/images/generate-selfie` with `ImageGenerationRequest{bot_id, message}`. JWT required.

### Processing / State
**Path A — `api/selfie.py`:**
1. **Context Load:** `load_context(user_id, bot_id)` from Redis → recent chat messages. Fallback: generic context `[{"role": "user", "content": "Hey, how's it going?"}]`.
2. **Scene Generation:** `generate_scene_description(bot_id, context)` → Gemini analyzes conversation mood → returns visual scene description (e.g., "standing in a sunlit park, smiling warmly, cherry blossoms falling").

**Path B — `api/images.py`:**
1. **Base Image Lookup:** `find_base_image(bot_id)` → scans `image-generation/photos/{bot_id}.jpeg`. 404 if not found.
2. **Semantic Memory Injection:** Generate embedding of user message → `get_semantically_similar_memories()` → top-3 relevant memories for richer emotional context.
3. **Bot Reaction:** `get_bot_quick_response(bot_id, message, semantic_memory)` → Gemini generates emotional reaction to user's message.
4. **Emotion Context:** `extract_emotion_context(bot_reaction)` → Gemini extracts `{emotion, location, action}` from reaction text.

### External / Background Action
**Path A:**
5. **Image Generation:** `generate_bot_selfie(bot_id, scene_description, user_id)` → `selfie_service.py` → constructs visual prompt from `bot_prompts.py` (3,296 lines of per-persona appearance definitions: ethnicity, hair, clothing, face shape + scene variants) → HuggingFace Serverless API → generated image → upload to Supabase Storage.

**Path B:**
5. **FaceID Generation:** `image_service.py` → `get_image_service()` returns singleton with Gradio client + space rotation logic → `generate_selfie(bot_id, base_image_path, context)` → Gradio FaceID API (preserves facial identity from base photo while applying emotion/scene context) → returns `(relative_url, image_base64)`. Saved to `static/images/{uuid}.png`.

**Both Paths:**
6. **Memory Pipeline Integration:** Session hydrated → user message + scene description cached to Redis → `publish_memory_task()` and `publish_message_log(activity_type="selfie"|"image_gen", media_url=image_url)` dispatched to RabbitMQ.

### Resolution
7. **XP Award:** `award_xp(user_id, bot_id, "selfie_generate")` → 150 XP.
8. **Path A Response:** `SelfieResponse{bot_id, image_url, scene_description, xp_earned}`.
9. **Path B Response:** `ImageGenerationResponse{bot_id, image_url, image_base64, status, emotion_context, xp_earned}`.
10. **Status Check:** `GET /api/images/status` → `{available, current_space, error_count}` for Gradio health monitoring.

---

## 9. Role-Based Matching Queue
**Logic: (Supabase Queue Table ↔ Compatibility Algorithm ↔ Role Complements ↔ Relationship Creation)**

### Trigger
- **Browse (no auth):** `GET /matching/browse/{role}` — public search by role.
- **Queue entry (auth):** `POST /matching/search` with `MatchRequest{seeking_role, offering_role, preferred_age_min, preferred_age_max, preferred_countries, language_priority}`.
- **Direct connect (auth):** `POST /matching/connect/{target_user_id}?role={role}`.

### Processing / State
1. **Browse Logic:** Fetch ALL non-banned profiles from `profiles_realtime`. For each: check `matching_preferences` JSONB → `offering_role`, `preferred_roles[]`, and top-level `role` column. Apply alias expansion (sibling→brother/sister, penpal→friend). Sort by `(is_verified DESC, care_score DESC)`.
2. **Queue Entry:** Cancel existing `searching` entries for user in `matching_queue_realtime`. INSERT new queue row: `{user_id, seeking_role, offering_role, preferred_age_min/max, preferred_countries, language_priority, status: "searching"}`.
3. **Instant Match Attempt:** `find_match(user_id, seeking_role, offering_role)` from `matching_service.py`:

### External / Background Action
4. **Compatibility Scoring Algorithm:**
   - Language overlap (ease mode): +20 per shared language.
   - Language diversity (learn mode): +20 per unique language.
   - Verified badge: +30 (trust signal).
   - Care score: +score/10 (community reputation).
   - Reliability score: +score/20 (anti-ghosting metric).
   - Randomness: +0-15 (prevents deterministic lock-in).
5. **Role Complement Validation:** mother↔son, father↔daughter, mentor↔student, brother↔sister, friend↔friend, grandparent↔grandchild. Direct connect auto-infers complement if user has no explicit offering_role.

### Resolution
6. **Match Found:** `create_relationship(user_a_id, user_b_id, role_a, role_b)` → INSERT into `relationships_realtime` with `{status: "active", level: 1, bond_points: 0}`. UPDATE both queue entries: `status = "matched"`, `matched_with`, `matched_at`. Response: `{status: "matched", relationship, partner_profile, match_score}`.
7. **No Match:** Response: `{status: "searching", queue_id, queue_position, estimated_wait: "2-5 minutes", tips[]}`. User remains in queue for async matching by future searchers.
8. **Direct Connect:** Checks for existing active relationship (returns "already_connected" if found). Creates relationship immediately — no queue, no waiting. Response includes full partner profile.

---

## 10. Family Rooms Mediasoup SFU Signaling
**Logic: (FastAPI WebSocket ↔ Internal Express SFU REST ↔ mediasoup Workers ↔ WebRTC Transports)**

### Trigger
- **Client connects:** `WS /family-rooms/{room_id}/ws/{user_id}` — user opens family room with call capability.
- **SFU call initiation:** Client sends `{type: "sfu_create_transport", direction: "send"|"recv"}` over WebSocket.

### Processing / State
1. **Room Validation:** Query `family_rooms_realtime` for room existence. Query `family_room_members_realtime` for membership status (`joined`). Reject non-members.
2. **Connection Registration:** FastAPI WebSocket handler adds connection to room-level `ConnectionManager` → enables message broadcast, typing indicators, reactions, polls within room scope.
3. **SFU Architecture — Dual Server Topology:**
   - **Primary SFU** (`mediasoup_server/index.js`, port 3016): Socket.IO signaling. Used for 1-on-1 calls from `calls/page.tsx`. Manages mediasoup Worker pool (1 per CPU core), Router creation (VP8 video 500-1500kbps, Opus audio 64kbps), WebRtcTransport creation with DTLS, Producer/Consumer pairing.
   - **Internal SFU** (`sfu_server/server.js`, port 4000): REST API only. **No direct client access.** FastAPI acts as control plane — issues HTTP requests to create transports, produce/consume media on behalf of room participants.

### External / Background Action
4. **Transport Creation Flow (Internal SFU path for family rooms):**
   - Client → WebSocket → FastAPI handler receives `sfu_create_transport` message.
   - FastAPI → `POST http://localhost:4000/create-transport` with `{room_id, direction}` → Express SFU creates `WebRtcTransport` with announced IP (`MEDIASOUP_ANNOUNCED_IP`), port range (`MEDIASOUP_MIN_PORT`-`MEDIASOUP_MAX_PORT`), DTLS parameters.
   - SFU returns `{transport_id, ice_parameters, ice_candidates, dtls_parameters}` → FastAPI relays back to client via WebSocket.
5. **Producer/Consumer Flow:**
   - Client creates local media tracks → sends `sfu_produce` with `{transport_id, kind, rtp_parameters}` → FastAPI → `POST :4000/produce` → SFU creates Producer → returns `{producer_id}`.
   - For each other participant: FastAPI → `POST :4000/consume` with `{producer_id, consumer_transport_id}` → SFU creates Consumer → returns `{consumer_id, rtp_parameters}` → relayed to receiving client via WebSocket.
6. **9 SFU Message Types:** `sfu_create_transport`, `sfu_connect_transport`, `sfu_produce`, `sfu_consume`, `sfu_resume_consumer`, `sfu_close_producer`, `sfu_transport_created`, `sfu_produced`, `sfu_new_consumer`.

### Resolution
7. **Multi-party Call Active:** All room participants have send+receive transports. Audio/video flows through mediasoup SFU (no peer-to-peer — all media relayed through server for scalability).
8. **On disconnect:** Close all transports and producers/consumers for the leaving user. Notify remaining participants via WebSocket broadcast. If ≤1 member remains: auto-dissolve transports.
9. **Call Logging:** Duration and participant list recorded in room activity history.

---

## 11. Live Games P2P Signaling
**Logic: (WebSocket ↔ LiveGameManager ↔ SDP/ICE Relay ↔ RTCDataChannel ↔ XP Rewards)**

### Trigger
- **Client connects:** `WS /live-games/ws/{session_id}/{user_id}` — player opens real-time game (Pong, Air Hockey).
- **Alternative:** `POST /live-games/create` creates session → returns `session_id` → client connects WebSocket.
- **Game invite:** Presence WebSocket `{type: "invite_game"}` → target user receives invite → accepts → both connect to same `session_id`.

### Processing / State
1. **`LiveGameManager` (in-memory singleton):**
   ```
   sessions: Dict[str, dict]           # session_id → {players[], status, game_type, scores, created_at}
   waiting_players: Dict[str, str]     # user_id → session_id (matchmaking queue)
   active_connections: Dict[str, WebSocket]  # user_id → WebSocket
   ```
2. **Session Creation:** Player A sends `{type: "create_session", game_type: "pong"}` → `LiveGameManager` creates session entry → adds A to `waiting_players` → returns `{type: "session_created", session_id}`.
3. **Join Flow:** Player B sends `{type: "join_session", session_id}` → manager validates session exists + has room → adds B to session players → removes A from `waiting_players` → broadcasts `{type: "player_joined"}` to both.

### External / Background Action
4. **WebRTC P2P Signaling Relay (server acts as signaling server only — no media flows through server):**
   - Player A generates SDP Offer → sends `{type: "webrtc_offer", sdp: "..."}` via WebSocket → server relays to Player B.
   - Player B generates SDP Answer → sends `{type: "webrtc_answer", sdp: "..."}` → server relays to Player A.
   - Both players exchange ICE candidates: `{type: "ice_candidate", candidate: "..."}` → server relays bidirectionally.
   - Once ICE negotiation completes: direct P2P `RTCDataChannel` established between players. Game state (paddle positions, ball physics, scores) flows directly peer-to-peer with zero server involvement.
5. **Game State Sync:** `{type: "game_state", state: {ball_x, ball_y, paddle_a_y, paddle_b_y, score_a, score_b}}` exchanged over `RTCDataChannel` at 60fps. Server only receives periodic score snapshots for anti-cheat validation.
6. **Available Games Query:** `GET /live-games/available` → query `games_realtime_communication` WHERE `is_immersive = true` → returns game catalog.

### Resolution
7. **Game End:** Either player sends `{type: "game_end", result: {winner_id, score_a, score_b}}` → server validates scores against snapshots.
8. **Result Submission:** `POST /live-games/{session_id}/result` → UPDATE `game_sessions_realtime` with final scores, winner, duration → `award_xp()` for both players (winner gets bonus) → `check_and_level_up()` for the relationship → `award_bond_points()`.
9. **Cleanup:** Remove session from `LiveGameManager.sessions`. Close WebSocket connections. Broadcast `{type: "game_completed", results}` to both players via any remaining connection.
10. **History:** `GET /games/history/{relationship_id}` → all completed sessions with scores, winners, timestamps.

---

## Cross-Cutting Concern: The Redis→Supabase Write-Behind Pattern

All 11 flows above share a common persistence strategy. The synchronous request path **never blocks on Supabase writes**. Instead:

1. **Hot data** (messages, emotions, XP, game state) is written to Redis with sub-millisecond latency.
2. **RabbitMQ** consumers asynchronously persist memories and message logs.
3. **Background `asyncio.Task` workers** periodically flush accumulated state (XP, messages, streaks) from Redis to Supabase.
4. **On session teardown** (chat end, call disconnect, game complete), a final flush ensures no data loss.

This write-behind architecture enables the system to maintain consistent sub-100ms response times across all endpoints while guaranteeing eventual consistency with the durable PostgreSQL layer.

---

*All 11 architectural flows documented. Each breakdown traces data from client trigger through every intermediate technology (Redis, RabbitMQ, Gemini, Deepgram, Cartesia, mediasoup) to final database resolution. Derived exclusively from the Veliora.AI Canonical Architectural Documentation (Parts 1, 2, and 3).*
