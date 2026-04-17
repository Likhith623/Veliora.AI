import asyncio
from services.supabase_client import get_supabase_admin
def test():
    db = get_supabase_admin()
    res = db.table("emotion_telemetry").select("user_id, bot_id, text_message, speech_text, dominant_emotion, fused_valence").limit(10).execute()
    for row in res.data:
        print(row)
test()
