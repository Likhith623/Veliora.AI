"""
Veliora.AI — Selfie Routes
Contextual selfie generation based on chat context.
MVP: Bot-only selfies. User composite code is commented out.
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
import logging
from models.schemas import SelfieRequest, SelfieResponse
from api.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/selfie", tags=["Selfie Compositing"])


@router.post("/generate", response_model=SelfieResponse)
async def generate_selfie(
    request: SelfieRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate a contextual selfie of the bot.
    
    Flow:
    1. Load recent chat context from Redis
    2. Gemini generates a scene description from the conversation mood
    3. HuggingFace Serverless API generates the image
    4. Upload to Supabase Storage
    5. Return the image URL
    
    MVP: Bot-only selfie. If include_user=True, it is ignored for now
    (composite code is commented out in selfie_service.py).
    """
    from services.redis_cache import load_context
    from services.llm_engine import generate_scene_description
    from services.selfie_service import generate_bot_selfie
    from services.background_tasks import award_xp
    # from services.supabase_client import get_user_profile  # Uncomment for user composite

    user_id = current_user["user_id"]
    bot_id = request.bot_id

    # Load chat context for scene generation
    context = await load_context(user_id, bot_id)
    if not context:
        # Fallback: use a generic context
        context = [{"role": "user", "content": "Hey, how's it going?"}]

    # Generate scene description from chat context via Gemini
    scene_description = await generate_scene_description(bot_id, context)

    # ─── MVP: Bot-only selfie ───
    result = await generate_bot_selfie(bot_id, scene_description, user_id)

    if not result:
        raise HTTPException(
            status_code=500,
            detail="Selfie generation failed. The image model may be loading — try again in 30 seconds."
        )

    # ─── Future: User + Bot composite selfie ───
    # Uncomment the block below and the import above when ready.
    #
    # if request.include_user:
    #     profile = await get_user_profile(user_id)
    #     user_avatar = profile.get("avatar_url") if profile else None
    #
    #     if user_avatar:
    #         from services.selfie_service import generate_composite_selfie
    #         result = await generate_composite_selfie(
    #             bot_id, scene_description, user_id, user_avatar
    #         )
    #         if not result:
    #             raise HTTPException(
    #                 status_code=500,
    #                 detail="Composite selfie generation failed."
    #             )
    #     else:
    #         # User has no avatar — generate bot-only selfie
    #         pass  # Already generated above

    # Cache messages to Redis context so the LLM remembers
    from services.redis_cache import cache_message, has_active_session, load_session_from_supabase
    
    if not await has_active_session(user_id, bot_id):
        await load_session_from_supabase(user_id, bot_id)
        
    user_msg = f"User requested a selfie of {bot_id}"
    scene = result.get("scene_description", "Bot selfie generated")
    
    await cache_message(user_id, bot_id, "user", user_msg)
    await cache_message(user_id, bot_id, "bot", scene)

    # Publish to memory pipeline
    from services.rabbitmq_service import publish_memory_task, publish_message_log
    publish_memory_task(user_id, bot_id, user_msg, scene)
    publish_message_log(
        user_id, bot_id, user_msg, scene,
        activity_type="selfie", media_url=result.get("image_url")
    )

    # Award XP
    xp_result = await award_xp(user_id, bot_id, "selfie_generate")

    return SelfieResponse(
        bot_id=bot_id,
        image_url=result["image_url"],
        scene_description=scene,
        xp_earned=xp_result.get("total_earned", 150),
    )
