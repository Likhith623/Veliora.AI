"""
Veliora.AI — Image Generation Service
Selfie generation using Gradio FaceID space with Gemini emotion extraction.

Ported from image-generation/main.py — integrated into the main backend.
- Uses main backend's .env (no separate .env)
- Uses main backend's Supabase client
- Serves images on localhost:8000/static/images/
- Uses httpx + Gemini API for emotion extraction (replaces litellm)
"""

import os
import re
import json
import logging
import asyncio
import uuid
import base64
import time
import random
from typing import Optional, Dict
import httpx

from config.settings import get_settings

logger = logging.getLogger(__name__)

# Configuration
GRADIO_TIMEOUT = int(os.environ.get("GRADIO_TIMEOUT", "120"))
HTTP_TIMEOUT = int(os.environ.get("HTTP_TIMEOUT", "90"))
MAX_RETRIES = int(os.environ.get("MAX_RETRIES", "3"))
CONNECTION_TIMEOUT = int(os.environ.get("CONNECTION_TIMEOUT", "45"))

FALLBACK_SPACES = [
    "multimodalart/Ip-Adapter-FaceID",
]

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PHOTOS DIRECTORY — Bot face images
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Photos are in image-generation/photos/ relative to project root
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTOS_DIR = os.path.join(_PROJECT_ROOT, "image-generation", "photos")
STATIC_IMAGES_DIR = os.path.join(_PROJECT_ROOT, "static", "images")

# Ensure static/images exists
os.makedirs(STATIC_IMAGES_DIR, exist_ok=True)


def find_base_image(bot_id: str) -> Optional[str]:
    """Find the base face image for a bot_id in the photos directory."""
    if not os.path.isdir(PHOTOS_DIR):
        logger.error(f"Photos directory not found: {PHOTOS_DIR}")
        return None

    for ext in [".jpeg", ".jpg", ".png", ".webp"]:
        potential = os.path.join(PHOTOS_DIR, f"{bot_id}{ext}")
        if os.path.exists(potential):
            return potential
    return None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# EMOTION CONTEXT EXTRACTION (replaces litellm)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def extract_emotion_context(text: str) -> Dict[str, str]:
    """Extract emotion, location, action from text using Gemini."""
    settings = get_settings()
    prompt = f"""
    Analyze the following text and extract emotional context information.
    Return ONLY a valid JSON object with exactly these three keys: emotion, location, action.
    
    Text: "{text}"
    
    Example response:
    {{"emotion": "happy", "location": "a room", "action": "smiling"}}
    """

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"

    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 100},
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
            resp.raise_for_status()
            data = resp.json()

        content = data["candidates"][0]["content"]["parts"][0]["text"]
        # Strip markdown code fences
        cleaned = re.sub(r'```json\s*|\s*```', '', content).strip()
        # Extract JSON object if there's surrounding text
        json_match = re.search(r'\{[^}]+\}', cleaned)
        if json_match:
            cleaned = json_match.group()
        result = json.loads(cleaned)

        return {
            "emotion": result.get("emotion") or "neutral",
            "location": result.get("location") or "a room",
            "action": result.get("action") or "looking at camera",
        }
    except Exception as e:
        logger.warning(f"Context extraction failed: {e}")
        return {"emotion": "neutral", "location": "a room", "action": "looking at camera"}


async def get_bot_quick_response(bot_id: str, message: str) -> str:
    """Get a quick bot emotional reaction for context extraction."""
    settings = get_settings()
    bot_name = bot_id.replace("_", " ").title()

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": f"You are {bot_name}. React briefly showing emotion to: {message}"}]}
        ],
        "generationConfig": {"temperature": 0.8, "maxOutputTokens": 50},
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
            resp.raise_for_status()
            data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        logger.error(f"Quick response failed: {e}")
        return f"{bot_name} is thinking: '{message}'"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GRADIO IMAGE GENERATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class ImageGenerationService:
    """Manages Gradio client connection and image generation."""

    def __init__(self):
        self.gradio_client = None
        self.current_space = None
        self.client_lock = asyncio.Lock()
        self.last_error_time = 0
        self.error_count = 0
        self.max_errors = 5
        self.error_reset_interval = 300
        self.shutdown_event = asyncio.Event()

    def _check_error_threshold(self) -> bool:
        current_time = time.time()
        if current_time - self.last_error_time > self.error_reset_interval:
            self.error_count = 0
        return self.error_count < self.max_errors

    def _record_error(self):
        self.error_count += 1
        self.last_error_time = time.time()

    async def initialize_gradio_client(self) -> bool:
        """Initialize Gradio client with fallback spaces."""
        async with self.client_lock:
            if not self._check_error_threshold():
                logger.error("Too many Gradio errors, skipping init")
                return False

            for space in FALLBACK_SPACES:
                if self.shutdown_event.is_set():
                    return False

                try:
                    from gradio_client import Client
                    logger.info(f"Connecting to Gradio space: {space}")

                    client_task = asyncio.create_task(
                        asyncio.to_thread(Client, space)
                    )
                    try:
                        self.gradio_client = await asyncio.wait_for(
                            client_task, timeout=CONNECTION_TIMEOUT
                        )
                    except asyncio.TimeoutError:
                        client_task.cancel()
                        logger.warning(f"Gradio connection to {space} timed out")
                        continue

                    self.current_space = space
                    logger.info(f"Connected to Gradio space: {space}")

                    # Verify
                    try:
                        await asyncio.wait_for(
                            asyncio.to_thread(self.gradio_client.view_api),
                            timeout=10.0
                        )
                        logger.info(f"Gradio client verified: {space}")
                        return True
                    except Exception as e:
                        logger.warning(f"Gradio verification failed: {e}")
                        self.gradio_client = None
                        continue

                except Exception as e:
                    logger.warning(f"Gradio connection failed for {space}: {e}")
                    continue

            logger.error("Failed to connect to any Gradio space")
            self.gradio_client = None
            self.current_space = None
            self._record_error()
            return False

    async def generate_selfie(
        self, bot_id: str, base_image_path: str, context: Dict[str, str]
    ) -> tuple[str, str]:
        """
        Generate a selfie image using Gradio FaceID.

        Args:
            bot_id: The bot persona ID
            base_image_path: Path to the bot's face reference image
            context: Dict with emotion, location, action

        Returns:
            (relative_url, base64_encoded_image)
        """
        if not self.gradio_client:
            success = await self.initialize_gradio_client()
            if not success:
                raise RuntimeError("Gradio image service unavailable")

        from gradio_client import handle_file

        bot_name = bot_id.replace("_", " ").title()
        prompt_text = (
            f"Close-up portrait of a person like reference image, {context.get('emotion', 'neutral')}, "
            f"{context.get('action', 'looking at camera')}, at {context.get('location', 'a room')}. "
            f"The person's name is {bot_name}. Ultra-detailed, cinematic."
        )

        last_error = None
        for attempt in range(MAX_RETRIES):
            try:
                logger.info(f"Image gen attempt {attempt + 1}/{MAX_RETRIES}")

                gradio_task = asyncio.create_task(
                    asyncio.to_thread(
                        self.gradio_client.predict,
                        images=[handle_file(base_image_path)],
                        prompt=prompt_text,
                        negative_prompt="nsfw, low quality, deformed, ugly, blurry",
                        api_name="/generate_image",
                    )
                )

                result = await asyncio.wait_for(gradio_task, timeout=GRADIO_TIMEOUT)

                if not result or not isinstance(result, list) or len(result) == 0:
                    raise ValueError("Empty Gradio result")

                # Extract temp path
                if isinstance(result[0], dict) and "image" in result[0]:
                    temp_path = result[0]["image"]
                elif isinstance(result[0], str):
                    temp_path = result[0]
                else:
                    temp_path = result[0]

                if not os.path.exists(temp_path):
                    raise ValueError(f"Generated file not found: {temp_path}")

                with open(temp_path, "rb") as f:
                    image_bytes = f.read()

                if len(image_bytes) == 0:
                    raise ValueError("Generated image is empty")

                image_base64 = base64.b64encode(image_bytes).decode("utf-8")

                unique_filename = f"{uuid.uuid4()}.png"
                output_path = os.path.join(STATIC_IMAGES_DIR, unique_filename)
                with open(output_path, "wb") as f:
                    f.write(image_bytes)

                relative_url = f"/static/images/{unique_filename}"
                logger.info(f"Image saved: {output_path}")
                return relative_url, image_base64

            except asyncio.TimeoutError:
                last_error = f"Timeout after {GRADIO_TIMEOUT}s"
                logger.warning(f"Attempt {attempt + 1} timed out")
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Attempt {attempt + 1} failed: {e}")

            if attempt < MAX_RETRIES - 1:
                delay = min((2 ** attempt) + random.uniform(0, 1), 10)
                logger.info(f"Retrying in {delay:.2f}s...")
                await asyncio.sleep(delay)

        self._record_error()
        raise RuntimeError(f"Image generation failed after {MAX_RETRIES} attempts. Last error: {last_error}")

    @property
    def is_available(self) -> bool:
        return self.gradio_client is not None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SINGLETON
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

_image_service: Optional[ImageGenerationService] = None


def get_image_service() -> ImageGenerationService:
    """Get or create the image generation service singleton."""
    global _image_service
    if _image_service is None:
        _image_service = ImageGenerationService()
    return _image_service
