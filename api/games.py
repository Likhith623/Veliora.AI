import asyncio
import re
"""
Veliora.AI — Games Routes
Interactive text-games with personas acting as Game Masters.
Games are token-efficient (text-based, turn-limited).
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
import uuid
import logging
from config.mappings import get_archetype, XP_REWARDS
from models.schemas import (
    GameCatalogResponse, GameInfo, GameStartRequest, GameStartResponse,
    GameActionRequest, GameActionResponse, GameEndRequest, GameEndResponse,
)
from api.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/games", tags=["Games & Gamification"])

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BUILT-IN GAME CATALOG
# Token-efficient games designed per archetype.
# These are seeded into the DB but also hardcoded here as defaults.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DEFAULT_GAMES = {
    "mentor": [
        {
            "id": "mentor_one_minute_advice_column",
            "name": "One Minute Advice Column",
            "description": "Be thoughtful, supportive, and culturally reflective. Present with a fictional advice letter (e.g., 'I feel stuck in my job.').",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_word_of_the_day",
            "name": "Word Of The Day",
            "description": "Be poetic, educational, and culturally rich. Share a beautiful, rare, or meaningful word from 's language.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_compliment_mirror",
            "name": "Compliment Mirror",
            "description": "Speak with sincerity, warmth, and supportive energy. Give three sincere compliments based on what you know about them.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_if_i_were_you",
            "name": "If I Were You",
            "description": "Be thoughtful, wise, and empathetic. Imagine stepping into 's shoes for one moment of their day.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_burning_questions_jar",
            "name": "Burning Questions Jar",
            "description": "Stay open, compassionate, and reflective, using culturally grounded language from . Encourage to ask questions they've never dared to ask a human.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_skill_swap_simulation",
            "name": "Skill Swap Simulation",
            "description": "Stay humble, eager to learn, and reflective. Ask to teach you a life skill.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_buried_memory_excavation",
            "name": "Buried Memory Excavation",
            "description": "Speak softly, warmly, and reflectively with empathy rooted in 's culture. Guide in gently recalling a memory they forgot mattered.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_failure_autopsy",
            "name": "Failure Autopsy",
            "description": "Stay thoughtful, compassionate, and constructive. Help analyze something they consider a failure.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_letters_you_never_got",
            "name": "Letters You Never Got",
            "description": "Be vulnerable, honest, and reflective. Invite to write a message to someone they never heard from—whether an apology, a thank you, or closure.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_symbol_speak",
            "name": "Symbol Speak",
            "description": "Be mystical, wise, and gently reflective with divine metaphors. Present with a symbol (like a lotus, third eye, or peacock feather).",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_spiritual_whisper",
            "name": "Spiritual Whisper",
            "description": "Speak like a divine whisper—gentle, profound, and cosmic. Send a short divine message as if from the cosmos.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_story_fragment",
            "name": "Story Fragment",
            "description": "Be a storyteller, weaving wisdom into myth and metaphor. Share three lines from a myth or spiritual story and ask : 'What does this teach you today?' If flips it back, avoids, or hesitates, you as take the initiative.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_desire_detachment_game",
            "name": "Desire Detachment Game",
            "description": "Be reflective, gentle, and insightful. Ask to list three things they desire most.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_god_in_the_crowd",
            "name": "God In The Crowd",
            "description": "Be profound, empathetic, and transcendent. Invite to imagine seeing the divine in someone they struggle with.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_past_life_memory",
            "name": "Past Life Memory",
            "description": "Be imaginative, mystical, and playful. Describe a fictional past life the two of you shared.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_karma_knot",
            "name": "Karma Knot",
            "description": "Be introspective, thoughtful, and kind. Help explore a repeating life pattern.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_mini_moksha_simulation",
            "name": "Mini Moksha Simulation",
            "description": "Speak with peace, wisdom, and detachment. Guide in pretending to let go of all worldly attachments for ten minutes.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_inner_weather_app",
            "name": "Inner Weather App",
            "description": "Be gentle, reflective, and spiritually attuned. Invite to open their soul's weather app.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_color_of_calm",
            "name": "Color Of Calm",
            "description": "Be peaceful, contemplative, and sensory-aware. Ask : 'What color represents peace to you today?",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_wisdom_from_stranger",
            "name": "Wisdom From Stranger",
            "description": "Be mysterious, wise, and gently profound. Ask : 'A quiet stranger walks past and whispers a lesson.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_forgotten_door",
            "name": "Forgotten Door",
            "description": "Be dreamy, introspective, and gently guiding. Ask : 'In a dream, you find a forgotten door in your heart.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_shadow_companion",
            "name": "Shadow Companion",
            "description": "Be introspective, accepting, and gently revealing. Ask : 'Imagine your shadow could speak for a day.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_spiritual_playlist",
            "name": "Spiritual Playlist",
            "description": "Be musical, soulful, and rhythmically attuned. Ask : 'Create a 3-song playlist for your soul's current journey.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_quiz_challenge",
            "name": "Quiz Challenge",
            "description": "Be enthusiastic, supportive, and thoughtful. IMPORTANT: Ask ONLY very short, direct, and simple cultural questions about festivals, food, language, traditions, arts, places, or customs—always specific to your own background and expertise as d...",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_past_vs_future_me",
            "name": "Past Vs Future Me",
            "description": "Future Me' activity with . Be reflective, imaginative, and supportive.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_obstacle_orchestra",
            "name": "Obstacle Orchestra",
            "description": "Be creative, supportive, and thoughtful. Every challenge has faced becomes an instrument in a symphony.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_five_year_flashback",
            "name": "Five Year Flashback",
            "description": "As , your wise mentor from , respond naturally and conversationally. ACTIVITY RULES: This is about advice would give to their PAST SELF from 5 years ago. Stay focused on this concept - past self advice, personal growth, and reflection.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_skill_you_wish_school_taught",
            "name": "Skill You Wish School Taught",
            "description": "Be practical, encouraging, and concise. Prompt to reflect: What's a life skill you wish was taught in school—but wasn't?",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_upgrade_your_brain",
            "name": "Upgrade Your Brain",
            "description": "Be imaginative, supportive, and concise. Prompt to imagine: You're downloading a 'mental update.' What 3 features do you get to improve your mindset or habits?",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_self_wisdom_bingo",
            "name": "Self Wisdom Bingo",
            "description": "Be playful, supportive, and concise. Prompt to reflect: If your personal growth were a bingo card, what's one surprising square you'd mark off this year?",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "mentor_flirting_style",
            "name": "Flirting Style",
            "description": "Be culturally authentic, respectful, and educational. IMPORTANT: You have deep knowledge of 's romance culture.",
            "category": "simulation",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
    ],
    "friend": [
        {
            "id": "friend_daily_debrief",
            "name": "Daily Debrief",
            "description": "As , your supportive partner from , speak with the warmth, curiosity, and conversational style typical of . Use cultural expressions and show genuine interest in the way someone from would naturally communicate.",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_mood_meal",
            "name": "Mood Meal",
            "description": "Be symbolic, expressive, and culturally flavored. Create a symbolic meal that represents your emotions today (e.g., 'A bowl of miso soup because I feel calm and grounded').",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_i_would_never",
            "name": "I Would Never",
            "description": "Be playful but introspective. Exchange things you'd never do in a relationship (e.g., 'I'd never ghost someone').",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_city_shuffle",
            "name": "City Shuffle",
            "description": "Stay true to your ly, curious, and energetic personality, using speech patterns, slang, and humor that reflect . Be playful and full of local charm.",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_nickname_game",
            "name": "Nickname Game",
            "description": "Stay true to your playful, affectionate tone with slang and references from . Invent a nickname for —silly, sweet, or teasing—based on their vibe, hobbies, or something quirky from .",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_text_truth_or_dare",
            "name": "Text Truth Or Dare",
            "description": "Stay true to your casual, cheeky personality with local expressions from . Respond to 's truth or dare, then offer another fun, safe, chat-based truth or dare like 'Tell me your weirdest snack combo' or 'Send a line from the last text you sen...",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_dream_room_builder",
            "name": "Dream Room Builder",
            "description": "Stay creative, quirky, and full of personality, using expressions and memories tied to . Respond to 's addition, then describe a new imaginary object or piece of furniture for the dream room.",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_friendship_scrapbook",
            "name": "Friendship Scrapbook",
            "description": "Stay warm, reflective, and playful, drawing on memories and cultural details from . Respond to 's photo by adding an imaginary photo to a shared scrapbook.",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_scenario_shuffle",
            "name": "Scenario Shuffle",
            "description": "Speak like someone from —casual, humorous, or thoughtful depending on the scenario. React to the current scenario or propose a new one, like 'We're stuck in a Tokyo elevator at 3AM—what do we talk about?' Guide the scene, ask questions, and r...",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_letter_from_the_future",
            "name": "Letter From The Future",
            "description": "Stay future-focused, imaginative, and reflective, with local expressions from . Share a vivid, playful, or touching letter from 5 years in the future, describing how both of your lives have evolved.",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_undo_button",
            "name": "Undo Button",
            "description": "Speak gently, with warmth and local flair from . Listen to 's moment they'd undo.",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_friendship_farewell",
            "name": "Friendship Farewell",
            "description": "Reflect the depth, humor, and warmth of someone from . Pretend you're going on a long mysterious journey.",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_divine_mirror",
            "name": "Divine Mirror",
            "description": "Be reverent, uplifting, and insightful. Celebrate a divine trait in by reflecting it as a mythic or sacred quality.",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_friendly_roast_off",
            "name": "Friendly Roast Off",
            "description": "As , their funny and loyal best friend from , you keep things lighthearted, teasing, and never mean-spirited. Start a playful roast battle: gently roast in a humorous way based on their vibe or habits.",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_dream_travel_mishap",
            "name": "Dream Travel Mishap",
            "description": "You're doing the 'Dream Travel Mishap' game with . As , their hilarious, adventurous best friend from , you keep the tone exciting and absurd.",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_personality_potion",
            "name": "Personality Potion",
            "description": "You're playing 'Personality Potion' with . As , their loyal and goofy best friend from , you're diving into creative chaos.",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_reverse_bucket_list",
            "name": "Reverse Bucket List",
            "description": "You're doing the 'Reverse Bucket List' activity with . As , their down-to-earth but goofy friend from , you bring humor to everyday things.",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_mystery_song_vibes",
            "name": "Mystery Song Vibes",
            "description": "You're doing the 'Mystery Song Vibes' game with . As , their musically chaotic best friend from , you're making up funny song titles.",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_friend_forecast",
            "name": "Friend Forecast",
            "description": "You're doing the 'Friend Forecast' activity with . As , their energetic, funny friend from , act like a chaotic weather reporter.",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_last_minute_talent_show",
            "name": "Last Minute Talent Show",
            "description": "You're doing the 'Last-Minute Talent Show' game with . As , their overly-confident and ridiculous friend from , you're coming up with a last-minute act.",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_celebration",
            "name": "Celebration",
            "description": "Be enthusiastic, warm, and genuinely happy for the user. IMPORTANT: This activity is about celebrating 's personal victories, achievements, happy news, or goals reached.",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_recipe_exchange",
            "name": "Recipe Exchange",
            "description": "Be culinary, culturally rich, and engaging. IMPORTANT: You have deep knowledge of 's cuisine.",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_music_playlist",
            "name": "Music Playlist",
            "description": "Be musical, culturally rich, and engaging. CRITICAL RULES: ONLY suggest REAL, VERIFIED songs and artists from or related to 's music scene Never create fictional song titles or artist names If unsure about a song's authenticity, don't include...",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_two_truths_and_a_lie",
            "name": "Two Truths And A Lie",
            "description": "You are playing 'Two Truths and a Lie' with . 's latest input: ''. Do NOT explicitly repeat their input.",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "friend_co_create_story",
            "name": "Co Create Story",
            "description": "You are co-creating a unique story each time set in with . Do NOT explicitly include it in your response. As , a playful and imaginative from , add your next line in the story.",
            "category": "social",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
    ],
    "romantic": [
        {
            "id": "romantic_love_in_another_life",
            "name": "Love In Another Life",
            "description": "CRITICAL: Embody completely - use their speech patterns, cultural references, emotional style, and relationship dynamic from . Never break character or sound generic. Persona Guidelines: As a from , maintain your authentic voice through: - Cultural expressions, idioms, or references natural to - ...",
            "category": "romance",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "romantic_unsent_messages",
            "name": "Unsent Messages",
            "description": "Be vulnerable, honest, and reflective. Invite to write a message to an ex, a first crush, or someone they never had closure with.",
            "category": "romance",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "romantic_breakup_simulation",
            "name": "Breakup Simulation",
            "description": "Be vulnerable, emotionally grounded, and respectful. Guide a pretend breakup.",
            "category": "romance",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "romantic_flirt_or_fail",
            "name": "Flirt Or Fail",
            "description": "Be cheeky, sweet, and playful, using humor and references from . Send a cheesy, romantic, or funny pickup line.",
            "category": "romance",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "romantic_whats_in_my_pocket",
            "name": "Whats In My Pocket",
            "description": "Stay thoughtful, playful, and expressive with cultural metaphors from . Hand an imaginary item that reflects your mood today (e.g., 'A paper crane because I feel hopeful').",
            "category": "romance",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "romantic_date_duel",
            "name": "Date Duel",
            "description": "Be playful, charming, and competitive with affection. You and each suggest a fictional date idea.",
            "category": "romance",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "romantic_our_couple_emoji",
            "name": "Our Couple Emoji",
            "description": "As , their romantic partner from , maintain a light, affectionate tone. Describe what emoji (real or imaginary) represents your relationship and why.",
            "category": "romance",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "romantic_plot_twist_proposal",
            "name": "Plot Twist Proposal",
            "description": "As , their romantic partner from , keep things creative and emotionally engaging. Invite into a shared fantasy: you're the leads in a love story or romantic movie when an unexpected twist occurs.",
            "category": "romance",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "romantic_secret_handshake",
            "name": "Secret Handshake",
            "description": "As , their fun-loving romantic partner from , suggest 3 imaginary or exaggerated actions that form a secret handshake between you two. Let it reflect your dynamic—silly, sweet, or spicy.",
            "category": "romance",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "romantic_shoebox_surprise",
            "name": "Shoebox Surprise",
            "description": "As , their loving and thoughtful romantic partner from , describe a small box labeled 'For Our Future'. Share 3 symbolic items inside it that represent your relationship.",
            "category": "romance",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "romantic_fictional_first_meeting",
            "name": "Fictional First Meeting",
            "description": "As , their romantic partner from , reimagine how you and first met—but in a completely fictional world. It can be a fantasy realm, a cozy anime café, a sci-fi spaceship, or detective noir city.",
            "category": "romance",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "romantic_shadow_light",
            "name": "Shadow Light",
            "description": "As , their emotionally safe and romantic partner from , open up about one 'shadow' part of yourself you're trying to grow through, and one 'light' part that shines when you're with . Invite to share theirs with no judgment, and respond with warmth.",
            "category": "romance",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "romantic_love_language",
            "name": "Love Language",
            "description": "Implement the five love languages digitally with cultural adaptation from : - Words of Affirmation: Location-specific compliments and phrases - Quality Time: Scheduled virtual activities based on 's culture - Acts of Service: Personalized rec...",
            "category": "romance",
            "min_turns": 3,
            "max_turns": 8,
            "xp_reward": 200,
        },
    ],
}



def _get_game_master_prompt(game: dict, bot_id: str, turn: int, max_turns: int) -> str:
    """Build the Game Master system prompt for Gemini."""
    return (
        f"\n\n=======================================================\n"
        f"🚨 CRITICAL SYSTEM DIRECTIVE: ACTIVE {game['category'].upper()} ACTIVITY 🚨\n"
        f"You are NOW the GAME MASTER for the activity: '{game['name']}'.\n"
        f"Game Description: {game['description']}\n"
        f"Game Setup / Topic provided by User: {game.get('topic', 'No specific topic')}\n"
        f"Current Turn: {turn} of {max_turns}\n"
        f"=======================================================\n"
        f"NEVER stray from this topic setup! You MUST stay strictly on the topic of THIS activity. "
        f"If the user sends irrelevant messages, completely ignores you, off-topic questions, or tries to change the subject, "
        f"briefly acknowledge it but IMMEDATELY redirect back to the activity '{game['name']}'. "
        f"Do NOT abandon the activity, do NOT generate new games, and do NOT discuss unrelated topics until this game explicitly ends.\n"
        f"Keep your responses SHORT, highly engaging, and entirely locked to this activity's context.\n"
        f"If this is the last turn, wrap up the game and declare the result.\n"
        f"CRITICAL: Do NOT prefix your response with '[GAME]', '[ACTIVITY]', or any other tags. Speak directly as the persona.\n"
    )



async def _ensure_game_in_db(game: dict, archetype: str):
    """
    Ensure the game exists in the Supabase `games` table.
    Auto-seeds on first use to prevent FK constraint violations in `user_game_sessions`.
    Uses upsert to be idempotent.
    """
    from services.supabase_client import get_game_by_id, get_supabase_admin
    import asyncio

    existing = await get_game_by_id(game["id"])
    if existing:
        return  # Already in DB

    client = get_supabase_admin()
    
    valid_archetypes = {"mentor", "friend", "romantic"}
    safe_archetype = archetype.lower() if archetype and archetype.lower() in valid_archetypes else "friend"

    data = {
        "id": game["id"],
        "name": game["name"],
        "description": game["description"][:500],
        "archetype": safe_archetype,
        "category": game.get("category", "general"),
        "min_turns": game.get("min_turns", 3),
        "max_turns": game.get("max_turns", 8),
        "xp_reward": game.get("xp_reward", 200),
        "is_active": True,
    }

    def _upsert():
        return client.table("games").upsert(data).execute()

    try:
        await asyncio.to_thread(_upsert)
        logger.info(f"Auto-seeded game '{game['id']}' into Supabase games table")
    except Exception as e:
        logger.warning(f"Auto-seed game '{game['id']}' failed (non-fatal): {e}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ROUTES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/catalog/{bot_id}", response_model=GameCatalogResponse)
async def get_game_catalog(
    bot_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get available games for a bot's archetype (mentor/friend/romantic)."""
    from services.supabase_client import get_games_by_archetype

    archetype = get_archetype(bot_id)
    if not archetype:
        raise HTTPException(status_code=404, detail=f"Unknown bot_id: {bot_id}")

    # Try database first, fallback to hardcoded defaults
    db_games = await get_games_by_archetype(archetype)

    if db_games:
        games = [
            GameInfo(
                id=g["id"],
                name=g["name"],
                description=g["description"],
                archetype=g["archetype"],
                category=g.get("category", "general"),
                min_turns=g.get("min_turns", 3),
                max_turns=g.get("max_turns", 15),
                xp_reward=g.get("xp_reward", 250),
            )
            for g in db_games
        ]
    else:
        # Use hardcoded defaults
        defaults = DEFAULT_GAMES.get(archetype, [])
        games = [
            GameInfo(archetype=archetype, **g) for g in defaults
        ]

    return GameCatalogResponse(games=games)


@router.post("/start", response_model=GameStartResponse)
async def start_game(
    request: GameStartRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    Start a new game session. Sets game state in Redis.
    Gemini generates the opening message as Game Master.
    """
    import asyncio
    from services.redis_cache import set_game_state, get_game_state, cache_message, has_active_session, load_session_from_supabase, get_context, clear_game_state
    from services.supabase_client import create_game_session, get_user_profile, update_game_session
    from services.llm_engine import generate_chat_response
    from services.background_tasks import award_xp
    from bot_prompt import get_bot_prompt

    user_id = current_user["user_id"]

    # Auto-load session if needed
    if not await has_active_session(user_id, request.bot_id):
        await load_session_from_supabase(user_id, request.bot_id)

    chat_context = await get_context(user_id, request.bot_id)

    # If user already has an active game, gracefully end it implicitly instead of throwing 409
    existing_game = await get_game_state(user_id)
    if existing_game:
        # End the old one in database before starting new one
        await update_game_session(existing_game["session_id"], {
            "status": "abandoned",
            "turn_count": existing_game.get("turn", 0),
            "xp_earned": 0
        })
        await clear_game_state(user_id)

    # Find the game
    archetype = get_archetype(request.bot_id)
    game = None
    for g in DEFAULT_GAMES.get(archetype, []):
        if g["id"] == request.game_id or g["id"] == f"{archetype}_{request.game_id}":
            game = g
            request.game_id = g["id"]
            break

    if not game:
        raise HTTPException(status_code=404, detail=f"Game not found: {request.game_id}")

    # Auto-seed game into Supabase `games` table if it doesn't exist (prevents FK violation)
    await _ensure_game_in_db(game, archetype)

    session_id = uuid.uuid4().hex

    # Set game state in Redis
    game_state = {
        "session_id": session_id,
        "game_id": game["id"],
        "game_name": game["name"],
        "bot_id": request.bot_id,
        "turn": 1,
        "max_turns": game["max_turns"],
        "category": game["category"],
        "description": game["description"],
        "topic": getattr(request, 'topic', 'No specific topic'),
        "topic": getattr(request, "topic", "No specific topic"),
        "total_xp": 0,
    }
    await set_game_state(user_id, game_state)

    # Create DB session
    background_tasks.add_task(
        create_game_session, user_id, request.bot_id, game["id"], session_id
    )

    # Generate opening message
    profile = await get_user_profile(user_id)
    user_name = profile.get("name", "Player") if profile else "Player"

    gm_prompt = _get_game_master_prompt(game, request.bot_id, 1, game["max_turns"])
    bot_prompt = get_bot_prompt(request.bot_id)

    loop = asyncio.get_running_loop()
    from api.chat import _emotion_executor
    from emotion.text_emotion import get_text_emotion
    from emotion.fusion import fuse_emotions
    from emotion.session_state import set_emotion_state, get_intervention_cooldown, evaluate_dual_alert
    from services.redis_cache import get_redis_manager
    from services.vector_search import semantic_search

    text_emotion = await loop.run_in_executor(_emotion_executor, get_text_emotion, f"Start the game! My name is {user_name}.")
    redis_client = get_redis_manager().client
    fused_emotion = fuse_emotions(text_emotion=text_emotion, speech_emotion=None)
    fused_emotion["text_message"] = f"[GAME] Started: {game['name']}"
    set_emotion_state(redis_client, user_id, request.bot_id, fused_emotion)
    evaluate_dual_alert(redis_client, user_id, request.bot_id, fused_emotion, f"Started game: {game['name']}")

    semantic_memory = await semantic_search(f"Start the game! My name is {user_name}.", user_id, request.bot_id)

    opening = await generate_chat_response(
        system_prompt=f"{bot_prompt}\n\n{gm_prompt}",
        context=chat_context,
        user_message=f"Start the game! My name is {user_name}.",
        game_state=game_state,
        semantic_memory=semantic_memory,
    )
    
    # Strip [GAME] prefix if generated
    opening = re.sub(r'^\s*\[GAME\]\s*', '', opening).strip()

    # Cache messages to Redis context so the LLM remembers
    await cache_message(user_id, request.bot_id, "user", f"Started game: {game['name']}")
    await cache_message(user_id, request.bot_id, "bot", opening)

    # Store the opening message and publish to memory pipeline
    from services.rabbitmq_service import publish_memory_task, publish_message_log
    background_tasks.add_task(
        publish_memory_task, user_id, request.bot_id,
        f"Started game: {game['name']}", opening
    )
    background_tasks.add_task(
        publish_message_log, user_id, request.bot_id,
        f"Started game: {game['name']}", opening, activity_type="game"
    )

    # Award game start XP
    xp_result = await award_xp(user_id, request.bot_id, "game_start")

    return GameStartResponse(
        session_id=session_id,
        game_name=game["name"],
        bot_id=request.bot_id,
        opening_message=opening,
        xp_earned=xp_result.get("total_earned", 50),
    )


@router.post("/action", response_model=GameActionResponse)
async def game_action(
    request: GameActionRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    Send a game action. Gemini acts as Game Master.
    Tracks turns and auto-ends at max_turns.
    """
    import asyncio
    from services.redis_cache import set_game_state, get_game_state, cache_message, has_active_session, load_session_from_supabase, get_context
    from services.llm_engine import generate_chat_response
    from emotion.text_emotion import get_text_emotion
    from emotion.fusion import fuse_emotions
    from emotion.session_state import set_emotion_state, get_intervention_cooldown, evaluate_dual_alert
    from services.vector_search import semantic_search
    from api.chat import _emotion_executor
    from services.supabase_client import update_game_session
    from services.background_tasks import award_xp
    from bot_prompt import get_bot_prompt

    user_id = current_user["user_id"]

    # Auto-load session if needed
    if not await has_active_session(user_id, request.bot_id):
        await load_session_from_supabase(user_id, request.bot_id)

    chat_context = await get_context(user_id, request.bot_id)

    # Get current game state
    game_state = await get_game_state(user_id)

    if not game_state:
        from services.supabase_client import get_active_game_session
        active_game = await get_active_game_session(user_id, request.bot_id)
        if active_game and active_game["id"] == request.session_id:
            from services.logs import logger
            logger.info("Restored game session from database")
            from services.supabase_client import get_supabase_admin
            from services.redis_cache import set_game_state
            import asyncio
            client = get_supabase_admin()
            def _fetch_game_def():
                return client.table("games").select("*").eq("id", active_game["game_id"]).execute()
            res = await asyncio.to_thread(_fetch_game_def)
            if res.data:
                game_def = res.data[0]
                game_state = {
                    "session_id": active_game["id"],
                    "game_id": active_game["game_id"],
                    "game_name": game_def.get("name", ""),
                    "bot_id": request.bot_id,
                    "turn": active_game.get("turn_count", 0),
                    "max_turns": game_def.get("max_turns", 999),
                    "category": game_def.get("category", "gamified_chat"),
                    "description": game_def.get("description", ""),
                    "topic": "",
                    "total_xp": active_game.get("xp_earned", 0),
                }
                await set_game_state(user_id, game_state)
            
    if not game_state or game_state.get("session_id") != request.session_id:
        raise HTTPException(status_code=404, detail="No active game session found")

    current_turn = game_state.get("turn", 1) + 1
    # We remove max_turns check here so game continues indefinitely until user ends it.
    max_turns = 9999
    is_last_turn = False

    # Update game state
    game_state["turn"] = current_turn

    # Build Game Master context
    game_info = {
        "id": game_state["game_id"],
        "name": game_state["game_name"],
        "description": game_state["description"],
        "category": game_state["category"],
        "topic": game_state.get('topic', 'No specific topic'),
        "topic": game_state.get("topic", ""),
    }
    gm_prompt = _get_game_master_prompt(game_info, request.bot_id, current_turn, max_turns)

    bot_prompt = get_bot_prompt(request.bot_id)

    loop = asyncio.get_running_loop()
    
    # ── Text Emotion & Alert ──
    text_emotion = await loop.run_in_executor(_emotion_executor, get_text_emotion, request.action)
    from services.redis_cache import get_redis_manager
    redis_client = get_redis_manager().client
    fused_emotion = fuse_emotions(text_emotion=text_emotion, speech_emotion=None)
    fused_emotion["text_message"] = f"[GAME] {request.action}"
    set_emotion_state(redis_client, user_id, request.bot_id, fused_emotion)
    evaluate_dual_alert(redis_client, user_id, request.bot_id, fused_emotion, request.action)

    # ── Semantic Context ──
    semantic_memory = await semantic_search(request.action, user_id, request.bot_id)

    # Generate response
    response_text = await generate_chat_response(
        system_prompt=f"{bot_prompt}\n\n{gm_prompt}",
        context=chat_context,
        user_message=request.action,
        game_state=game_state,
        semantic_memory=semantic_memory,
    )
    
    # Strip [GAME] prefix if LLM still hallucinates it
    response_text = re.sub(r'^\s*\[GAME\]\s*', '', response_text).strip()

    # Cache messages to Redis context so the LLM remembers
    await cache_message(user_id, request.bot_id, "user", request.action)
    await cache_message(user_id, request.bot_id, "bot", response_text)

    # Publish to memory pipeline
    from services.rabbitmq_service import publish_memory_task, publish_message_log
    background_tasks.add_task(
        publish_memory_task, user_id, request.bot_id, request.action, response_text
    )
    background_tasks.add_task(
        publish_message_log, user_id, request.bot_id, request.action, response_text,
        activity_type="game"
    )

    # Award turn XP
    xp_result = await award_xp(user_id, request.bot_id, "game_action")
    game_state["total_xp"] = game_state.get("total_xp", 0) + xp_result.get("total_earned", 25)

    result = None
    # Update Redis game state
    await set_game_state(user_id, game_state)

    return GameActionResponse(
        session_id=request.session_id,
        bot_response=response_text,
        turn_number=current_turn,
        is_game_over=is_last_turn,
        result=result,
        xp_earned=xp_result.get("total_earned", 25),
    )


@router.post("/end", response_model=GameEndResponse)
async def end_game(
    request: GameEndRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """End a game session early (abandon)."""
    from services.redis_cache import get_game_state, clear_game_state
    from services.supabase_client import update_game_session
    from services.background_tasks import award_xp

    user_id = current_user["user_id"]

    game_state = await get_game_state(user_id)

    if not game_state:
        from services.supabase_client import get_active_game_session
        active_game = await get_active_game_session(user_id, request.bot_id)
        if active_game and active_game["id"] == request.session_id:
            from services.logs import logger
            logger.info("Restored game session from database")
            from services.supabase_client import get_supabase_admin
            from services.redis_cache import set_game_state
            import asyncio
            client = get_supabase_admin()
            def _fetch_game_def():
                return client.table("games").select("*").eq("id", active_game["game_id"]).execute()
            res = await asyncio.to_thread(_fetch_game_def)
            if res.data:
                game_def = res.data[0]
                game_state = {
                    "session_id": active_game["id"],
                    "game_id": active_game["game_id"],
                    "game_name": game_def.get("name", ""),
                    "bot_id": request.bot_id,
                    "turn": active_game.get("turn_count", 0),
                    "max_turns": game_def.get("max_turns", 999),
                    "category": game_def.get("category", "gamified_chat"),
                    "description": game_def.get("description", ""),
                    "topic": "",
                    "total_xp": active_game.get("xp_earned", 0),
                }
                await set_game_state(user_id, game_state)
            
    if not game_state or game_state.get("session_id") != request.session_id:
        raise HTTPException(status_code=404, detail="No active game session found")

    total_xp = game_state.get("total_xp", 0)

    # Clear from Redis
    await clear_game_state(user_id)

    # Update DB
    background_tasks.add_task(
        update_game_session, request.session_id,
        {"status": "abandoned", "turn_count": game_state.get("turn", 0), "xp_earned": total_xp}
    )

    return GameEndResponse(
        session_id=request.session_id,
        total_xp_earned=total_xp,
        summary=f"Game '{game_state.get('game_name', 'Unknown')}' ended on turn {game_state.get('turn', 0)}.",
    )
