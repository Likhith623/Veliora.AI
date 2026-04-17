import re

with open("api/games.py", "r") as f:
    text = f.read()

# 1. Fix start_game import and logic
old_start_import = "from services.vector_search import search_memories"
new_start_import = "from services.vector_search import semantic_search"

text = text.replace(old_start_import, new_start_import)

old_start_call = """semantic_memory = await loop.run_in_executor(_emotion_executor, search_memories, user_id, request.bot_id, f"Start the game! My name is {user_name}.")"""
new_start_call = """semantic_memory = await semantic_search(f"Start the game! My name is {user_name}.", user_id, request.bot_id)"""

text = text.replace(old_start_call, new_start_call)

# 2. Fix game_action call
old_action_call = """semantic_memory = await loop.run_in_executor(_emotion_executor, search_memories, user_id, request.bot_id, request.action)"""
new_action_call = """semantic_memory = await semantic_search(request.action, user_id, request.bot_id)"""

text = text.replace(old_action_call, new_action_call)

with open("api/games.py", "w") as f:
    f.write(text)

