"""
Veliora.AI — Image Generation Routes
Handles: selfie generation using Gradio FaceID with emotion context.

Ported from image-generation/main.py as an integrated API route.
Images are served at http://localhost:8000/static/images/
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, Dict
import logging
import os

from api.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/images", tags=["Image Generation"])


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SCHEMAS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class ImageGenerationRequest(BaseModel):
    bot_id: str
    message: str
    username: Optional[str] = "User"


class ImageGenerationResponse(BaseModel):
    bot_id: str
    image_url: str
    image_base64: str
    status: str
    emotion_context: Dict[str, str]
    xp_earned: int = 150


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GENERATE SELFIE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.post("/generate-selfie", response_model=ImageGenerationResponse)
async def generate_selfie(
    request: ImageGenerationRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate a persona selfie image based on the user's message.

    Flow:
    1. Get bot's quick emotional response to user message
    2. Extract emotion context (emotion, location, action)
    3. Generate FaceID selfie using Gradio
    4. Save image locally and return URL
    5. Log to Supabase and award XP

    Images served at: http://localhost:8000/static/images/{uuid}.png
    """
    from services.image_service import (
        get_image_service, find_base_image,
        extract_emotion_context, get_bot_quick_response,
    )
    from services.background_tasks import award_xp

    user_id = current_user["user_id"]
    bot_id = request.bot_id

    # Find base face image
    base_image_path = find_base_image(bot_id)
    if not base_image_path:
        raise HTTPException(
            status_code=404,
            detail=f"No face image found for bot '{bot_id}'. "
                   f"Add {bot_id}.jpeg to image-generation/photos/"
        )

    try:
        # Step 1: Get emotional reaction from bot
        bot_reaction = await get_bot_quick_response(bot_id, request.message)

        # Step 2: Extract emotion context
        context = await extract_emotion_context(bot_reaction)
        logger.info(f"Emotion context: {context}")

        # Step 3: Generate selfie
        image_service = get_image_service()
        relative_url, image_base64 = await image_service.generate_selfie(
            bot_id, base_image_path, context
        )

        # Step 4: Build full URL (localhost:8000)
        full_url = f"http://localhost:8000{relative_url}"

        # Step 5: Publish to memory pipeline and cache
        from services.redis_cache import cache_message, has_active_session, load_session_from_supabase
        if not await has_active_session(user_id, bot_id):
            await load_session_from_supabase(user_id, bot_id)

        bot_resp = f"Generated a selfie with emotion: {context.get('emotion', 'neutral')}, at {context.get('location', 'a room')}"
        
        await cache_message(user_id, bot_id, "user", request.message)
        await cache_message(user_id, bot_id, "bot", bot_resp)

        from services.rabbitmq_service import publish_memory_task, publish_message_log
        background_tasks.add_task(
            publish_memory_task, user_id, bot_id, request.message, bot_resp
        )
        background_tasks.add_task(
            publish_message_log, user_id, bot_id, request.message, bot_resp,
            activity_type="image_gen", media_url=full_url
        )

        # Step 7: Award XP in background
        background_tasks.add_task(award_xp, user_id, bot_id, "selfie_generate")

        return ImageGenerationResponse(
            bot_id=bot_id,
            image_url=full_url,
            image_base64=image_base64,
            status="success",
            emotion_context=context,
            xp_earned=150,
        )

    except HTTPException:
        raise
    except RuntimeError as e:
        logger.error(f"Image generation runtime error: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Image generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STATUS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/status")
async def image_service_status():
    """Check if the image generation service (Gradio) is available."""
    from services.image_service import get_image_service

    service = get_image_service()
    return {
        "available": service.is_available,
        "current_space": service.current_space,
        "error_count": service.error_count,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DETECT EMOTION (utility endpoint)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.post("/detect-emotion")
async def detect_emotion(
    message: str,
    current_user: dict = Depends(get_current_user),
):
    """Detect emotion context from a message (utility endpoint)."""
    from services.image_service import extract_emotion_context
    context = await extract_emotion_context(message)
    return {"emotion_context": context, "status": "success"}
