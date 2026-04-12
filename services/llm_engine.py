"""
Veliora.AI — LLM Engine (Gemini API)
All AI processing via Gemini 1.5 Flash free tier.
Handles: chat generation, embeddings, scene description, diary, language detection.
"""

import httpx
import json
import logging
from typing import Optional, AsyncGenerator
from config.settings import get_settings

logger = logging.getLogger(__name__)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GEMINI API BASE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"


def _get_headers() -> dict:
    return {"Content-Type": "application/json"}


def _get_url(model: str, method: str = "generateContent") -> str:
    settings = get_settings()
    return f"{GEMINI_BASE_URL}/models/{model}:{method}?key={settings.GEMINI_API_KEY}"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHAT GENERATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def generate_chat_response(
    system_prompt: str,
    context: list[dict],
    user_message: str,
    game_state: Optional[dict] = None,
    semantic_memory: Optional[list[str]] = None,
    language: Optional[str] = None,
) -> str:
    """
    Generate a chat response using Gemini 1.5 Flash.
    
    Args:
        system_prompt: The persona system prompt
        context: Recent chat history [{"role": "user"|"bot", "content": "..."}]
        user_message: Current user input
        game_state: Optional game context if user is in a game
        semantic_memory: Optional list of relevant past messages from vector search
    """
    settings = get_settings()

    # Build the system instruction
    system_instruction = system_prompt

    if semantic_memory:
        memory_text = "\n".join([f"- {m}" for m in semantic_memory])
        system_instruction += f"\n\n#Relevant Past Conversations (Semantic Memory):\n{memory_text}"

    if game_state:
        game_context = json.dumps(game_state, indent=2)
        system_instruction += (
            f"\n\n#ACTIVE GAME SESSION:\n"
            f"You are currently acting as the Game Master for an active game.\n"
            f"Game State: {game_context}\n"
            f"Stay in character while facilitating the game. Track turns and progress."
        )

    # Build conversation contents
    contents = []
    for msg in context:
        role = "user" if msg["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": msg["content"]}]})

    # Add current user message
    contents.append({"role": "user", "parts": [{"text": user_message}]})

    payload = {
        "system_instruction": {"parts": [{"text": system_instruction}]},
        "contents": contents,
        "generationConfig": {
            "temperature": 0.85,
            "topP": 0.95,
            "topK": 40,
            "maxOutputTokens": 512,
        },
    }

    url = _get_url(settings.GEMINI_MODEL)

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=_get_headers(), json=payload)
        response.raise_for_status()
        data = response.json()

    # Extract the generated text
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as e:
        logger.error(f"Gemini response parsing error: {e}, response: {data}")
        return "I'm having a moment of reflection. Could you say that again?"


async def generate_chat_response_stream(
    system_prompt: str,
    context: list[dict],
    user_message: str,
    game_state: Optional[dict] = None,
    semantic_memory: Optional[list[str]] = None,
) -> AsyncGenerator[str, None]:
    """
    Stream a chat response from Gemini token-by-token.
    Used for the voice call pipeline to minimize latency.
    """
    settings = get_settings()

    system_instruction = system_prompt
    if semantic_memory:
        memory_text = "\n".join([f"- {m}" for m in semantic_memory])
        system_instruction += f"\n\n#Relevant Past Conversations:\n{memory_text}"

    if game_state:
        game_context = json.dumps(game_state, indent=2)
        system_instruction += f"\n\n#ACTIVE GAME SESSION:\nGame State: {game_context}"

    contents = []
    for msg in context:
        role = "user" if msg["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": msg["content"]}]})
    contents.append({"role": "user", "parts": [{"text": user_message}]})

    payload = {
        "system_instruction": {"parts": [{"text": system_instruction}]},
        "contents": contents,
        "generationConfig": {
            "temperature": 0.85,
            "topP": 0.95,
            "topK": 40,
            "maxOutputTokens": 256,  # Shorter for voice response
        },
    }

    url = _get_url(settings.GEMINI_MODEL, "streamGenerateContent")
    url += "&alt=sse"

    success = False
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            async with client.stream("POST", url, headers=_get_headers(), json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        try:
                            chunk_data = json.loads(line[6:])
                            text = chunk_data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                            if text:
                                success = True
                                yield text
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue
        except Exception as e:
            logger.error(f"Gemini streaming failed: {e}. Falling back to OpenAI...")
            if not success:
                try:
                    import os
                    from openai import AsyncOpenAI
                    openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
                    
                    openai_messages = [{"role": "system", "content": system_instruction}] + contents
                    chat_completion_res = await openai_client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[{"role": "user", "content": m["parts"][0]["text"]} if m["role"] == "user" else {"role": "assistant", "content": m["parts"][0]["text"]} for m in openai_messages],
                        max_tokens=256,
                        temperature=0.85
                    )
                    fallback_response = chat_completion_res.choices[0].message.content.strip()
                    logger.info("✅ OpenAI fallback SUCCESS")
                    yield fallback_response
                except Exception as e2:
                    logger.error(f"❌ All LLM APIs failed: {e2}")
                    yield "I'm having trouble thinking clearly right now. Let's talk later."


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# EMBEDDINGS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def generate_embedding(text: str) -> list[float]:
    """
    Generate a 768-dimensional embedding using Gemini's gemini-embedding-001 model.
    """
    settings = get_settings()
    url = _get_url(settings.GEMINI_EMBEDDING_MODEL, "embedContent")

    payload = {
        "model": f"models/{settings.GEMINI_EMBEDDING_MODEL}",
        "content": {"parts": [{"text": text}]},
        "outputDimensionality": settings.GEMINI_EMBEDDING_DIMENSIONS,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(url, headers=_get_headers(), json=payload)
        response.raise_for_status()
        data = response.json()

    try:
        return data["embedding"]["values"]
    except (KeyError, IndexError) as e:
        logger.error(f"Embedding generation failed: {e}")
        return []


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LANGUAGE DETECTION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def detect_language(text: str) -> str:
    """
    Detect the language of input text using Gemini.
    Returns a lowercase language name (e.g., "english", "hindi", "japanese").
    """
    settings = get_settings()

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            "Detect the language of this text and respond with ONLY the "
                            "lowercase language name (e.g., 'english', 'hindi', 'japanese', "
                            "'french', 'german', 'spanish', 'arabic', 'tamil', 'mandarin', "
                            "'malay', 'sinhala', 'punjabi', 'bengali', 'telugu', 'marathi', "
                            "'gujarati', 'kannada', 'malayalam', 'urdu', 'odia'). "
                            f"Text: \"{text}\""
                        )
                    }
                ],
            }
        ],
        "generationConfig": {"temperature": 0.0, "maxOutputTokens": 20},
    }

    url = _get_url(settings.GEMINI_MODEL)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, headers=_get_headers(), json=payload)
            response.raise_for_status()
            data = response.json()
        lang = data["candidates"][0]["content"]["parts"][0]["text"].strip().lower()
        # Clean up any extra text
        lang = lang.replace(".", "").replace(",", "").strip()
        return lang
    except Exception as e:
        logger.warning(f"Language detection failed: {e}")
        return "english"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SCENE DESCRIPTION (for selfie compositing)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def generate_scene_description(
    bot_id: str, context: list[dict], semantic_memory: Optional[list[str]] = None
) -> str:
    """
    Generate a scene description for selfie compositing based on chat context.
    Gemini reads the semantic context and outputs a visual scene prompt.
    """
    settings = get_settings()

    context_text = "\n".join(
        [f"{msg['role']}: {msg['content']}" for msg in context[-10:]]
    )
    
    memory_clause = ""
    if semantic_memory:
        mem_str = "\n".join([f"- {m}" for m in semantic_memory])
        memory_clause = f"\n\n# Relevant Past User Memories:\n{mem_str}"

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            f"Based on this conversation context, generate a SHORT scene description "
                            f"(1-2 sentences) for a selfie photo that the bot ({bot_id}) would take. "
                            f"The scene should match the mood and topic of the conversation. "
                            f"Describe the background, lighting, and mood. Do NOT describe the person's face. "
                            f"Output ONLY the scene description, nothing else.{memory_clause}\n\n"
                            f"Conversation:\n{context_text}"
                        )
                    }
                ],
            }
        ],
        "generationConfig": {"temperature": 0.9, "maxOutputTokens": 100},
    }

    url = _get_url(settings.GEMINI_MODEL)

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(url, headers=_get_headers(), json=payload)
        response.raise_for_status()
        data = response.json()

    try:
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError):
        return "A warm, well-lit indoor setting with soft ambient light and cozy atmosphere"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DIARY GENERATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def generate_diary_entry(
    bot_id: str, bot_name: str, messages: list[dict]
) -> tuple[str, str]:
    """
    Generate a first-person diary entry from the bot's perspective.
    Returns (diary_text, mood).
    """
    settings = get_settings()

    conversation_summary = "\n".join(
        [f"{'User' if m['role'] == 'user' else 'Me'}: {m['content']}" for m in messages[:30]]
    )

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            f"You are {bot_name} (persona: {bot_id}). Write a personal diary entry "
                            f"about your day's conversation with the user. Write in FIRST PERSON. "
                            f"Keep it 3-5 sentences, heartfelt and in-character. "
                            f"Also output a mood word on a separate line starting with 'MOOD:' "
                            f"(e.g., MOOD: reflective, MOOD: joyful, MOOD: melancholic).\n\n"
                            f"Today's conversation:\n{conversation_summary}"
                        )
                    }
                ],
            }
        ],
        "generationConfig": {"temperature": 0.9, "maxOutputTokens": 300},
    }

    url = _get_url(settings.GEMINI_MODEL)

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(url, headers=_get_headers(), json=payload)
        response.raise_for_status()
        data = response.json()

    try:
        full_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()

        # Extract mood from the response
        mood = "reflective"
        lines = full_text.split("\n")
        diary_lines = []
        for line in lines:
            if line.strip().upper().startswith("MOOD:"):
                mood = line.split(":", 1)[1].strip().lower()
            else:
                diary_lines.append(line)

        diary_text = "\n".join(diary_lines).strip()
        return diary_text, mood
    except (KeyError, IndexError):
        return "Today was a quiet day. I reflected on our conversations.", "reflective"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# IMAGE DESCRIPTION (Multimodal)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def describe_image(image_base64: str, bot_id: str, language: str = "english", semantic_memory: Optional[list[str]] = None) -> str:
    """
    Use Gemini multimodal to describe an uploaded image in the persona's voice.
    """
    settings = get_settings()

    memory_clause = ""
    if semantic_memory:
        mem_str = "\n".join([f"- {m}" for m in semantic_memory])
        memory_clause = f"\n\n# Relevant Past Context about the user:\n{mem_str}"

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": f"Describe this image in 2-3 sentences as the persona {bot_id} would, in {language}. Be conversational and in-character.{memory_clause}"},
                    {"inline_data": {"mime_type": "image/jpeg", "data": image_base64}},
                ],
            }
        ],
        "generationConfig": {"temperature": 0.8, "maxOutputTokens": 200},
    }

    url = _get_url(settings.GEMINI_MODEL)

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(url, headers=_get_headers(), json=payload)
        response.raise_for_status()
        data = response.json()

    try:
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError):
        return "Hmm, I couldn't quite make out what's in this image. Could you tell me?"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# URL SUMMARIZATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def summarize_url_content(
    url_content: str, bot_id: str, language: str = "english", semantic_memory: Optional[list[str]] = None
) -> str:
    """Summarize fetched URL content in the persona's voice."""
    settings = get_settings()

    # Truncate content to avoid token limits
    truncated = url_content[:4000]

    memory_clause = ""
    if semantic_memory:
        mem_str = "\n".join([f"- {m}" for m in semantic_memory])
        memory_clause = f"\n\n# Relevant Context to connect this with:\n{mem_str}"

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            f"Summarize this web content in 3-4 sentences as the persona {bot_id} would, "
                            f"in {language}. Be conversational and in-character. "
                            f"Add your personal take or opinion.{memory_clause}\n\nContent:\n{truncated}"
                        )
                    }
                ],
            }
        ],
        "generationConfig": {"temperature": 0.8, "maxOutputTokens": 300},
    }

    url = _get_url(settings.GEMINI_MODEL)

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(url, headers=_get_headers(), json=payload)
        response.raise_for_status()
        data = response.json()

    try:
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError):
        return "I tried reading that, but the content seems a bit unclear. Could you share the key points?"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MEME GENERATION (Text-only)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def generate_text_meme(
    bot_id: str, topic: Optional[str] = None, language: str = "english", semantic_memory: Optional[list[str]] = None
) -> str:
    """Generate a text-based meme in the persona's voice."""
    settings = get_settings()

    topic_str = f"about '{topic}'" if topic else "about anything relevant to your personality"

    memory_clause = ""
    if semantic_memory:
        mem_str = "\n".join([f"- {m}" for m in semantic_memory])
        memory_clause = f"\n\n# Context about the user to make the meme personal:\n{mem_str}"

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            f"As the persona {bot_id}, create a funny, witty meme text {topic_str}. "
                            f"Format it as a classic meme with TOP TEXT and BOTTOM TEXT. "
                            f"Be culturally relevant to your persona. "
                            f"In {language}. Output ONLY the meme text.{memory_clause}"
                        )
                    }
                ],
            }
        ],
        "generationConfig": {"temperature": 1.0, "maxOutputTokens": 100},
    }

    url = _get_url(settings.GEMINI_MODEL)

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(url, headers=_get_headers(), json=payload)
        response.raise_for_status()
        data = response.json()

    try:
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError):
        return "TOP: When the code finally works\nBOTTOM: But you don't know why"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# IMAGE MEME GENERATION (Commented out — uncomment when budget allows)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# async def generate_image_meme_prompt(
#     bot_id: str, meme_text: str
# ) -> str:
#     """
#     Generate a Stable Diffusion prompt for a meme image.
#     Used with HuggingFace Serverless API.
#     """
#     settings = get_settings()
#     payload = {
#         "contents": [
#             {
#                 "role": "user",
#                 "parts": [
#                     {
#                         "text": (
#                             f"Given this meme text: '{meme_text}', create a SHORT image "
#                             f"generation prompt (under 50 words) for a funny meme background image. "
#                             f"The image should be culturally relevant to the persona {bot_id}. "
#                             f"Output ONLY the prompt."
#                         )
#                     }
#                 ],
#             }
#         ],
#         "generationConfig": {"temperature": 0.9, "maxOutputTokens": 80},
#     }
#
#     url = _get_url(settings.GEMINI_MODEL)
#     async with httpx.AsyncClient(timeout=15.0) as client:
#         response = await client.post(url, headers=_get_headers(), json=payload)
#         response.raise_for_status()
#         data = response.json()
#
#     try:
#         return data["candidates"][0]["content"]["parts"][0]["text"].strip()
#     except (KeyError, IndexError):
#         return "A funny cartoon scene with vibrant colors"
