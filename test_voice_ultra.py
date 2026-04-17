import asyncio
from api._ultra_emotion import process_ultra_fast_emotion
from services.redis_cache import get_redis_manager
import logging

logging.basicConfig(level=logging.DEBUG)

async def test():
    # Provide enough "audio" bytes to be > 0.5 seconds at least to not fail early.
    # We will just write a valid sine wave WAV into a bytes object!
    import wave, struct
    import io
    
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        # Write 1 second of silence
        data = struct.pack("<h", 0) * 16000
        w.writeframes(data)
    
    audio_bytes = buf.getvalue()
    
    await process_ultra_fast_emotion("b643a6d1-4f11-473d-9d41-a67bfe571e4d", "test_bot_1", audio_bytes, "this is a test")

if __name__ == "__main__":
    asyncio.run(test())
