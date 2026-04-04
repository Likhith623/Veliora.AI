"""
Redis_chat — Serialization Utilities
Converts Redis hash data to formats suitable for Supabase table inserts.

Adapted for Veliora.AI schema:
- Messages → `messages` table (user_id UUID, bot_id TEXT, role, content, embedding, language)
- Memories → kept in Redis (RFM-scored semantic memory, not persisted to a separate table)
- Game sessions → `user_game_sessions` table
"""

import numpy as np

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MEMORY VALIDATION & SERIALIZATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUIRED_MEMORY_FIELDS = [
    "id", "user_id", "bot_id", "memory_text", "embedding", "magnitude",
    "last_used", "frequency", "rfm_score", "created_at"
]

EMB_DIM = 768


def is_valid_memory(mem: dict) -> bool:
    """Check if a memory dict has all required fields and valid embedding."""
    for field in REQUIRED_MEMORY_FIELDS:
        if field not in mem or mem[field] is None:
            return False
        if isinstance(mem[field], str) and not mem[field].strip():
            return False
    # Check embedding shape
    emb = mem["embedding"]
    if isinstance(emb, np.ndarray):
        if emb.size != EMB_DIM:
            return False
    elif isinstance(emb, list):
        if len(emb) != EMB_DIM:
            return False
    else:
        return False
    # Check numeric fields
    try:
        float(mem["magnitude"])
        int(mem["frequency"])
    except (TypeError, ValueError):
        return False
    return True


def serialize_memory(mem: dict) -> dict:
    """Convert a memory dict for safe storage (list embedding, no Redis internals)."""
    serialized = {}
    for k, v in mem.items():
        if k == "embedding":
            if isinstance(v, np.ndarray):
                serialized[k] = v.tolist()
            else:
                serialized[k] = v
        elif k.startswith("__"):
            continue  # Skip Redis internal keys
        else:
            serialized[k] = v
    return serialized


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHAT SERIALIZATION → Supabase `messages` table
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def serialize_chat_to_messages(chat: dict, embedding: list = None) -> list[dict]:
    """
    Convert a Redis chat record (user_message + bot_response) into
    two rows for the Supabase `messages` table.

    Redis chat format:
        {id, user_id, bot_id, user_message, bot_response, timestamp}

    Supabase messages format:
        {user_id, bot_id, role, content, language, embedding, created_at}
    """
    user_id = chat.get("user_id", "")
    bot_id = chat.get("bot_id", "")
    timestamp = chat.get("timestamp")
    rows = []

    if chat.get("user_message"):
        rows.append({
            "user_id": user_id,
            "bot_id": bot_id,
            "role": "user",
            "content": chat["user_message"],
            "created_at": timestamp,
        })

    if chat.get("bot_response"):
        rows.append({
            "user_id": user_id,
            "bot_id": bot_id,
            "role": "bot",
            "content": chat["bot_response"],
            "created_at": timestamp,
        })

    return rows


def serialize_single_message(
    user_id: str, bot_id: str, role: str, content: str,
    embedding: list = None, language: str = None
) -> dict:
    """Build a single message row for the Supabase `messages` table."""
    row = {
        "user_id": user_id,
        "bot_id": bot_id,
        "role": role,
        "content": content,
    }
    if embedding:
        row["embedding"] = embedding
    if language:
        row["language"] = language
    return row
