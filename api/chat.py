"""
Veliora.AI — Chat Routes
Main chat endpoint with language validation, semantic memory,
game context, write-behind caching, and XP awards.
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
import logging
from config.mappings import (
    validate_language, get_message_xp, XP_REWARDS, get_supported_languages,
)
from models.schemas import (
    ChatRequest, ChatResponse, ChatHistoryResponse, MessageItem,
)
from api.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("/send", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    Main chat endpoint. Full flow:
    1. Validate language against BOT_LANGUAGE_MAP
    2. Load context from Redis (fallback to Supabase)
    3. Retrieve semantic memory via two-stage vector search
    4. Check active game state from Redis
    5. Build system prompt from bot_prompts.py
    6. Call Gemini → return response immediately
    7. Background: append to Redis, sync to Supabase with embeddings, award XP
    """
    from services.redis_cache import (
        load_context, append_message,
        get_game_state, increment_session_message_count,
    )
    from services.llm_engine import (
        generate_chat_response, detect_language,
    )
    from services.vector_search import semantic_search
    from services.supabase_client import get_message_history, get_user_profile
    from services.background_tasks import sync_message_to_db, award_xp
    from bot_prompt import get_bot_prompt

    user_id = current_user["user_id"]
    bot_id = request.bot_id
    user_message = request.message
    language = request.language

    # ─── Step 1: Language Validation ───
    # Auto-detect language if not specified
    if language == "auto" or not language:
        language = await detect_language(user_message)

    # Validate against bot's supported languages
    if not validate_language(bot_id, language):
        supported = get_supported_languages(bot_id)
        return ChatResponse(
            bot_id=bot_id,
            user_message=user_message,
            bot_response=(
                f"I'm sorry, I can only communicate in {', '.join(supported)}. "
                f"Could you please try in one of these languages?"
            ),
            language=language,
            xp_earned=0,
            semantic_memory_used=False,
        )

    # ─── Step 2: Load Context from Redis ───
    context = await load_context(user_id, bot_id)
    if not context:
        # Fallback: load from Supabase
        db_messages = await get_message_history(user_id, bot_id, limit=20)
        context = [
            {"role": msg["role"], "content": msg["content"]}
            for msg in db_messages
        ]

    # ─── Step 3: Semantic Memory (Two-Stage Vector Search) ───
    semantic_memory = []
    memory_used = False
    try:
        semantic_memory = await semantic_search(user_message, user_id, bot_id)
        memory_used = len(semantic_memory) > 0
    except Exception as e:
        logger.warning(f"Semantic search failed (non-critical): {e}")

    # ─── Step 4: Check Game State ───
    game_state = await get_game_state(user_id)

    # ─── Step 5: Build System Prompt ───
    raw_prompt = get_bot_prompt(bot_id)
    if raw_prompt == "Bot prompt not found.":
        raise HTTPException(status_code=404, detail=f"Unknown bot_id: {bot_id}")

    # Get user profile for prompt personalization
    profile = await get_user_profile(user_id)
    user_name = profile.get("name", "Friend") if profile else "Friend"
    user_gender = profile.get("gender", "unknown") if profile else "unknown"

    # Format the system prompt with user details
    system_prompt = raw_prompt.format(
        custom_bot_name=request.custom_bot_name or bot_id.replace("_", " ").title(),
        userName=user_name,
        userGender=user_gender,
        traitsString=request.traits or "",
        languageString=language,
    )

    # ─── Step 6: Generate Response ───
    bot_response = await generate_chat_response(
        system_prompt=system_prompt,
        context=context,
        user_message=user_message,
        game_state=game_state,
        semantic_memory=semantic_memory if memory_used else None,
    )

    # ─── Step 7: Background Tasks ───
    # Append both user and bot messages to Redis cache
    background_tasks.add_task(append_message, user_id, bot_id, "user", user_message)
    background_tasks.add_task(append_message, user_id, bot_id, "bot", bot_response)

    # Sync both messages to Supabase with embeddings
    background_tasks.add_task(
        sync_message_to_db, user_id, bot_id, "user", user_message, language
    )
    background_tasks.add_task(
        sync_message_to_db, user_id, bot_id, "bot", bot_response, language
    )

    # Award XP based on message length
    msg_xp = get_message_xp(len(user_message))
    xp_result = await award_xp(user_id, bot_id, "message_short", msg_xp)

    # Check conversation milestones
    session_count = await increment_session_message_count(user_id, bot_id)
    if session_count == 10:
        await award_xp(user_id, bot_id, "conversation_milestone_10")
        msg_xp += XP_REWARDS["conversation_milestone_10"]
    elif session_count == 25:
        await award_xp(user_id, bot_id, "conversation_milestone_25")
        msg_xp += XP_REWARDS["conversation_milestone_25"]

    return ChatResponse(
        bot_id=bot_id,
        user_message=user_message,
        bot_response=bot_response,
        language=language,
        xp_earned=xp_result.get("total_earned", msg_xp),
        semantic_memory_used=memory_used,
    )


@router.get("/history/{bot_id}", response_model=ChatHistoryResponse)
async def get_chat_history(
    bot_id: str,
    page: int = 1,
    page_size: int = 50,
    current_user: dict = Depends(get_current_user),
):
    """
    Get paginated chat history for a user-bot pair.
    Returns both user queries and bot responses.
    """
    from services.supabase_client import get_message_history, get_message_count

    user_id = current_user["user_id"]
    offset = (page - 1) * page_size

    messages = await get_message_history(user_id, bot_id, limit=page_size, offset=offset)
    total = await get_message_count(user_id, bot_id)

    return ChatHistoryResponse(
        messages=[
            MessageItem(
                id=msg.get("id"),
                role=msg["role"],
                content=msg["content"],
                bot_id=bot_id,
                created_at=msg.get("created_at"),
            )
            for msg in messages
        ],
        total=total,
        page=page,
        page_size=page_size,
    )
