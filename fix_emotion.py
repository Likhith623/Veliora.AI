import re

with open("services/emotion_worker.py", "r") as f:
    code = f.read()

target = """            # ── Drain any new Deepgram transcriptions ──────────────────────
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
                else:"""

replacement = """            # ── Drain any new Deepgram transcriptions ──────────────────────
            has_new_text = False
            if transcription_queue is not None:
                while not transcription_queue.empty():
                    try:
                        text, _ts = transcription_queue.get_nowait()
                        latest_transcribed_text = text
                        has_new_text = True
                        transcription_queue.task_done()
                    except asyncio.QueueEmpty:
                        break

            # ── FIX: Process audio cleanly even on timeout ──
            if not timed_out:
                # chunk is a real bytes object or the sentinel
                queue.task_done()

                if chunk is None:
                    # Sentinel received — break out of the loop
                    break

                # ── Stream chunk into persistent FFmpeg process ────────────────
                await decoder.write_chunk(chunk)

            # ── Pull newly decoded PCM frames (even on timeout, FFmpeg might have yielded data)
            new_pcm = await decoder.pull_pcm_array()
            if new_pcm.size > 0:
                rolling_buffer = np.concatenate((rolling_buffer, new_pcm))
                if rolling_buffer.size > MAX_BUFFER_SAMPLES:
                    rolling_buffer = rolling_buffer[-MAX_BUFFER_SAMPLES:]

            # ── Debounced inference: run at most once per second ───────────
            current_time = time.monotonic()
            
            # Trigger inference IF we have new audio OR we just got a new text STT result
            has_enough_audio = rolling_buffer.size >= MIN_BUFFER_SAMPLES
            trigger_audio = (new_pcm.size > 0)
            
            if (trigger_audio or has_new_text) and has_enough_audio and (current_time - last_inference_time > 1.0):
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
                    # CLEAR IT: Prevent leaking thread-pool re-evaluating the SAME text repeatedly!
                    latest_transcribed_text = ""
                else:"""

if target in code:
    code = code.replace(target, replacement)
    with open("services/emotion_worker.py", "w") as f:
        f.write(code)
    print("SUCCESS")
else:
    print("FAILED")
