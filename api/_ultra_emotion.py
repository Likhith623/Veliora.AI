import tempfile
import asyncio
import numpy as np
import logging

logger = logging.getLogger(__name__)

async def process_ultra_fast_emotion(user_id: str, bot_id: str, audio_bytes: bytes, transcribed_text: str):
    """
    Background task to run speech and text emotion on the recorded audio from
    the ultra-fast REST endpoint, fusing them and persisting the result.
    """
    try:
        from emotion.speech_emotion import get_speech_emotion, MIN_AUDIO_SAMPLES
        from emotion.text_emotion import get_text_emotion
        from emotion.fusion import fuse_emotions
        from emotion.session_state import set_emotion_state, evaluate_dual_alert
        from services.redis_cache import get_redis_manager
        
        # 1. Decode Audio to 16kHz PCM Float32 using FFmpeg
        pcm_array = np.array([], dtype=np.float32)
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=True) as tf:
            tf.write(audio_bytes)
            tf.flush()
            
            proc = await asyncio.create_subprocess_exec(
                "ffmpeg", "-hide_banner", "-loglevel", "error", 
                "-i", tf.name, "-f", "f32le", "-ar", "16000", "-ac", "1", "pipe:1",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL
            )
            stdout, _ = await proc.communicate()
            if stdout:
                # Align bytes to 4 boundaries
                aligned_len = len(stdout) - (len(stdout) % 4)
                if aligned_len > 0:
                    pcm_array = np.frombuffer(stdout[:aligned_len], dtype=np.float32)

        # 2. Run inferences in separate threads
        loop = asyncio.get_running_loop()
        
        # Only run speech emotion if sufficient audio exists
        if pcm_array.size >= MIN_AUDIO_SAMPLES:
            speech_res = await loop.run_in_executor(None, get_speech_emotion, pcm_array)
        else:
            speech_res = {"label": "neutral", "score": 0.0}
            
        text_res = await loop.run_in_executor(None, get_text_emotion, transcribed_text or "")
        
        # 3. Fuse and Persist
        final_emotion = fuse_emotions(text_res, speech_res)
        final_emotion["speech_text"] = transcribed_text or ""
        
        manager = get_redis_manager()
        rd = manager.client
        
        set_emotion_state(rd, user_id, bot_id, final_emotion)
        
        alert_result = evaluate_dual_alert(
            redis_client=rd,
            user_id=user_id,
            bot_id=bot_id,
            fused_emotion=final_emotion,
            user_text=transcribed_text or None,
        )
        
        if alert_result.get("alert_tier") == "tier1":
            import json
            try:
                payload = {
                    "type": "crisis_alert",
                    "user_id": user_id,
                    "bot_id": bot_id,
                    "tier": "tier1",
                    "message": alert_result.get("crisis_resources", {}).get("message", "I'm really concerned about you right now."),
                }
                rd.publish(f"user_alerts:{user_id}", json.dumps(payload))
            except Exception as pub_err:
                logger.error(f"Failed to publish ultra-fast crisis alert: {pub_err}")

        logger.info(f"Ultra-fast emotion processed & stored for {user_id}:{bot_id}")

    except Exception as e:
        logger.error(f"Error in ultra-fast emotion background processing: {e}")
