"""Deepgram Speech-to-Text service.

Uses Deepgram's Nova-2 model for high-accuracy, real-time transcription.
Supports 30+ languages — perfect for Familia's cross-cultural chat.
Docs: https://developers.deepgram.com/docs
"""

import httpx
from realtime_communication.config import get_settings

DEEPGRAM_STT_URL = "https://api.deepgram.com/v1/listen"


async def transcribe_audio(
    audio_bytes: bytes,
    language: str = "en",
    mime_type: str = "audio/webm",
) -> dict:
    """Transcribe audio bytes to text using Deepgram Nova-2.

    Args:
        audio_bytes: Raw audio file bytes (webm, wav, mp3, ogg, etc.)
        language: BCP-47 language code (e.g. 'en', 'hi', 'pt', 'ja')
        mime_type: MIME type of the audio (default: audio/webm)

    Returns:
        {
            "transcript": "Hello, how are you?",
            "confidence": 0.98,
            "language": "en",
            "words": [{"word": "Hello", "start": 0.0, "end": 0.42}, ...]
        }
    """
    api_key = get_settings().DEEPGRAM_API_KEY
    if not api_key:
        return {
            "transcript": "",
            "confidence": 0,
            "language": language,
            "words": [],
            "error": "Deepgram API key not configured",
        }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                DEEPGRAM_STT_URL,
                headers={
                    "Authorization": f"Token {api_key}",
                    "Content-Type": mime_type,
                },
                params={
                    "model": "nova-2",
                    "language": language,
                    "punctuate": "true",
                    "smart_format": "true",
                },
                content=audio_bytes,
                timeout=30,
            )

            if resp.status_code == 200:
                data = resp.json()
                result = data.get("results", {})
                channels = result.get("channels", [])

                if channels:
                    alt = channels[0].get("alternatives", [{}])[0]
                    detected_lang = result.get("language", language)
                    return {
                        "transcript": alt.get("transcript", ""),
                        "confidence": alt.get("confidence", 0),
                        "language": detected_lang,
                        "words": alt.get("words", []),
                    }

            print(f"[Deepgram STT] {resp.status_code}: {resp.text[:200]}")

    except Exception as exc:
        print(f"[Deepgram STT] Exception: {exc}")

    return {
        "transcript": "",
        "confidence": 0,
        "language": language,
        "words": [],
        "error": "Transcription failed",
    }


async def transcribe_audio_auto_detect(
    audio_bytes: bytes,
    mime_type: str = "audio/webm",
) -> dict:
    """Transcribe audio with automatic language detection.

    Deepgram will detect the spoken language automatically.
    Useful when the sender's language is unknown.
    """
    api_key = get_settings().DEEPGRAM_API_KEY
    if not api_key:
        return {"transcript": "", "confidence": 0, "language": "en", "words": []}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                DEEPGRAM_STT_URL,
                headers={
                    "Authorization": f"Token {api_key}",
                    "Content-Type": mime_type,
                },
                params={
                    "model": "nova-2",
                    "detect_language": "true",
                    "punctuate": "true",
                    "smart_format": "true",
                },
                content=audio_bytes,
                timeout=30,
            )

            if resp.status_code == 200:
                data = resp.json()
                result = data.get("results", {})
                channels = result.get("channels", [])

                if channels:
                    alt = channels[0].get("alternatives", [{}])[0]
                    detected = channels[0].get("detected_language", "en")
                    return {
                        "transcript": alt.get("transcript", ""),
                        "confidence": alt.get("confidence", 0),
                        "language": detected,
                        "words": alt.get("words", []),
                    }

            print(f"[Deepgram STT auto] {resp.status_code}: {resp.text[:200]}")

    except Exception as exc:
        print(f"[Deepgram STT auto] Exception: {exc}")

    return {"transcript": "", "confidence": 0, "language": "en", "words": []}
