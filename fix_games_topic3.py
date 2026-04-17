import re

with open("api/games.py", "r") as f:
    text = f.read()

# Update gm prompt
old_gm = """        f"Game Description: {game['description']}\\n"
        f"Current Turn: {turn} of {max_turns}\\n\"""

new_gm = """        f"Game Description: {game['description']}\\n"
        f"Game Setup / Topic provided by User: {game.get('topic', 'No specific topic')}\\n"
        f"Current Turn: {turn} of {max_turns}\\n\"""

text = text.replace(old_gm, new_gm)

old_state = """        "description": game["description"],
        "total_xp": 0,
    }"""

new_state = """        "description": game["description"],
        "topic": getattr(request, "topic", "No specific topic"),
        "total_xp": 0,
    }"""

text = text.replace(old_state, new_state)


old_info = """        "description": game_state["description"],
        "category": game_state["category"],
    }"""

new_info = """        "description": game_state["description"],
        "category": game_state["category"],
        "topic": game_state.get("topic", "No specific topic"),
    }"""

text = text.replace(old_info, new_info)

with open("api/games.py", "w") as f:
    f.write(text)
print("done")
