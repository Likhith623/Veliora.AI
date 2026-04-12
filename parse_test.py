import re

def parse_message(text):
    parsed = {
        "text": text,
        "isVoiceNote": False,
        "isUserImage": False,
        "isActivityStart": False,
        "isActivityEnd": False,
        "audioUrl": None,
        "imageUrl": None
    }
    
    # Check flags
    if "[VOICE_NOTE]" in text:
        parsed["isVoiceNote"] = True
        parsed["text"] = parsed["text"].replace("[VOICE_NOTE]", "")
    if "[IMAGE_GEN]" in text:
        parsed["isUserImage"] = True
        parsed["text"] = parsed["text"].replace("[IMAGE_GEN]", "")
    if "[GAME]" in text:
        parsed["isActivityStart"] = True
        parsed["text"] = parsed["text"].replace("[GAME]", "")
    if "[GAME_END]" in text:
        parsed["isActivityEnd"] = True
        parsed["text"] = parsed["text"].replace("[GAME_END]", "")
        
    # Extract Media URLs
    media_pattern = r"\(Media:\s*(https?://[^\)]+)\)"
    match = re.search(media_pattern, parsed["text"])
    if match:
        url = match.group(1)
        parsed["text"] = re.sub(media_pattern, "", parsed["text"])
        if parsed["isVoiceNote"] or url.endswith(".wav") or "audio" in url:
            parsed["audioUrl"] = url
        elif parsed["isUserImage"] or url.endswith((".png", ".jpg", ".jpeg", ".gif")) or "image" in url:
            parsed["imageUrl"] = url
            
    # Clean up whitespace
    parsed["text"] = parsed["text"].strip()
    return parsed

print(parse_message("[VOICE_NOTE]\n(Media: https://s3.com/audio.wav)\nListen to this!"))
print(parse_message("[IMAGE_GEN]\n(Media: https://s3.com/img.png)\nLook at this!"))
print(parse_message("[GAME] Let's play a game!"))
