import asyncio
from services.supabase_client import get_supabase_admin

async def seed():
    db = get_supabase_admin()
    user_id = db.table("users").select("id").eq("email", "kingjames.08623@gmail.com").execute().data[0]["id"]
    
    existing = db.table("profiles_realtime").select("id").eq("id", user_id).execute()
    if not existing.data:
        db.table("profiles_realtime").insert({
            "id": user_id,
            "username": "kingjames",
            "display_name": "King James",
            "email": "kingjames.08623@gmail.com",
            "date_of_birth": "1990-01-01",
            "country": "USA",
            "timezone": "UTC"
        }).execute()
    print("Profile seeded.")

asyncio.run(seed())
