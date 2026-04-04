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
            "id": "mentor_wisdom_quest",
            "name": "Wisdom Quest",
            "description": "Answer life's big questions. The mentor poses philosophical dilemmas and you reason through them together. Earn XP for thoughtful answers.",
            "category": "philosophy",
            "min_turns": 5,
            "max_turns": 10,
            "xp_reward": 250,
        },
        {
            "id": "mentor_culture_trivia",
            "name": "Culture Compass",
            "description": "Test your knowledge about the mentor's home city and culture. From food to history, see how well you know their world.",
            "category": "trivia",
            "min_turns": 5,
            "max_turns": 12,
            "xp_reward": 200,
        },
        {
            "id": "mentor_life_simulator",
            "name": "Life Crossroads",
            "description": "Face real-life dilemmas and make choices. The mentor guides you through consequences of each decision. A life-advice simulator.",
            "category": "simulation",
            "min_turns": 5,
            "max_turns": 10,
            "xp_reward": 300,
        },
    ],
    "friend": [
        {
            "id": "friend_would_you_rather",
            "name": "Would You Rather?",
            "description": "Classic would-you-rather with wild, culturally-flavored scenarios. Your friend gets increasingly creative and absurd!",
            "category": "party",
            "min_turns": 5,
            "max_turns": 15,
            "xp_reward": 200,
        },
        {
            "id": "friend_story_builder",
            "name": "Story Chain",
            "description": "Build a collaborative story one sentence at a time. Your friend adds twists and you keep the narrative alive!",
            "category": "creative",
            "min_turns": 8,
            "max_turns": 15,
            "xp_reward": 250,
        },
        {
            "id": "friend_two_truths",
            "name": "Two Truths & A Lie",
            "description": "Take turns sharing two truths and a lie. Can you fool your friend? Can you spot theirs?",
            "category": "social",
            "min_turns": 4,
            "max_turns": 10,
            "xp_reward": 200,
        },
        {
            "id": "friend_music_battle",
            "name": "Song Lyrics Battle",
            "description": "Quote lyrics and your friend guesses the song (or vice versa). Culturally themed to their musical taste!",
            "category": "music",
            "min_turns": 5,
            "max_turns": 12,
            "xp_reward": 200,
        },
    ],
    "romantic": [
        {
            "id": "romantic_dream_date",
            "name": "Dream Date Planner",
            "description": "Plan the perfect dream date together. Choose the city, activity, food, and vibe. Your partner reacts to each choice!",
            "category": "romance",
            "min_turns": 5,
            "max_turns": 10,
            "xp_reward": 250,
        },
        {
            "id": "romantic_love_language",
            "name": "Love Language Quiz",
            "description": "Discover your love language through playful scenarios. Your partner interprets your choices with flirty commentary.",
            "category": "quiz",
            "min_turns": 5,
            "max_turns": 8,
            "xp_reward": 200,
        },
        {
            "id": "romantic_20_questions",
            "name": "20 Flirty Questions",
            "description": "A flirty version of 20 questions where the stakes and chemistry keep rising with each answer!",
            "category": "social",
            "min_turns": 10,
            "max_turns": 20,
            "xp_reward": 300,
        },
    ],
}


def _get_game_master_prompt(game: dict, bot_id: str, turn: int, max_turns: int) -> str:
    """Build the Game Master system prompt for Gemini."""
    return (
        f"You are now the GAME MASTER for the game '{game['name']}'.\n"
        f"Game Description: {game['description']}\n"
        f"Current Turn: {turn}/{max_turns}\n"
        f"Stay in your personality as {bot_id} while facilitating the game.\n"
        f"Keep responses SHORT (2-3 sentences). Track the game state.\n"
        f"If this is the last turn, wrap up the game and declare the result.\n"
        f"Game Category: {game['category']}\n"
    )


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
    from services.redis_cache import set_game_state, get_game_state
    from services.supabase_client import create_game_session, get_user_profile
    from services.llm_engine import generate_chat_response
    from services.background_tasks import award_xp, sync_message_to_db
    from bot_prompt import get_bot_prompt

    user_id = current_user["user_id"]

    # Check if user already has an active game
    existing_game = await get_game_state(user_id)
    if existing_game:
        raise HTTPException(
            status_code=409,
            detail="You already have an active game. End it first with /games/end."
        )

    # Find the game
    archetype = get_archetype(request.bot_id)
    game = None
    for g in DEFAULT_GAMES.get(archetype, []):
        if g["id"] == request.game_id:
            game = g
            break

    if not game:
        raise HTTPException(status_code=404, detail=f"Game not found: {request.game_id}")

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

    opening = await generate_chat_response(
        system_prompt=f"{bot_prompt}\n\n{gm_prompt}",
        context=[],
        user_message=f"Start the game! My name is {user_name}.",
    )

    # Store the opening message
    background_tasks.add_task(
        sync_message_to_db, user_id, request.bot_id, "bot", opening
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
    from services.redis_cache import set_game_state, get_game_state
    from services.llm_engine import generate_chat_response
    from services.supabase_client import update_game_session
    from services.background_tasks import award_xp, sync_message_to_db
    from bot_prompt import get_bot_prompt

    user_id = current_user["user_id"]

    # Get current game state
    game_state = await get_game_state(user_id)
    if not game_state or game_state.get("session_id") != request.session_id:
        raise HTTPException(status_code=404, detail="No active game session found")

    current_turn = game_state.get("turn", 1) + 1
    max_turns = game_state.get("max_turns", 10)
    is_last_turn = current_turn >= max_turns

    # Update game state
    game_state["turn"] = current_turn

    # Build Game Master context
    game_info = {
        "id": game_state["game_id"],
        "name": game_state["game_name"],
        "description": game_state["description"],
        "category": game_state["category"],
    }
    gm_prompt = _get_game_master_prompt(game_info, request.bot_id, current_turn, max_turns)

    if is_last_turn:
        gm_prompt += "\nThis is the FINAL TURN. Wrap up the game, announce the result, and say goodbye!"

    bot_prompt = get_bot_prompt(request.bot_id)

    # Generate response
    response_text = await generate_chat_response(
        system_prompt=f"{bot_prompt}\n\n{gm_prompt}",
        context=[],
        user_message=request.action,
        game_state=game_state,
    )

    # Store messages
    background_tasks.add_task(
        sync_message_to_db, user_id, request.bot_id, "user", request.action
    )
    background_tasks.add_task(
        sync_message_to_db, user_id, request.bot_id, "bot", response_text
    )

    # Award turn XP
    xp_result = await award_xp(user_id, request.bot_id, "game_action")
    game_state["total_xp"] = game_state.get("total_xp", 0) + xp_result.get("total_earned", 25)

    result = None
    if is_last_turn:
        # Auto-end the game
        result = "completed"
        completion_xp = await award_xp(user_id, request.bot_id, "game_complete")
        game_state["total_xp"] += completion_xp.get("total_earned", 250)

        # Clear game state from Redis
        from services.redis_cache import clear_game_state
        await clear_game_state(user_id)

        # Update DB session
        background_tasks.add_task(
            update_game_session, request.session_id,
            {"status": "completed", "turn_count": current_turn, "xp_earned": game_state["total_xp"]}
        )
    else:
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
