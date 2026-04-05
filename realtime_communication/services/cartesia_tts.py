"""Cartesia Text-to-Speech service.

Uses Cartesia's Sonic model for natural, expressive speech synthesis.
Supports multiple languages and voices — ideal for reading translated
messages aloud in Familia chat.
Docs: https://docs.cartesia.ai
"""

import httpx
from realtime_communication.config import get_settings

CARTESIA_TTS_URL = "https://api.cartesia.ai/tts/bytes"

# Curated voices for Familia's supported languages
# Each entry: voice_id from Cartesia's voice library
DEFAULT_VOICES = {
    "en": "a0e99841-438c-4a64-b679-ae501e7d6091",   # Barbershop Man (English)
    "es": "846d6cb0-2301-48b6-9571-fc77a6234e90",   # Spanish Female
    "fr": "a8a1eb38-5f15-4c1d-8722-7ac0f329f8f3",   # French Female
    "de": "fb26447f-308b-471e-8b00-8e9f04284eb5",   # German Male
    "pt": "700d1ee3-a641-4018-ba6e-899dcadc9e2b",   # Portuguese Male
    "ja": "2b568345-1d48-4f7e-9571-f5b5a0895b16",   # Japanese Female
    "ko": "663afeec-d082-4ab5-89c6-35117e3a42ed",   # Korean Female
    "hi": "d46abd1d-2571-44e3-ac3c-09483f0e7c15",   # Hindi Female
    "zh": "eda5bbff-1ff1-4b99-b912-8d3bfef4e2d8",   # Chinese Female
}


async def synthesize_speech(
    text: str,
    language: str = "en",
    voice_id: str | None = None,
    output_format: str = "mp3",
) -> dict:
    """Convert text to speech using Cartesia Sonic model.

    Args:
        text: The text to speak (max ~5000 chars recommended).
        language: ISO language code (used to pick a default voice).
        voice_id: Optional specific Cartesia voice ID override.
        output_format: 'mp3' or 'wav' (default: mp3).

    Returns:
        {
            "audio_bytes": b'...',       # raw audio data
            "content_type": "audio/mpeg",
            "language": "en",
            "success": True
        }
    """
    api_key = get_settings().CARTESIA_API_KEY
    if not api_key:
        return {
            "audio_bytes": b"",
            "content_type": "audio/mpeg",
            "language": language,
            "success": False,
            "error": "Cartesia API key not configured",
        }

    selected_voice = voice_id or DEFAULT_VOICES.get(language, DEFAULT_VOICES["en"])

    # Map output format to Cartesia's encoding parameter
    encoding_map = {
        "mp3": {"container": "mp3", "encoding": "mp3", "content_type": "audio/mpeg"},
        "wav": {"container": "wav", "encoding": "pcm_s16le", "content_type": "audio/wav"},
    }
    fmt = encoding_map.get(output_format, encoding_map["mp3"])

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                CARTESIA_TTS_URL,
                headers={
                    "X-API-Key": api_key,
                    "Cartesia-Version": "2024-06-10",
                    "Content-Type": "application/json",
                },
                json={
                    "model_id": "sonic-2",
                    "transcript": text,
                    "voice": {
                        "mode": "id",
                        "id": selected_voice,
                    },
                    "language": language,
                    "output_format": {
                        "container": fmt["container"],
                        "encoding": fmt["encoding"],
                        "sample_rate": 24000,
                    },
                },
                timeout=30,
            )

            if resp.status_code == 200:
                return {
                    "audio_bytes": resp.content,
                    "content_type": fmt["content_type"],
                    "language": language,
                    "success": True,
                }

            print(f"[Cartesia TTS] {resp.status_code}: {resp.text[:200]}")

    except Exception as exc:
        print(f"[Cartesia TTS] Exception: {exc}")

    return {
        "audio_bytes": b"",
        "content_type": fmt["content_type"],
        "language": language,
        "success": False,
        "error": "Speech synthesis failed",
    }


def get_available_voices() -> list[dict]:
    """Return the list of curated Familia voices by language."""
    return [
        {"language": lang, "voice_id": vid}
        for lang, vid in DEFAULT_VOICES.items()
    ]
