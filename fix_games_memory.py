import re

with open("api/games.py", "r") as f:
    text = f.read()

# 1. Provide game_state to start_game LLM
old_start = """    opening = await generate_chat_response(
        system_prompt=f"{bot_prompt}\\n\\n{gm_prompt}",
        context=chat_context,
        user_message=f"Start the game! My name is {user_name}.",
        semantic_memory=semantic_memory,
    )"""

new_start = """    opening = await generate_chat_response(
        system_prompt=f"{bot_prompt}\\n\\n{gm_prompt}",
        context=chat_context,
        user_message=f"Start the game! My name is {user_name}.",
        game_state=game_state,
        semantic_memory=semantic_memory,
    )"""

text = text.replace(old_start, new_start)

with open("api/games.py", "w") as f:
    f.write(text)
