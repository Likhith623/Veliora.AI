"""
Veliora.AI — Multimodal Routes
Image description, URL summarization, weather, meme generation.
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, UploadFile, File, Form
import httpx
import base64
import logging
from typing import Optional
from models.schemas import (
    ImageDescribeResponse, URLSummarizeRequest, URLSummarizeResponse,
    WeatherResponse, MemeRequest, MemeResponse,
)
from collections import defaultdict
from api.auth import get_current_user
from config.mappings import get_persona_origin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/multimodal", tags=["Multimodal"])


def _safe_format(template: str, **kwargs) -> str:
    """Safely format prompt template, ignoring missing keys and unmatched braces."""
    class SafeDict(defaultdict):
        def __missing__(self, key):
            return f"{{{key}}}"
    try:
        return template.format_map(SafeDict(str, **kwargs))
    except (ValueError, KeyError):
        for k, v in kwargs.items():
            template = template.replace(f"{{{k}}}", str(v))
        return template


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# IMAGE DESCRIPTION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.post("/describe-image", response_model=ImageDescribeResponse)
async def describe_image(
    background_tasks: BackgroundTasks,
    bot_id: str = Form(...),
    file: UploadFile = File(...),
    language: str = Form("english"),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload an image and get a description from the persona's perspective.
    Uses Gemini multimodal vision capabilities.
    """
    from services.llm_engine import describe_image as llm_describe
    from services.background_tasks import award_xp

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="Image must be under 10MB")

    image_b64 = base64.b64encode(file_bytes).decode("utf-8")

    user_id = current_user["user_id"]
    user_msg = f"User uploaded an image for description"

    # Fetch Semantic Memory
    from services.llm_engine import generate_embedding
    from Redis_chat.working_files.memory_functions import get_semantically_similar_memories
    from services.redis_cache import get_redis_manager
    manager = get_redis_manager()
    
    emb = await generate_embedding(user_msg)
    semantic_memory = None
    if emb:
        sims = await get_semantically_similar_memories(manager.client, user_id, bot_id, emb, k=3, bump_metadata=True)
        if sims:
            semantic_memory = [s["text"] for s in sims]

    description = await llm_describe(image_b64, bot_id, language, semantic_memory=semantic_memory)

    # Publish to memory pipeline
    from services.rabbitmq_service import publish_memory_task, publish_message_log
    user_msg = f"User uploaded an image for description"
    
    from services.redis_cache import cache_message, has_active_session, load_session_from_supabase
    
    if not await has_active_session(user_id, bot_id):
        await load_session_from_supabase(user_id, bot_id)
        
    await cache_message(user_id, bot_id, "user", user_msg)
    await cache_message(user_id, bot_id, "bot", description)

    publish_memory_task(user_id, bot_id, user_msg, description)
    publish_message_log(user_id, bot_id, user_msg, description, activity_type="image_describe")

    # Award XP
    xp_result = await award_xp(user_id, bot_id, "image_describe")

    return ImageDescribeResponse(
        description=description,
        bot_response=description,
        xp_earned=xp_result.get("total_earned", 50),
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# URL SUMMARIZATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.post("/summarize-url", response_model=URLSummarizeResponse)
async def summarize_url(
    request: URLSummarizeRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch content from a URL and summarize it in the persona's voice.
    Works with articles, YouTube info, and general web pages.
    """
    from services.llm_engine import summarize_url_content
    from services.background_tasks import award_xp

    # Fetch URL content
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(
                request.url,
                headers={"User-Agent": "Mozilla/5.0 Veliora.AI Bot"},
            )
            response.raise_for_status()

            # Extract text content (basic HTML stripping)
            content = response.text
            # Simple HTML tag removal for text extraction
            import re
            # Remove script and style elements
            content = re.sub(r'<script[^>]*>.*?</script>', '', content, flags=re.DOTALL)
            content = re.sub(r'<style[^>]*>.*?</style>', '', content, flags=re.DOTALL)
            # Remove HTML tags
            content = re.sub(r'<[^>]+>', ' ', content)
            # Clean whitespace
            content = re.sub(r'\s+', ' ', content).strip()

    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"Could not fetch URL: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"URL fetch error: {str(e)}")

    if not content or len(content) < 50:
        raise HTTPException(status_code=400, detail="Could not extract meaningful content from URL")

    user_id = current_user["user_id"]
    user_msg = f"User shared a URL: {request.url}"

    # Fetch Semantic Memory
    from services.llm_engine import generate_embedding
    from Redis_chat.working_files.memory_functions import get_semantically_similar_memories
    from services.redis_cache import get_redis_manager
    manager = get_redis_manager()
    
    emb = await generate_embedding(user_msg)
    semantic_memory = None
    if emb:
        sims = await get_semantically_similar_memories(manager.client, user_id, request.bot_id, emb, k=3, bump_metadata=True)
        if sims:
            semantic_memory = [s["text"] for s in sims]

    summary = await summarize_url_content(content, request.bot_id, request.language, semantic_memory=semantic_memory)

    # Publish to memory pipeline
    from services.rabbitmq_service import publish_memory_task, publish_message_log
    
    from services.redis_cache import cache_message, has_active_session, load_session_from_supabase
    
    if not await has_active_session(user_id, request.bot_id):
        await load_session_from_supabase(user_id, request.bot_id)

    await cache_message(user_id, request.bot_id, "user", user_msg)
    await cache_message(user_id, request.bot_id, "bot", summary)

    publish_memory_task(user_id, request.bot_id, user_msg, summary)
    publish_message_log(user_id, request.bot_id, user_msg, summary, activity_type="url_summary")

    # Award XP
    xp_result = await award_xp(user_id, request.bot_id, "url_summarize")

    return URLSummarizeResponse(
        url=request.url,
        summary=summary,
        bot_response=summary,
        xp_earned=xp_result.get("total_earned", 50),
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# WEATHER (Localized to Persona Origin)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WEATHER_API_URL = "https://wttr.in"  # Free, no API key required


@router.get("/weather/{bot_id}", response_model=WeatherResponse)
async def get_weather(
    bot_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    Get real-time weather for the persona's origin city.
    Uses wttr.in (free, no API key) and Gemini for persona commentary.
    """
    from services.llm_engine import generate_chat_response
    from services.background_tasks import award_xp
    from bot_prompt import get_bot_prompt
    from services.supabase_client import get_user_profile

    origin = get_persona_origin(bot_id)
    if not origin:
        raise HTTPException(status_code=404, detail=f"No origin city for bot: {bot_id}")

    city = origin["city"]
    country = origin["country"]

    # Fetch weather data
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{WEATHER_API_URL}/{city}",
                params={"format": "j1"},
                headers={"User-Agent": "curl/7.68.0"},
            )
            response.raise_for_status()
            weather_data = response.json()

        current = weather_data.get("current_condition", [{}])[0]
        temp_c = float(current.get("temp_C", 0))
        weather_desc = current.get("weatherDesc", [{}])[0].get("value", "unknown")
        feels_like = current.get("FeelsLikeC", temp_c)
        humidity = current.get("humidity", "?")

        weather_summary = (
            f"Weather in {city}: {weather_desc}, {temp_c}°C "
            f"(feels like {feels_like}°C), humidity {humidity}%"
        )

    except Exception as e:
        logger.warning(f"Weather fetch failed: {e}")
        temp_c = None
        weather_desc = "Unable to fetch weather data"
        weather_summary = f"Weather data for {city} is currently unavailable."

    # Generate persona commentary on the weather
    profile = await get_user_profile(current_user["user_id"])
    user_name = profile.get("name", "Friend") if profile else "Friend"

    raw_prompt = get_bot_prompt(bot_id)
    # FIX-4: Use _safe_format to handle literal braces in bot prompts
    system_prompt = _safe_format(
        raw_prompt,
        custom_bot_name=bot_id.replace("_", " ").title(),
        userName=user_name,
        userGender=profile.get("gender", "unknown") if profile else "unknown",
        traitsString="",
        languageString="english",
    )

    u_id = current_user["user_id"]
    from services.redis_cache import cache_message, has_active_session, load_session_from_supabase, get_context
    if not await has_active_session(u_id, bot_id):
        await load_session_from_supabase(u_id, bot_id)
        
    chat_context = await get_context(u_id, bot_id)
    
    user_msg = f"User asked about weather in {city}"
    
    # Fetch Semantic Memory
    from services.llm_engine import generate_embedding
    from Redis_chat.working_files.memory_functions import get_semantically_similar_memories
    from services.redis_cache import get_redis_manager
    manager = get_redis_manager()
    
    emb = await generate_embedding(user_msg)
    semantic_memory = None
    if emb:
        sims = await get_semantically_similar_memories(manager.client, u_id, bot_id, emb, k=3, bump_metadata=True)
        if sims:
            semantic_memory = [s["text"] for s in sims]

    commentary = await generate_chat_response(
        system_prompt=system_prompt,
        context=chat_context,
        user_message=f"Comment on today's weather: {weather_summary}. Be brief and in-character.",
        semantic_memory=semantic_memory,
    )

    # Publish to memory pipeline
    from services.rabbitmq_service import publish_memory_task, publish_message_log
    
    user_msg = f"User asked about weather in {city}"
    
    await cache_message(u_id, bot_id, "user", user_msg)
    await cache_message(u_id, bot_id, "bot", commentary)

    publish_memory_task(u_id, bot_id, user_msg, commentary)
    publish_message_log(u_id, bot_id, user_msg, commentary, activity_type="weather")

    # Award XP
    xp_result = await award_xp(current_user["user_id"], bot_id, "weather_check")

    return WeatherResponse(
        city=city,
        country=country,
        temperature=temp_c,
        description=weather_desc,
        bot_commentary=commentary,
        xp_earned=xp_result.get("total_earned", 25),
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MEME GENERATION (Text-only by default)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.post("/meme", response_model=MemeResponse)
async def generate_meme(
    request: MemeRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate a semantic meme in the persona's voice.
    Default: text-only meme. Image generation code is commented out below.
    """
    from services.llm_engine import generate_text_meme
    from services.background_tasks import award_xp

    u_id = current_user["user_id"]
    user_msg = f"User requested a meme about: {request.topic or 'random topic'}"
    
    # Fetch Semantic Memory
    from services.llm_engine import generate_embedding
    from Redis_chat.working_files.memory_functions import get_semantically_similar_memories
    from services.redis_cache import get_redis_manager
    manager = get_redis_manager()
    
    emb = await generate_embedding(user_msg)
    semantic_memory = None
    if emb:
        sims = await get_semantically_similar_memories(manager.client, u_id, request.bot_id, emb, k=3, bump_metadata=True)
        if sims:
            semantic_memory = [s["text"] for s in sims]

    meme_text = await generate_text_meme(
        request.bot_id, request.topic, request.language, semantic_memory=semantic_memory
    )

    # ─── Image Meme Generation (COMMENTED OUT — uncomment when budget allows) ───
    # image_url = None
    # try:
    #     from config.settings import get_settings
    #     settings = get_settings()
    #
    #     # Generate image prompt from meme text
    #     image_prompt = await generate_image_meme_prompt(request.bot_id, meme_text)
    #
    #     # Generate image via HuggingFace
    #     url = f"https://api-inference.huggingface.co/models/{settings.HF_IMAGE_MODEL}"
    #     headers = {"Authorization": f"Bearer {settings.HF_API_TOKEN}"}
    #
    #     async with httpx.AsyncClient(timeout=120.0) as client:
    #         response = await client.post(url, headers=headers, json={"inputs": image_prompt})
    #         if response.status_code == 503:
    #             import asyncio
    #             await asyncio.sleep(20)
    #             response = await client.post(url, headers=headers, json={"inputs": image_prompt})
    #         response.raise_for_status()
    #         image_bytes = response.content
    #
    #     # Upload to Supabase Storage
    #     import uuid
    #     from services.supabase_client import upload_to_storage
    #     filename = f"memes/{current_user['user_id']}/{uuid.uuid4().hex}.png"
    #     image_url = await upload_to_storage("memes", image_bytes, filename, "image/png")
    #
    # except Exception as e:
    #     logger.warning(f"Image meme generation failed (non-critical): {e}")
    #     image_url = None

    # Publish to memory pipeline
    from services.rabbitmq_service import publish_memory_task, publish_message_log
    from services.redis_cache import cache_message, has_active_session, load_session_from_supabase
    
    if not await has_active_session(u_id, request.bot_id):
        await load_session_from_supabase(u_id, request.bot_id)

    await cache_message(u_id, request.bot_id, "user", user_msg)
    await cache_message(u_id, request.bot_id, "bot", meme_text)

    publish_memory_task(u_id, request.bot_id, user_msg, meme_text)
    publish_message_log(u_id, request.bot_id, user_msg, meme_text, activity_type="meme")

    # Award XP
    xp_result = await award_xp(current_user["user_id"], request.bot_id, "meme_generate")

    return MemeResponse(
        text_meme=meme_text,
        # image_url=image_url,  # Uncomment when image generation is enabled
        xp_earned=xp_result.get("total_earned", 100),
    )
