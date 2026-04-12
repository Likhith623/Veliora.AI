"""
Veliora.AI — Voice Routes
Handles: voice note generation (REST), voice call streaming (WebSocket),
         voice call info (REST visible in Swagger).
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, WebSocket, WebSocketDisconnect
import logging
import asyncio
import json
from models.schemas import VoiceNoteRequest, VoiceNoteResponse
from pydantic import BaseModel
from api.auth import get_current_user
from config.mappings import get_voice_id, validate_language

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/voice", tags=["Voice"])


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# VOICE NOTE (REST — TTS Generation)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.post("/note", response_model=VoiceNoteResponse)
async def generate_voice_note(
    request: VoiceNoteRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate a voice note: LLM generates text → Cartesia TTS → audio MP3.
    Returns audio URL (stored in Supabase Storage) + text response.
    """
    from services.llm_engine import generate_chat_response
    from services.voice_service import generate_voice_note as tts_generate
    from services.redis_cache import has_active_session, load_session_from_supabase, cache_message
    from services.background_tasks import award_xp
    from bot_prompt import get_bot_prompt

    user_id = current_user["user_id"]
    bot_id = request.bot_id

# Validate voice exists
    voice_id = get_voice_id(bot_id)
    if not voice_id:
        raise HTTPException(status_code=400, detail="Unknown bot ID")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# RAW AUDIO GENERATOR (PlayAudio.jsx Component Support)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class RawAudioRequest(BaseModel):
    transcript: str
    bot_id: str
    output_format: dict = None

@router.post("/generate-audio")
async def raw_generate_audio(request: RawAudioRequest):
    """
    Stand-alone TTS generator for frontend components.
    Returns direct base64 audio payload to match CultureVo specs.
    """
    from services.voice_service import CARTESIA_API_URL
    from config.settings import get_settings
    from config.mappings import get_voice_id
    import httpx
    import base64

    settings = get_settings()
    voice_id = get_voice_id(request.bot_id)

    if not voice_id:
        raise HTTPException(status_code=400, detail="Unknown bot ID")

    headers = {
        "X-API-Key": settings.CARTESIA_API_KEY,
        "Cartesia-Version": "2024-06-10",
        "Content-Type": "application/json",
    }

    payload = {
        "model_id": settings.CARTESIA_MODEL,
        "transcript": request.transcript,
        "voice": {"mode": "id", "id": voice_id},
        "output_format": request.output_format or {
            "container": "wav",
            "encoding": "pcm_s16le",
            "sample_rate": 22050,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                CARTESIA_API_URL, headers=headers, json=payload
            )
            response.raise_for_status()
            audio_bytes = response.content

        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        return {"audio_base64": audio_b64}
    except Exception as e:
        logger.error(f"Raw audio generation failed: {e}")
        raise HTTPException(status_code=500, detail="TTS Failed")
        raise HTTPException(
            status_code=400,
            detail=f"No voice configured for bot '{bot_id}'. Voice notes are not available for this persona."
        )

    try:
        # Auto-load session if needed
        session_active = await has_active_session(user_id, bot_id)
        if not session_active:
            await load_session_from_supabase(user_id, bot_id)

        # Get context for response
        from services.redis_cache import get_context
        context = await get_context(user_id, bot_id)
        
        # Load Semantic Memory
        from services.llm_engine import generate_embedding
        from Redis_chat.working_files.memory_functions import get_semantically_similar_memories
        from services.redis_cache import get_redis_manager
        
        manager = get_redis_manager()
        emb = await generate_embedding(request.message)
        semantic_memory = None
        if emb:
            sims = await get_semantically_similar_memories(manager.client, user_id, bot_id, emb, k=3, bump_metadata=True)
            if sims:
                semantic_memory = [s["text"] for s in sims]

        # Generate text response from LLM
        system_prompt = get_bot_prompt(bot_id)
        if request.custom_bot_name:
            system_prompt = system_prompt.replace("your name", request.custom_bot_name)

        text_response = await generate_chat_response(
            system_prompt=system_prompt,
            context=context,
            user_message=request.message,
            semantic_memory=semantic_memory,
            language=request.language,
        )

        # Generate TTS audio
        audio_result = await tts_generate(text_response, bot_id, user_id)

        if not audio_result:
            raise HTTPException(
                status_code=500,
                detail="Voice note generation failed. TTS service may be unavailable."
            )

        # Cache messages in Redis
        await cache_message(user_id, bot_id, "user", request.message)
        await cache_message(user_id, bot_id, "bot", text_response)

        # Publish to RabbitMQ for memory extraction and Redis chat logging
        from services.rabbitmq_service import publish_memory_task, publish_message_log
        background_tasks.add_task(
            publish_memory_task, user_id, bot_id, request.message, text_response
        )
        background_tasks.add_task(
            publish_message_log, user_id, bot_id, request.message, text_response,
            activity_type="voice_note", media_url=audio_result["audio_url"]
        )

        # Award XP
        xp_result = await award_xp(user_id, bot_id, "voice_note_request")

        return VoiceNoteResponse(
            bot_id=bot_id,
            text_response=text_response,
            audio_url=audio_result["audio_url"],
            duration_seconds=audio_result.get("duration_seconds"),
            xp_earned=xp_result.get("total_earned", 75),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice note error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Voice note failed: {str(e)}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# VOICE CALL INFO (REST — Visible in Swagger)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/call/info")
async def voice_call_info():
    """
    Information about the WebSocket voice call endpoint.
    WebSocket endpoints are not visible in Swagger UI — use this REST endpoint
    to discover the connection details.

    **WebSocket URL**: `ws://host/api/voice/call`

    **Protocol**:
    1. Connect with query params: `?token=JWT_TOKEN&bot_id=BOT_ID`
    2. Send binary audio chunks (PCM 16-bit, 16kHz, mono) from microphone
    3. Receive binary audio chunks (PCM 32-bit float, 24kHz) for playback
    4. Send JSON `{"type": "end"}` to end the call

    **Audio Format**:
    - Input: PCM 16-bit signed integer, 16kHz sample rate, mono channel
    - Output: PCM 32-bit float, 24kHz sample rate, mono channel
    """
    return {
        "endpoint": "ws://<host>/api/voice/call",
        "protocol": "WebSocket",
        "auth": "Pass JWT token as query parameter: ?token=YOUR_TOKEN&bot_id=BOT_ID",
        "input_format": {
            "encoding": "pcm_s16le",
            "sample_rate": 16000,
            "channels": 1,
            "description": "Send raw PCM audio bytes from microphone"
        },
        "output_format": {
            "encoding": "pcm_f32le",
            "sample_rate": 24000,
            "channels": 1,
            "description": "Receive raw PCM audio bytes for speaker playback"
        },
        "commands": {
            "end_call": '{"type": "end"}',
        },
        "features": [
            "Real-time speech-to-text via Deepgram Nova-2",
            "AI response generation via Gemini 2.0 Flash",
            "Text-to-speech via Cartesia Sonic-2",
            "Triple-streaming pipeline for <500ms latency",
        ],
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# VOICE CALL (WebSocket — Real-Time Streaming)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.websocket("/call")
async def voice_call(websocket: WebSocket):
    """
    Real-time voice call via WebSocket.
    Triple-streaming: Deepgram STT → Gemini LLM → Cartesia TTS

    Connect with: ws://host/api/voice/call?token=JWT&bot_id=BOT_ID
    """
    from services.voice_service import DeepgramSTTStream, stream_tts_chunks
    from services.llm_engine import generate_chat_response_stream
    from services.redis_cache import cache_message
    from services.background_tasks import award_xp
    from bot_prompt import get_bot_prompt
    import jwt
    from config.settings import get_settings

    # ─── Extract auth from query params ───
    token = websocket.query_params.get("token")
    bot_id = websocket.query_params.get("bot_id")

    if not token or not bot_id:
        await websocket.close(code=4001, reason="Missing token or bot_id query params")
        return

    # Validate JWT
    settings = get_settings()
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")

        if alg == "ES256":
            from api.auth import _get_jwks_key
            kid = header.get("kid")
            public_key = await _get_jwks_key(kid, settings.SUPABASE_URL)
            if not public_key:
                await websocket.close(code=4001, reason="Invalid token")
                return
            payload = jwt.decode(token, public_key, algorithms=["ES256"], audience="authenticated")
        else:
            payload = jwt.decode(
                token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated"
            )

        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token: no subject")
            return
    except jwt.InvalidTokenError as e:
        await websocket.close(code=4001, reason=f"Auth failed: {str(e)}")
        return

    # Validate voice
    voice_id = get_voice_id(bot_id)
    if not voice_id:
        await websocket.close(code=4002, reason=f"No voice for bot {bot_id}")
        return

    await websocket.accept()
    logger.info(f"Voice call started: {user_id} ↔ {bot_id}")

    # Initialize STT
    stt = DeepgramSTTStream()
    try:
        await stt.connect()
    except Exception as e:
        logger.error(f"Deepgram connection failed: {e}")
        await websocket.send_json({"type": "error", "message": "Speech-to-text service unavailable"})
        await websocket.close()
        return

    from services.redis_cache import get_context, has_active_session, load_session_from_supabase
    if not await has_active_session(user_id, bot_id):
        await load_session_from_supabase(user_id, bot_id)
        
    call_context = await get_context(user_id, bot_id)

    system_prompt = get_bot_prompt(bot_id)
    call_active = True

    async def receive_audio():
        """Receive audio from client and forward to Deepgram STT."""
        nonlocal call_active
        try:
            while call_active:
                data = await websocket.receive()
                if "bytes" in data:
                    await stt.send_audio(data["bytes"])
                elif "text" in data:
                    msg = json.loads(data["text"])
                    if msg.get("type") == "end":
                        call_active = False
                        break
        except WebSocketDisconnect as e:
            logger.info(f"WebSocket disconnected with code: {e.code}")
            call_active = False
        except RuntimeError as e:
            if "disconnect" in str(e).lower():
                logger.info("Runtime error disconnect caught.")
                call_active = False
            else:
                logger.warning(f"Receive loop runtime error: {e}")
                call_active = False
        except Exception as e:
            logger.warning(f"Receive loop exception: {e}")
            call_active = False

    async def process_and_respond():
        """Get transcripts from STT → generate LLM response → stream TTS audio back."""
        nonlocal call_active
        while call_active:
            try:
                transcript = await stt.get_transcript(timeout=30.0)
                if not transcript:
                    continue
            except asyncio.TimeoutError:
                # Polling continues over periods of user silence
                continue
            except Exception as e:
                logger.warning(f"Voice call STT receive warning: {e}")
                continue

            # --- Process the transcript (was previously unreachable dead code) ---
            try:
                logger.info(f"User said: {transcript}")

                # Notify client of transcript
                await websocket.send_json({
                    "type": "transcript",
                    "text": transcript,
                    "role": "user",
                })

                # Add to context
                call_context.append({"role": "user", "content": transcript})

                # Fetch Semantic Memory
                from services.llm_engine import generate_embedding
                from Redis_chat.working_files.memory_functions import get_semantically_similar_memories
                from services.redis_cache import get_redis_manager
                manager = get_redis_manager()

                emb = await generate_embedding(transcript)
                semantic_memory = None
                if emb:
                    sims = await get_semantically_similar_memories(manager.client, user_id, bot_id, emb, k=3, bump_metadata=True)
                    if sims:
                        semantic_memory = [s["text"] for s in sims]

                # Generate streaming LLM response
                text_stream = generate_chat_response_stream(
                    system_prompt=system_prompt,
                    context=call_context[-10:],  # Last 10 messages
                    user_message=transcript,
                    semantic_memory=semantic_memory,
                )

                # Stream TTS audio
                full_response = ""
                async for audio_chunk in stream_tts_chunks(text_stream, bot_id):
                    if not call_active:
                        break
                    await websocket.send_bytes(audio_chunk)

                # Collect full text from what was streamed
                from services.llm_engine import generate_chat_response
                full_response = await generate_chat_response(
                    system_prompt=system_prompt,
                    context=call_context[-10:],
                    user_message=transcript,
                    semantic_memory=semantic_memory,
                )

                call_context.append({"role": "bot", "content": full_response})

                # Notify client that response is complete
                await websocket.send_json({
                    "type": "response_complete",
                    "text": full_response,
                    "role": "bot",
                })

                # Cache messages
                await cache_message(user_id, bot_id, "user", transcript)
                await cache_message(user_id, bot_id, "bot", full_response)

                # Trigger memory storage and message log for DB persistence
                from services.rabbitmq_service import publish_memory_task, publish_message_log
                publish_memory_task(user_id, bot_id, transcript, full_response)
                publish_message_log(user_id, bot_id, transcript, full_response, activity_type="voice_call")

            except Exception as e:
                logger.error(f"Response generation error: {e}")
                try:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Response generation failed",
                    })
                except Exception:
                    pass
                if not call_active:
                    break

    try:
        # Run both loops concurrently
        receive_task = asyncio.create_task(receive_audio())
        process_task = asyncio.create_task(process_and_respond())

        # Wait for either to finish (usually receive_audio when user sends "end")
        done, pending = await asyncio.wait(
            [receive_task, process_task],
            return_when=asyncio.FIRST_COMPLETED,
        )

        # Cancel remaining
        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    except Exception as e:
        logger.error(f"Voice call error: {e}")
    finally:
        await stt.close()

        # Award voice call XP
        try:
            await award_xp(user_id, bot_id, "voice_call_start")
        except Exception:
            pass

        logger.info(f"Voice call ended: {user_id} ↔ {bot_id}")

        try:
            await websocket.close()
        except Exception:
            pass
