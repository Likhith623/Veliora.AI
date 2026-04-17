import asyncio
import re

with open("api/games.py", "r") as f:
    text = f.read()

# 1. Update Game Master prompt
old_prompt = """        f"If this is the last turn, wrap up the game and declare the result.\\n"
    )"""

new_prompt = """        f"If this is the last turn, wrap up the game and declare the result.\\n"
        f"CRITICAL: Do NOT prefix your response with '[GAME]', '[ACTIVITY]', or any other tags. Speak directly as the persona.\\n"
    )"""

text = text.replace(old_prompt, new_prompt)

# 2. Add emotion executor to imports
old_imports = """    from services.redis_cache import set_game_state, get_game_state, cache_message, has_active_session, load_session_from_supabase, get_context
    from services.llm_engine import generate_chat_response"""

new_imports = """    import asyncio
    from services.redis_cache import set_game_state, get_game_state, cache_message, has_active_session, load_session_from_supabase, get_context
    from services.llm_engine import generate_chat_response
    from emotion.text_emotion import get_text_emotion
    from emotion.fusion import fuse_emotions
    from emotion.session_state import set_emotion_state, get_intervention_cooldown, evaluate_dual_alert
    from services.vector_search import search_memories
    from api.chat import _emotion_executor"""

text = text.replace(old_imports, new_imports)

# 3. Patch the game_action logic
old_logic = """    # Generate response
    response_text = await generate_chat_response(
        system_prompt=f"{bot_prompt}\\n\\n{gm_prompt}",
        context=chat_context,
        user_message=request.action,
        game_state=game_state,
    )"""

new_logic = """    loop = asyncio.get_running_loop()
    
    # ── Text Emotion & Alert ──
    text_emotion = await loop.run_in_executor(_emotion_executor, get_text_emotion, request.action)
    from services.redis_cache import get_redis_manager
    redis_client = get_redis_manager().client
    fused_emotion = fuse_emotions(text_emotion=text_emotion, speech_emotion=None)
    fused_emotion["text_message"] = request.action
    set_emotion_state(redis_client, user_id, request.bot_id, fused_emotion)
    evaluate_dual_alert(redis_client, user_id, request.bot_id, fused_emotion, request.action)

    # ── Semantic Context ──
    semantic_memory = await loop.run_in_executor(_emotion_executor, search_memories, user_id, request.bot_id, request.action)

    # Generate response
    response_text = await generate_chat_response(
        system_prompt=f"{bot_prompt}\\n\\n{gm_prompt}",
        context=chat_context,
        user_message=request.action,
        game_state=game_state,
        semantic_memory=semantic_memory,
    )
    
    # Strip [GAME] prefix if LLM still hallucinates it
    response_text = re.sub(r'^\s*\[GAME\]\s*', '', response_text).strip()"""

text = text.replace(old_logic, new_logic)

with open("api/games.py", "w") as f:
    f.write(text)

print("games.py patched!")
