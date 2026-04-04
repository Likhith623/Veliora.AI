"""
Redis_chat — RedisManager Class
Manages Redis Stack connection, memory/chat storage, session load/clear.

Adapted for Veliora.AI:
- Keys include bot_id: memories:{user_id}:{bot_id}:{mem_id}
- Chat keys: chat:{user_id}:{bot_id}:{chat_id}
- Session keys: session:{user_id}:{bot_id}
- Loads data from Veliora's `messages` table format
"""

import redis
import numpy as np
import json
import logging
from datetime import datetime, timezone

from config.settings import get_settings

logger = logging.getLogger(__name__)


def normalize_memory_fields(mem: dict) -> dict:
    """
    Normalize a memory dict from Supabase or internal format
    so all fields are correctly typed for Redis hset.
    """
    normalized = {}
    for k, v in mem.items():
        if k == "embedding":
            if isinstance(v, bytes):
                normalized[k] = v
            elif isinstance(v, list):
                normalized[k] = np.array(v, dtype=np.float32).tobytes()
            elif isinstance(v, str):
                normalized[k] = np.array(json.loads(v), dtype=np.float32).tobytes()
            elif isinstance(v, np.ndarray):
                normalized[k] = v.astype(np.float32).tobytes()
            else:
                continue
        elif v is None:
            continue
        else:
            normalized[k] = str(v) if not isinstance(v, str) else v
    return normalized


def clean_mem_id(mem_id: str) -> str:
    """Extract last 36 chars (UUID) from a Redis key or mem_id."""
    if len(mem_id) > 36:
        return mem_id[-36:]
    return mem_id


class RedisManager:
    """
    Manages all Redis Stack operations for the Veliora.AI memory system.
    Connects to local Docker Redis Stack with RediSearch support.
    """

    def __init__(self, host=None, port=None, db=0):
        settings = get_settings()
        host = host or settings.REDIS_HOST
        port = port or settings.REDIS_PORT
        db = db or settings.REDIS_DB
        self.client = redis.Redis(host=host, port=port, db=db)
        logger.info(f"Redis Stack connected: {host}:{port}/{db}")

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # INDEX CREATION
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    def create_indexes(self):
        """Create RediSearch indexes for memories and chats if they don't exist."""
        from redis.commands.search.field import (
            TagField, TextField, NumericField, VectorField,
        )
        from redis.commands.search.index_definition import IndexDefinition, IndexType

        # Memory index
        try:
            self.client.ft("memories_idx").info()
            logger.info("memories_idx already exists")
        except redis.exceptions.ResponseError:
            schema = (
                TagField("user_id"),
                TagField("bot_id"),
                TextField("memory_text", weight=1.0),
                VectorField(
                    "embedding", "HNSW",
                    {"TYPE": "FLOAT32", "DIM": 768, "DISTANCE_METRIC": "COSINE",
                     "M": 16, "EF_CONSTRUCTION": 200}
                ),
                NumericField("rfm_score", sortable=True),
                NumericField("magnitude"),
                NumericField("frequency"),
                TextField("created_at"),
                TextField("last_used"),
            )
            definition = IndexDefinition(
                prefix=["memories:"], index_type=IndexType.HASH
            )
            self.client.ft("memories_idx").create_index(
                schema, definition=definition
            )
            logger.info("Created memories_idx")

        # Chat index
        try:
            self.client.ft("chats_idx").info()
            logger.info("chats_idx already exists")
        except redis.exceptions.ResponseError:
            schema = (
                TagField("user_id"),
                TagField("bot_id"),
                TextField("user_message", weight=1.0),
                TextField("bot_response", weight=1.0),
                TextField("timestamp"),
            )
            definition = IndexDefinition(
                prefix=["chat:"], index_type=IndexType.HASH
            )
            self.client.ft("chats_idx").create_index(
                schema, definition=definition
            )
            logger.info("Created chats_idx")

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # MEMORY STORAGE
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    def store_memory(self, user_id: str, bot_id: str, mem_id: str, memory_dict: dict):
        """Store a memory hash in Redis with embedding as bytes."""
        key = f"memories:{user_id}:{bot_id}:{mem_id}"
        mapping = {}
        for k, v in memory_dict.items():
            if k == "embedding":
                if isinstance(v, bytes):
                    mapping[k] = v
                elif isinstance(v, list):
                    mapping[k] = np.array(v, dtype=np.float32).tobytes()
                elif isinstance(v, np.ndarray):
                    mapping[k] = v.astype(np.float32).tobytes()
                elif isinstance(v, str):
                    mapping[k] = np.array(json.loads(v), dtype=np.float32).tobytes()
                else:
                    continue
            elif v is None:
                continue
            else:
                mapping[k] = str(v) if not isinstance(v, str) else v
        # Ensure user_id and bot_id are in the mapping for index filtering
        mapping["user_id"] = user_id
        mapping["bot_id"] = bot_id
        self.client.hset(key, mapping=mapping)

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # CHAT STORAGE
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    def store_chat(self, user_id: str, bot_id: str, chat_id: str, chat_dict: dict):
        """Store a chat exchange hash in Redis."""
        key = f"chat:{user_id}:{bot_id}:{chat_id}"
        mapping = {k: str(v) if not isinstance(v, str) else v
                   for k, v in chat_dict.items() if v is not None}
        mapping["user_id"] = user_id
        mapping["bot_id"] = bot_id
        self.client.hset(key, mapping=mapping)

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # SESSION LOAD FROM SUPABASE
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    def load_user_session(self, user_id: str, bot_id: str, messages: list, memories: list = None):
        """
        Load a user's data from Supabase into Redis on first chat message.

        Args:
            user_id: UUID string
            bot_id: persona bot_id string
            messages: List of dicts from Supabase `messages` table
                      [{role, content, created_at, id, ...}, ...]
            memories: Optional list of memory dicts (if we persist memories)
        """
        now = str(datetime.now(timezone.utc).timestamp())

        # Load messages as chat records
        # Group consecutive user+bot message pairs
        i = 0
        while i < len(messages):
            msg = messages[i]
            chat_id = msg.get("id", f"loaded_{i}")
            timestamp = msg.get("created_at", datetime.now(timezone.utc).isoformat())

            if msg["role"] == "user":
                # Try to pair with next bot message
                bot_resp = ""
                if i + 1 < len(messages) and messages[i + 1]["role"] == "bot":
                    bot_resp = messages[i + 1]["content"]
                    i += 1  # Skip the bot message

                chat_record = {
                    "id": chat_id,
                    "user_id": user_id,
                    "bot_id": bot_id,
                    "user_message": msg["content"],
                    "bot_response": bot_resp,
                    "timestamp": timestamp,
                }
                self.store_chat(user_id, bot_id, chat_id, chat_record)
            else:
                # Standalone bot message (e.g., system greeting)
                chat_record = {
                    "id": chat_id,
                    "user_id": user_id,
                    "bot_id": bot_id,
                    "user_message": "",
                    "bot_response": msg["content"],
                    "timestamp": timestamp,
                }
                self.store_chat(user_id, bot_id, chat_id, chat_record)
            i += 1

        # Load memories if provided
        if memories:
            for mem in memories:
                mem_id = clean_mem_id(mem.get("id", ""))
                if mem_id:
                    self.store_memory(
                        user_id, bot_id, mem_id,
                        normalize_memory_fields(mem)
                    )

        # Mark session as active
        session_key = f"session:{user_id}:{bot_id}"
        self.client.set(session_key, json.dumps({
            "loaded_at": now,
            "messages_loaded": len(messages),
            "memories_loaded": len(memories) if memories else 0,
        }))

        logger.info(
            f"Session loaded: {user_id}:{bot_id} — "
            f"{len(messages)} messages"
        )

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # SESSION CHECK
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    def has_session(self, user_id: str, bot_id: str) -> bool:
        """Check if a session is already loaded in Redis."""
        session_key = f"session:{user_id}:{bot_id}"
        return self.client.exists(session_key) > 0

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # DATA RETRIEVAL
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    def get_user_memories(self, user_id: str, bot_id: str) -> list:
        """Get all memories for a user-bot pair from Redis."""
        pattern = f"memories:{user_id}:{bot_id}:*"
        keys = self.client.keys(pattern)
        memories = []
        for key in keys:
            mem = self.client.hgetall(key)
            decoded = {}
            for k, v in mem.items():
                k = k.decode() if isinstance(k, bytes) else k
                if k == "embedding":
                    decoded[k] = np.frombuffer(v, dtype=np.float32)
                else:
                    decoded[k] = v.decode() if isinstance(v, bytes) else v
            decoded["__redis_key__"] = key.decode() if isinstance(key, bytes) else key
            memories.append(decoded)
        return memories

    def get_user_chats(self, user_id: str, bot_id: str) -> list:
        """Get all chat records for a user-bot pair from Redis."""
        pattern = f"chat:{user_id}:{bot_id}:*"
        keys = self.client.keys(pattern)
        chats = []
        for key in keys:
            chat = self.client.hgetall(key)
            decoded = {}
            for k, v in chat.items():
                k = k.decode() if isinstance(k, bytes) else k
                decoded[k] = v.decode() if isinstance(v, bytes) else v
            decoded["__redis_key__"] = key.decode() if isinstance(key, bytes) else key
            chats.append(decoded)
        return chats

    def get_context_messages(self, user_id: str, bot_id: str, limit: int = 50) -> list[dict]:
        """
        Get recent messages as context list [{role, content}, ...] for LLM prompt.
        Uses the chats_idx for sorted retrieval.
        """
        from redis.commands.search.query import Query as RQuery

        query_str = f"@user_id:{{{user_id}}} @bot_id:{{{bot_id}}}"
        try:
            query = RQuery(query_str).sort_by("timestamp", asc=False).paging(0, limit)
            res = self.client.ft("chats_idx").search(query)
        except Exception as e:
            logger.warning(f"Redis chats_idx search failed: {e}")
            return []

        messages = []
        for doc in reversed(res.docs):
            d = doc.__dict__
            user_msg = d.get("user_message", "")
            bot_resp = d.get("bot_response", "")
            if user_msg:
                messages.append({"role": "user", "content": user_msg})
            if bot_resp:
                messages.append({"role": "bot", "content": bot_resp})
        return messages

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # SESSION CLEAR
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    def clear_session(self, user_id: str, bot_id: str) -> int:
        """Clear all session data (chats + session marker) for a user-bot pair.
        Memories are NOT cleared — they persist across sessions."""
        chat_keys = self.client.keys(f"chat:{user_id}:{bot_id}:*")
        session_key = f"session:{user_id}:{bot_id}"
        all_keys = chat_keys + [session_key.encode()]
        decoded = [k.decode() if isinstance(k, bytes) else k for k in all_keys]
        if decoded:
            self.client.delete(*decoded)
        return len(decoded)

    def clear_all_user_data(self, user_id: str, bot_id: str) -> int:
        """Clear ALL data (memories + chats + session) for a user-bot pair."""
        mem_keys = self.client.keys(f"memories:{user_id}:{bot_id}:*")
        chat_keys = self.client.keys(f"chat:{user_id}:{bot_id}:*")
        session_key = f"session:{user_id}:{bot_id}"
        all_keys = mem_keys + chat_keys + [session_key.encode()]
        decoded = [k.decode() if isinstance(k, bytes) else k for k in all_keys]
        if decoded:
            self.client.delete(*decoded)
        return len(decoded)

    def ping(self) -> bool:
        """Check if Redis is reachable."""
        try:
            return self.client.ping()
        except Exception:
            return False
