import os
import re

file_path = "api/chat.py"
with open(file_path, "r") as f:
    content = f.read()

new_route = """# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHAT INIT (Eager Load & Parsed History)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/init/{bot_id}")
async def init_chat_session(
    bot_id: str,
    current_user: dict = Depends(get_current_user),
):
    \"\"\"
    Eagerly loads the session into Redis from Supabase.
    Fetches chronological message history and parses media tags.
    \"\"\"
    from services.redis_cache import load_session_from_supabase
    from services.supabase_client import get_supabase_admin
    import re
    
    user_id = current_user["user_id"]
    
    # 1. Eagerly prime Redis with user's memories, diaries, states
    await load_session_from_supabase(user_id, bot_id)
    
    # 2. Fetch entire history in chronological order
    client = get_supabase_admin()
    response = client.table("messages") \\
        .select("id, role, content, created_at") \\
        .eq("user_id", user_id) \\
        .eq("bot_id", bot_id) \\
        .order("created_at", desc=False) \\
        .execute()
        
    messages = response.data or []
    parsed_history = []
    
    for msg in messages:
        text = msg.get("content", "")
        role = msg.get("role", "user")
        
        parsed = {
            "id": msg.get("id"),
            "role": role,
            "created_at": msg.get("created_at"),
            "text": text,
            "isVoiceNote": False,
            "isUserImage": False,
            "isActivityStart": False,
            "isActivityEnd": False,
            "audioUrl": None,
            "imageUrl": None
        }
        
        # Check flags
        if "[VOICE_NOTE]" in parsed["text"]:
            parsed["isVoiceNote"] = True
            parsed["text"] = parsed["text"].replace("[VOICE_NOTE]", "")
        if "[IMAGE_GEN]" in parsed["text"]:
            parsed["isUserImage"] = True
            parsed["text"] = parsed["text"].replace("[IMAGE_GEN]", "")
        if "[GAME]" in parsed["text"]:
            parsed["isActivityStart"] = True
            parsed["text"] = parsed["text"].replace("[GAME]", "")
        if "[GAME_END]" in parsed["text"]:
            parsed["isActivityEnd"] = True
            parsed["text"] = parsed["text"].replace("[GAME_END]", "")
            
        # Extract Media URLs
        # Often represented as (Media: https://...) or sometimes just plain urls, but the plan says (Media: ...)
        media_pattern = r"\(Media:\s*(https?://[^\)]+)\)"
        match = re.search(media_pattern, parsed["text"])
        if match:
            url = match.group(1)
            parsed["text"] = re.sub(media_pattern, "", parsed["text"])
            if parsed["isVoiceNote"] or url.endswith((".wav", ".mp3", ".ogg")) or "audio" in url.lower():
                parsed["audioUrl"] = url
            elif parsed["isUserImage"] or url.endswith((".png", ".jpg", ".jpeg", ".webp", ".gif")) or "image" in url.lower():
                parsed["imageUrl"] = url
                
        # Clean up whitespace
        parsed["text"] = parsed["text"].strip()
        parsed_history.append(parsed)
        
    return {
        "status": "success",
        "bot_id": bot_id,
        "history": parsed_history
    }


"""

content = content.replace(
    "# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n# CHAT HISTORY (From Supabase)",
    new_route + "# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n# CHAT HISTORY (From Supabase)"
)

with open(file_path, "w") as f:
    f.write(content)

print("done")
