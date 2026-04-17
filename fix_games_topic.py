import re

with open("api/games.py", "r") as f:text = f.read()

# 1. Update _get_game_master_prompt to include topic
old_gm = """        f"Game Description: {game['description']}\\n"
        f"Current Turn: {turn} of {max_turns}\\n\"""

new_gm = """        f"Game Description: {game['description']}\\n"
        f"{(f'Specific User Instructions/Topic for this Game: {game.get(\"topic\")}\\n') if game.get('topic') else ''}"
        f"Current Turn: {turn} of {max_turns}\\n\"""
text = text.replace(old_gm, new_gm)

# 2. Add topic to game_state in start_game
old_state = """    game_state = {
        "session_id": session_id,
        "game_id": game["id"],
        "game_name": game["name"],
        "bot_id": request.bot_id,
        "turn": 1,
        "max_turns": game["max_turns"],
        "category": game["category"],
        "description": game["description"],
        "total_xp": 0,
    }"""
new_state = """    game_state = {
        "session_id": session_id,
        "game_id": game["id"],
        "game_name": game["name"],
        "bot_id": request.bot_id,
        "turn": 1,
        "max_turns": game["max_turns"],
        "category": game["category"],
        "description": game["description"],
        "topic": getattr(request, "topic", ""),
        "total_xp": 0,
    }"""
text = text.replace(old_state, new_state)

# 3. Add topic to game_info in game_action
old_info = """    game_info = {
        "id": game_state["game_id"],
        "name": game_state["game_name"],
        "description": game_state["description"],
        "category": game_state["category"],
    }"""
new_info = """    game_info = {
        "id": game_state["game_id"],
        "name": game_state["game_name"],
        "description": game_state["description"],
        "category": game_state["category"],
        "topic": game_state.get("topic", ""),
    }"""
text = text.replace(old_info, new_info)

with open("api/games.py", "w") as f:f.write(text)
