"""
Veliora.AI — Voice Routes
POST /voice/note: Generate TTS voice note, upload to storage, return URL
WS   /voice/call: Bidirectional real-time voice call
     Triple-streaming: Deepgram STT → Gemini (streaming) → Cartesia TTS (streaming)
"""

from collections import defaultdict
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, WebSocket, WebSocketDisconnect
import asyncio
import json
import logging
from config.mappings import XP_REWARDS
from models.schemas import VoiceNoteRequest, VoiceNoteResponse
from api.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/voice", tags=["Voice"])


def _safe_format(template: str, **kwargs) -> str:
    """Safely format prompt template, ignoring missing keys."""
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
# VOICE NOTE (REST endpoint — in-chat TTS)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.post("/note", response_model=VoiceNoteResponse)
async def generate_voice_note(
    request: VoiceNoteRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate a voice note from text input.
    1. Generate bot's text response via Gemini
    2. Convert text to speech via Cartesia
    3. Upload audio to Supabase Storage
    4. Return the audio URL and text
    
    Both the user query and bot response text are stored in messages.
    """
    from services.llm_engine import generate_chat_response
    from services.voice_service import generate_voice_note as gen_voice
    from services.redis_cache import load_context, append_message, warm_cache_from_db
    from services.background_tasks import sync_message_to_db, award_xp
    from services.supabase_client import get_user_profile
    from bot_prompt import get_bot_prompt
    from config.mappings import validate_language, get_supported_languages

    user_id = current_user["user_id"]

    # Validate language
    if not validate_language(request.bot_id, request.language):
        supported = get_supported_languages(request.bot_id)
        raise HTTPException(
            status_code=400,
            detail=f"Language '{request.language}' not supported. Supported: {supported}"
        )

    # Load context (warm from DB on first entry)
    context = await load_context(user_id, request.bot_id)
    if not context:
        context = await warm_cache_from_db(user_id, request.bot_id)

    # Get user profile for personalization
    profile = await get_user_profile(user_id)
    user_name = profile.get("name", "Friend") if profile else "Friend"
    user_gender = profile.get("gender", "unknown") if profile else "unknown"

    # Build prompt
    raw_prompt = get_bot_prompt(request.bot_id)
    system_prompt = _safe_format(
        raw_prompt,
        custom_bot_name=request.custom_bot_name or request.bot_id.replace("_", " ").title(),
        userName=user_name,
        userGender=user_gender,
        traitsString=request.traits or "",
        languageString=request.language,
    )

    # Generate text response
    bot_text = await generate_chat_response(
        system_prompt=system_prompt,
        context=context,
        user_message=request.message,
    )

    # Generate voice note
    voice_result = await gen_voice(bot_text, request.bot_id, user_id)
    if not voice_result:
        raise HTTPException(status_code=500, detail="Voice generation failed")

    # Store both user and bot messages in background
    background_tasks.add_task(append_message, user_id, request.bot_id, "user", request.message)
    background_tasks.add_task(append_message, user_id, request.bot_id, "bot", bot_text)
    background_tasks.add_task(
        sync_message_to_db, user_id, request.bot_id, "user", request.message, request.language
    )
    background_tasks.add_task(
        sync_message_to_db, user_id, request.bot_id, "bot", bot_text, request.language
    )

    # Award XP
    xp_result = await award_xp(user_id, request.bot_id, "voice_note_request")

    return VoiceNoteResponse(
        bot_id=request.bot_id,
        text_response=bot_text,
        audio_url=voice_result["audio_url"],
        duration_seconds=voice_result.get("duration_seconds"),
        xp_earned=xp_result.get("total_earned", 75),
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# REAL-TIME VOICE CALL (WebSocket)
# Triple-streaming: Deepgram → Gemini (streaming) → Cartesia (streaming)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.websocket("/call")
async def voice_call(websocket: WebSocket):
    """
    Bidirectional WebSocket for real-time voice calls.
    
    Protocol:
    1. Client connects with ?token=<jwt>&bot_id=<bot_id>
    2. Client streams audio chunks (binary) to server
    3. Server → Deepgram (STT) → Gemini (streaming LLM) → Cartesia (streaming TTS)
    4. Server sends audio chunks (binary) back to client in real-time
    5. Server also sends JSON metadata: {"type": "transcript|response_text|status", ...}
    """
    import jwt as pyjwt
    from config.settings import get_settings
    from services.voice_service import DeepgramSTTStream, stream_tts_chunks
    from services.llm_engine import generate_chat_response_stream
    from services.redis_cache import (
        load_context, append_message, set_voice_call_active, clear_voice_call,
        warm_cache_from_db,
    )
    from services.background_tasks import sync_message_to_db, award_xp
    from services.supabase_client import get_user_profile
    from bot_prompt import get_bot_prompt

    settings = get_settings()

    # ─── Authenticate via query params ───
    token = websocket.query_params.get("token")
    bot_id = websocket.query_params.get("bot_id")

    if not token or not bot_id:
        await websocket.close(code=4001, reason="Missing token or bot_id")
        return

    try:
        payload = pyjwt.decode(
            token, settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"], audience="authenticated",
        )
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except Exception:
        await websocket.close(code=4001, reason="Authentication failed")
        return

    await websocket.accept()
    logger.info(f"Voice call started: user={user_id}, bot={bot_id}")

    # ─── Initialize components ───
    deepgram_stt = DeepgramSTTStream()
    call_minutes = 0
    call_start = asyncio.get_event_loop().time()

    try:
        # Mark call as active
        await set_voice_call_active(user_id, bot_id)

        # Load context (warm from DB on first entry)
        context = await load_context(user_id, bot_id)
        if not context:
            context = await warm_cache_from_db(user_id, bot_id)

        # Get user profile for prompt
        profile = await get_user_profile(user_id)
        user_name = profile.get("name", "Friend") if profile else "Friend"
        user_gender = profile.get("gender", "unknown") if profile else "unknown"

        raw_prompt = get_bot_prompt(bot_id)
        system_prompt = _safe_format(
            raw_prompt,
            custom_bot_name=bot_id.replace("_", " ").title(),
            userName=user_name,
            userGender=user_gender,
            traitsString="",
            languageString="english",
        )

        # Connect to Deepgram
        await deepgram_stt.connect()

        # Award call start XP
        await award_xp(user_id, bot_id, "voice_call_start")

        # Send ready signal
        await websocket.send_json({"type": "status", "message": "ready"})

        # ─── Main call loop ───
        async def audio_receiver():
            """Receive audio from client and forward to Deepgram."""
            try:
                while True:
                    data = await websocket.receive_bytes()
                    await deepgram_stt.send_audio(data)
            except WebSocketDisconnect:
                pass
            except Exception as e:
                logger.warning(f"Audio receiver ended: {e}")

        async def conversation_processor():
            """Process transcripts and generate streamed responses."""
            nonlocal call_minutes, context

            while True:
                # Wait for a complete transcript from Deepgram
                transcript = await deepgram_stt.get_transcript(timeout=30.0)

                if transcript is None:
                    try:
                        await websocket.send_json({"type": "status", "message": "listening"})
                    except Exception:
                        break
                    continue

                logger.info(f"[Voice] User said: {transcript}")

                # Send transcript to client
                try:
                    await websocket.send_json({
                        "type": "transcript",
                        "text": transcript,
                    })
                except Exception:
                    break

                # ─── Triple-streaming pipeline ───
                full_response = ""

                async def gemini_stream():
                    nonlocal full_response
                    async for chunk in generate_chat_response_stream(
                        system_prompt=system_prompt,
                        context=context,
                        user_message=transcript,
                    ):
                        full_response += chunk
                        yield chunk

                # Pipe Gemini output → Cartesia TTS → client
                try:
                    async for audio_chunk in stream_tts_chunks(
                        gemini_stream(), bot_id
                    ):
                        await websocket.send_bytes(audio_chunk)
                except Exception as e:
                    logger.warning(f"TTS streaming error: {e}")

                # Send complete response text
                try:
                    await websocket.send_json({
                        "type": "response_text",
                        "text": full_response,
                    })
                except Exception:
                    break

                # Update context (in-place mutation — FIX-6)
                context.append({"role": "user", "content": transcript})
                context.append({"role": "bot", "content": full_response})

                # Keep context manageable (in-place slice — FIX-6)
                if len(context) > 20:
                    context[:] = context[-20:]

                # FIX-5: Add error callback so create_task failures are logged
                def _task_error_handler(t: asyncio.Task):
                    if t.cancelled():
                        return
                    exc = t.exception()
                    if exc:
                        logger.warning(f"Voice call background task failed: {exc}")

                # Store messages in background
                t1 = asyncio.create_task(
                    append_message(user_id, bot_id, "user", transcript)
                )
                t1.add_done_callback(_task_error_handler)
                t2 = asyncio.create_task(
                    append_message(user_id, bot_id, "bot", full_response)
                )
                t2.add_done_callback(_task_error_handler)
                t3 = asyncio.create_task(
                    sync_message_to_db(user_id, bot_id, "user", transcript)
                )
                t3.add_done_callback(_task_error_handler)
                t4 = asyncio.create_task(
                    sync_message_to_db(user_id, bot_id, "bot", full_response)
                )
                t4.add_done_callback(_task_error_handler)

                # Track call duration for XP
                elapsed = (asyncio.get_event_loop().time() - call_start) / 60
                new_minutes = int(elapsed)
                if new_minutes > call_minutes:
                    minutes_diff = new_minutes - call_minutes
                    call_minutes = new_minutes
                    t5 = asyncio.create_task(
                        award_xp(user_id, bot_id, "voice_call_minute",
                                 minutes_diff * XP_REWARDS.get("voice_call_minute", 50))
                    )
                    t5.add_done_callback(_task_error_handler)

        # Run receiver and processor concurrently
        receiver_task = asyncio.create_task(audio_receiver())
        processor_task = asyncio.create_task(conversation_processor())

        done, pending = await asyncio.wait(
            {receiver_task, processor_task},
            return_when=asyncio.FIRST_COMPLETED,
        )

        for task in pending:
            task.cancel()

    except WebSocketDisconnect:
        logger.info(f"Voice call disconnected: user={user_id}")
    except Exception as e:
        logger.error(f"Voice call error: {e}")
    finally:
        # Cleanup
        await deepgram_stt.close()
        await clear_voice_call(user_id)

        # Final XP award
        total_minutes = max(1, int((asyncio.get_event_loop().time() - call_start) / 60))
        logger.info(f"Voice call ended: user={user_id}, duration={total_minutes}m")

        try:
            await websocket.close()
        except Exception:
            pass
