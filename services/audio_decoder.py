# audio_decoder.py
"""
Veliora.AI — Persistent FFmpeg Audio Decoder

Maintains a single long-lived FFmpeg process per voice call session.
Streams raw Opus/WebM/etc. bytes into stdin, reads 32-bit float PCM from stdout.

Key design choices:
- No spawn overhead per chunk (process lives for the duration of the call)
- Background reader task drains stdout continuously into a locked bytearray
- pull_pcm_array() extracts 4-byte aligned float32 frames and returns them
  as a numpy array ready for HuBERT inference
- Automatic restart if the FFmpeg process dies unexpectedly
"""

import asyncio
import numpy as np
import logging

logger = logging.getLogger(__name__)


class PersistentFFmpegDecoder:
    """
    Persistent FFmpeg pipe decoder for real-time audio streaming.

    Usage:
        decoder = PersistentFFmpegDecoder()
        await decoder.start()
        await decoder.write_chunk(opus_bytes)
        pcm = await decoder.pull_pcm_array()   # np.ndarray float32
        await decoder.close()
    """

    def __init__(self):
        self.process      = None
        self.pcm_buffer   = bytearray()
        self._buffer_lock = asyncio.Lock()
        self.reader_task  = None

    async def start(self) -> None:
        """Spawn the FFmpeg process and start the background stdout reader."""
        self.process = await asyncio.create_subprocess_exec(
            "ffmpeg",
            "-hide_banner", "-loglevel", "error",
            "-i",       "pipe:0",       # Streaming stdin input (autodetect WebM/Opus)
            "-f",       "f32le",        # Raw 32-bit float little-endian output
            "-acodec",  "pcm_f32le",
            "-ar",      "16000",        # Resample to 16kHz for ML models
            "-ac",      "1",            # Mono channel
            "-flags",   "low_delay",    # Minimize buffering latency
            "pipe:1",                   # Streaming stdout output
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        self.reader_task = asyncio.create_task(self._read_stdout())
        logger.debug("PersistentFFmpegDecoder started.")

    def _is_process_alive(self) -> bool:
        """Synchronous liveness check (no await needed)."""
        return self.process is not None and self.process.returncode is None

    async def _read_stdout(self) -> None:
        """Background task: continuously drain FFmpeg stdout into the PCM buffer."""
        while True:
            try:
                chunk = await self.process.stdout.read(4096)
                if not chunk:
                    # FFmpeg closed stdout — process likely exited
                    break
                async with self._buffer_lock:
                    self.pcm_buffer.extend(chunk)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"FFmpeg stdout read error: {e}")
                break

    async def write_chunk(self, audio_bytes: bytes) -> None:
        """
        Write a raw audio chunk (Opus, WebM, etc.) to FFmpeg stdin.
        Automatically restarts FFmpeg if the process has died.
        """
        if not self._is_process_alive():
            logger.warning("FFmpeg process dead — restarting.")
            await self.close()
            await self.start()

        try:
            self.process.stdin.write(audio_bytes)
            await self.process.stdin.drain()
        except BrokenPipeError:
            logger.error("FFmpeg stdin broken pipe — restarting.")
            await self.close()
            await self.start()
        except Exception as e:
            logger.error(f"FFmpeg write error: {e}")

    async def pull_pcm_array(self) -> np.ndarray:
        """
        Extract all available decoded PCM bytes from the buffer.
        Aligns to 4-byte float32 boundaries and returns a float32 numpy array.
        Any trailing unaligned bytes are returned to the buffer for the next call.

        Returns:
            np.ndarray of dtype=float32, shape=(N,). Empty array if no data.
        """
        async with self._buffer_lock:
            if not self.pcm_buffer:
                return np.array([], dtype=np.float32)
            data = bytes(self.pcm_buffer)
            self.pcm_buffer.clear()

        # Align to 4-byte float32 boundaries
        aligned_len = len(data) - (len(data) % 4)
        if aligned_len == 0:
            # Put unaligned bytes back
            async with self._buffer_lock:
                self.pcm_buffer.extend(data)
            return np.array([], dtype=np.float32)

        valid_data = data[:aligned_len]
        remainder  = data[aligned_len:]

        if remainder:
            async with self._buffer_lock:
                self.pcm_buffer.extend(remainder)

        return np.frombuffer(valid_data, dtype=np.float32)

    async def close(self) -> None:
        """Gracefully shut down the FFmpeg process and reader task."""
        if self.reader_task and not self.reader_task.done():
            self.reader_task.cancel()
            try:
                await self.reader_task
            except asyncio.CancelledError:
                pass

        if self.process:
            try:
                self.process.stdin.close()
            except Exception:
                pass
            try:
                self.process.terminate()
                await asyncio.wait_for(self.process.wait(), timeout=2.0)
            except asyncio.TimeoutError:
                logger.warning("FFmpeg did not terminate in time — killing.")
                self.process.kill()
            except Exception:
                pass

        self.process     = None
        self.reader_task = None
        logger.debug("PersistentFFmpegDecoder closed.")