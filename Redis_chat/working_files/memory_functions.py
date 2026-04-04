"""
Redis_chat — Memory Functions
Semantic search, RFM retrieval, memory extraction, consolidation, chat logging.

Adapted for Veliora.AI:
- All functions take bot_id parameter
- Redis keys: memories:{user_id}:{bot_id}:{mem_id}
- Uses Veliora Supabase schema
"""

import os
import json
import asyncio
import numpy as np
import uuid
import logging
from datetime import datetime, timezone
from google import genai
from google.genai import types
from redis.commands.search.query import Query

from Redis_chat.working_files.RFM_functions import (
    get_magnitude_for_query, get_recency_score, get_rfm_score,
)
from config.settings import get_settings

logger = logging.getLogger(__name__)

_settings = get_settings()
_client = genai.Client(api_key=_settings.effective_google_api_key)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# UTILITY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def time_ago_human(past_time_str, now=None):
    """Convert ISO timestamp to human-readable relative time."""
    now = now or datetime.now(timezone.utc)
    try:
        past_time = datetime.fromisoformat(past_time_str.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        return "unknown"
    diff = now - past_time

    if diff.days > 365:
        years = diff.days // 365
        return f"{years} year{'s' if years > 1 else ''} ago"
    elif diff.days > 30:
        months = diff.days // 30
        return f"{months} month{'s' if months > 1 else ''} ago"
    elif diff.days > 0:
        return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
    elif diff.seconds > 3600:
        hours = diff.seconds // 3600
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    elif diff.seconds > 60:
        minutes = diff.seconds // 60
        return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
    else:
        return "just now"


def clean_mem_id(mem_id: str) -> str:
    """Extract last 36 chars (UUID) from a Redis key or mem_id."""
    if len(mem_id) > 36:
        return mem_id[-36:]
    return mem_id


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# EMBEDDINGS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _escape_tag(value: str) -> str:
    """Escape special characters in RediSearch TAG values (hyphens, colons, etc.)."""
    # RediSearch TAG fields treat hyphens as syntax — must backslash-escape them
    return value.replace("-", "\\-")


async def get_embedding(text: str) -> list[float]:
    """Generate a 768-dim vector embedding using Google gemini-embedding-001."""
    try:
        embed_res = _client.models.embed_content(
            model="gemini-embedding-001",
            contents=text,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=768,
            ),
        )
        return embed_res.embeddings[0].values if embed_res.embeddings else []
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        return []


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    v1, v2 = np.array(a), np.array(b)
    if not v1.any() or not v2.any():
        return 0.0
    return float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2)))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHAT RETRIEVAL
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def fetch_last_m_messages(redis_client, user_id: str, bot_id: str, m: int = 10):
    """
    Retrieve the latest m chat messages for a user-bot pair from Redis,
    with humanized timestamps.
    """
    uid_esc = _escape_tag(user_id)
    bid_esc = _escape_tag(bot_id)
    query_str = f"@user_id:{{{uid_esc}}} @bot_id:{{{bid_esc}}}"
    try:
        query = Query(query_str).sort_by("timestamp", asc=False).paging(0, m)
        res = redis_client.ft("chats_idx").search(query)
    except Exception as e:
        logger.warning(f"fetch_last_m_messages failed: {e}")
        return []

    now = datetime.now(timezone.utc)
    messages = []
    for doc in res.docs:
        msg = doc.__dict__
        msg['timestamp'] = time_ago_human(msg.get('timestamp', ''), now)
        messages.append(msg)
    return messages


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SEMANTIC MEMORY RETRIEVAL
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def get_semantically_similar_memories(
    redis_client, user_id: str, bot_id: str, input_embedding,
    k: int = 3, bump_metadata: bool = True, cutoff: float = 0.7
):
    """
    Retrieve top-k semantically similar memories using Redis vector search.
    Optionally bumps frequency/last_used (for RFM re-scoring).
    """
    vec = np.array(input_embedding, dtype=np.float32)
    if vec.shape[0] != 768:
        raise ValueError(f"Embedding must be length 768, got {vec.shape}")

    uid_esc = _escape_tag(user_id)
    bid_esc = _escape_tag(bot_id)
    query_str = f"@user_id:{{{uid_esc}}} @bot_id:{{{bid_esc}}}=>[KNN {k} @embedding $vec as score]"
    params = {"vec": vec.tobytes()}
    query = (
        Query(query_str)
        .return_fields("id", "memory_text", "score", "created_at", "last_used")
        .sort_by("score", asc=True)
        .paging(0, k)
        .dialect(2)
    )

    try:
        res = await asyncio.to_thread(
            redis_client.ft("memories_idx").search, query, query_params=params
        )
    except Exception as e:
        logger.warning(f"Semantic memory search failed: {e}")
        return []

    now_iso = datetime.now(timezone.utc).isoformat()
    results = []
    for doc in res.docs:
        try:
            sim_score = float(doc.score)
        except (ValueError, AttributeError):
            continue
        if cutoff is not None and sim_score > cutoff:
            continue

        doc_id = getattr(doc, "id", "")
        # The full Redis key is in doc.id; extract the real key
        redis_key = doc_id if doc_id.startswith("memories:") else f"memories:{user_id}:{bot_id}:{doc_id}"

        if bump_metadata:
            try:
                redis_client.hincrby(redis_key, "frequency", 1)
                redis_client.hset(redis_key, "last_used", now_iso)
                freq = int(redis_client.hget(redis_key, "frequency") or 5)
                magnitude = float(redis_client.hget(redis_key, "magnitude") or 1.0)
                rfm = get_rfm_score(now_iso, freq, magnitude)
                redis_client.hset(redis_key, "rfm_score", str(rfm))
            except Exception as e:
                logger.warning(f"RFM bump failed for {redis_key}: {e}")

        results.append({
            "id": doc_id,
            "text": getattr(doc, "memory_text", None),
            "sim": sim_score,
            "created_at": getattr(doc, "created_at", None),
            "last_used": now_iso if bump_metadata else getattr(doc, "last_used", None),
        })
    return results


async def get_highest_rfm_memories(redis_client, user_id: str, bot_id: str, k: int = 3):
    """Retrieve top-k memories ranked by RFM score."""
    uid_esc = _escape_tag(user_id)
    bid_esc = _escape_tag(bot_id)
    query_str = f"@user_id:{{{uid_esc}}} @bot_id:{{{bid_esc}}}"
    try:
        query = Query(query_str).sort_by("rfm_score", asc=False).paging(0, k)
        res = redis_client.ft("memories_idx").search(query)
    except Exception as e:
        logger.warning(f"RFM memory retrieval failed: {e}")
        return []

    results = []
    for doc in res.docs:
        results.append({
            "id": doc.id,
            "text": getattr(doc, "memory_text", ""),
            "rfm_score": float(getattr(doc, "rfm_score", 0)),
        })
    return results


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MEMORY EXTRACTION & CONSOLIDATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def generate_candidate_memories(
    user_id: str, user_msg: str, bot_resp: str
) -> list[str]:
    """Extract 0-2 new memories from a conversation exchange."""
    prompt = f"""
You are a **Memory Extraction Engine**.

TASK — Identify **0-2 NEW** user memories found *only* in the exchange below.

RULES
• Start each memory with "- ".
• Around **15 words** per memory, third-person, about the *user*.
• Include specific nouns, verbs, and context words for better retrieval.
• Skip if nothing new → output single line: **- None**

CURRENT EXCHANGE
User: {user_msg}
Bot : {bot_resp}

OUTPUT:
"""
    try:
        resp = _client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        text = resp.text.strip()
        if "none" in text.lower() and len(text) < 20:
            return []
        return [line.strip("- ").strip() for line in text.split("\n") if line.strip() and line.strip() != "-"]
    except Exception as e:
        logger.error(f"Memory extraction failed: {e}")
        return []


async def update_user_memory(
    redis_manager, candidate: str, user_id: str, user_msg: str,
    bot_resp: str, bot_id: str
) -> str:
    """
    Decide add/merge/override for a candidate memory and update Redis.
    """
    context_pair = f"User: {user_msg}\nBot: {bot_resp}"
    now = datetime.now(timezone.utc).isoformat()
    emb = await get_embedding(candidate)
    if not emb:
        return "Embedding generation failed, skipping."

    sims = await get_semantically_similar_memories(
        redis_manager.client, user_id, bot_id, emb, k=3, bump_metadata=False
    )

    alias = {str(i + 1): sim["id"] for i, sim in enumerate(sims)}

    sim_text = chr(10).join(
        f"Index: {i+1} | Text: {sim['text']} | Similarity: {sim['sim']}"
        for i, sim in enumerate(sims)
    )

    prompt = f"""
You are a Memory Manager. Decide how to integrate a new candidate memory.

CURRENT EXCHANGE:
{context_pair}

INPUTS:
• Candidate memory: "{candidate}"
• Existing similar memories:
{sim_text if sims else "No existing memories found."}

DECISION RULES:
1. OVERRIDE if it fully duplicates or directly contradicts an existing memory.
2. MERGE only if it adds new info to an existing memory.
3. ADD if genuinely new or no similar memories exist.
4. NONE if redundant.

OUTPUT (exactly one, no extra text):
add
merge:<index>
override:<index>
none
"""

    try:
        dec = _client.models.generate_content(
            model="gemini-2.0-flash", contents=prompt
        ).text.strip().lower()
    except Exception as e:
        logger.error(f"Memory decision failed: {e}")
        return "Decision failed."

    if dec == "none":
        return "Redundant, no memory update."

    elif dec == "add":
        magnitude = await get_magnitude_for_query(candidate)
        rfm = get_rfm_score(now, frequency=1, magnitude=magnitude)
        mem_id = str(uuid.uuid4())
        memory_dict = {
            "id": mem_id,
            "user_id": user_id,
            "bot_id": bot_id,
            "memory_text": candidate,
            "embedding": emb,
            "magnitude": str(magnitude),
            "last_used": now,
            "frequency": "1",
            "rfm_score": str(rfm),
            "created_at": now,
        }
        redis_manager.store_memory(user_id, bot_id, mem_id, memory_dict)
        return "Memory added."

    elif dec.startswith("merge:"):
        idxs = [i.strip() for i in dec.replace("merge:", "").split(",")]
        merged_log = ""
        for idx in idxs:
            mem_id = alias.get(idx)
            if not mem_id:
                continue
            try:
                current_mem = redis_manager.client.hgetall(mem_id)
                current_text = current_mem.get(b'memory_text', b'').decode('utf-8')
                current_freq = int(current_mem.get(b'frequency', b'1').decode('utf-8'))

                merged_text = await llm_consolidate(current_text, candidate)
                emb_new = await get_embedding(merged_text)
                magnitude = await get_magnitude_for_query(merged_text)
                rfm = get_rfm_score(now, frequency=current_freq + 1, magnitude=magnitude)

                clean_id = clean_mem_id(mem_id)
                memory_dict = {
                    "id": clean_id,
                    "user_id": user_id,
                    "bot_id": bot_id,
                    "memory_text": merged_text,
                    "embedding": emb_new,
                    "magnitude": str(magnitude),
                    "last_used": now,
                    "frequency": str(current_freq + 1),
                    "rfm_score": str(rfm),
                }
                redis_manager.store_memory(user_id, bot_id, clean_id, memory_dict)
                merged_log += f"Merged: {current_text[:20]}→{merged_text[:20]}\n"
            except Exception as e:
                logger.error(f"Merge failed for idx {idx}: {e}")
        return f"Merged {len(idxs)} memories.\n{merged_log}"

    elif dec.startswith("override:"):
        idxs = [i.strip() for i in dec.replace("override:", "").split(",")]
        override_log = ""
        for idx in idxs:
            mem_id = alias.get(idx)
            if not mem_id:
                continue
            try:
                current_mem = redis_manager.client.hgetall(mem_id)
                current_freq = int(current_mem.get(b'frequency', b'1').decode('utf-8'))
                magnitude = await get_magnitude_for_query(candidate)
                rfm = get_rfm_score(now, frequency=current_freq + 1, magnitude=magnitude)

                clean_id = clean_mem_id(mem_id)
                memory_dict = {
                    "id": clean_id,
                    "user_id": user_id,
                    "bot_id": bot_id,
                    "memory_text": candidate,
                    "embedding": emb,
                    "magnitude": str(magnitude),
                    "last_used": now,
                    "frequency": str(current_freq + 1),
                    "rfm_score": str(rfm),
                }
                redis_manager.store_memory(user_id, bot_id, clean_id, memory_dict)
                override_log += f"Overridden: {candidate[:20]}\n"
            except Exception as e:
                logger.error(f"Override failed for idx {idx}: {e}")
        return f"Overridden {len(idxs)} memories.\n{override_log}"

    return "No memory update."


async def llm_consolidate(memory: str, candidate: str) -> str:
    """Merge two related memories into one concise memory."""
    prompt = f"""
You are a Memory Consolidation Agent. Merge these into ONE concise memory (max 20 words):

• Existing: {memory}
• New: {candidate}

Include all important keywords. Output only the merged memory.
"""
    try:
        res = _client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        return res.text.strip()
    except Exception as e:
        logger.error(f"Memory consolidation failed: {e}")
        return candidate  # Fallback to the new candidate


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHAT LOGGING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def log_message(
    redis_manager, user_id: str, bot_id: str,
    user_input: str, bot_response: str
):
    """Persist a user-bot exchange chronologically in Redis."""
    chat_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    chat_record = {
        "id": chat_id,
        "user_id": user_id,
        "bot_id": bot_id,
        "user_message": user_input,
        "bot_response": bot_response,
        "timestamp": timestamp,
    }
    redis_manager.store_chat(user_id, bot_id, chat_id, chat_record)
