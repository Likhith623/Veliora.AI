"""Voice router — Speech-to-Text (Deepgram) & Text-to-Speech (Cartesia).

POST /voice/transcribe   → upload audio, get text back
POST /voice/speak        → send text, get audio back
GET  /voice/voices       → list available TTS voices
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional

from realtime_communication.services.deepgram_stt import transcribe_audio, transcribe_audio_auto_detect
from realtime_communication.services.cartesia_tts import synthesize_speech, get_available_voices

router = APIRouter(prefix="/voice", tags=["Voice"])


# ─── Request / Response models ─────────────────────────────────────────────────

class SpeakRequest(BaseModel):
    text: str
    language: str = "en"
    voice_id: Optional[str] = None
    output_format: str = "mp3"


# ─── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None),
):
    """Transcribe an uploaded audio file to text.

    - If `language` is provided, Deepgram uses that language model.
    - If omitted, Deepgram auto-detects the spoken language.
    """
    audio_bytes = await audio.read()

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    mime = audio.content_type or "audio/webm"

    if language:
        result = await transcribe_audio(audio_bytes, language=language, mime_type=mime)
    else:
        result = await transcribe_audio_auto_detect(audio_bytes, mime_type=mime)

    if result.get("error"):
        raise HTTPException(status_code=502, detail=result["error"])

    return {
        "transcript": result["transcript"],
        "confidence": result["confidence"],
        "detected_language": result["language"],
        "words": result.get("words", []),
    }


@router.post("/speak")
async def speak(req: SpeakRequest):
    """Convert text to speech and return audio bytes.

    Returns raw audio (audio/mpeg or audio/wav) — 
    the frontend can play it directly via an <audio> element or Web Audio API.
    """
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    result = await synthesize_speech(
        text=req.text,
        language=req.language,
        voice_id=req.voice_id,
        output_format=req.output_format,
    )

    if not result["success"]:
        raise HTTPException(status_code=502, detail=result.get("error", "TTS failed"))

    return Response(
        content=result["audio_bytes"],
        media_type=result["content_type"],
        headers={"Content-Disposition": f'inline; filename="speech.{req.output_format}"'},
    )


@router.get("/voices")
async def list_voices():
    """List available TTS voices by language."""
    return {"voices": get_available_voices()}
