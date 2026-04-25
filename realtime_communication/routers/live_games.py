
#live_games.py
"""Live immersive games — Pong, Air Hockey, Tic-Tac-Toe via WebRTC P2P.

The server acts ONLY as a matchmaking and WebRTC signaling server (SDP/ICE).
Game state is synchronized in real-time P2P using WebRTC RTCDataChannel.
All results are stored in Supabase game_sessions with XP awarded.
"""
import json
import random
from datetime import datetime
from typing import Dict
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends

from realtime_communication.models.schemas import CreateLiveGameRequest
from realtime_communication.services.supabase_client import get_supabase
from realtime_communication.services.auth_service import get_current_user_id
from realtime_communication.services.xp_service import award_xp, check_and_level_up, award_relationship_points
from realtime_communication.services.notification_service import send_notification
from realtime_communication.routers.presence import presence_manager

router = APIRouter(prefix="/games/live", tags=["Live Immersive Games (WebRTC)"])


# ─── Game State Manager (WebRTC Signaling Only) ────────────────────────────────

class LiveGameManager:
    """Manages WebSocket connections strictly for WebRTC signaling and game state consensus."""
    
    def __init__(self):
        self.connections: Dict[str, Dict[str, WebSocket]] = {}  # session_id → {user_id: ws}
    
    async def connect(self, ws: WebSocket, session_id: str, user_id: str):
        if session_id not in self.connections:
            self.connections[session_id] = {}
        self.connections[session_id][user_id] = ws
    
    def disconnect(self, session_id: str, user_id: str):
        if session_id in self.connections:
            self.connections[session_id].pop(user_id, None)
            if not self.connections[session_id]:
                del self.connections[session_id]
    
    async def broadcast(self, session_id: str, data: dict, exclude: str = None):
        if session_id in self.connections:
            for uid, ws in list(self.connections[session_id].items()):
                if uid != exclude:
                    try:
                        await ws.send_json(data)
                    except Exception:
                        pass
    
    async def send_to(self, session_id: str, user_id: str, data: dict):
        if session_id in self.connections and user_id in self.connections[session_id]:
            try:
                await self.connections[session_id][user_id].send_json(data)
            except Exception:
                pass


manager = LiveGameManager()


# ─── REST Endpoints ────────────────────────────────────────────────────────────

@router.get("/available")
async def get_available_games():
    """List available immersive live games."""
    return {
        "games": [
            {
                "type": "pong",
                "title": "🏓 Pong",
                "description": "Classic pong! First to 5 points wins. (P2P Low Latency)",
                "players": 2,
                "estimated_minutes": 3,
                "xp_reward": 15,
            },
            {
                "type": "air_hockey",
                "title": "🥅 Air Hockey",
                "description": "Fast-paced air hockey! Score goals to win. (P2P Low Latency)",
                "players": 2,
                "estimated_minutes": 3,
                "xp_reward": 15,
            },
            {
                "type": "tic_tac_toe",
                "title": "❌ Tic-Tac-Toe",
                "description": "Classic X's and O's. Outsmart your friend!",
                "players": 2,
                "estimated_minutes": 2,
                "xp_reward": 10,
            },
        ]
    }


@router.post("/create")
async def create_live_game(req: CreateLiveGameRequest, current_user: str = Depends(get_current_user_id)):
    """Create a live game session and invite the partner."""
    db = get_supabase()
    
    # We still accept all game types, including bonding_synchrony which might skip P2P depending on frontend.
    
    # Verify relationship
    rel = db.table("relationships_realtime").select("*").eq("id", req.relationship_id).eq("status", "active").execute()
    if not rel.data:
        raise HTTPException(status_code=404, detail="Relationship not found or inactive")
    
    rel_data = rel.data[0]
    if current_user not in [rel_data["user_a_id"], rel_data["user_b_id"]]:
        raise HTTPException(status_code=403, detail="You are not part of this relationship")
    
    partner_id = rel_data["user_b_id"] if rel_data["user_a_id"] == current_user else rel_data["user_a_id"]
    
    # Find or create the game catalog entry
    game_catalog = db.table("games_realtime_communication").select("id").eq("game_type", req.game_type).eq("is_immersive", True).execute()
    if not game_catalog.data:
        # Auto-create catalog entry
        titles = {"pong": "🏓 Pong", "air_hockey": "🥅 Air Hockey", "tic_tac_toe": "❌ Tic-Tac-Toe"}
        cat = db.table("games_realtime_communication").insert({
            "game_type": req.game_type,
            "title": titles.get(req.game_type, req.game_type),
            "description": f"Live {req.game_type} game",
            "min_players": 2, "max_players": 2,
            "estimated_minutes": 3,
            "bond_points_reward": 5,
            "xp_reward": 15 if req.game_type != "tic_tac_toe" else 10,
            "category": "immersive",
            "is_active": True,
            "is_immersive": True,
        }).execute()
        game_id = cat.data[0]["id"] if cat.data else None
    else:
        game_id = game_catalog.data[0]["id"]
    
    # Create session
    session_players = [
        {"user_id": current_user, "score": 0},
        {"user_id": partner_id, "score": 0},
    ]
    # Assign initiator for WebRTC
    session_players[0]["is_initiator"] = True
    session_players[1]["is_initiator"] = False
    
    session = db.table("game_sessions_realtime").insert({
        "game_id": game_id,
        "relationship_id": req.relationship_id,
        "players": session_players,
        "status": "waiting",
        "game_data": {"game_type": req.game_type},
        "created_at": datetime.utcnow().isoformat(),
    }).execute()
    
    if not session.data:
        raise HTTPException(status_code=500, detail="Failed to create game session")
    
    session_id = session.data[0]["id"]
    
    # Notify partner
    sender = db.table("profiles_realtime").select("display_name").eq("id", current_user).execute()
    sender_name = sender.data[0]["display_name"] if sender.data else "Your friend"
    
    await send_notification(
        partner_id, "live_game_invite",
        data={"session_id": session_id, "game_type": req.game_type},
        sender=sender_name, game=req.game_type.replace("_", " ").title()
    )
    
    await presence_manager.send_to_user(partner_id, {
        "type": "game_invite_received",
        "sender_id": current_user,
        "sender_name": sender_name,
        "game_type": req.game_type,
        "session_id": session_id
    })
    
    return {"session_id": session_id, "game_type": req.game_type}


# ─── WebSocket Game Endpoint (Signaling) ──────────────────────────────────────

@router.websocket("/ws/{session_id}/{user_id}")
async def live_game_ws(websocket: WebSocket, session_id: str, user_id: str):
    """WebSocket endpoint solely for WebRTC signaling and game state sync/consensus.
    
    Client sends:
      - {"type": "ready"}
      - {"type": "webrtc_offer", "offer": ...}
      - {"type": "webrtc_answer", "answer": ...}
      - {"type": "webrtc_ice_candidate", "candidate": ...}
      - {"type": "game_finished", "winner": ..., "state": ...}
    
    Server relays WebRTC payloads to the other player and processes game_finished.
    """
    await websocket.accept()
    db = get_supabase()
    
    # Validate session
    session = db.table("game_sessions_realtime").select("*").eq("id", session_id).execute()
    if not session.data:
        await websocket.close(code=4004, reason="Session not found")
        return
    
    session_data = session.data[0]
    raw_players = session_data.get("players", [])
    if isinstance(raw_players, str):
        try:
            raw_players = json.loads(raw_players)
        except:
            raw_players = []
            
    player_ids = [p.get("user_id") for p in raw_players if isinstance(p, dict) and "user_id" in p]
    
    if user_id not in player_ids:
        await websocket.close(code=4003, reason="Not a player in this game")
        return
    
    # Determine if this user is the initiator (Player A)
    is_initiator = raw_players[0].get("user_id") == user_id
    
    await manager.connect(websocket, session_id, user_id)
    
    try:
        conns = manager.connections.get(session_id, {})
        if len(conns) < 2:
            await websocket.send_json({"type": "waiting_for_opponent"})
        else:
            await manager.broadcast(session_id, {"type": "opponent_joined"})
        
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            msg_type = msg.get("type")
            
            # Game Start & Signaling Setup
            if msg_type == "ready":
                conns = manager.connections.get(session_id, {})
                if len(conns) >= 2:
                    # Both players ready
                    # Update session status
                    db.table("game_sessions_realtime").update({
                        "status": "active",
                        "started_at": datetime.utcnow().isoformat(),
                    }).eq("id", session_id).execute()
                    
                    game_type = session_data.get("game_data", {}).get("game_type", "pong")
                    for member_id, member_ws in list(conns.items()):
                        m_is_initiator = (raw_players[0].get("user_id") == member_id)
                        await manager.send_to(session_id, member_id, {
                            "type": "game_start", 
                            "is_initiator": m_is_initiator,
                            "players": player_ids,
                            "game_type": game_type
                        })
                else:
                    await websocket.send_json({"type": "waiting_for_opponent"})
            
            # Relaying WebRTC Signaling
            elif msg_type == "webrtc_offer":
                await manager.broadcast(session_id, {
                    "type": "webrtc_offer",
                    "offer": msg.get("offer"),
                    "sender_id": user_id
                }, exclude=user_id)
                
            elif msg_type == "webrtc_answer":
                await manager.broadcast(session_id, {
                    "type": "webrtc_answer",
                    "answer": msg.get("answer"),
                    "sender_id": user_id
                }, exclude=user_id)
                
            elif msg_type == "webrtc_ice_candidate":
                await manager.broadcast(session_id, {
                    "type": "webrtc_ice_candidate",
                    "candidate": msg.get("candidate"),
                    "sender_id": user_id
                }, exclude=user_id)
                
            # Non-P2P games (tic_tac_toe, bonding_synchrony) can still use centralized websocket fallback
            elif msg_type == "sync_state": 
                # For non-latency-sensitive games or turn-based games
                await manager.broadcast(session_id, {
                    "type": "sync_state",
                    "state": msg.get("state"),
                    "sender_id": user_id
                }, exclude=user_id)
            
            # P2P consensus resolution
            elif msg_type == "game_finished":
                # Ensure we only process this once
                check = db.table("game_sessions_realtime").select("status").eq("id", session_id).execute()
                if check.data and check.data[0].get("status") != "completed":
                    winner = msg.get("winner")
                    final_state = msg.get("state", {})
                    await _finish_game(session_id, final_state, winner, player_ids, db)
    
    except WebSocketDisconnect:
        manager.disconnect(session_id, user_id)
        await manager.broadcast(session_id, {
            "type": "opponent_disconnected",
            "user_id": user_id
        })
    except Exception as e:
        print(f"[LiveGame WS] Error: {e}")
        manager.disconnect(session_id, user_id)


async def _finish_game(session_id: str, state: dict, winner: str, player_ids: list, db):
    """Handle game completion — save results, award XP, notify."""
    pa_id = player_ids[0]
    pb_id = player_ids[1] if len(player_ids) > 1 else None
    
    game_type = state.get("type", state.get("game_type", "pong"))
    
    # Determine XP rewards
    xp_winner = 15 if game_type != "tic_tac_toe" else 10
    xp_loser = 5
    xp_draw = 8
    
    winner_id = None
    if winner == "bonding":
        await award_xp(pa_id, xp_winner, "game", "game_reward", source_id=session_id)
        if pb_id:
            await award_xp(pb_id, xp_winner, "game", "game_reward", source_id=session_id)
    elif winner and winner != "draw":
        winner_id = winner
        loser_id = pb_id if winner == pa_id else pa_id
        await award_xp(winner_id, xp_winner, "game", "game_reward", source_id=session_id)
        if loser_id:
            await award_xp(loser_id, xp_loser, "game", "game_reward", source_id=session_id)
    elif winner == "draw":
        await award_xp(pa_id, xp_draw, "game", "game_reward", source_id=session_id)
        if pb_id:
            await award_xp(pb_id, xp_draw, "game", "game_reward", source_id=session_id)
    
    # Update session in DB
    scores = state.get("scores", {})
    db.table("game_sessions_realtime").update({
        "status": "completed",
        "winner_id": winner_id,
        "game_data": state,
        "xp_awarded_user_a": xp_winner if winner in (pa_id, "bonding") else (xp_draw if winner == "draw" else xp_loser),
        "xp_awarded_user_b": xp_winner if winner in (pb_id, "bonding") else (xp_draw if winner == "draw" else xp_loser),
        "bond_points_awarded": 5,
        "completed_at": datetime.utcnow().isoformat(),
    }).eq("id", session_id).execute()
    
    # Award bond points to relationship
    session = db.table("game_sessions_realtime").select("relationship_id").eq("id", session_id).execute()
    if session.data and session.data[0].get("relationship_id"):
        rel_id = session.data[0]["relationship_id"]
        await award_relationship_points(rel_id, 5, 1)
    
    # Update realtime_xp game stats
    for uid in [pa_id, pb_id]:
        if uid:
            xp_row = db.table("realtime_xp_realtime").select("games_played, games_won").eq("user_id", uid).execute()
            if xp_row.data:
                db.table("realtime_xp_realtime").update({
                    "games_played": xp_row.data[0].get("games_played", 0) + 1,
                    "games_won": xp_row.data[0].get("games_won", 0) + (1 if uid == winner_id else 0),
                }).eq("user_id", uid).execute()
    
    # Broadcast game over
    await manager.broadcast(session_id, {
        "type": "game_over",
        "winner": winner,
        "scores": scores,
        "xp_awarded": {"winner": xp_winner, "loser": xp_loser} if winner != "draw" else {"both": xp_draw},
    })
    
    # Notify players
    for uid in [pa_id, pb_id]:
        if uid:
            game_name = game_type.replace("_", " ").title()
            if winner == uid:
                await send_notification(uid, "game_completed",
                                       data={"session_id": session_id},
                                       game=game_name, result="You won! 🏆")
            elif winner == "draw":
                await send_notification(uid, "game_completed",
                                       data={"session_id": session_id},
                                       game=game_name, result="It's a draw!")
            else:
                await send_notification(uid, "game_completed",
                                       data={"session_id": session_id},
                                       game=game_name, result="Better luck next time!")
