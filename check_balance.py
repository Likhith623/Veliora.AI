import asyncio
import httpx
from config.settings import get_settings

async def main():
    settings = get_settings()
    
    # Check Cartesia
    print("Checking Cartesia...")
    async with httpx.AsyncClient() as client:
        resp = await client.get("https://api.cartesia.ai/v1/billing/balance", headers={
            "X-API-Key": settings.CARTESIA_API_KEY,
            "Cartesia-Version": "2024-06-10"
        })
        print(f"Cartesia Balance: {resp.status_code}")
        try:
            print(resp.json())
        except:
            print(resp.text)
            
    # Check Deepgram
    print("Checking Deepgram...")
    async with httpx.AsyncClient() as client:
        resp = await client.get("https://api.deepgram.com/v1/projects", headers={
            "Authorization": f"Token {settings.DEEPGRAM_API_KEY}"
        })
        print(f"Deepgram Projects: {resp.status_code}")
        try:
            print(resp.json())
        except:
            print(resp.text)

asyncio.run(main())
