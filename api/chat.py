"""
Veliora.AI — Chat Routes
Handles: send message (with Redis memory system), chat history, end chat (sync to DB).
Integrates Redis_chat memory pipeline: first message loads Supabase→Redis,
subsequent messages use Redis for context, end-chat syncs Redis→Supabase.
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
import logging
from config.mappings import get_message_xp, validate_language
from models.schemas import (
    ChatRequest, ChatResponse, ChatHistoryRequest,
    ChatHistoryResponse, MessageItem,
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
