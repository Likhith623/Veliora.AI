import asyncio
from services.supabase_client import get_supabase_admin

async def test():
    db = get_supabase_admin()
    try:
        r = db.table("user_achievements_realtime").select("id").limit(1).execute()
        print("user_achievements_realtime:", "OK" if r else "None")
    except Exception as e: print("user_achievements_realtime:", e)

    try:
        r = db.table("achievements_realtime").select("id").limit(1).execute()
        print("achievements_realtime:", "OK" if r else "None")
    except Exception as e: print("achievements_realtime:", e)

asyncio.run(test())
