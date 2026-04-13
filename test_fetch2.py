import sys
import os
sys.path.append(os.getcwd())
from services.supabase_client import get_supabase_admin
client = get_supabase_admin()
res = client.table("messages").select("role, content, activity_type, media_url").eq("activity_type", "voice_note").order("created_at", desc=True).limit(5).execute()
print(res.data)
