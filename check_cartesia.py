import asyncio
import httpx
from config.settings import get_settings
from config.mappings import get_voice_id

async def main():
    settings = get_settings()
    voice_id = get_voice_id("delhi_mentor_male") or "a0e99841-438c-4a64-b6a9-ae08173ce188"
    print("Using voice ID:", voice_id)
    cartesia_payload = {
        "transcript": "Hello",
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
        print("Cartesia Status:", tts_res.status_code)
        if tts_res.status_code != 200:
            print("Cartesia Error:", tts_res.text)
        else:
            print("Cartesia API is NOT exhausted, successfully generated audio.")

asyncio.run(main())
