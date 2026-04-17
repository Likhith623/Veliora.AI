import asyncio
from api._ultra_emotion import process_ultra_fast_emotion

async def main():
    try:
        # Pass dummy audio bytes
        await process_ultra_fast_emotion("user123", "bot123", b"dummy_audio", "hello world")
        print("Success")
    except Exception as e:
        print("Error:", e)

asyncio.run(main())
