import asyncio
from realtime_communication.services.supabase_client import get_supabase

async def test():
    db = get_supabase()
    session_id = "c818ac01-bcd1-4644-857c-e6482747f0c6"
    res = db.table("game_sessions_realtime").select("*").eq("id", session_id).execute()
    print("SESSION VALID:", bool(res.data), res.data)

asyncio.run(test())
