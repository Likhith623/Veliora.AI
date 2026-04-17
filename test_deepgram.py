import asyncio
import httpx
import wave, struct, io
from config.settings import get_settings

async def main():
    settings = get_settings()
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        data = struct.pack("<h", 0) * 16000
        w.writeframes(data)
    
    audio_content = buf.getvalue()
    
    async with httpx.AsyncClient() as hc:
        dg_res = await hc.post(
            "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true",
            headers={
                "Authorization": f"Token {settings.DEEPGRAM_API_KEY}",
                "Content-Type": "audio/wav"
            },
            content=audio_content
        )
        print("Deepgram status:", dg_res.status_code)
        print("Deepgram data:", dg_res.text)

asyncio.run(main())
