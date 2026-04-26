"""
Redis_chat — Chatbot Response Generation
Three modes: semantic, RFM, combined (semantic + RFM).

Adapted for Veliora.AI:
- All functions take bot_id
- Integrates with bot_prompt.get_bot_prompt() for persona system prompts
- Uses Veliora's Gemini config
"""

from google import genai
import os
import time
import asyncio
import logging
from datetime import datetime, timezone

from Redis_chat.working_files.memory_functions import (
    fetch_last_m_messages, get_semantically_similar_memories,
    get_highest_rfm_memories, get_embedding, time_ago_human,
)
from config.settings import get_settings

logger = logging.getLogger(__name__)

_settings = get_settings()
_client = genai.Client(api_key=_settings.effective_google_api_key)


def _build_persona_context(bot_id: str, user_name: str = "Friend") -> str:
    """Build persona system prompt from bot_prompt.py."""
    try:
        from bot_prompt import get_bot_prompt
        raw_prompt = get_bot_prompt(bot_id)
        if raw_prompt and raw_prompt != "Bot prompt not found.":
            return raw_prompt
    except Exception:
        pass
    return f"You are a friendly conversational AI persona ({bot_id}). Be warm and engaging."


async def get_bot_response_combined(
    redis_manager, user_id: str, bot_id: str, user_input: str,
    user_name: str = "Friend", traits: str = None, language: str = "english"
) -> dict:
    """
    Combined RFM + Semantic memory retrieval → Generate response.
    This is the primary chat function used by the Veliora backend.
    """
    embedding_time = time.perf_counter()
    input_embedding = await get_embedding(user_input)
    embedding_elapsed = time.perf_counter() - embedding_time

    fetch_start = time.perf_counter()

    # Parallel fetch: recent chat, RFM memories, semantic memories, and emotion state
    recent_task = fetch_last_m_messages(
        redis_manager.client, user_id, bot_id, m=10
    )
    rfm_task = get_highest_rfm_memories(
        redis_manager.client, user_id, bot_id
    )

    from emotion.session_state import get_emotion_state
    emotion_task = asyncio.to_thread(get_emotion_state, redis_manager.client, user_id, bot_id)

    if input_embedding:
        semantic_task = get_semantically_similar_memories(
            redis_manager.client, user_id, bot_id, input_embedding, cutoff=0.4
        )
        recent, rfm, semantic, current_emotion = await asyncio.gather(
            recent_task, rfm_task, semantic_task, emotion_task
        )
    else:
        recent, rfm, current_emotion = await asyncio.gather(recent_task, rfm_task, emotion_task)
        semantic = []

    fetch_elapsed = time.perf_counter() - fetch_start

    emotion_block = ""
    if current_emotion:
        emotion_label = current_emotion.get("fused_emotion", "neutral")
        emotion_score = current_emotion.get("confidence", 0.0)
        all_emotions = current_emotion.get("all_emotions", {})
        top_3_str = ""
        if all_emotions:
            top_3 = dict(sorted(all_emotions.items(), key=lambda item: item[1], reverse=True)[:3])
            top_3_str = f" [Top 3 Emotions Detected: {top_3}]"
        
        # Check standard negative emotions to trigger therapy/comfort mode
        if "sad" in emotion_label.lower() or "angry" in emotion_label.lower() or "anxious" in emotion_label.lower() or "fear" in emotion_label.lower():
            emotion_block = f"\n\n**CRITICAL EMOTIONAL STATE:**\nThe user's dominant emotion is {emotion_label} (Confidence: {emotion_score*100:.1f}%).{top_3_str}\nTrigger Therapy/Comfort Mode. Be extremely gentle, empathetic, and supportive. Validate their feelings deeply before offering any advice."
        else:
            emotion_block = f"\n\n[User's current emotional state: {emotion_label} ({emotion_score*100:.1f}%)]{top_3_str}"

    # Format memory blocks
    rfm_block = (
        "\n\n".join(
            f"{mem['text']} | RFM score:{mem['rfm_score']}"
            for mem in rfm
        )
        if rfm else "No high-RFM memories available."
    )

    semantic_block = (
        "\n\n".join(
            f"{mem['text']} | Similarity:{mem['sim']:.3f} | "
            f"Added {time_ago_human(mem.get('created_at', ''))}, "
            f"last used {time_ago_human(mem.get('last_used', ''))}"
            for mem in semantic
        )
        if semantic else "No semantically similar memories found."
    )

    history_block = "\n\n".join(
        f"[{r.get('activity_type', 'chat').upper()}] {r.get('timestamp', '?')}\n"
        f"User: {r.get('user_message', '')}\n"
        f"Bot: {r.get('bot_response', '')}" + (f" (Media: {r['media_url']})" if r.get('media_url') else "")
        for r in recent
    )

    # Get persona prompt
    persona_prompt = _build_persona_context(bot_id, user_name)

    traits_block = ""
    if traits:
        traits_block = f"\n\n**CRITICAL BEHAVIOR TRAITS APPLIED:**\nYou must fundamentally embody these EXACT traits in this response: {traits}\nAdhere perfectly to this tone without breaking character."

    language_block = f"\n\n**RESPONSE LANGUAGE:**\nYou must respond entirely in the {language} language."

    prompt = f"""{persona_prompt}{traits_block}{language_block}{emotion_block}

**Memory Context (use to personalize your response):**

Recent Chat History:
{history_block}

Semantically Relevant Memories:
{semantic_block}

Important Memories (RFM ranked):
{rfm_block}

**Current User Input:**
{user_input}

Respond to the user now. Stay in character. Be specific, warm, and engaging.
"""

    response_start = time.perf_counter()
    try:
        response = _client.models.generate_content(
            model="gemini-2.0-flash", contents=prompt
        )
        bot_text = response.text.strip()
    except Exception as e:
        logger.error(f"Gemini response generation failed: {e}")
        bot_text = "I'm having a moment of reflection. Could you say that again?"

    response_elapsed = time.perf_counter() - response_start

    return {
        'response': bot_text,
        'fetch_time': fetch_elapsed,
        'embedding_time': embedding_elapsed,
        'response_time': response_elapsed,
        'memories_retrieved': {
            'semantic': semantic_block,
            'rfm': rfm_block,
        },
    }


async def get_bot_response_from_memory(
    redis_manager, user_id: str, bot_id: str, user_input: str,
    user_name: str = "Friend"
) -> dict:
    """Semantic-only memory retrieval → Generate response."""
    embedding_time = time.perf_counter()
    input_embedding = await get_embedding(user_input)
    embedding_elapsed = time.perf_counter() - embedding_time

    fetch_start = time.perf_counter()
    recent_task = fetch_last_m_messages(
        redis_manager.client, user_id, bot_id, m=10
    )

    if input_embedding:
        semantic_task = get_semantically_similar_memories(
            redis_manager.client, user_id, bot_id, input_embedding, cutoff=0
        )
        recent, semantic = await asyncio.gather(recent_task, semantic_task)
    else:
        recent = await recent_task
        semantic = []

    fetch_elapsed = time.perf_counter() - fetch_start

    semantic_block = "\n\n".join(
        f"{mem['text']} | Similarity:{mem['sim']:.3f} | "
        f"Added {time_ago_human(mem.get('created_at', ''))}"
        for mem in semantic
    ) if semantic else "No memories found."

    history_block = "\n\n".join(
        f"[{r.get('activity_type', 'chat').upper()}] {r.get('timestamp', '?')}\n"
        f"User: {r.get('user_message', '')}\n"
        f"Bot: {r.get('bot_response', '')}" + (f" (Media: {r['media_url']})" if r.get('media_url') else "")
        for r in recent
    )

    persona_prompt = _build_persona_context(bot_id, user_name)

    prompt = f"""{persona_prompt}

Recent Chat: {history_block}
Semantically Relevant Memories: {semantic_block}
Current User Input: {user_input}

Respond now.
"""

    response_start = time.perf_counter()
    try:
        response = _client.models.generate_content(
            model="gemini-2.0-flash", contents=prompt
        )
        bot_text = response.text.strip()
    except Exception as e:
        logger.error(f"Response generation failed: {e}")
        bot_text = "Could you say that again?"

    response_elapsed = time.perf_counter() - response_start

    return {
        'response': bot_text,
        'fetch_time': fetch_elapsed,
        'response_time': response_elapsed,
        'embeddings_time': embedding_elapsed,
        'memories_retrieved': {'semantic': semantic_block},
    }


async def get_bot_response_rfm(
    redis_manager, user_id: str, bot_id: str, user_input: str,
    user_name: str = "Friend"
) -> dict:
    """RFM-only memory retrieval → Generate response."""
    fetch_start = time.perf_counter()
    recent_task = fetch_last_m_messages(
        redis_manager.client, user_id, bot_id, m=10
    )
    rfm_task = get_highest_rfm_memories(
        redis_manager.client, user_id, bot_id
    )
    recent, rfm_memories = await asyncio.gather(recent_task, rfm_task)
    fetch_elapsed = time.perf_counter() - fetch_start

    rfm_block = "\n\n".join(
        f"{mem['text']} | RFM:{mem['rfm_score']}"
        for mem in rfm_memories
    ) if rfm_memories else "No high-RFM memories."

    history_block = "\n\n".join(
        f"[{r.get('activity_type', 'chat').upper()}] {r.get('timestamp', '?')}\n"
        f"User: {r.get('user_message', '')}\n"
        f"Bot: {r.get('bot_response', '')}" + (f" (Media: {r['media_url']})" if r.get('media_url') else "")
        for r in recent
    )

    persona_prompt = _build_persona_context(bot_id, user_name)

    prompt = f"""{persona_prompt}

Recent Chat: {history_block}
Important Memories (RFM): {rfm_block}
Current User Input: {user_input}

Respond now.
"""

    response_start = time.perf_counter()
    try:
        response = _client.models.generate_content(
            model="gemini-2.0-flash", contents=prompt
        )
        bot_text = response.text.strip()
    except Exception as e:
        logger.error(f"Response generation failed: {e}")
        bot_text = "Could you say that again?"

    response_elapsed = time.perf_counter() - response_start

    return {
        'response': bot_text,
        'fetch_time': fetch_elapsed,
        'response_time': response_elapsed,
        'memories_retrieved': {'rfm': rfm_block},
    }
