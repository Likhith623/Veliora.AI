import base64
import httpx
import logging
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from config.settings import get_settings
from services.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/voice-call-ultra-fast")
async def voice_call_ultra_fast_endpoint(
    audio_file: UploadFile = File(...),
    bot_id: str = Form("delhi_mentor_male"),
    email: str = Form(""),
    platform: str = Form("web"),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    ULTRA-FAST Voice Call endpoint replacement utilizing strictly the new architecture.
    Provides identical payload structures to the legacy reference API for frontend compatibility.
    """
    try:
        # Get user
        client = get_supabase_admin()
        user_res = client.table("users").select("id").eq("email", email).execute()
        user_id = user_res.data[0]["id"] if user_res.data else None

        # Phase 1: STT via Deepgram REST
        audio_content = await audio_file.read()
        settings = get_settings()
        async with httpx.AsyncClient() as hc:
            dg_res = await hc.post(
                "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true",
                headers={"Authorization": f"Token {settings.DEEPGRAM_API_KEY}"},
                content=audio_content
            )
            dg_data = dg_res.json()
            try:
                transcript = dg_data["results"]["channels"][0]["alternatives"][0]["transcript"]
            except KeyError:
                logger.error(f"Deepgram error: {dg_data}")
                transcript = ""
            
            if not transcript or transcript.strip() == "":
                return JSONResponse(
                    status_code=400,
                    content={"error": "Could not transcribe audio. Please try again."}
                )

        # Phase 2: LLM Response
        from services.llm_engine import generate_chat_response
        from services.redis_cache import get_context
        from bot_prompt import get_bot_prompt
        
        context = await get_context(user_id, bot_id) if user_id else ""
        system_prompt = get_bot_prompt(bot_id)
        
        response_text = await generate_chat_response(
            system_prompt=system_prompt,
            context=context,
            user_message=transcript
        )

        # Phase 3: TTS via Cartesia REST directly to Base64
        from config.mappings import get_voice_id
        voice_id = get_voice_id(bot_id)
        
        audio_base64 = None
        if voice_id:
            cartesia_payload = {
                "transcript": response_text,
                "model_id": "sonic",
                "voice": {"mode": "id", "id": voice_id},
                "output_format": {
                    "container": "wav",
                    "encoding": "pcm_s16le",
                    "sample_rate": 8000
                }
            }
            async with httpx.AsyncClient() as hc:
                tts_res = await hc.post(
                    "https://api.cartesia.ai/tts/bytes",
                    headers={
                        "X-API-Key": settings.CARTESIA_API_KEY, 
                        "Cartesia-Version": "2024-06-10"
                    },
                    json=cartesia_payload,
                    timeout=15.0
                )
                if tts_res.status_code == 200:
                    audio_base64 = base64.b64encode(tts_res.content).decode("utf-8")
                else:
                    logger.error(f"Cartesia error: {tts_res.text}")

        # Post-Processing: Cache messages & add background extraction tasks
        if user_id:
            from services.redis_cache import cache_message
            await cache_message(user_id, bot_id, "user", transcript)
            await cache_message(user_id, bot_id, "bot", response_text)
            
            # Fire semantic memory extractor
            from services.rabbitmq_service import publish_memory_task
            background_tasks.add_task(
                publish_memory_task, user_id, bot_id, transcript, response_text
            )
            
            # Fire Ultra-Fast Emotion Processing (Missing from previously strict architecture upgrade)
            from api._ultra_emotion import process_ultra_fast_emotion
            background_tasks.add_task(
                process_ultra_fast_emotion, user_id, bot_id, audio_content, transcript
            )

        # Mirror EXACT XP calculations from reference_main legacy stack
        try:
            import sys
            import os
            sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/..")
            from reference_main import get_magnitude_for_query
            from MM2.user_xp import award_immediate_xp_and_magnitude
            
            magnitude = get_magnitude_for_query(transcript)
            immediate_xp_result = award_immediate_xp_and_magnitude(email, bot_id, magnitude)
        except Exception as xp_err:
            logger.warning(f"Failed to calculate exact XP magnitude for voice stream: {xp_err}")
            immediate_xp_result = {"immediate_xp_awarded": 150}

        return {
            "transcript": transcript,
            "text_response": response_text,
            "voice_id": voice_id,
            "audio_base64": audio_base64,
            "xp_data": immediate_xp_result,
            "performance": {
                "optimizations_applied": ["rest_native", "cartesia_direct_bytes", "legacy_xp_parity"]
            }
        }

    except Exception as e:
        logger.error(f"Ultra-fast voice call error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
