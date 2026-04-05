import re

with open("api/multimodal.py", "r") as f:
    text = f.read()

# Pattern 1
old1 = """    user_msg = f"User uploaded an image for description"
    publish_memory_task(user_id, bot_id, user_msg, description)
    publish_message_log(user_id, bot_id, user_msg, description)

    # Persist to Supabase
    from services.background_tasks import sync_message_to_db
    background_tasks.add_task(
        sync_message_to_db, user_id, bot_id, "user", user_msg,
        activity_type="image_describe",
    )
    background_tasks.add_task(
        sync_message_to_db, user_id, bot_id, "bot", description,
        activity_type="image_describe",
    )"""

new1 = """    user_msg = f"User uploaded an image for description"
    
    from services.redis_cache import cache_message, has_active_session, load_session_from_supabase
    
    if not await has_active_session(user_id, bot_id):
        await load_session_from_supabase(user_id, bot_id)
        
    await cache_message(user_id, bot_id, "user", user_msg)
    await cache_message(user_id, bot_id, "bot", description)

    publish_memory_task(user_id, bot_id, user_msg, description)
    publish_message_log(user_id, bot_id, user_msg, description, activity_type="image_describe")"""

text = text.replace(old1, new1)

# Pattern 2
old2 = """    user_msg = f"User shared a URL: {request.url}"
    publish_memory_task(user_id, request.bot_id, user_msg, summary)
    publish_message_log(user_id, request.bot_id, user_msg, summary)

    # Persist to Supabase
    from services.background_tasks import sync_message_to_db
    background_tasks.add_task(
        sync_message_to_db, user_id, request.bot_id, "user", user_msg,
        activity_type="url_summary",
    )
    background_tasks.add_task(
        sync_message_to_db, user_id, request.bot_id, "bot", summary,
        activity_type="url_summary",
    )"""

new2 = """    user_msg = f"User shared a URL: {request.url}"
    
    from services.redis_cache import cache_message, has_active_session, load_session_from_supabase
    
    if not await has_active_session(user_id, request.bot_id):
        await load_session_from_supabase(user_id, request.bot_id)

    await cache_message(user_id, request.bot_id, "user", user_msg)
    await cache_message(user_id, request.bot_id, "bot", summary)

    publish_memory_task(user_id, request.bot_id, user_msg, summary)
    publish_message_log(user_id, request.bot_id, user_msg, summary, activity_type="url_summary")"""

text = text.replace(old2, new2)

# Pattern 3
old3 = """    from services.rabbitmq_service import publish_memory_task
    user_msg = f"User asked about weather in {city}"
    publish_memory_task(current_user["user_id"], bot_id, user_msg, commentary)

    # Persist to Supabase
    from services.background_tasks import sync_message_to_db
    background_tasks.add_task(
        sync_message_to_db, current_user["user_id"], bot_id, "user", user_msg,
        activity_type="weather",
    )
    background_tasks.add_task(
        sync_message_to_db, current_user["user_id"], bot_id, "bot", commentary,
        activity_type="weather",
    )"""

new3 = """    from services.rabbitmq_service import publish_memory_task, publish_message_log
    from services.redis_cache import cache_message, has_active_session, load_session_from_supabase
    
    user_msg = f"User asked about weather in {city}"
    u_id = current_user["user_id"]
    
    if not await has_active_session(u_id, bot_id):
        await load_session_from_supabase(u_id, bot_id)

    await cache_message(u_id, bot_id, "user", user_msg)
    await cache_message(u_id, bot_id, "bot", commentary)

    publish_memory_task(u_id, bot_id, user_msg, commentary)
    publish_message_log(u_id, bot_id, user_msg, commentary, activity_type="weather")"""

text = text.replace(old3, new3)

# Pattern 4
old4 = """    from services.rabbitmq_service import publish_memory_task
    user_msg = f"User requested a meme about: {request.topic or 'random topic'}"
    publish_memory_task(current_user["user_id"], request.bot_id, user_msg, meme_text)

    # Persist to Supabase
    from services.background_tasks import sync_message_to_db
    background_tasks.add_task(
        sync_message_to_db, current_user["user_id"], request.bot_id, "user", user_msg,
        activity_type="meme",
    )
    background_tasks.add_task(
        sync_message_to_db, current_user["user_id"], request.bot_id, "bot", meme_text,
        activity_type="meme",
    )"""

new4 = """    from services.rabbitmq_service import publish_memory_task, publish_message_log
    from services.redis_cache import cache_message, has_active_session, load_session_from_supabase
    
    user_msg = f"User requested a meme about: {request.topic or 'random topic'}"
    u_id = current_user["user_id"]
    
    if not await has_active_session(u_id, request.bot_id):
        await load_session_from_supabase(u_id, request.bot_id)

    await cache_message(u_id, request.bot_id, "user", user_msg)
    await cache_message(u_id, request.bot_id, "bot", meme_text)

    publish_memory_task(u_id, request.bot_id, user_msg, meme_text)
    publish_message_log(u_id, request.bot_id, user_msg, meme_text, activity_type="meme")"""

text = text.replace(old4, new4)

with open("api/multimodal.py", "w") as f:
    f.write(text)
