"""Games router - Fun & emotional games with proper auth and XP awards."""
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
import json
import asyncio
from datetime import datetime
from realtime_communication.models.schemas import StartGameRequest, GameActionRequest
from realtime_communication.services.supabase_client import get_supabase
from realtime_communication.services.auth_service import get_current_user_id
from realtime_communication.services.xp_service import award_xp, check_and_level_up
from realtime_communication.services.notification_service import send_notification

router = APIRouter(prefix="/games", tags=["Games"])

class BondGameManager:
    def __init__(self):
        self.connections: dict[str, dict[str, WebSocket]] = {}

    async def connect(self, ws: WebSocket, session_id: str, user_id: str):
        if session_id not in self.connections:
            self.connections[session_id] = {}
        self.connections[session_id][user_id] = ws

    def disconnect(self, session_id: str, user_id: str):
        if session_id in self.connections:
            self.connections[session_id].pop(user_id, None)
            if not self.connections[session_id]:
                del self.connections[session_id]

    async def broadcast(self, session_id: str, message: dict, exclude: str = None):
        if session_id in self.connections:
            for uid, ws in list(self.connections[session_id].items()):
                if exclude and uid == exclude:
                    continue
                try:
                    await ws.send_json(message)
                except Exception:
                    pass

    async def send_to(self, session_id: str, user_id: str, message: dict):
        if session_id in self.connections and user_id in self.connections[session_id]:
            try:
                await self.connections[session_id][user_id].send_json(message)
            except Exception:
                pass

bond_manager = BondGameManager()

@router.websocket("/ws/{session_id}/{user_id}")
async def bond_game_ws(websocket: WebSocket, session_id: str, user_id: str):
    await websocket.accept()
    db = get_supabase()
    
    session = db.table("game_sessions_realtime").select("*").eq("id", session_id).execute()
    if not session.data:
        await websocket.close(code=4004, reason="Session not found")
        return
        
    session_data = session.data[0]
    game_data = session_data.get("game_data", {})
    
    # Auto-migrate old game data to prevent client crashes
    needs_update = False
    if "current_q" not in game_data:
        game_data["current_q"] = 0
        needs_update = True
    if "answers" not in game_data:
        game_data["answers"] = {}
        needs_update = True
    if "scores" not in game_data:
        game_data["scores"] = {}
        needs_update = True
        
    # Check if questions are in the old format (dict with 'a' and 'b')
    if game_data.get("questions") and "a" in game_data["questions"][0]:
        new_qs = []
        for q in game_data["questions"]:
            if "a" in q:
                new_qs.append({
                    "q": f"Would you rather {q['a'].lower()} or {q['b'].lower()}?",
                    "opt_a": q['a'],
                    "opt_b": q['b']
                })
            else:
                new_qs.append(q)
        game_data["questions"] = new_qs
        needs_update = True
        
    if not game_data.get("questions"):
        # Default questions if completely missing
        game_data["questions"] = [
            {"q": "Ideal Friday night?", "opt_a": "Going out", "opt_b": "Staying in"},
            {"q": "Vacation preference?", "opt_a": "Beach", "opt_b": "Mountains"},
            {"q": "Morning person or Night owl?", "opt_a": "Morning", "opt_b": "Night"}
        ]
        needs_update = True

    if needs_update:
        db.table("game_sessions_realtime").update({"game_data": game_data}).eq("id", session_id).execute()

    await bond_manager.connect(websocket, session_id, user_id)
    
    try:
        session_data = session.data[0]
        game_data = session_data.get("game_data", {})
        
        conns = bond_manager.connections.get(session_id, {})
        if len(conns) < 2:
            await bond_manager.send_to(session_id, user_id, {"type": "waiting_for_opponent"})
        else:
            await bond_manager.broadcast(session_id, {"type": "opponent_joined"})
            
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            msg_type = msg.get("type")
            
            if msg_type == "ready":
                conns = bond_manager.connections.get(session_id, {})
                if len(conns) >= 2:
                    current_state = db.table("game_sessions_realtime").select("*").eq("id", session_id).execute().data[0]
                    players = current_state.get("players", [])
                    player_ids = [p.get("user_id") for p in players if isinstance(p, dict) and "user_id" in p]
                    
                    db.table("game_sessions_realtime").update({
                        "status": "active",
                        "started_at": datetime.utcnow().isoformat(),
                    }).eq("id", session_id).execute()
                    
                    await bond_manager.broadcast(session_id, {
                        "type": "game_start", 
                        "state": current_state.get("game_data", {}),
                        "players": player_ids,
                        "is_initiator": user_id == player_ids[0] if player_ids else False
                    })
                else:
                    await bond_manager.send_to(session_id, user_id, {"type": "waiting_for_opponent"})
                    
            elif msg_type == "move":
                ans = msg.get("data", {}).get("answer")
                if ans is not None:
                    curr = db.table("game_sessions_realtime").select("*").eq("id", session_id).execute()
                    if not curr.data:
                        continue
                    curr_session = curr.data[0]
                    curr_game_data = curr_session.get("game_data", {})
                    
                    if "answers" not in curr_game_data:
                        curr_game_data["answers"] = {}
                    
                    curr_game_data["answers"][user_id] = ans
                    
                    players = curr_session.get("players", [])
                    player_ids = [p.get("user_id") for p in players if isinstance(p, dict) and "user_id" in p]
                    
                    # Ensure player_a and player_b are set for synchrony
                    if "player_a" not in curr_game_data and len(player_ids) >= 2:
                        curr_game_data["player_a"] = player_ids[0]
                        curr_game_data["player_b"] = player_ids[1]
                    
                    player_a = curr_game_data.get("player_a")
                    player_b = curr_game_data.get("player_b")
                    
                    ans_a = curr_game_data["answers"].get(player_a) if player_a else None
                    ans_b = curr_game_data["answers"].get(player_b) if player_b else None
                    
                    if ans_a is not None and ans_b is not None:
                        # Both answered!
                        match = (ans_a == ans_b)
                        
                        if "scores" not in curr_game_data:
                            curr_game_data["scores"] = {pid: 0 for pid in player_ids}
                            
                        if match:
                            curr_game_data["scores"][player_a] = curr_game_data["scores"].get(player_a, 0) + 10
                            curr_game_data["scores"][player_b] = curr_game_data["scores"].get(player_b, 0) + 10
                        
                        round_data = {
                            "match": match,
                            "ans_a": ans_a,
                            "ans_b": ans_b,
                            "state": curr_game_data
                        }
                        
                        db.table("game_sessions_realtime").update({
                            "game_data": curr_game_data
                        }).eq("id", session_id).execute()
                        
                        await bond_manager.broadcast(session_id, {
                            "type": "state", 
                            "state": curr_game_data
                        })
                        
                        await bond_manager.broadcast(session_id, {
                            "type": "round_result",
                            **round_data
                        })
                        
                        # Advance round
                        async def advance_round(sid, ga_data, pa, pb):
                            await asyncio.sleep(3)
                            r_curr = db.table("game_sessions_realtime").select("*").eq("id", sid).execute()
                            if not r_curr.data: return
                            latest_data = r_curr.data[0].get("game_data", {})
                            
                            latest_data["current_q"] = latest_data.get("current_q", 0) + 1
                            latest_data["answers"] = {pa: None, pb: None}
                            
                            questions = latest_data.get("questions", [])
                            if latest_data["current_q"] >= len(questions) and questions:
                                latest_data["status"] = "finished"
                                winner = pa if latest_data["scores"].get(pa, 0) > latest_data["scores"].get(pb, 0) else pb
                                if latest_data["scores"].get(pa, 0) == latest_data["scores"].get(pb, 0):
                                    winner = "tie"
                                
                                db.table("game_sessions_realtime").update({
                                    "game_data": latest_data,
                                    "status": "completed"
                                }).eq("id", sid).execute()
                                
                                await bond_manager.broadcast(sid, {
                                    "type": "game_over",
                                    "winner": winner,
                                    "scores": latest_data["scores"],
                                    "xp_awarded": 10
                                })
                            else:
                                db.table("game_sessions_realtime").update({
                                    "game_data": latest_data
                                }).eq("id", sid).execute()
                                
                                await bond_manager.broadcast(sid, {
                                    "type": "state",
                                    "state": latest_data
                                })
                        
                        asyncio.create_task(advance_round(session_id, curr_game_data, player_a, player_b))
                        
                    else:
                        db.table("game_sessions_realtime").update({
                            "game_data": curr_game_data
                        }).eq("id", session_id).execute()
                        
                        await bond_manager.broadcast(session_id, {
                            "type": "state", 
                            "state": curr_game_data
                        })
                        
            elif msg_type == "sync_state":
                await bond_manager.broadcast(session_id, {
                    "type": "sync_state",
                    "state": msg.get("state"),
                    "sender_id": user_id
                }, exclude=user_id)
                
    except WebSocketDisconnect:
        bond_manager.disconnect(session_id, user_id)
        await bond_manager.broadcast(session_id, {"type": "opponent_disconnected", "user_id": user_id})
    except Exception as e:
        bond_manager.disconnect(session_id, user_id)

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
                {"q": "Would you rather speak every language or talk to animals?", "opt_a": "Speak every language", "opt_b": "Talk to animals"},
                {"q": "Would you rather live in the past or the future?", "opt_a": "Live in the past", "opt_b": "Live in the future"},
                {"q": "Would you rather have unlimited money or time?", "opt_a": "Unlimited money", "opt_b": "Unlimited time"},
                {"q": "Would you rather know how you die or when?", "opt_a": "Know how you die", "opt_b": "Know when you die"},
                {"q": "Would you rather be famous or rich?", "opt_a": "Be famous", "opt_b": "Be rich"}
            ],
            "current_q": 0,
            "answers": {},
            "scores": {},
            "status": "playing"
        },
        "live_bond": {
            "questions": [
                {"q": "Ideal Friday night?", "opt_a": "Going out", "opt_b": "Staying in"},
                {"q": "Vacation preference?", "opt_a": "Beach", "opt_b": "Mountains"},
                {"q": "Morning person or Night owl?", "opt_a": "Morning", "opt_b": "Night"},
                {"q": "Coffee or Tea?", "opt_a": "Coffee", "opt_b": "Tea"},
                {"q": "Cats or Dogs?", "opt_a": "Cats", "opt_b": "Dogs"},
            ],
            "current_q": 0,
            "answers": {},
            "scores": {},
            "status": "playing"
        },
        "synchrony": {
            "questions": [
                {"q": "Ideal Friday night?", "opt_a": "Going out", "opt_b": "Staying in"},
                {"q": "Vacation preference?", "opt_a": "Beach", "opt_b": "Mountains"},
                {"q": "Morning person or Night owl?", "opt_a": "Morning", "opt_b": "Night"},
                {"q": "Coffee or Tea?", "opt_a": "Coffee", "opt_b": "Tea"},
                {"q": "Cats or Dogs?", "opt_a": "Cats", "opt_b": "Dogs"},
            ],
            "current_q": 0,
            "answers": {},
            "scores": {},
            "status": "playing"
        },
    }
    return game_inits.get(game_type, {})


@router.get("/")
async def get_all_games():
    """Get all available games."""
    db = get_supabase()
    
    games = db.table("games_realtime_communication") \
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
    
    game = db.table("games_realtime_communication").select("*").eq("id", req.game_id).execute()
    if not game.data:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game_data = game.data[0]
    
    players = [{"user_id": user_id, "score": 0}]
    partner_id = None
    
    if req.relationship_id:
        rel = db.table("relationships_realtime").select("*").eq("id", req.relationship_id).eq("status", "active").execute()
        if rel.data:
            rel_data = rel.data[0]
            if user_id not in [rel_data["user_a_id"], rel_data["user_b_id"]]:
                raise HTTPException(status_code=403, detail="Not part of this relationship")
            partner_id = rel_data["user_b_id"] if rel_data["user_a_id"] == user_id else rel_data["user_a_id"]
            players.append({"user_id": partner_id, "score": 0})
    
    session = db.table("game_sessions_realtime").insert({
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
        sender = db.table("profiles_realtime").select("display_name").eq("id", user_id).execute()
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
    
    session = db.table("game_sessions_realtime").select("*").eq("id", req.session_id).execute()
    if not session.data:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    session_data = session.data[0]
    game_data = session_data.get("game_data", {})
    
    game = db.table("games_realtime_communication").select("game_type, bond_points_reward, xp_reward").eq("id", session_data["game_id"]).execute()
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
        db.table("game_sessions_realtime").update({
            "game_data": game_data,
            "current_round": session_data.get("current_round", 0) + 1,
        }).eq("id", req.session_id).execute()
        return result
    elif req.action == "complete":
        bond_points = game_info.get("bond_points_reward", 5)
        xp_reward = game_info.get("xp_reward", 10)
        
        db.table("game_sessions_realtime").update({
            "status": "completed",
            "completed_at": datetime.utcnow().isoformat(),
            "bond_points_awarded": bond_points,
        }).eq("id", req.session_id).execute()
        
        # Award bond points to relationship
        if session_data.get("relationship_id"):
            rel = db.table("relationships_realtime").select("bond_points").eq("id", session_data["relationship_id"]).execute()
            if rel.data:
                new_bp = rel.data[0].get("bond_points", 0) + bond_points
                db.table("relationships_realtime").update({"bond_points": new_bp}).eq("id", session_data["relationship_id"]).execute()
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
    db.table("game_sessions_realtime").update({
        "game_data": game_data,
    }).eq("id", req.session_id).execute()
    
    return result


@router.get("/session/{session_id}")
async def get_game_session(session_id: str, user_id: str = Depends(get_current_user_id)):
    """Get current game session state."""
    db = get_supabase()
    
    session = db.table("game_sessions_realtime") \
        .select("*, games_realtime_communication(*)") \
        .eq("id", session_id) \
        .execute()
    
    if not session.data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"session": session.data[0]}


@router.get("/history/{relationship_id}")
async def get_game_history(relationship_id: str, user_id: str = Depends(get_current_user_id)):
    """Get game history for a relationship."""
    db = get_supabase()
    
    sessions = db.table("game_sessions_realtime") \
        .select("*, games_realtime_communication(title, icon_emoji, category)") \
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
