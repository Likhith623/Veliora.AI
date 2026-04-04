"""
Veliora.AI — Redis Stack Cache Service
Replaces the old Upstash REST-based redis_cache.py with Redis Stack (redis-py).
Handles: context caching, game state, XP batching, session management.
All operations go through the local Docker Redis Stack instance.
"""

import json
import logging
from typing import Optional
from config.settings import get_settings
from Redis_chat.working_files.redis_class import RedisManager

logger = logging.getLogger(__name__)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SINGLETON REDIS MANAGER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

_redis_manager: Optional[RedisManager] = None


def get_redis_manager() -> RedisManager:
    """Get or create the Redis Stack manager singleton."""
    global _redis_manager
    if _redis_manager is None:
        settings = get_settings()
        _redis_manager = RedisManager(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
        )
    return _redis_manager


def init_redis():
    """Initialize Redis connection and create indexes. Call on app startup."""
    manager = get_redis_manager()
    if not manager.ping():
        logger.error("Redis Stack is NOT reachable! Start Docker redis-stack container.")
        raise ConnectionError("Cannot connect to Redis Stack")
    manager.create_indexes()
    logger.info("Redis Stack initialized and indexes created.")
    return manager


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CONTEXT CACHE (Recent Messages)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def cache_message(user_id: str, bot_id: str, role: str, content: str):
    """Push a message to the context list in Redis."""
    manager = get_redis_manager()
    settings = get_settings()
    key = f"context:{user_id}:{bot_id}"

    message = json.dumps({"role": role, "content": content})
    manager.client.rpush(key, message)

    # Trim to max messages
    manager.client.ltrim(key, -settings.REDIS_CONTEXT_MAX_MESSAGES, -1)
    # Set TTL
    manager.client.expire(key, settings.REDIS_CONTEXT_TTL)


async def get_context(user_id: str, bot_id: str) -> list[dict]:
    """Get the cached context messages list."""
    manager = get_redis_manager()
    key = f"context:{user_id}:{bot_id}"

    raw_messages = manager.client.lrange(key, 0, -1)
    messages = []
    for raw in raw_messages:
        try:
            msg = json.loads(raw.decode() if isinstance(raw, bytes) else raw)
            messages.append(msg)
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue
    return messages


async def clear_context(user_id: str, bot_id: str):
    """Clear the context cache for a user-bot pair."""
    manager = get_redis_manager()
    key = f"context:{user_id}:{bot_id}"
    manager.client.delete(key)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SESSION MANAGEMENT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def has_active_session(user_id: str, bot_id: str) -> bool:
    """Check if a chat session is loaded in Redis."""
    manager = get_redis_manager()
    return manager.has_session(user_id, bot_id)


async def load_session_from_supabase(user_id: str, bot_id: str):
    """
    Load all messages from Supabase into Redis for a user-bot pair.
    Called on the first message of a chat session.
    """
    from services.supabase_client import get_all_messages_for_cache

    manager = get_redis_manager()

    # Check if already loaded
    if manager.has_session(user_id, bot_id):
        logger.info(f"Session already active: {user_id}:{bot_id}")
        return

    # Fetch all messages from Supabase
    messages = await get_all_messages_for_cache(user_id, bot_id)
    logger.info(f"Loaded {len(messages)} messages from Supabase for {user_id}:{bot_id}")

    # Load into Redis
    manager.load_user_session(user_id, bot_id, messages)


async def end_session_and_sync(user_id: str, bot_id: str) -> dict:
    """
    End a chat session: sync new Redis data to Supabase, then clear session.

    Steps:
    1. Get all chat records from Redis (this session's data)
    2. Generate embeddings for each message
    3. Batch insert into Supabase `messages` table
    4. Clear session data from Redis (memories persist)

    Returns: summary dict with counts
    """
    from services.supabase_client import insert_message
    from services.llm_engine import generate_embedding
    from Redis_chat.working_files.serialization import serialize_chat_to_messages

    manager = get_redis_manager()

    if not manager.has_session(user_id, bot_id):
        return {"synced_messages": 0, "status": "no_active_session"}

    # Get all chat records from Redis
    chats = manager.get_user_chats(user_id, bot_id)
    logger.info(f"Syncing {len(chats)} chat records for {user_id}:{bot_id}")

    synced_count = 0
    for chat in chats:
        # Convert chat records to message rows
        message_rows = serialize_chat_to_messages(chat)

        for row in message_rows:
            try:
                # Generate embedding for the content
                embedding = await generate_embedding(row["content"])

                await insert_message(
                    user_id=row["user_id"],
                    bot_id=row["bot_id"],
                    role=row["role"],
                    content=row["content"],
                    embedding=embedding if embedding else None,
                    activity_type="chat",
                )
                synced_count += 1
            except Exception as e:
                logger.error(f"Failed to sync message to Supabase: {e}")

    # Clear session data from Redis (memories persist for future sessions)
    cleared = manager.clear_session(user_id, bot_id)
    await clear_context(user_id, bot_id)

    logger.info(
        f"Session ended: {user_id}:{bot_id} — "
        f"synced {synced_count} messages, cleared {cleared} keys"
    )

    return {
        "synced_messages": synced_count,
        "cleared_keys": cleared,
        "status": "success",
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GAME STATE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def set_game_state(user_id: str, game_state: dict):
    """Store game state in Redis."""
    manager = get_redis_manager()
    settings = get_settings()
    key = f"game_state:{user_id}"
    manager.client.set(key, json.dumps(game_state), ex=settings.REDIS_GAME_STATE_TTL)


async def get_game_state(user_id: str) -> Optional[dict]:
    """Get game state from Redis."""
    manager = get_redis_manager()
    key = f"game_state:{user_id}"
    raw = manager.client.get(key)
    if raw:
        return json.loads(raw.decode() if isinstance(raw, bytes) else raw)
    return None


async def clear_game_state(user_id: str):
    """Clear game state from Redis."""
    manager = get_redis_manager()
    key = f"game_state:{user_id}"
    manager.client.delete(key)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# XP BATCHING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

XP_PENDING_KEY = "xp:pending"


async def increment_xp(user_id: str, bot_id: str, xp_amount: int):
    """Increment XP in Redis hash for later batch flush to Supabase."""
    manager = get_redis_manager()
    field = f"{user_id}:{bot_id}"
    manager.client.hincrby(XP_PENDING_KEY, field, xp_amount)


async def get_all_pending_xp() -> dict:
    """Get all pending XP entries from Redis hash."""
    manager = get_redis_manager()
    raw = manager.client.hgetall(XP_PENDING_KEY)
    if not raw:
        return {}
    result = {}
    for k, v in raw.items():
        key = k.decode() if isinstance(k, bytes) else k
        val = int(v.decode() if isinstance(v, bytes) else v)
        result[key] = val
    return result


async def delete_pending_xp_field(field: str):
    """Delete a single field from the pending XP hash."""
    manager = get_redis_manager()
    manager.client.hdel(XP_PENDING_KEY, field)
