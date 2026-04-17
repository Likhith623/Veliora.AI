with open("api/games.py", "r") as f:
    text = f.read()

# Fix 1: Update gm prompt
old_gm = '        f"Game Description: {game[\'description\']}\\n"\\n        f"Current Turn: {turn} of {max_turns}\\n"'
new_gm = '        f"Game Description: {game[\'description\']}\\n"\\n        f"Game Setup / Topic provided by User: {game.get(\'topic\', \'No specific topic\')}\\n"\\n        f"Current Turn: {turn} of {max_turns}\\n"'

text = text.replace(old_gm, new_gm)

# Fix 2: Start Game State
old_state = '        "description": game["description"],\n        "total_xp": 0,\n    }'
new_state = '        "description": game["description"],\n        "topic": getattr(request, "topic", "No specific topic"),\n        "total_xp": 0,\n    }'

text = text.replace(old_state, new_state)

# Fix 3: Action Game Info
old_info = '        "description": game_state["description"],\n        "category": game_state["category"],\n    }'
new_info = '        "description": game_state["description"],\n        "category": game_state["category"],\n        "topic": game_state.get("topic", ""),\n    }'

text = text.replace(old_info, new_info)

with open("api/games.py", "w") as f:
    f.write(text)

