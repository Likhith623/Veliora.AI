"""
Veliora.AI — Bot Language Map, Voice Mapping, and XP Configuration.
All persona-to-language and persona-to-voice mappings live here.
"""

from typing import Optional

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BOT LANGUAGE MAP
# Defines which languages each persona supports.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOT_LANGUAGE_MAP: dict[str, list[str]] = {
    # --- Delhi Personas ---
    "delhi_mentor_male": ["hindi", "english", "punjabi", "bengali", "tamil", "telugu", "marathi", "gujarati", "kannada", "malayalam", "urdu", "odia"],
    "delhi_mentor_female": ["hindi", "english", "punjabi", "bengali", "tamil", "telugu", "marathi", "gujarati", "kannada", "malayalam", "urdu", "odia"],
    "delhi_friend_male": ["hindi", "english", "punjabi", "bengali", "tamil", "telugu", "marathi", "gujarati", "kannada", "malayalam", "urdu", "odia"],
    "delhi_friend_female": ["hindi", "english", "punjabi", "bengali", "tamil", "telugu", "marathi", "gujarati", "kannada", "malayalam", "urdu", "odia"],
    "delhi_romantic_male": ["hindi", "english", "punjabi", "bengali", "tamil", "telugu", "marathi", "gujarati", "kannada", "malayalam", "urdu", "odia"],
    "delhi_romantic_female": ["hindi", "english", "punjabi", "bengali", "tamil", "telugu", "marathi", "gujarati", "kannada", "malayalam", "urdu", "odia"],

    # --- Japanese Personas ---
    "japanese_mentor_male": ["japanese", "english"],
    "japanese_mentor_female": ["japanese", "english"],
    "japanese_friend_male": ["japanese", "english"],
    "japanese_friend_female": ["japanese", "english"],
    "japanese_romantic_female": ["japanese", "english"],
    "japanese_romantic_male": ["japanese", "english"],

    # --- Parisian Personas ---
    "parisian_mentor_male": ["french", "english"],
    "parisian_mentor_female": ["french", "english"],
    "parisian_friend_male": ["french", "english"],
    "parisian_friend_female": ["french", "english"],
    "parisian_romantic_female": ["french", "english"],

    # --- Berlin Personas ---
    "berlin_mentor_male": ["german", "english"],
    "berlin_mentor_female": ["german", "english"],
    "berlin_friend_male": ["german", "english"],
    "berlin_friend_female": ["german", "english"],
    "berlin_romantic_male": ["german", "english"],
    "berlin_romantic_female": ["german", "english"],

    # --- Singaporean Personas ---
    "singapore_mentor_male": ["english", "mandarin", "malay", "tamil"],
    "singapore_mentor_female": ["english", "mandarin", "malay", "tamil"],
    "singapore_friend_male": ["english", "mandarin", "malay", "tamil"],
    "singapore_friend_female": ["english", "mandarin", "malay", "tamil"],
    "singapore_romantic_male": ["english", "mandarin", "malay", "tamil"],
    "singapore_romantic_female": ["english", "mandarin", "malay", "tamil"],

    # --- Mexican Personas ---
    "mexican_mentor_male": ["spanish", "english"],
    "mexican_mentor_female": ["spanish", "english"],
    "mexican_friend_male": ["spanish", "english"],
    "mexican_friend_female": ["spanish", "english"],
    "mexican_romantic_male": ["spanish", "english"],
    "mexican_romantic_female": ["spanish", "english"],

    # --- Sri Lankan Personas ---
    "srilankan_mentor_male": ["sinhala", "tamil", "english"],
    "srilankan_mentor_female": ["sinhala", "tamil", "english"],
    "srilankan_friend_male": ["sinhala", "tamil", "english"],
    "srilankan_friend_female": ["sinhala", "tamil", "english"],
    "srilankan_romantic_male": ["sinhala", "tamil", "english"],
    "srilankan_romantic_female": ["sinhala", "tamil", "english"],

    # --- Emirati Personas ---
    "emirati_mentor_male": ["arabic", "english"],
    "emirati_mentor_female": ["arabic", "english"],
    "emirati_friend_male": ["arabic", "english"],
    "emirati_friend_female": ["arabic", "english"],
    "emirati_romantic_male": ["arabic", "english"],
    "emirati_romantic_female": ["arabic", "english"],
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# VOICE MAPPING (Cartesia Voice IDs)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VOICE_MAPPING: dict[str, str] = {
    "delhi_mentor_male": "fd2ada67-c2d9-4afe-b474-6386b87d8fc3",
    "delhi_mentor_female": "faf0731e-dfb9-4cfc-8119-259a79b27e12",
    "delhi_friend_male": "791d5162-d5eb-40f0-8189-f19db44611d8",
    "delhi_friend_female": "95d51f79-c397-46f9-b49a-23763d3eaa2d",
    "delhi_romantic_male": "be79f378-47fe-4f9c-b92b-f02cefa62ccf",
    "delhi_romantic_female": "28ca2041-5dda-42df-8123-f58ea9c3da00",

    "japanese_mentor_male": "a759ecc5-ac21-487e-88c7-288bdfe76999",
    "japanese_mentor_female": "2b568345-1d48-4047-b25f-7baccf842eb0",
    "japanese_friend_male": "06950fa3-534d-46b3-93bb-f852770ea0b5",
    "japanese_friend_female": "44863732-e415-4084-8ba1-deabe34ce3d2",
    "japanese_romantic_female": "0cd0cde2-3b93-42b5-bcb9-f214a591aa29",
    "japanese_romantic_male": "6b92f628-be90-497c-8f4c-3b035002df71",

    "parisian_mentor_male": "5c3c89e5-535f-43ef-b14d-f8ffe148c1f0",
    "parisian_mentor_female": "8832a0b5-47b2-4751-bb22-6a8e2149303d",
    "parisian_friend_male": "ab7c61f5-3daa-47dd-a23b-4ac0aac5f5c3",
    "parisian_friend_female": "65b25c5d-ff07-4687-a04c-da2f43ef6fa9",
    "parisian_romantic_female": "a8a1eb38-5f15-4c1d-8722-7ac0f329727d",

    "berlin_mentor_male": "e00dd3df-19e7-4cd4-827a-7ff6687b6954",
    "berlin_mentor_female": "3f4ade23-6eb4-4279-ab05-6a144947c4d5",
    "berlin_friend_male": "afa425cf-5489-4a09-8a3f-d3cb1f82150d",
    "berlin_friend_female": "1ade29fc-6b82-4607-9e70-361720139b12",
    "berlin_romantic_male": "b7187e84-fe22-4344-ba4a-bc013fcb533e",
    "berlin_romantic_female": "4ab1ff51-476d-42bb-8019-4d315f7c0c05",

    "singapore_mentor_male": "eda5bbff-1ff1-4886-8ef1-4e69a77640a0",
    "singapore_mentor_female": "f9a4b3a6-b44b-469f-90e3-c8e19bd30e99",
    "singapore_friend_male": "c59c247b-6aa9-4ab6-91f9-9eabea7dc69e",
    "singapore_friend_female": "bf32f849-7bc9-4b91-8c62-954588efcc30",
    "singapore_romantic_male": "653b9445-ae0c-4312-a3ce-375504cff31e",
    "singapore_romantic_female": "7a5d4663-88ae-47b7-808e-8f9b9ee4127b",

    "mexican_mentor_male": "79743797-2087-422f-8dc7-86f9efca85f1",
    "mexican_mentor_female": "cefcb124-080b-4655-b31f-932f3ee743de",
    "mexican_friend_male": "15d0c2e2-8d29-44c3-be23-d585d5f154a1",
    "mexican_friend_female": "5c5ad5e7-1020-476b-8b91-fdcbe9cc313c",
    "mexican_romantic_male": "5ef98b2a-68d2-4a35-ac52-632a2d288ea6",
    "mexican_romantic_female": "c0c374aa-09be-42d9-9828-4d2d7df86962",

    "srilankan_mentor_male": "fd2ada67-c2d9-4afe-b474-6386b87d8fc3",
    "srilankan_mentor_female": "faf0731e-dfb9-4cfc-8119-259a79b27e12",
    "srilankan_friend_male": "791d5162-d5eb-40f0-8189-f19db44611d8",
    "srilankan_friend_female": "95d51f79-c397-46f9-b49a-23763d3eaa2d",
    "srilankan_romantic_male": "be79f378-47fe-4f9c-b92b-f02cefa62ccf",
    "srilankan_romantic_female": "28ca2041-5dda-42df-8123-f58ea9c3da00",

    "emirati_mentor_male": "5a31e4fb-f823-4359-aa91-82c0ae9a991c",
    "emirati_mentor_female": "fa7bfcdc-603c-4bf1-a600-a371400d2f8c",
    "emirati_friend_male": "c1cfee3d-532d-47f8-8dd2-8e5b2b66bf1d",
    "emirati_friend_female": "fa7bfcdc-603c-4bf1-a600-a371400d2f8c",
    "emirati_romantic_male": "39f753ef-b0eb-41cd-aa53-2f3c284f948f",
    "emirati_romantic_female": "bb2347fe-69e9-4810-873f-ffd759fe8420",

    # --- Mythological Personas ---
    "Krishna": "be79f378-47fe-4f9c-b92b-f02cefa62ccf",
    "Rama": "fd2ada67-c2d9-4afe-b474-6386b87d8fc3",
    "Hanuman": "fd2ada67-c2d9-4afe-b474-6386b87d8fc3",
    "Shiva": "be79f378-47fe-4f9c-b92b-f02cefa62ccf",
    "Trimurti": "be79f378-47fe-4f9c-b92b-f02cefa62ccf",
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PERSONA ORIGIN CITIES (for weather/festival lookups)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PERSONA_ORIGIN_MAP: dict[str, dict[str, str]] = {
    "delhi":     {"city": "New Delhi",     "country": "IN", "timezone": "Asia/Kolkata"},
    "japanese":  {"city": "Tokyo",         "country": "JP", "timezone": "Asia/Tokyo"},
    "parisian":  {"city": "Paris",         "country": "FR", "timezone": "Europe/Paris"},
    "berlin":    {"city": "Berlin",        "country": "DE", "timezone": "Europe/Berlin"},
    "singapore": {"city": "Singapore",     "country": "SG", "timezone": "Asia/Singapore"},
    "mexican":   {"city": "Mexico City",   "country": "MX", "timezone": "America/Mexico_City"},
    "srilankan": {"city": "Colombo",       "country": "LK", "timezone": "Asia/Colombo"},
    "emirati":   {"city": "Dubai",         "country": "AE", "timezone": "Asia/Dubai"},
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BOT FACE IMAGE REFERENCES
# Placeholder filenames — will be replaced with actual
# Supabase Storage URLs once images are uploaded.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOT_FACE_IMAGES: dict[str, str] = {
    bot_id: f"{bot_id}.jpeg" for bot_id in VOICE_MAPPING.keys()
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PERSONA ARCHETYPES (for game matching)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARCHETYPE_MAP: dict[str, str] = {}
for bot_id in BOT_LANGUAGE_MAP:
    parts = bot_id.rsplit("_", 2)  # e.g., "delhi_mentor_male" → ["delhi", "mentor", "male"]
    if len(parts) >= 2:
        ARCHETYPE_MAP[bot_id] = parts[-2]  # "mentor", "friend", or "romantic"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# XP CONFIGURATION — Rigorous Point System
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# Design Rationale:
# - Daily login is the highest single-action reward to incentivize retention
# - Chat XP scales with message length to reward engagement depth
# - Games reward completion, not just starting, to prevent farming
# - Creative actions (selfie, meme) are premium rewards
# - Voice interactions reward richer engagement
# - Streak multiplier compounds daily, capped at 2x to prevent runaway
#
# Level curve: level = floor(sqrt(total_xp / 100))
#   Level 1  =    100 XP   (1 login + a few messages)
#   Level 5  =  2,500 XP   (~3 days of active use)
#   Level 10 = 10,000 XP   (~1-2 weeks active)
#   Level 20 = 40,000 XP   (~1-2 months active)
#   Level 50 = 250,000 XP  (~6+ months dedicated)

XP_REWARDS: dict[str, int] = {
    # ─── Core Actions ───
    "daily_login":              1000,   # Once per calendar day
    "daily_login_streak_bonus":  200,   # Additional per consecutive day (up to 7x = 1400 bonus)

    # ─── Chat XP ───
    "message_short":              10,   # 1-50 chars
    "message_medium":             25,   # 51-200 chars
    "message_long":               50,   # 201-500 chars
    "message_detailed":          100,   # 500+ chars (deep conversations)
    "conversation_milestone_10":  150,  # Bonus at 10 messages in one session
    "conversation_milestone_25":  300,  # Bonus at 25 messages in one session

    # ─── Games ───
    "game_start":                 50,   # Starting a game
    "game_action":                25,   # Each action/turn in a game
    "game_complete":             250,   # Completing a game session
    "game_win":                  500,   # Winning a game (if applicable)

    # ─── Voice ───
    "voice_note_request":         75,   # Requesting a voice note
    "voice_call_start":          100,   # Starting a voice call
    "voice_call_minute":          50,   # Per minute of voice call

    # ─── Creative / Multimodal ───
    "selfie_generate":           150,   # Generating a bot selfie
    "image_describe":             50,   # Describing an uploaded image
    "url_summarize":              50,   # Summarizing a URL
    "meme_generate":             100,   # Generating a meme
    "weather_check":              25,   # Checking weather

    # ─── Diary ───
    "diary_read":                 30,   # Reading a persona diary entry

    # ─── Profile ───
    "profile_complete":          500,   # Filling out all profile fields
    "profile_photo_upload":      200,   # Uploading profile photo
}

# Streak multiplier: min(1.0 + (streak_days - 1) * 0.15, 2.0)
MAX_STREAK_MULTIPLIER: float = 2.0
STREAK_MULTIPLIER_INCREMENT: float = 0.15

# Level calculation
XP_PER_LEVEL_BASE: int = 100  # level = floor(sqrt(total_xp / XP_PER_LEVEL_BASE))


def calculate_level(total_xp: int) -> int:
    """Calculate level from total XP using sqrt curve."""
    import math
    return int(math.floor(math.sqrt(total_xp / XP_PER_LEVEL_BASE)))


def calculate_streak_multiplier(streak_days: int) -> float:
    """Calculate XP multiplier based on consecutive login days."""
    if streak_days <= 1:
        return 1.0
    return min(1.0 + (streak_days - 1) * STREAK_MULTIPLIER_INCREMENT, MAX_STREAK_MULTIPLIER)


def get_message_xp(char_count: int) -> int:
    """Determine XP reward based on message length."""
    if char_count <= 50:
        return XP_REWARDS["message_short"]
    elif char_count <= 200:
        return XP_REWARDS["message_medium"]
    elif char_count <= 500:
        return XP_REWARDS["message_long"]
    else:
        return XP_REWARDS["message_detailed"]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# HELPER FUNCTIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def get_voice_id(bot_id: str) -> Optional[str]:
    """Get Cartesia voice ID for a bot."""
    return VOICE_MAPPING.get(bot_id)


def get_supported_languages(bot_id: str) -> list[str]:
    """Get list of supported languages for a bot."""
    return BOT_LANGUAGE_MAP.get(bot_id, [])


def validate_language(bot_id: str, language: str) -> bool:
    """Check if a language is supported by the given bot."""
    supported = get_supported_languages(bot_id)
    if not supported:
        return False
    return language.lower() in [lang.lower() for lang in supported]


def get_persona_origin(bot_id: str) -> Optional[dict[str, str]]:
    """Get origin city/country for a bot based on its region prefix."""
    for prefix, origin in PERSONA_ORIGIN_MAP.items():
        if bot_id.startswith(prefix):
            return origin
    return None


def get_archetype(bot_id: str) -> Optional[str]:
    """Get the archetype (mentor/friend/romantic) for a bot."""
    return ARCHETYPE_MAP.get(bot_id)


def get_bot_face_image(bot_id: str) -> str:
    """Get the face image filename for a bot."""
    return BOT_FACE_IMAGES.get(bot_id, f"{bot_id}.jpeg")
