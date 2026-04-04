"""
Veliora.AI — Multimodal Routes
Image description, URL summarization, weather, meme generation.
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, UploadFile, File
import httpx
import base64
import logging
from typing import Optional
from models.schemas import (
    ImageDescribeResponse, URLSummarizeRequest, URLSummarizeResponse,
    WeatherResponse, MemeRequest, MemeResponse,
)
from api.auth import get_current_user
from config.mappings import get_persona_origin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/multimodal", tags=["Multimodal"])


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# IMAGE DESCRIPTION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.post("/describe-image", response_model=ImageDescribeResponse)
async def describe_image(
    bot_id: str,
    file: UploadFile = File(...),
    language: str = "english",
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

    description = await llm_describe(image_b64, bot_id, language)

    # Award XP
    xp_result = await award_xp(current_user["user_id"], bot_id, "image_describe")

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

    summary = await summarize_url_content(content, request.bot_id, request.language)

    # Award XP
    xp_result = await award_xp(current_user["user_id"], request.bot_id, "url_summarize")

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
    try:
        system_prompt = raw_prompt.format(
            custom_bot_name=bot_id.replace("_", " ").title(),
            userName=user_name,
            userGender=profile.get("gender", "unknown") if profile else "unknown",
            traitsString="",
            languageString="english",
        )
    except Exception:
        system_prompt = f"You are {bot_id}. Be conversational."

    commentary = await generate_chat_response(
        system_prompt=system_prompt,
        context=[],
        user_message=f"Comment on today's weather: {weather_summary}. Be brief and in-character.",
    )

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
    current_user: dict = Depends(get_current_user),
):
    """
    Generate a semantic meme in the persona's voice.
    Default: text-only meme. Image generation code is commented out below.
    """
    from services.llm_engine import generate_text_meme
    from services.background_tasks import award_xp
    # from services.llm_engine import generate_image_meme_prompt  # Uncomment for image memes

    meme_text = await generate_text_meme(
        request.bot_id, request.topic, request.language
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

    # Award XP
    xp_result = await award_xp(current_user["user_id"], request.bot_id, "meme_generate")

    return MemeResponse(
        text_meme=meme_text,
        # image_url=image_url,  # Uncomment when image generation is enabled
        xp_earned=xp_result.get("total_earned", 100),
    )
