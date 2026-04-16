# chat.py
"""
Veliora.AI — Chat Routes
Handles: send message (with Redis memory system), chat history, end chat (sync to DB),
clear chat, forget friend, and crisis acknowledgment.

Mental Health Integration:
- Every user message runs through RoBERTa text emotion analysis
- Dual-Alert system evaluates Tier 1 (acute) and Tier 2 (chronic) on every turn
- Tier 1 bypasses the LLM entirely and returns localized crisis resources
- Tier 2 prepends a gentle proactive nudge to the bot response
- Intervention cooldown requires explicit user acknowledgment before LLM resumes
- Emotion state is fused and stored in Redis for the voice pipeline to merge with
"""

import asyncio
import concurrent.futures
import logging
import re
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Query

from config.mappings import get_message_xp, validate_language
from models.schemas import (
    ChatRequest, ChatHistoryRequest,
    ChatHistoryResponse, MessageItem,
    ChatResponse,
)
from api.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["Chat"])

# FIX: Module-level executor — was being created inside the request handler on
# every single chat message, leaking a new ThreadPoolExecutor each time.
# One shared pool handles all RoBERTa/emotion inference for the entire process.
_emotion_executor = concurrent.futures.ThreadPoolExecutor(
    max_workers=2, thread_name_prefix="chat_emotion"
)


# ──────────────────────────────────────────────────────────────────────────────
# SEND MESSAGE (Memory-Enhanced + Mental Health Dual-Alert)
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/send", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    Send a message and get a memory-enhanced, emotionally-aware bot response.

    Flow:
    1. First message → auto-load Supabase messages into Redis
    2. Check intervention cooldown — if Tier 1 active, bypass LLM and return crisis response
    3. Run RoBERTa text emotion analysis on user message
    4. Fuse text emotion with latest speech emotion from Redis (if voice call active)
    5. Persist fused emotion, run Dual-Alert evaluation
    6. If Tier 1 fires → return crisis resources immediately, no LLM call
    7. If Tier 2 fires → prepend nudge message to LLM response
    8. Generate memory-enhanced LLM response (if not bypassed)
    9. Cache messages, publish to RabbitMQ, award XP
    """
    from services.redis_cache import (
        has_active_session, load_session_from_supabase,
        cache_message, get_redis_manager,
    )
    from services.rabbitmq_service import publish_memory_task, publish_message_log
    from services.background_tasks import award_xp
    from Redis_chat.working_files.chatbot import get_bot_response_combined
    from emotion.text_emotion import get_text_emotion
    from emotion.fusion import fuse_emotions
    from emotion.session_state import (
        get_emotion_state, set_emotion_state,
        get_intervention_cooldown, evaluate_dual_alert,
        CRISIS_RESOURCES,
    )

    user_id = current_user["user_id"]
    bot_id  = request.bot_id

    if not validate_language(bot_id, request.language):
        logger.warning(f"Language {request.language} not validated for {bot_id}, proceeding anyway")

    try:
        redis_manager = get_redis_manager()
        redis_client  = redis_manager.client

        # ── Step 1: Auto-load session on first message ────────────────────────
        if not await has_active_session(user_id, bot_id):
            logger.info(f"First message — loading session from Supabase for {user_id}:{bot_id}")
            await load_session_from_supabase(user_id, bot_id)

        # ── Step 2: Check active intervention cooldown ────────────────────────
        # If a Tier 1 crisis lock is active and not yet acknowledged, return
        # crisis resources immediately without touching the LLM.
        active_cooldown = get_intervention_cooldown(redis_client, user_id, bot_id)
        if active_cooldown == "tier1":
            logger.warning(
                f"[COOLDOWN-GATE] Tier 1 active for {user_id}:{bot_id} — "
                f"LLM bypassed, crisis resources returned."
            )
            return ChatResponse(
                bot_id=bot_id,
                user_message=request.message,
                bot_response=_build_crisis_response(CRISIS_RESOURCES),
                language=request.language,
                xp_earned=0,
                semantic_memory_used=False,
                alert_tier="tier1",
                bypass_llm=True,
                crisis_resources=CRISIS_RESOURCES,
            )

        # ── Step 3: Text emotion analysis (RoBERTa GoEmotions) ───────────────
        loop = asyncio.get_running_loop()

        text_emotion = await loop.run_in_executor(
            _emotion_executor, get_text_emotion, request.message
        )
        
        # Prepare a pretty log for the max label and top 3 percentages to avoid terminal spam
        max_label = text_emotion.get('label')
        max_score = text_emotion.get('score')
        all_em = text_emotion.get('all_emotions', {})
        if all_em:
            top_3 = dict(sorted(all_em.items(), key=lambda item: item[1], reverse=True)[:3])
            log_str = f"🧠 [ROBERTA] Max: '{max_label}' ({max_score*100:.1f}%) | Top 3: {top_3} | User: '{request.message[:50]}...'"
        else:
            log_str = f"🧠 [ROBERTA] Model Result: {text_emotion} -> User: '{request.message}'"
        
        logger.info(log_str)

        # ── Step 4: Fuse with latest speech emotion (if available) ───────────
        # Speech emotion is updated asynchronously by emotion_worker.py.
        # We read the last known state here for fusion.
        # This achieves temporal sync: the same conversational turn's audio
        # was already processed by the voice pipeline if a call is active.
        latest_stored_emotion = get_emotion_state(redis_client, user_id, bot_id)
        speech_emotion_for_fusion = None
        if latest_stored_emotion and latest_stored_emotion.get("speech_raw") not in (None, "n/a"):
            # FIX: reconstruct the speech signal from its dedicated stored fields.
            # We now have the exact speech_score available from our previous fusion.
            speech_raw   = latest_stored_emotion["speech_raw"]
            speech_score = latest_stored_emotion.get("speech_score", 0.0)
            all_speech   = latest_stored_emotion.get("all_speech_emotions", {})
            
            speech_emotion_for_fusion = {
                "label": speech_raw,
                "score": float(speech_score),
                "all_emotions": all_speech,
            }

        fused_emotion = fuse_emotions(
            text_emotion=text_emotion,
            speech_emotion=speech_emotion_for_fusion,
        )
        fused_emotion["text_message"] = request.message

        # ── Step 5: Persist fused emotion to Redis ────────────────────────────
        set_emotion_state(redis_client, user_id, bot_id, fused_emotion)

        # ── Step 6: Dual-Alert evaluation ─────────────────────────────────────
        alert_result = evaluate_dual_alert(
            redis_client=redis_client,
            user_id=user_id,
            bot_id=bot_id,
            fused_emotion=fused_emotion,
            user_text=request.message,
        )

        # ── Step 7: Tier 1 — Bypass LLM, return crisis response ──────────────
        if alert_result["bypass_llm"]:
            crisis_response = _build_crisis_response(alert_result["crisis_resources"])
            # Cache user message and crisis response for history continuity
            await cache_message(user_id, bot_id, "user", request.message)
            await cache_message(user_id, bot_id, "bot", crisis_response)
            
            import uuid
            redis_manager.store_chat(
                user_id, bot_id, str(uuid.uuid4()),
                chat_dict={
                    "user_message": request.message,
                    "bot_response": crisis_response,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "is_historical": "false"
                }
            )

            background_tasks.add_task(
                publish_message_log, user_id, bot_id, request.message, crisis_response
            )
            return ChatResponse(
                bot_id=bot_id,
                user_message=request.message,
                bot_response=crisis_response,
                language=request.language,
                xp_earned=0,
                semantic_memory_used=False,
                alert_tier="tier1",
                bypass_llm=True,
                crisis_resources=alert_result["crisis_resources"],
            )

        # ── Step 8: Generate memory-enhanced LLM response ────────────────────
        user_name = current_user.get("name", "Friend")
        result = await get_bot_response_combined(
            redis_manager, user_id, bot_id, request.message, user_name, request.traits
        )
        bot_response = result["response"]

        # ── Step 9: Tier 2 — Prepend gentle nudge to response ────────────────
        if alert_result["alert_tier"] == "tier2" and alert_result.get("nudge_message"):
            bot_response = f"{alert_result['nudge_message']}\n\n{bot_response}"

        # ── Step 10: Cache messages in Redis context list ──────────────────────
        await cache_message(user_id, bot_id, "user", request.message)
        await cache_message(user_id, bot_id, "bot", bot_response)

        import uuid
        redis_manager.store_chat(
            user_id, bot_id, str(uuid.uuid4()),
            chat_dict={
                "user_message": request.message,
                "bot_response": bot_response,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "is_historical": "false"
            }
        )

        # ── Step 11: Publish to RabbitMQ (async background processing) ────────
        background_tasks.add_task(
            publish_memory_task, user_id, bot_id, request.message, bot_response
        )
        background_tasks.add_task(
            publish_message_log, user_id, bot_id, request.message, bot_response
        )

        # ── Step 12: Award XP ─────────────────────────────────────────────────
        message_xp = get_message_xp(len(request.message))
        xp_result  = await award_xp(user_id, bot_id, "message_short", message_xp)
        xp_earned  = xp_result.get("total_earned", 0)

        return ChatResponse(
            bot_id=bot_id,
            user_message=request.message,
            bot_response=bot_response,
            language=request.language,
            xp_earned=xp_earned,
            semantic_memory_used=True,
            alert_tier=alert_result.get("alert_tier"),
            bypass_llm=False,
            fused_emotion=fused_emotion,
        )

    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


# ──────────────────────────────────────────────────────────────────────────────
# CRISIS ACKNOWLEDGMENT — "I am safe, return to chat"
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/acknowledge-crisis")
async def acknowledge_crisis_endpoint(
    bot_id: str = Query(..., description="Bot ID for which to acknowledge crisis"),
    current_user: dict = Depends(get_current_user),
):
    """
    Called when the user explicitly clicks 'I am safe, return to chat'.
    Clears the Tier 1 intervention cooldown and unlocks the LLM.
    The acknowledgment timestamp is stored for audit purposes.

    This endpoint is mandatory for re-enabling normal chat after a Tier 1 alert.
    The LLM will NOT automatically unlock — the user MUST call this endpoint.
    """
    from services.redis_cache import get_redis_manager
    from emotion.session_state import acknowledge_crisis, get_intervention_cooldown

    user_id      = current_user["user_id"]
    redis_client = get_redis_manager().client

    cooldown = get_intervention_cooldown(redis_client, user_id, bot_id)
    if cooldown != "tier1":
        return {
            "status":  "no_active_crisis",
            "message": "No active Tier 1 crisis lock found for this session.",
        }

    success = acknowledge_crisis(redis_client, user_id, bot_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to acknowledge crisis.")

    logger.info(f"[SAFE-RETURN] {user_id}:{bot_id} returned to normal chat.")
    return {
        "status":  "success",
        "message": "Crisis acknowledged. You're back in normal chat. I'm here with you.",
    }


# ──────────────────────────────────────────────────────────────────────────────
# EMOTION STATE — FOR DASHBOARD / DEBUG
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/emotion-state/{bot_id}")
async def get_current_emotion_state(
    bot_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Returns the latest fused emotion state, rolling valence history,
    and active intervention cooldown for the clinical dashboard.
    """
    from services.redis_cache import get_redis_manager
    from emotion.session_state import (
        get_emotion_state, get_valence_history, get_intervention_cooldown,
    )

    user_id      = current_user["user_id"]
    redis_client = get_redis_manager().client

    return {
        "latest_emotion":    get_emotion_state(redis_client, user_id, bot_id),
        "valence_history":   get_valence_history(redis_client, user_id, bot_id),
        "active_cooldown":   get_intervention_cooldown(redis_client, user_id, bot_id),
    }


# ──────────────────────────────────────────────────────────────────────────────
# CRISIS RESPONSE BUILDER
# ──────────────────────────────────────────────────────────────────────────────

def _build_crisis_response(crisis_resources: dict) -> str:
    """
    Build a warm, non-clinical crisis response string from the resources dict.
    This is what the user sees in the chat UI when a Tier 1 alert fires.

    FIX: Removed markdown bold syntax (**text**) from the phone lines because
    many chat clients render this literally rather than as bold, making the
    output look cluttered. The structure relies on line breaks and emoji
    for visual hierarchy instead.
    """
    lines = [
        crisis_resources.get("message", "I'm really concerned about you right now."),
        "",
    ]
    for r in crisis_resources.get("primary", []):
        hours = f"  ({r['hours']})" if r.get("hours") else ""
        lines.append(f"\U0001f4de {r['name']}: {r['number']}{hours}")
    lines.append("")
    lines.append("You matter. Please reach out — you don't have to go through this alone. \U0001f499")
    lines.append("")
    lines.append("When you're ready to come back, press 'I am safe' below.")
    return "\n".join(lines)


# ──────────────────────────────────────────────────────────────────────────────
# END CHAT (Sync Redis → Supabase)
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/end-chat")
async def end_chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    End a chat session — sync all new Redis data to Supabase.
    """
    from services.redis_cache import end_session_and_sync

    user_id = current_user["user_id"]
    bot_id  = request.bot_id

    try:
        result = await end_session_and_sync(user_id, bot_id)
        return {
            "status":  "success",
            "message": f"Session ended. Synced {result['synced_messages']} messages to database.",
            "details": result,
        }
    except Exception as e:
        logger.error(f"End chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"End chat failed: {str(e)}")


# ──────────────────────────────────────────────────────────────────────────────
# MESSAGE CONTENT PARSER
# ──────────────────────────────────────────────────────────────────────────────

# FIX: Compiled regexes at module level — were being recompiled inside
# _parse_message_content on every single message parse call.
_MEDIA_PATTERN    = re.compile(r"\(Media:\s*(https?://[^\)]+)\)")
_ALL_BRACKET_TAGS = re.compile(r"\[([A-Z_]+)\]")


def _parse_message_content(m: dict, bot_id: str) -> MessageItem:
    """Helper to standardize parsing of tags and media from message content."""
    content       = m.get("content", "")
    role          = m.get("role", "user")
    activity_type = m.get("activity_type", "chat")
    media_url     = m.get("media_url")

    tags = set(_ALL_BRACKET_TAGS.findall(content))

    is_voice_note       = any(t in tags for t in ["VOICE_NOTE", "VOICE_CALL", "VOICE_NOTE_SENT"])
    is_image_msg        = any(t in tags for t in ["IMAGE_GEN", "SELFIE", "IMAGE_DESCRIBE"])
    is_activity_start   = any(t in tags for t in ["ACTIVITY_START", "GAME_START"])
    is_activity_end     = any(t in tags for t in ["ACTIVITY_END", "GAME_END"])
    is_voice_call_start = "VOICE_CALL_START" in tags
    is_voice_call_end   = "VOICE_CALL_END" in tags
    is_system           = is_activity_start or is_activity_end or is_voice_call_start or is_voice_call_end

    clean_content = _ALL_BRACKET_TAGS.sub("", content).strip()

    audio_url = None
    image_url = None

    media_match = _MEDIA_PATTERN.search(clean_content)
    if media_match:
        url = media_match.group(1).strip()
        clean_content = _MEDIA_PATTERN.sub("", clean_content).strip()
        ext_lower = url.lower()
        if any(ext_lower.endswith(e) for e in (".mp3", ".wav", ".ogg")) or "audio" in ext_lower:
            audio_url = url
            is_voice_note = True
        elif any(ext_lower.endswith(e) for e in (".png", ".jpg", ".jpeg", ".webp", ".gif")) or "image" in ext_lower:
            image_url = url
            is_image_msg = True

    if media_url and not audio_url and not image_url:
        ml = media_url.lower()
        if any(ml.endswith(e) for e in (".mp3", ".wav", ".ogg")) or "audio" in ml:
            audio_url = media_url
            is_voice_note = True
        elif any(ml.endswith(e) for e in (".png", ".jpg", ".jpeg", ".webp", ".gif")) or "image" in ml:
            image_url = media_url
            is_image_msg = True

    if activity_type == "voice_note":
        is_voice_note = True
        audio_url = media_url or audio_url
    if activity_type == "voice_call":
        audio_url = media_url or audio_url
    if activity_type in ("image_gen", "image_describe"):
        is_image_msg = True
        image_url = media_url or image_url

    if role == "user" and clean_content == "User uploaded an image for description":
        clean_content = ""

    return MessageItem(
        id=m.get("id"),
        role=role,
        content=clean_content,
        bot_id=m.get("bot_id", bot_id),
        activity_type=activity_type,
        media_url=media_url,
        created_at=m.get("created_at"),
        is_voice_note=is_voice_note,
        is_image_message=is_image_msg,
        is_activity_start=is_activity_start,
        is_activity_end=is_activity_end,
        is_voice_call_start=is_voice_call_start,
        is_voice_call_end=is_voice_call_end,
        is_system_message=is_system,
        audio_url=audio_url,
        image_url=image_url,
    )


# ──────────────────────────────────────────────────────────────────────────────
# INIT CHAT SESSION
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/init/{bot_id}")
async def init_chat_session(
    bot_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Eagerly loads the session into Redis from Supabase.
    Fetches chronological message history and parses media tags.
    """
    from services.redis_cache import load_session_from_supabase
    from services.supabase_client import get_supabase_admin

    user_id = current_user["user_id"]
    await load_session_from_supabase(user_id, bot_id)

    client   = get_supabase_admin()
    response = (
        client.table("messages")
        .select("id, role, content, bot_id, created_at, activity_type, media_url")
        .eq("user_id", user_id)
        .eq("bot_id", bot_id)
        .order("created_at", desc=False)
        .execute()
    )
    messages       = response.data or []
    parsed_history = [_parse_message_content(m, bot_id) for m in messages]

    return {"status": "success", "bot_id": bot_id, "history": parsed_history}


# ──────────────────────────────────────────────────────────────────────────────
# CHAT HISTORY (From Supabase)
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    request: ChatHistoryRequest,
    current_user: dict = Depends(get_current_user),
):
    from services.supabase_client import get_message_history, get_message_count

    user_id    = current_user["user_id"]
    offset     = (request.page - 1) * request.page_size
    raw_msgs   = await get_message_history(user_id, request.bot_id, limit=request.page_size, offset=offset)
    total      = await get_message_count(user_id, request.bot_id)
    parsed     = [_parse_message_content(m, request.bot_id) for m in raw_msgs]

    return ChatHistoryResponse(messages=parsed, total=total, page=request.page, page_size=request.page_size)


# ──────────────────────────────────────────────────────────────────────────────
# CHAT OVERVIEW
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/overview")
async def get_chat_overview_route(current_user: dict = Depends(get_current_user)):
    from services.supabase_client import get_chat_overview

    user_id = current_user["user_id"]
    try:
        sessions = await get_chat_overview(user_id)
        formatted = [
            {
                "bot_id": s["bot_id"],
                "last_message": {
                    "text":      s.get("text") or s.get("content") or "",
                    "role":      s.get("role") or "bot",
                    "timestamp": s.get("timestamp") or s.get("created_at"),
                },
            }
            for s in sessions
        ]
        return {"success": True, "sessions": formatted}
    except Exception as e:
        logger.error(f"Chat overview error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch chat overview: {str(e)}")


# ──────────────────────────────────────────────────────────────────────────────
# CLEAR CHAT
# ──────────────────────────────────────────────────────────────────────────────

@router.delete("/clear")
async def clear_chat(
    bot_id: str = Query(..., description="Bot ID to clear chat for"),
    current_user: dict = Depends(get_current_user),
):
    from services.supabase_client import get_supabase_admin
    from services.redis_cache import get_redis_manager

    user_id = current_user["user_id"]
    client  = get_supabase_admin()

    try:
        result = await asyncio.to_thread(
            lambda: client.table("messages").delete()
            .eq("user_id", user_id).eq("bot_id", bot_id).execute()
        )
        deleted_count = len(result.data) if result.data else 0

        try:
            redis_manager = get_redis_manager()
            for key in [
                f"session:{user_id}:{bot_id}:messages",
                f"session:{user_id}:{bot_id}:context",
                f"overview:{user_id}",
            ]:
                await asyncio.to_thread(redis_manager.client.delete, key)
        except Exception as redis_err:
            logger.warning(f"Redis clear warning (non-fatal): {redis_err}")

        return {
            "status":        "success",
            "message":       f"Cleared {deleted_count} messages for bot {bot_id}.",
            "deleted_count": deleted_count,
        }
    except Exception as e:
        logger.error(f"Clear chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Clear chat failed: {str(e)}")


# ──────────────────────────────────────────────────────────────────────────────
# FORGET FRIEND (Nuclear)
# ──────────────────────────────────────────────────────────────────────────────

@router.delete("/forget")
async def forget_friend(
    bot_id: str = Query(..., description="Bot ID to forget"),
    current_user: dict = Depends(get_current_user),
):
    from services.supabase_client import get_supabase_admin
    from services.redis_cache import get_redis_manager

    user_id = current_user["user_id"]
    client  = get_supabase_admin()
    results: dict = {}

    for table, result_key in [
        ("messages",          "messages_deleted"),
        ("memories",          "memories_deleted"),
        ("user_game_sessions","game_sessions_deleted"),
    ]:
        try:
            r = await asyncio.to_thread(
                lambda t=table: client.table(t).delete()
                .eq("user_id", user_id).eq("bot_id", bot_id).execute()
            )
            results[result_key] = len(r.data) if r.data else 0
        except Exception as e:
            logger.warning(f"forget_friend: {table} delete warning: {e}")
            results[result_key] = 0

    try:
        redis_manager  = get_redis_manager()
        redis_client   = redis_manager.client
        keys_to_delete = []

        # FIX: The original code used `async for key in redis_manager.scan_iter(...)`.
        # redis-py's scan_iter is synchronous. Wrap in to_thread to avoid blocking
        # the event loop, and collect keys first before deleting.
        def _collect_session_keys() -> list[str]:
            return list(redis_client.scan_iter(f"session:{user_id}:{bot_id}:*"))

        session_keys = await asyncio.to_thread(_collect_session_keys)
        keys_to_delete.extend(session_keys)

        # Also clear emotion / alert keys
        keys_to_delete.extend([
            f"emotion_state:{user_id}:{bot_id}",
            f"emotion_window:{user_id}:{bot_id}",
            f"valence_history:{user_id}:{bot_id}",
            f"alert_cooldown:{user_id}:{bot_id}",
            f"alert_cooldown_ts:{user_id}:{bot_id}",
            f"crisis_acknowledged:{user_id}:{bot_id}",
            f"tier2_last_nudge:{user_id}:{bot_id}",
            f"overview:{user_id}",
            f"context:{user_id}:{bot_id}",
        ])

        if keys_to_delete:
            await asyncio.to_thread(redis_client.delete, *keys_to_delete)

        results["redis_keys_cleared"] = len(keys_to_delete)

    except Exception as redis_err:
        logger.warning(f"forget_friend: Redis clear warning (non-fatal): {redis_err}")
        results["redis_keys_cleared"] = 0

    return {
        "status":  "success",
        "message": f"All data for bot {bot_id} has been permanently deleted.",
        "details": results,
    }