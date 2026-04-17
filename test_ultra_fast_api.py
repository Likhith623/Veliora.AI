import httpx
import asyncio
import wave
import io
import struct

async def main():
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        data = struct.pack("<h", 0) * 16000
        w.writeframes(data)
    
    audio_bytes = buf.getvalue()
    files = {"audio_file": ("test.wav", audio_bytes, "audio/wav")}
    data = {"email": "test@example.com"}
    
    async with httpx.AsyncClient() as client:
        resp = await client.post("http://127.0.0.1:8000/voice-call-ultra-fast", files=files, data=data, timeout=30.0)
        print("Status", resp.status_code)
        print("Text", resp.text)

asyncio.run(main())
