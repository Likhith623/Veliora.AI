import re

with open("api/games.py", "r") as f:
    text = f.read()

# Add import asyncio inside start_game near the other imports
old_imports = """    from services.redis_cache import set_game_state, get_game_state, cache_message, has_active_session, load_session_from_supabase, get_context, clear_game_state
    from services.supabase_client import create_game_session, get_user_profile, update_game_session
    from services.llm_engine import generate_chat_response
    from services.background_tasks import award_xp
    from bot_prompt import get_bot_prompt"""

new_imports = """    import asyncio
    from services.redis_cache import set_game_state, get_game_state, cache_message, has_active_session, load_session_from_supabase, get_context, clear_game_state
    from services.supabase_client import create_game_session, get_user_profile, update_game_session
    from services.llm_engine import generate_chat_response
    from services.background_tasks import award_xp
    from bot_prompt import get_bot_prompt"""

if "import asyncio" not in text[:200]:
    text = "import asyncio\n" + text

text = text.replace(old_imports, new_imports)

with open("api/games.py", "w") as f:
    f.write(text)

