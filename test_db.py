import json, asyncio
from realtime_communication.services.supabase_client import get_supabase
db = get_supabase()
res = db.table("game_sessions_realtime").select("*").limit(1).execute()
print(res.data)
