from services.supabase_client import get_supabase_admin
import asyncio

async def test():
    client = get_supabase_admin()
    res = client.table("messages").select("id, role, content, bot_id, created_at, activity_type, media_url").order("created_at", desc=True).limit(3).execute()
    for row in res.data:
        print(row)

asyncio.run(test())
