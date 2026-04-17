import asyncio
from services.supabase_client import get_supabase_admin

async def main():
    sb = get_supabase_admin()
    res = sb.table("emotion_telemetry").select("user_id, bot_id, created_at").limit(10).execute()
    print(res.data)

asyncio.run(main())
