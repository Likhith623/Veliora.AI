"""
Veliora.AI — Voice Service (Cartesia TTS + Deepgram STT)
Handles: voice note generation, real-time voice call streaming.
Uses triple-streaming architecture for <500ms latency.
"""

import httpx
import base64
import logging
import json
from typing import Optional, AsyncGenerator
from config.settings import get_settings
from config.mappings import get_voice_id
from services.supabase_client import upload_to_storage

logger = logging.getLogger(__name__)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CARTESIA TTS — Voice Note Generation (REST API)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CARTESIA_API_URL = "https://api.cartesia.ai/tts/bytes"


async def generate_voice_note(
    text: str,
    bot_id: str,
    user_id: str,
) -> Optional[dict]:
    """
    Generate a TTS voice note using Cartesia REST API.
    Uploads the audio to Supabase Storage and returns the URL.
    
    Returns: {"audio_url": str, "duration_seconds": float}
    """
    settings = get_settings()
    voice_id = get_voice_id(bot_id)

    if not voice_id:
        logger.error(f"No voice ID found for bot: {bot_id}")
        return None

    headers = {
        "X-API-Key": settings.CARTESIA_API_KEY,
        "Cartesia-Version": "2024-06-10",
        "Content-Type": "application/json",
    }

    payload = {
        "model_id": settings.CARTESIA_MODEL,
        "transcript": text,
        "voice": {"mode": "id", "id": voice_id},
        "output_format": {
            "container": "mp3",
            "bit_rate": 128000,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                CARTESIA_API_URL, headers=headers, json=payload
            )
            response.raise_for_status()
            audio_bytes = response.content

        # Upload to Supabase Storage
        import uuid
        filename = f"voice_notes/{user_id}/{bot_id}/{uuid.uuid4().hex}.mp3"
        audio_url = await upload_to_storage(
            "voice-notes", audio_bytes, filename, "audio/mpeg"
        )

        # Estimate duration (rough: MP3 at 128kbps)
        duration = len(audio_bytes) / (128000 / 8)  # bytes / (bits_per_sec / 8)

        return {"audio_url": audio_url, "duration_seconds": round(duration, 1)}

    except Exception as e:
        logger.error(f"Voice note generation failed: {e}")
        return None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CARTESIA TTS — Streaming Audio Chunks (for Voice Calls)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CARTESIA_WS_URL = "wss://api.cartesia.ai/tts/websocket"


async def stream_tts_chunks(
    text_chunks: AsyncGenerator[str, None],
    bot_id: str,
) -> AsyncGenerator[bytes, None]:
    """
    Stream text chunks from Gemini into Cartesia WebSocket,
    yield raw audio chunks back as they arrive.
    
    This is the final leg of the triple-streaming pipeline:
    Deepgram STT → Gemini LLM (streaming) → Cartesia TTS (streaming)
    """
    import websockets

    settings = get_settings()
    voice_id = get_voice_id(bot_id)

    if not voice_id:
        logger.error(f"No voice ID for bot: {bot_id}")
        return

    ws_url = (
        f"{CARTESIA_WS_URL}"
        f"?api_key={settings.CARTESIA_API_KEY}"
        f"&cartesia_version=2024-06-10"
    )

    try:
        async with websockets.connect(ws_url) as ws:
            import uuid
            context_id = uuid.uuid4().hex

            accumulated_text = ""
            chunk_count = 0

            async for text_chunk in text_chunks:
                accumulated_text += text_chunk
                chunk_count += 1

                # Send text chunk to Cartesia
                message = {
                    "context_id": context_id,
                    "model_id": settings.CARTESIA_MODEL,
                    "transcript": text_chunk,
                    "voice": {"mode": "id", "id": voice_id},
                    "output_format": {
                        "container": "raw",
                        "encoding": "pcm_f32le",
                        "sample_rate": 24000,
                    },
                    "continue": True,
                }
                await ws.send(json.dumps(message))

                # Receive and yield audio chunks
                try:
                    while True:
                        response = await asyncio.wait_for(ws.recv(), timeout=0.1)
                        if isinstance(response, bytes):
                            yield response
                        else:
                            # JSON response (status/metadata)
                            data = json.loads(response)
                            if data.get("type") == "chunk":
                                audio_b64 = data.get("data")
                                if audio_b64:
                                    yield base64.b64decode(audio_b64)
                            elif data.get("done"):
                                break
                except asyncio.TimeoutError:
                    continue  # No audio yet, continue with next text chunk

            # Send final empty message to flush remaining audio
            final_message = {
                "context_id": context_id,
                "model_id": settings.CARTESIA_MODEL,
                "transcript": "",
                "voice": {"mode": "id", "id": voice_id},
                "output_format": {
                    "container": "raw",
                    "encoding": "pcm_f32le",
                    "sample_rate": 24000,
                },
                "continue": False,  # Signal end of input
            }
            await ws.send(json.dumps(final_message))

            # Drain remaining audio
            try:
                while True:
                    response = await asyncio.wait_for(ws.recv(), timeout=2.0)
                    if isinstance(response, bytes):
                        yield response
                    else:
                        data = json.loads(response)
                        if data.get("type") == "chunk":
                            audio_b64 = data.get("data")
                            if audio_b64:
                                yield base64.b64decode(audio_b64)
                        if data.get("done"):
                            break
            except asyncio.TimeoutError:
                pass

    except Exception as e:
        logger.error(f"TTS streaming failed: {e}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DEEPGRAM STT — Speech-to-Text via WebSocket
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import asyncio


class DeepgramSTTStream:
    """
    Manages a persistent Deepgram WebSocket connection for
    real-time speech-to-text during voice calls.
    """

    def __init__(self):
        self.ws = None
        self.transcript_queue: asyncio.Queue = asyncio.Queue()
        self._listen_task = None
        self._is_connected = False

    async def connect(self):
        """Establish WebSocket connection to Deepgram."""
        import websockets

        settings = get_settings()
        url = (
            "wss://api.deepgram.com/v1/listen"
            "?model=nova-2"
            "&language=multi"
            "&smart_format=true"
            "&interim_results=false"
            "&endpointing=300"
            "&utterance_end_ms=1000"
        )
        headers = {"Authorization": f"Token {settings.DEEPGRAM_API_KEY}"}

        self.ws = await websockets.connect(url, extra_headers=headers)
        self._is_connected = True
        self._listen_task = asyncio.create_task(self._listen_loop())
        logger.info("Deepgram STT WebSocket connected")

    async def _listen_loop(self):
        """Background task to receive transcripts from Deepgram."""
        try:
            async for message in self.ws:
                if isinstance(message, str):
                    data = json.loads(message)
                    # Check for final transcript
                    if data.get("type") == "Results":
                        channel = data.get("channel", {})
                        alternatives = channel.get("alternatives", [{}])
                        if alternatives:
                            transcript = alternatives[0].get("transcript", "").strip()
                            is_final = data.get("is_final", False)
                            if transcript and is_final:
                                await self.transcript_queue.put(transcript)
                                logger.debug(f"Deepgram transcript: {transcript}")
        except Exception as e:
            logger.warning(f"Deepgram listen loop ended: {e}")
        finally:
            self._is_connected = False

    async def send_audio(self, audio_bytes: bytes):
        """Send audio chunk to Deepgram for transcription."""
        if self.ws and self._is_connected:
            try:
                await self.ws.send(audio_bytes)
            except Exception as e:
                logger.warning(f"Failed to send audio to Deepgram: {e}")

    async def get_transcript(self, timeout: float = 10.0) -> Optional[str]:
        """Wait for the next final transcript from Deepgram."""
        try:
            return await asyncio.wait_for(
                self.transcript_queue.get(), timeout=timeout
            )
        except asyncio.TimeoutError:
            return None

    async def close(self):
        """Close the Deepgram WebSocket connection."""
        self._is_connected = False
        if self._listen_task:
            self._listen_task.cancel()
        if self.ws:
            try:
                # Send close signal to Deepgram
                await self.ws.send(json.dumps({"type": "CloseStream"}))
                await self.ws.close()
            except Exception:
                pass
        logger.info("Deepgram STT WebSocket closed")
