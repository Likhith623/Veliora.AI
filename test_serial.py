import json
from Redis_chat.working_files.serialization import serialize_chat_to_messages

chat = {
    "id": "123",
    "user_id": "u",
    "bot_id": "b",
    "user_message": "please voice note",
    "bot_response": "here is my voice",
    "timestamp": "2026-04-13T00:00",
    "activity_type": "voice_note",
    "media_url": "http://audio.wav"
}
rows = serialize_chat_to_messages(chat)
print(json.dumps(rows, indent=2))
