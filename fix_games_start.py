import re

with open("api/games.py", "r") as f:
    text = f.read()

# 1. Update Game Master prompt in start
old_logic = """    opening = await generate_chat_response(
        system_prompt=f"{bot_prompt}\\n\\n{gm_prompt}",
        context=[],
        user_message=f"I want to play {game.get('name', request.archetype)}. Topic/Instruction: {request.topic}",
        game_state=game_state,
    )"""

new_logic = """    loop = asyncio.get_running_loop()
    from api.chat import _emotion_executor
    from emotion.text_emotion import get_text_emotion
    from emotion.fusion import fuse_emotions
    from emotion.session_state import set_emotion_state, get_intervention_cooldown, evaluate_dual_alert
    from services.redis_cache import get_redis_manager
    from services.vector_search import search_memories

    text_emotion = await loop.run_in_executor(_emotion_executor, get_text_emotion, request.topic)
    redis_client = get_redis_manager().client
    fused_emotion = fuse_emotions(text_emotion=text_emotion, speech_emotion=None)
    fused_emotion["text_message"] = request.topic
    set_emotion_state(redis_client, user_id, request.bot_id, fused_emotion)
    evaluate_dual_alert(redis_client, user_id, request.bot_id, fused_emotion, request.topic)

    semantic_memory = await loop.run_in_executor(_emotion_executor, search_memories, user_id, request.bot_id, request.topic)

    opening = await generate_chat_response(
        system_prompt=f"{bot_prompt}\\n\\n{gm_prompt}",
        context=[],
        user_message=f"I want to play {game.get('name', request.archetype)}. Topic/Instruction: {request.topic}",
        game_state=game_state,
        semantic_memory=semantic_memory,
    )
    opening = re.sub(r'^\s*\[GAME\]\s*', '', opening).strip()"""

text = text.replace(old_logic, new_logic)

with open("api/games.py", "w") as f:
    f.write(text)

print("games start patched!")
