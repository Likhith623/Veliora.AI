# Redis_chat — Memory-Enhanced Conversational AI

## Overview

This module provides the **memory-enhanced chat system** for Veliora.AI, powered by **Redis Stack** (RediSearch + HNSW vector indexes) and **RabbitMQ** for asynchronous background processing.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Veliora.AI Backend                     │
│                                                          │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────┐ │
│  │ FastAPI   │──▶│ Redis Stack  │   │ Supabase (PG)    │ │
│  │ api/chat  │   │ (memories,   │   │ (messages table) │ │
│  │           │   │  chats,      │   │                  │ │
│  │           │   │  session)    │   │                  │ │
│  └─────┬─────┘   └──────────────┘   └──────────────────┘ │
│        │                                                  │
│        ▼                                                  │
│  ┌──────────────┐                                         │
│  │ RabbitMQ     │                                         │
│  │  ├─memory_   │──▶ memory_worker.py (extract memories) │
│  │  │ tasks     │                                         │
│  │  └─message_  │──▶ message_worker.py (log to Redis)    │
│  │    logs      │                                         │
│  └──────────────┘                                         │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. First Message → Load Session
When a user sends their **first message** to a bot:
1. Backend checks `session:{user_id}:{bot_id}` key in Redis
2. If no session → loads ALL messages from Supabase `messages` table
3. Messages are stored in Redis as chat records: `chat:{user_id}:{bot_id}:{chat_id}`
4. Session marker is created

### 2. Subsequent Messages → Memory-Enhanced Context
For each message:
1. **Semantic search** — HNSW vector search in Redis for relevant memories
2. **RFM retrieval** — Top memories ranked by Recency-Frequency-Magnitude score
3. **Recent chat** — Last 10 messages from Redis
4. All three are combined into a rich prompt for Gemini 2.0 Flash
5. Exchange is published to RabbitMQ:
   - `memory_tasks_user_{user_id}` → memory_worker extracts 0-2 new memories
   - `message_logs_user_{user_id}` → message_worker logs the chat pair

### 3. End Chat → Sync to Supabase
When user clicks "End Chat" (`POST /api/chat/end-chat`):
1. All chat records from Redis are serialized
2. Embeddings are generated for each message
3. Batch inserted into Supabase `messages` table
4. Chat session data is cleared from Redis
5. **Memories persist** — they stay in Redis for the next session

## Redis Key Schema

| Key Pattern | Type | Description |
|---|---|---|
| `memories:{user_id}:{bot_id}:{mem_id}` | HASH | Memory with text, embedding, RFM score |
| `chat:{user_id}:{bot_id}:{chat_id}` | HASH | Chat exchange (user_message + bot_response) |
| `session:{user_id}:{bot_id}` | STRING | Session marker (JSON with load timestamp) |
| `context:{user_id}:{bot_id}` | LIST | Recent messages list (role + content JSON) |
| `game_state:{user_id}` | STRING | Active game state JSON |
| `xp:pending` | HASH | Pending XP to flush to Supabase |

## Redis Indexes (RediSearch)

### memories_idx
```
FT.CREATE memories_idx ON HASH PREFIX 1 memories: SCHEMA
  user_id TAG SEPARATOR ,
  bot_id TAG SEPARATOR ,
  memory_text TEXT WEIGHT 1
  embedding VECTOR HNSW 10 TYPE FLOAT32 DIM 768 DISTANCE_METRIC COSINE M 16 EF_CONSTRUCTION 200
  rfm_score NUMERIC SORTABLE
  magnitude NUMERIC
  frequency NUMERIC
  created_at TEXT WEIGHT 1
  last_used TEXT WEIGHT 1
```

### chats_idx
```
FT.CREATE chats_idx ON HASH PREFIX 1 chat: SCHEMA
  user_id TAG SEPARATOR ,
  bot_id TAG SEPARATOR ,
  user_message TEXT WEIGHT 1
  bot_response TEXT WEIGHT 1
  timestamp TEXT WEIGHT 1
```

## RFM Scoring

Each memory has an RFM score:
- **Recency** (0.3 weight): Days since last accessed (5=today, 1=14+ days)
- **Frequency** (0.2 weight): Number of times the memory was retrieved
- **Magnitude** (0.5 weight): Importance score (0-5) rated by Gemini

Formula: `rfm_score = recency * 0.3 + frequency * 0.2 + magnitude * 0.5`

## Memory Operations

- **EXTRACT**: From each user-bot exchange, Gemini generates 0-2 candidate memories
- **ADD**: If genuinely new → create new memory with embedding
- **MERGE**: If adds info to existing → consolidate via LLM
- **OVERRIDE**: If contradicts existing → replace with new
- **NONE**: If redundant → skip

## Supabase Schema (Target Tables)

### `messages` table
```sql
id UUID, user_id UUID, bot_id TEXT, role TEXT, content TEXT,
embedding vector(768), language TEXT, created_at TIMESTAMPTZ
```

### `user_game_sessions` table
```sql
id UUID, user_id UUID, bot_id TEXT, game_id TEXT,
status TEXT, turn_count INT, xp_earned INT
```

## Environment Variables

```env
# Redis Stack (Local Docker)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# RabbitMQ (Local Docker)
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
RABBITMQ_API_URL=http://localhost:15672/api/queues
RABBITMQ_API_USER=guest
RABBITMQ_API_PASS=guest

# Google GenAI SDK
GOOGLE_API_KEY=your_gemini_api_key
```

## Docker Setup

```bash
# Redis Stack
docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 redis/redis-stack:latest

# RabbitMQ
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

## Working Files

| File | Purpose |
|---|---|
| `redis_class.py` | RedisManager — connection, indexes, session load/clear |
| `memory_functions.py` | Semantic search, RFM retrieval, memory CRUD, chat logging |
| `chatbot.py` | Response generation (combined, semantic-only, RFM-only) |
| `RFM_functions.py` | RFM scoring algorithm |
| `serialization.py` | Convert Redis data → Supabase table format |
| `memory_worker.py` | RabbitMQ consumer for memory extraction |
| `message_worker.py` | RabbitMQ consumer for chat logging |
| `queue_cleanup.py` | Periodic cleanup of empty RabbitMQ queues |