with open("api/games.py", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "game_state = await get_game_state(user_id)" in line:
        new_lines.append(line)
        new_lines.append("""
    if not game_state:
        from services.supabase_client import get_active_game_session
        active_game = await get_active_game_session(user_id, request.bot_id)
        if active_game and active_game["id"] == request.session_id:
            logger.info("Restored game session from database")
            from services.supabase_client import get_supabase_admin
            client = get_supabase_admin()
            game_def = client.table("games").select("*").eq("id", active_game["game_id"]).execute().data[0]
            game_state = {
                "session_id": active_game["id"],
                "game_id": active_game["game_id"],
                "game_name": game_def["name"],
                "bot_id": request.bot_id,
                "turn": active_game.get("turn_count", 0),
                "max_turns": game_def.get("max_turns", 999),
                "category": game_def.get("category", "gamified_chat"),
                "description": game_def.get("description", ""),
                "topic": "",
                "total_xp": active_game.get("xp_earned", 0),
            }
            await set_game_state(user_id, game_state)
            
""")
    else:
        new_lines.append(line)

with open("api/games.py", "w") as f:
    f.writelines(new_lines)
print("Done")
