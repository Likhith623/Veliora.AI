import asyncio
from services.supabase_client import get_supabase_admin
client = get_supabase_admin()
r = client.table("messages").select("*").eq("activity_type", "voice_note").order("created_at", desc=True).limit(2).execute()
import json
print(json.dumps(r.data, indent=2))
