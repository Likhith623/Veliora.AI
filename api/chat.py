"""
Veliora.AI — Chat Routes
Handles: send message (with Redis memory system), chat history, end chat (sync to DB),
clear chat, and forget friend.
Integrates Redis_chat memory pipeline: first message loads Supabase→Redis,
subsequent messages use Redis for context, end-chat syncs Redis→Supabase.
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Query
import logging
from config.mappings import get_message_xp, validate_language
from models.schemas import (
    ChatRequest, ChatHistoryRequest,
    ChatHistoryResponse, MessageItem,
    ChatResponse,
)
from api.auth import get_current_user
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["Chat"])


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SEND MESSAGE (Memory-Enhanced)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.post("/send", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    Send a message and get a memory-enhanced bot response.

    Flow:
    1. First message → auto-load Supabase messages into Redis
    2. Get memory-enhanced response (semantic + RFM + recent context)
    3. Publish to RabbitMQ for async memory extraction + chat logging
    4. Award XP
    """
    from services.redis_cache import (
        has_active_session, load_session_from_supabase,
        cache_message, get_redis_manager,
    )
    from services.rabbitmq_service import publish_memory_task, publish_message_log
    from services.background_tasks import award_xp
    from Redis_chat.working_files.chatbot import get_bot_response_combined
    from services.supabase_client import get_user_profile

    user_id = current_user["user_id"]
    bot_id = request.bot_id

    # Validate language
    if not validate_language(bot_id, request.language):
        logger.warning(f"Language {request.language} not validated for {bot_id}, proceeding anyway")

    try:
        # ─── Step 1: Auto-load session on first message ───
        session_active = await has_active_session(user_id, bot_id)
        if not session_active:
            logger.info(f"First message — loading session from Supabase for {user_id}:{bot_id}")
            await load_session_from_supabase(user_id, bot_id)

        # ─── Step 2: Get memory-enhanced response ───
        redis_manager = get_redis_manager()

        # Get user name for personalization from token securely
        user_name = current_user.get("name", "Friend")

        result = await get_bot_response_combined(
            redis_manager, user_id, bot_id, request.message, user_name
        )
        bot_response = result["response"]

        # ─── Step 3: Cache messages in Redis context list ───
        await cache_message(user_id, bot_id, "user", request.message)
        await cache_message(user_id, bot_id, "bot", bot_response)

        # ─── Step 4: Publish to RabbitMQ (async background processing) ───
        background_tasks.add_task(
            publish_memory_task, user_id, bot_id, request.message, bot_response
        )
        background_tasks.add_task(
            publish_message_log, user_id, bot_id, request.message, bot_response
        )

        # ─── Step 5: Award XP ───
        message_xp = get_message_xp(len(request.message))
        xp_result = await award_xp(user_id, bot_id, "message_short", message_xp)
        xp_earned = xp_result.get("total_earned", 0)

        return ChatResponse(
            bot_id=bot_id,
            user_message=request.message,
            bot_response=bot_response,
            language=request.language,
            xp_earned=xp_earned,
            semantic_memory_used=True,
        )

    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# END CHAT (Sync Redis → Supabase)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.post("/end-chat")
async def end_chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    End a chat session — sync all new Redis data to Supabase.

    Flow:
    1. Get all new chat records from Redis
    2. Generate embeddings for each message
    3. Batch insert into Supabase `messages` table
    4. Clear session data from Redis (memories persist)
    """
    from services.redis_cache import end_session_and_sync

    user_id = current_user["user_id"]
    bot_id = request.bot_id

    try:
        result = await end_session_and_sync(user_id, bot_id)
        return {
            "status": "success",
            "message": f"Session ended. Synced {result['synced_messages']} messages to database.",
            "details": result,
        }
    except Exception as e:
        logger.error(f"End chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"End chat failed: {str(e)}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHAT HISTORY (From Supabase)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.post("/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    request: ChatHistoryRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Get paginated chat history from Supabase.
    This is for the chat history UI — not memory retrieval.
    """
    from services.supabase_client import get_message_history, get_message_count

    user_id = current_user["user_id"]

    offset = (request.page - 1) * request.page_size
    messages = await get_message_history(
        user_id, request.bot_id, limit=request.page_size, offset=offset
    )
    total = await get_message_count(user_id, request.bot_id)

    return ChatHistoryResponse(
        messages=[
            MessageItem(
                id=m.get("id"),
                role=m.get("role", "user"),
                content=m.get("content", ""),
                bot_id=m.get("bot_id", request.bot_id),
                created_at=m.get("created_at"),
            )
            for m in messages
        ],
        total=total,
        page=request.page,
        page_size=request.page_size,
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHAT OVERVIEW (Optimized History Preview)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/overview")
async def get_chat_overview_route(
    current_user: dict = Depends(get_current_user),
):
    """
    Returns a lightweight summary of all bots the user has interacted with, 
    including only the most recent message for the history UI.
    Optimizes away N+1 history requests via a single Supabase query.
    """
    from services.supabase_client import get_chat_overview

    user_id = current_user["user_id"]

    try:
        sessions = await get_chat_overview(user_id)
        
        # Format explicitly mapping to the user's expected payload
        formatted_sessions = []
        for s in sessions:
            formatted_sessions.append({
                "bot_id": s["bot_id"],
                "last_message": {
                    "text": s["text"],
                    "role": s["role"],
                    "timestamp": s["timestamp"]
                }
            })

        return {
            "success": True,
            "sessions": formatted_sessions
        }
    except Exception as e:
        logger.error(f"Chat overview error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch chat overview: {str(e)}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CLEAR CHAT (Delete messages only, keep memories)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.delete("/clear")
async def clear_chat(
    bot_id: str = Query(..., description="Bot ID to clear chat for"),
    current_user: dict = Depends(get_current_user),
):
    """
    Clear all chat messages for a user-bot pair.
    - Deletes messages from Supabase.
    - Clears Redis session context (messages only, memories preserved).
    - Does NOT delete memories or XP.
    """
    from services.supabase_client import get_supabase_admin
    from services.redis_cache import get_redis_manager

    user_id = current_user["user_id"]
    client = get_supabase_admin()

    try:
        # 1. Delete messages from Supabase
        def _delete_messages():
            import asyncio
            return client.table("messages") \
                .delete() \
                .eq("user_id", user_id) \
                .eq("bot_id", bot_id) \
                .execute()

        import asyncio
        result = await asyncio.to_thread(_delete_messages)
        deleted_count = len(result.data) if result.data else 0

        # 2. Clear Redis context cache for this session (fire-and-forget)
        try:
            redis_manager = get_redis_manager()
            session_key = f"session:{user_id}:{bot_id}:messages"
            context_key = f"session:{user_id}:{bot_id}:context"
            overview_key = f"overview:{user_id}"
            await redis_manager.delete(session_key)
            await redis_manager.delete(context_key)
            await redis_manager.delete(overview_key)
        except Exception as redis_err:
            logger.warning(f"Redis clear warning (non-fatal): {redis_err}")

        return {
            "status": "success",
            "message": f"Cleared {deleted_count} messages for bot {bot_id}.",
            "deleted_count": deleted_count,
        }
    except Exception as e:
        logger.error(f"Clear chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Clear chat failed: {str(e)}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FORGET FRIEND (Nuclear — delete ALL data for pair)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.delete("/forget")
async def forget_friend(
    bot_id: str = Query(..., description="Bot ID to forget"),
    current_user: dict = Depends(get_current_user),
):
    """
    Permanently delete ALL data for a user-bot pair.
    - Deletes all messages from Supabase.
    - Deletes all memories from Supabase.
    - Deletes all game sessions from Supabase.
    - Clears all Redis keys for this pair.
    This is irreversible.
    """
    from services.supabase_client import get_supabase_admin
    from services.redis_cache import get_redis_manager
    import asyncio

    user_id = current_user["user_id"]
    client = get_supabase_admin()

    results = {}

    # 1. Delete messages
    try:
        def _del_msgs():
            return client.table("messages").delete() \
                .eq("user_id", user_id).eq("bot_id", bot_id).execute()
        r = await asyncio.to_thread(_del_msgs)
        results["messages_deleted"] = len(r.data) if r.data else 0
    except Exception as e:
        logger.warning(f"forget_friend: message delete warning: {e}")
        results["messages_deleted"] = 0

    # 2. Delete memories
    try:
        def _del_mems():
            return client.table("memories").delete() \
                .eq("user_id", user_id).eq("bot_id", bot_id).execute()
        r = await asyncio.to_thread(_del_mems)
        results["memories_deleted"] = len(r.data) if r.data else 0
    except Exception as e:
        logger.warning(f"forget_friend: memory delete warning: {e}")
        results["memories_deleted"] = 0

    # 3. Delete game sessions
    try:
        def _del_games():
            return client.table("user_game_sessions").delete() \
                .eq("user_id", user_id).eq("bot_id", bot_id).execute()
        r = await asyncio.to_thread(_del_games)
        results["game_sessions_deleted"] = len(r.data) if r.data else 0
    except Exception as e:
        logger.warning(f"forget_friend: game sessions delete warning: {e}")
        results["game_sessions_deleted"] = 0

    # 4. Nuke all Redis keys for this pair
    try:
        redis_manager = get_redis_manager()
        redis_prefix = f"session:{user_id}:{bot_id}:*"
        # Use SCAN to find and delete all matching keys
        keys_to_delete = []
        async for key in redis_manager.scan_iter(redis_prefix):
            keys_to_delete.append(key)
        
        # Globally invalidate overview cache
        keys_to_delete.append(f"overview:{user_id}")
        
        if keys_to_delete:
            await redis_manager.delete(*keys_to_delete)
        results["redis_keys_cleared"] = len(keys_to_delete)
    except Exception as redis_err:
        logger.warning(f"forget_friend: Redis clear warning (non-fatal): {redis_err}")
        results["redis_keys_cleared"] = 0

    return {
        "status": "success",
        "message": f"All data for bot {bot_id} has been permanently deleted.",
        "details": results,
    }
