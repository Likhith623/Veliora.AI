import asyncio
from datetime import datetime
from realtime_communication.services.supabase_client import get_supabase

async def test():
    db = get_supabase()
    session_id = "c818ac01-bcd1-4644-857c-e6482747f0c6"
    try:
        res = db.table("game_sessions_realtime").update({
            "status": "active",
            "started_at": datetime.utcnow().isoformat()
        }).eq("id", session_id).execute()
        print("UPDATE SUCCESS:", res.data)
    except Exception as e:
        print("UPDATE EXCEPTION:", str(e))

asyncio.run(test())
