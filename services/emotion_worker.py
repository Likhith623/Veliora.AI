# emotion_worker.py
"""
Veliora.AI — Emotion Worker (Voice Call Pipeline)

This worker handles the AUDIO-ONLY emotion pathway during active voice calls.
It runs as a background asyncio task, continuously:
  1. Decoding Opus audio chunks via a persistent FFmpeg process
  2. Maintaining a rolling 4-second PCM buffer
  3. Running HuBERT speech emotion inference (debounced every 1 second)
  4. Fusing the speech result with the LATEST TEXT emotion from Redis
     (Text emotion is updated in real-time by chat.py via RoBERTa on each
      transcribed utterance from Deepgram. The worker reads that state here
      to achieve temporal synchronization of the same conversational turn.)
  5. Persisting the fused result and running Dual-Alert evaluation

Design note on text/speech temporal sync:
  When Deepgram streams a transcription, chat.py immediately runs RoBERTa
  on that text and stores it via set_emotion_state(). The emotion_worker
  processes the corresponding audio chunk in parallel. When the worker calls
  fuse_emotions(), it reads the latest stored state which reflects the same
  conversational utterance, achieving the synchronized ensemble required by
  the architecture spec.

Dual-Alert evaluation is intentionally run here too (not just in chat.py)
because voice calls do not always produce chat.py requests — the user may be
speaking without explicit text submission. Safety monitoring must be continuous.

Sentinel convention:
  The caller shuts down this worker by pushing the sentinel value `None`
  into `queue` (not by relying on asyncio.CancelledError alone). The sentinel
  is a single enqueued None item, distinct from the asyncio.TimeoutError path
  which simply means "no audio arrived this 100ms window".
"""

import asyncio
import logging
import json
import time
import numpy as np
import concurrent.futures

from .audio_decoder import PersistentFFmpegDecoder
from ..emotion.speech_emotion import get_speech_emotion
from ..emotion.text_emotion import get_text_emotion
from ..emotion.fusion import fuse_emotions
from ..emotion.session_state import (
    set_emotion_state,
    get_emotion_state,
    evaluate_dual_alert,
)

logger = logging.getLogger(__name__)

MAX_CONSECUTIVE_ERRORS = 5

# Module-level executor — shared across all worker coroutines in this process.
# FIX: was created inside run_emotion_worker, leaking a new pool on every call.
# Sized for parallel text+speech inference across concurrent voice calls.
_executor = concurrent.futures.ThreadPoolExecutor(max_workers=32, thread_name_prefix="emotion")


async def run_emotion_worker(
    queue: asyncio.Queue,
    redis_client,
    user_id: str,
    bot_id: str,
    transcription_queue: asyncio.Queue = None,
) -> None:
    """
    Background loop for continuous voice-call emotion tracking.

    Args:
        queue:               asyncio.Queue of raw Opus audio bytes.
                             Push `None` (sentinel) to shut this worker down.
        redis_client:        Redis client instance
        user_id:             Current user ID
        bot_id:              Current bot ID
        transcription_queue: Optional asyncio.Queue of (text: str, timestamp: float)
                             tuples from Deepgram. When provided, each transcribed
                             sentence triggers an immediate synchronized text+speech
                             fusion rather than relying solely on Redis state.
    """
    loop    = asyncio.get_running_loop()
    decoder = PersistentFFmpegDecoder()
    await decoder.start()

    # Audio memory: 4s of context @ 16kHz
    MAX_BUFFER_SAMPLES = 16000 * 4
    MIN_BUFFER_SAMPLES = 16000 * 1   # Need at least 1s for accurate prosody
    rolling_buffer     = np.array([], dtype=np.float32)

    last_inference_time  = 0.0
    consecutive_errors   = 0

    # Latest transcribed text for synchronized fusion (updated from transcription_queue)
    latest_transcribed_text: str = ""

    try:
        while True:
            # ── Poll audio queue with a short timeout so transcriptions
            #    can be processed even during audio silence ──────────────────
            chunk: bytes | None = None
            timed_out = False
            try:
                chunk = await asyncio.wait_for(queue.get(), timeout=0.1)
            except asyncio.TimeoutError:
                # No audio this 100ms window — still drain transcription queue below
                timed_out = True
                pass

            # ── Drain any new Deepgram transcriptions ──────────────────────
            if transcription_queue is not None:
                while not transcription_queue.empty():
                    try:
                        text, _ts = transcription_queue.get_nowait()
                        latest_transcribed_text = text
                        transcription_queue.task_done()
                    except asyncio.QueueEmpty:
                        break

            # ── FIX: Sentinel check — None item in queue means shut down ──
            if timed_out:
                # Nothing dequeued this cycle (timeout) — keep polling
                continue

            # chunk is a real bytes object or the sentinel
            # Sentinel: None pushed by the caller to signal shutdown
            queue.task_done()

            if chunk is None:
                # Sentinel received — break out of the loop
                break

            # ── Stream chunk into persistent FFmpeg process ────────────────
            await decoder.write_chunk(chunk)

            # ── Pull newly decoded PCM frames ──────────────────────────────
            new_pcm = await decoder.pull_pcm_array()
            if new_pcm.size > 0:
                rolling_buffer = np.concatenate((rolling_buffer, new_pcm))
                if rolling_buffer.size > MAX_BUFFER_SAMPLES:
                    rolling_buffer = rolling_buffer[-MAX_BUFFER_SAMPLES:]

            # ── Debounced inference: run at most once per second ───────────
            current_time = time.monotonic()  # safer than time.time() for intervals
            
            # Added `new_pcm.size > 0` condition so it only runs if NEW audio arrived!
            if (
                new_pcm.size > 0
                and rolling_buffer.size >= MIN_BUFFER_SAMPLES
                and (current_time - last_inference_time > 1.0)
            ):
                last_inference_time = current_time
                pcm_snapshot = rolling_buffer.copy()

                # ── Speech emotion inference (HuBERT) ─────────────────────
                speech_res = await loop.run_in_executor(
                    _executor, get_speech_emotion, pcm_snapshot
                )

                # ── Text emotion: use transcription if available, else
                #    fall back to latest Redis state ─────────────────────────
                if latest_transcribed_text:
                    # Synchronized path: same utterance, run RoBERTa now
                    text_res = await loop.run_in_executor(
                        _executor, get_text_emotion, latest_transcribed_text
                    )
                else:
                    # Fallback: use what chat.py stored (may be from last turn)
                    stored = get_emotion_state(redis_client, user_id, bot_id)
                    if stored and stored.get("text_raw"):
                        text_res = {
                            "label": stored["text_raw"],
                            "score": stored.get("text_score", 0.0),
                        }
                    else:
                        text_res = {"label": "neutral", "score": 0.0}

                # ── Confidence-weighted fusion ─────────────────────────────
                final_emotion = fuse_emotions(
                    text_emotion=text_res,
                    speech_emotion=speech_res,
                )
                final_emotion["speech_text"] = latest_transcribed_text or ""

                # ── Persist fused emotion ──────────────────────────────────
                set_emotion_state(redis_client, user_id, bot_id, final_emotion)

                # ── Dual-Alert evaluation (safety monitoring during calls) ─
                # Even if no LLM call is made, crisis detection must run.
                alert_result = evaluate_dual_alert(
                    redis_client=redis_client,
                    user_id=user_id,
                    bot_id=bot_id,
                    fused_emotion=final_emotion,
                    user_text=latest_transcribed_text or None,
                )

                # ── Notify UI immediately if crisis lock is engaged ────────
                if alert_result.get("alert_tier") == "tier1":
                    try:
                        # Publish crisis alert to Redis so WebSocket handlers can relay it
                        payload = {
                            "type": "crisis_alert",
                            "user_id": user_id,
                            "bot_id": bot_id,
                            "tier": "tier1",
                            "message": alert_result.get("crisis_resources", {}).get("message", "I'm really concerned about you right now."),
                        }
                        redis_client.publish(f"user_alerts:{user_id}", json.dumps(payload))
                    except Exception as e:
                        logger.error(f"Failed to publish crisis alert for {user_id}: {e}")

                consecutive_errors = 0  # reset on success

    except asyncio.CancelledError:
        logger.info(f"Emotion worker for {user_id}:{bot_id} cancelled cleanly.")
    except Exception as e:
        consecutive_errors += 1
        logger.error(
            f"Emotion worker error ({consecutive_errors}/{MAX_CONSECUTIVE_ERRORS}): {e}"
        )
        if consecutive_errors >= MAX_CONSECUTIVE_ERRORS:
            logger.critical(
                f"Emotion worker for {user_id}:{bot_id} exceeded error threshold. "
                f"Terminating to prevent resource leak."
            )
    finally:
        # Graceful shutdown regardless of exit reason
        await decoder.close()
        logger.debug(f"Emotion worker for {user_id}:{bot_id} shut down.")