import asyncio
from api.emotion_dashboard import get_mental_health_dashboard

async def test():
    # Use the user ID from before
    res = await get_mental_health_dashboard("6dfa0107-6ca0-4c29-a6bc-9b33f4998685")
    print(res["history"][:2])
    print("Total history:", len(res["history"]))
    print("Stats:", res["recent_emotion"], res["recent_valence"])

asyncio.run(test())
