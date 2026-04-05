"""Games router - Fun & emotional games with proper auth and XP awards."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from realtime_communication.models.schemas import StartGameRequest, GameActionRequest
from realtime_communication.services.supabase_client import get_supabase
from realtime_communication.services.auth_service import get_current_user_id
from realtime_communication.services.xp_service import award_xp, check_and_level_up
from realtime_communication.services.notification_service import send_notification

router = APIRouter(prefix="/games", tags=["Games"])


def _get_initial_game_data(game_type: str) -> dict:
    """Get initial game data based on game type."""
    game_inits = {
        "emotion_charades": {
            "emotions": ["happy", "sad", "excited", "nervous", "grateful", "nostalgic", "hopeful", "peaceful"],
            "current_emotion": None, "guesses": []
        },
        "two_truths_lie": {"statements": [], "guesses": [], "reveals": []},
        "story_chain": {"story": [], "word_limit": 20},
        "gratitude_jar": {"entries": [], "read_entries": []},
        "would_you_rather": {
            "questions": [
                {"a": "Be able to speak every language", "b": "Be able to talk to animals"},
                {"a": "Live in the past", "b": "Live in the future"},
                {"a": "Have unlimited money", "b": "Have unlimited time"},
                {"a": "Know how you die", "b": "Know when you die"},
                {"a": "Be famous", "b": "Be rich"}
            ],
            "answers": {}, "predictions": {}
        },
    }
    return game_inits.get(game_type, {})


@router.get("/")
async def get_all_games():
    """Get all available games."""
    db = get_supabase()
    
    games = db.table("games") \
        .select("*") \
        .eq("is_active", True) \
        .order("category") \
        .execute()
    
    categories = {}
    for game in (games.data or []):
        cat = game.get("category", "other")
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(game)
    
    return {"games": games.data or [], "categories": categories}


@router.post("/start")
async def start_game(req: StartGameRequest, user_id: str = Depends(get_current_user_id)):
    """Start a game session."""
    db = get_supabase()
    
    game = db.table("games").select("*").eq("id", req.game_id).execute()
    if not game.data:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game_data = game.data[0]
    
    players = [{"user_id": user_id, "score": 0}]
    partner_id = None
    
    if req.relationship_id:
        rel = db.table("relationships").select("*").eq("id", req.relationship_id).eq("status", "active").execute()
        if rel.data:
            rel_data = rel.data[0]
            if user_id not in [rel_data["user_a_id"], rel_data["user_b_id"]]:
                raise HTTPException(status_code=403, detail="Not part of this relationship")
            partner_id = rel_data["user_b_id"] if rel_data["user_a_id"] == user_id else rel_data["user_a_id"]
            players.append({"user_id": partner_id, "score": 0})
    
    session = db.table("game_sessions").insert({
        "game_id": req.game_id,
        "relationship_id": req.relationship_id,
        "room_id": req.room_id,
        "players": players,
        "status": "active",
        "current_round": 1,
        "total_rounds": game_data.get("estimated_minutes", 10) // 2,
        "started_at": datetime.utcnow().isoformat(),
        "game_data": _get_initial_game_data(game_data["game_type"])
    }).execute()
    
    if not session.data:
        raise HTTPException(status_code=500, detail="Failed to start game")
    
    # Notify partner
    if partner_id:
        sender = db.table("profiles").select("display_name").eq("id", user_id).execute()
        sender_name = sender.data[0]["display_name"] if sender.data else "Your friend"
        await send_notification(
            partner_id, "game_invite",
            data={"session_id": session.data[0]["id"], "game_id": req.game_id},
            sender=sender_name, game=game_data["title"]
        )
    
    return {
        "session": session.data[0],
        "game": game_data,
        "initial_data": session.data[0].get("game_data", {})
    }


@router.post("/action")
async def game_action(req: GameActionRequest, user_id: str = Depends(get_current_user_id)):
    """Perform a game action."""
    db = get_supabase()
    
    session = db.table("game_sessions").select("*").eq("id", req.session_id).execute()
    if not session.data:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    session_data = session.data[0]
    game_data = session_data.get("game_data", {})
    
    game = db.table("games").select("game_type, bond_points_reward, xp_reward").eq("id", session_data["game_id"]).execute()
    game_info = game.data[0] if game.data else {}
    
    result = {"success": True}
    
    if req.action == "submit":
        game_data[f"answer_{user_id}"] = req.data
        result["submitted"] = True
    elif req.action == "guess":
        game_data.setdefault("guesses", []).append({
            "user_id": user_id,
            "guess": req.data,
            "timestamp": datetime.utcnow().isoformat()
        })
        result["guess_recorded"] = True
    elif req.action == "reveal":
        game_data.setdefault("reveals", []).append(req.data)
        result["revealed"] = True
    elif req.action == "next_round":
        db.table("game_sessions").update({
            "game_data": game_data,
            "current_round": session_data.get("current_round", 0) + 1,
        }).eq("id", req.session_id).execute()
        return result
    elif req.action == "complete":
        bond_points = game_info.get("bond_points_reward", 5)
        xp_reward = game_info.get("xp_reward", 10)
        
        db.table("game_sessions").update({
            "status": "completed",
            "completed_at": datetime.utcnow().isoformat(),
            "bond_points_awarded": bond_points,
        }).eq("id", req.session_id).execute()
        
        # Award bond points to relationship
        if session_data.get("relationship_id"):
            rel = db.table("relationships").select("bond_points").eq("id", session_data["relationship_id"]).execute()
            if rel.data:
                new_bp = rel.data[0].get("bond_points", 0) + bond_points
                db.table("relationships").update({"bond_points": new_bp}).eq("id", session_data["relationship_id"]).execute()
                await check_and_level_up(session_data["relationship_id"])
        
        # Award XP to all players
        for player in session_data.get("players", []):
            try:
                await award_xp(player["user_id"], xp_reward, "game", "game_reward",
                              source_id=req.session_id)
            except Exception:
                pass
        
        result["completed"] = True
        result["bond_points_awarded"] = bond_points
        result["xp_awarded"] = xp_reward
        return result
    
    # Update game data
    db.table("game_sessions").update({
        "game_data": game_data,
    }).eq("id", req.session_id).execute()
    
    return result


@router.get("/session/{session_id}")
async def get_game_session(session_id: str, user_id: str = Depends(get_current_user_id)):
    """Get current game session state."""
    db = get_supabase()
    
    session = db.table("game_sessions") \
        .select("*, games(*)") \
        .eq("id", session_id) \
        .execute()
    
    if not session.data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"session": session.data[0]}


@router.get("/history/{relationship_id}")
async def get_game_history(relationship_id: str, user_id: str = Depends(get_current_user_id)):
    """Get game history for a relationship."""
    db = get_supabase()
    
    sessions = db.table("game_sessions") \
        .select("*, games(title, icon_emoji, category)") \
        .eq("relationship_id", relationship_id) \
        .eq("status", "completed") \
        .order("completed_at", desc=True) \
        .limit(20) \
        .execute()
    
    total_points = sum(s.get("bond_points_awarded", 0) for s in (sessions.data or []))
    
    return {
        "sessions": sessions.data or [],
        "total_games": len(sessions.data or []),
        "total_bond_points": total_points
    }
