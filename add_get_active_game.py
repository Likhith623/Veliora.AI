import re
with open("services/supabase_client.py", "r") as f:
    lines = f.readlines()
# insert before 'def update_game_session'
out = []
found = False
for line in lines:
    if "async def update_game_session" in line and not found:
        out.append("""async def get_active_game_session(user_id: str, bot_id: str) -> dict:
    \"\"\"Get the active game session for a user-bot pair.\"\"\"
    client = get_supabase_admin()
    def _fetch():
        return (
            client.table("user_game_sessions")
            .select("*")
            .eq("user_id", user_id)
            .eq("bot_id", bot_id)
            .eq("status", "active")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
    import asyncio
    result = await asyncio.to_thread(_fetch)
    return result.data[0] if result.data else None

""")
        found = True
    out.append(line)
with open("services/supabase_client.py", "w") as f:
    f.writelines(out)
print("Done")
