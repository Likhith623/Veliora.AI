"""
Veliora.AI — Upstash Redis Cache Service
Uses Upstash REST API (httpx) for serverless Redis operations.
Handles: context caching, game state, XP micro-batching.
"""

import httpx
import json
import logging
from typing import Optional
from config.settings import get_settings

logger = logging.getLogger(__name__)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# REDIS CLIENT (Upstash REST API)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

_http_client: Optional[httpx.AsyncClient] = None


async def get_redis_client() -> httpx.AsyncClient:
    """Get or create the async HTTP client for Upstash Redis."""
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=10.0)
    return _http_client


async def close_redis_client():
    """Close the HTTP client gracefully."""
    global _http_client
    if _http_client and not _http_client.is_closed:
        await _http_client.aclose()
        _http_client = None


async def _redis_command(*args) -> dict:
    """Execute a raw Redis command via Upstash REST API."""
    settings = get_settings()
    client = await get_redis_client()
    url = f"{settings.UPSTASH_REDIS_URL}"
    headers = {"Authorization": f"Bearer {settings.UPSTASH_REDIS_TOKEN}"}

    # Upstash REST API accepts commands as a JSON array
    response = await client.post(url, headers=headers, json=list(args))
    response.raise_for_status()
    return response.json()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CONTEXT CACHE (Chat Message History)
# Write-behind pattern: append to Redis list, async sync to Supabase
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _context_key(user_id: str, bot_id: str) -> str:
    return f"ctx:{user_id}:{bot_id}"


async def load_context(user_id: str, bot_id: str) -> list[dict]:
    """
    Load recent chat context from Redis.
    Returns list of {"role": "user"|"bot", "content": "..."} dicts.
    If Redis is empty, caller should fallback to Supabase.
    """
    key = _context_key(user_id, bot_id)
    try:
        settings = get_settings()
        result = await _redis_command("LRANGE", key, 0, settings.REDIS_CONTEXT_MAX_MESSAGES - 1)
        messages = []
        if result.get("result"):
            for item in result["result"]:
                try:
                    messages.append(json.loads(item))
                except json.JSONDecodeError:
                    continue
        return messages
    except Exception as e:
        logger.warning(f"Redis load_context failed: {e}")
        return []


async def append_message(user_id: str, bot_id: str, role: str, content: str) -> bool:
    """
    Append a message to the Redis context list. O(1) operation.
    Also trims the list to prevent unbounded growth.
    """
    key = _context_key(user_id, bot_id)
    settings = get_settings()
    msg = json.dumps({"role": role, "content": content})

    try:
        # RPUSH to append
        await _redis_command("RPUSH", key, msg)
        # LTRIM to keep only the most recent N messages
        await _redis_command("LTRIM", key, -settings.REDIS_CONTEXT_MAX_MESSAGES, -1)
        # Set TTL
        await _redis_command("EXPIRE", key, settings.REDIS_CONTEXT_TTL)
        return True
    except Exception as e:
        logger.warning(f"Redis append_message failed: {e}")
        return False


async def clear_context(user_id: str, bot_id: str) -> bool:
    """Clear the context cache for a user-bot pair."""
    key = _context_key(user_id, bot_id)
    try:
        await _redis_command("DEL", key)
        return True
    except Exception as e:
        logger.warning(f"Redis clear_context failed: {e}")
        return False


async def warm_cache_from_db(user_id: str, bot_id: str) -> list[dict]:
    """
    Warm-load the Redis context cache from Supabase on first chat entry.
    Loads ALL messages (no filtering) from the DB into Redis.
    Returns the loaded context for immediate use.
    """
    from services.supabase_client import get_all_messages_for_cache

    key = _context_key(user_id, bot_id)
    settings = get_settings()
    db_messages = []  # FIX-1: Initialize before try to prevent UnboundLocalError

    try:
        # Load ALL messages from Supabase (no limit/filter)
        db_messages = await get_all_messages_for_cache(user_id, bot_id)
        if not db_messages:
            return []

        # Build the context list
        context = [
            {"role": msg["role"], "content": msg["content"]}
            for msg in db_messages
        ]

        # FIX-2: Batch-push all messages in a single RPUSH call
        # Upstash REST API supports variadic RPUSH: RPUSH key val1 val2 ...
        serialized_msgs = [json.dumps(msg) for msg in context]
        if serialized_msgs:
            await _redis_command("RPUSH", key, *serialized_msgs)

        # Keep only the most recent N messages in Redis
        await _redis_command(
            "LTRIM", key,
            -settings.REDIS_CONTEXT_MAX_MESSAGES, -1
        )
        # Set TTL
        await _redis_command("EXPIRE", key, settings.REDIS_CONTEXT_TTL)

        logger.info(
            f"Warmed Redis cache for {user_id}:{bot_id} "
            f"with {len(db_messages)} messages (trimmed to {settings.REDIS_CONTEXT_MAX_MESSAGES})"
        )

        # Return the trimmed context for immediate use
        trimmed = context[-settings.REDIS_CONTEXT_MAX_MESSAGES:]
        return trimmed

    except Exception as e:
        logger.error(f"Redis warm_cache_from_db failed: {e}")
        # FIX-1: Safe fallback — db_messages is always defined
        return [
            {"role": msg["role"], "content": msg["content"]}
            for msg in db_messages
        ]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GAME STATE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _game_key(user_id: str) -> str:
    return f"game:{user_id}"


async def set_game_state(user_id: str, game_data: dict) -> bool:
    """Set the current game state for a user in Redis."""
    key = _game_key(user_id)
    settings = get_settings()
    try:
        value = json.dumps(game_data)
        await _redis_command("SET", key, value, "EX", settings.REDIS_GAME_STATE_TTL)
        return True
    except Exception as e:
        logger.warning(f"Redis set_game_state failed: {e}")
        return False


async def get_game_state(user_id: str) -> Optional[dict]:
    """Get the current game state for a user from Redis."""
    key = _game_key(user_id)
    try:
        result = await _redis_command("GET", key)
        value = result.get("result")
        if value:
            return json.loads(value)
        return None
    except Exception as e:
        logger.warning(f"Redis get_game_state failed: {e}")
        return None


async def clear_game_state(user_id: str) -> bool:
    """Clear the game state when a game ends."""
    key = _game_key(user_id)
    try:
        await _redis_command("DEL", key)
        return True
    except Exception as e:
        logger.warning(f"Redis clear_game_state failed: {e}")
        return False


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# XP MICRO-BATCHING
# Accumulate XP in Redis, flush to Supabase every 60s
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

XP_HASH_KEY = "xp:pending"


async def increment_xp(user_id: str, bot_id: str, amount: int) -> int:
    """
    Atomically increment XP for a user-bot pair in Redis.
    Uses HINCRBY on a hash for O(1) accumulation.
    Returns the new accumulated value.
    """
    field = f"{user_id}:{bot_id}"
    try:
        result = await _redis_command("HINCRBY", XP_HASH_KEY, field, amount)
        return int(result.get("result", 0))
    except Exception as e:
        logger.warning(f"Redis increment_xp failed: {e}")
        return 0


async def get_all_pending_xp() -> dict[str, int]:
    """
    Get all pending XP entries from Redis hash.
    Returns dict of "user_id:bot_id" -> accumulated_xp.
    """
    try:
        result = await _redis_command("HGETALL", XP_HASH_KEY)
        raw = result.get("result", [])
        # HGETALL returns flat list: [field1, val1, field2, val2, ...]
        pending = {}
        for i in range(0, len(raw), 2):
            pending[raw[i]] = int(raw[i + 1])
        return pending
    except Exception as e:
        logger.warning(f"Redis get_all_pending_xp failed: {e}")
        return {}


async def clear_pending_xp() -> bool:
    """Clear the pending XP hash after flushing to Supabase."""
    try:
        await _redis_command("DEL", XP_HASH_KEY)
        return True
    except Exception as e:
        logger.warning(f"Redis clear_pending_xp failed: {e}")
        return False


async def delete_pending_xp_field(field: str) -> bool:
    """Delete a single field from the pending XP hash after successful flush."""
    try:
        await _redis_command("HDEL", XP_HASH_KEY, field)
        return True
    except Exception as e:
        logger.warning(f"Redis delete_pending_xp_field failed: {e}")
        return False


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SESSION TRACKING (for conversation milestones)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _session_msg_count_key(user_id: str, bot_id: str) -> str:
    return f"session_msgs:{user_id}:{bot_id}"


async def increment_session_message_count(user_id: str, bot_id: str) -> int:
    """Increment and return the session message count (for milestone XP)."""
    key = _session_msg_count_key(user_id, bot_id)
    try:
        result = await _redis_command("INCR", key)
        # Auto-expire after 6 hours (session boundary)
        await _redis_command("EXPIRE", key, 21600)
        return int(result.get("result", 0))
    except Exception as e:
        logger.warning(f"Redis increment_session_message_count failed: {e}")
        return 0


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# VOICE CALL STATE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _voice_call_key(user_id: str) -> str:
    return f"voice_call:{user_id}"


async def set_voice_call_active(user_id: str, bot_id: str) -> bool:
    """Mark a voice call as active."""
    key = _voice_call_key(user_id)
    try:
        data = json.dumps({"bot_id": bot_id, "active": True})
        await _redis_command("SET", key, data, "EX", 3600)  # 1 hour max
        return True
    except Exception as e:
        logger.warning(f"Redis set_voice_call_active failed: {e}")
        return False


async def clear_voice_call(user_id: str) -> bool:
    """Clear voice call state."""
    key = _voice_call_key(user_id)
    try:
        await _redis_command("DEL", key)
        return True
    except Exception as e:
        logger.warning(f"Redis clear_voice_call failed: {e}")
        return False
