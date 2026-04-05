"""Live immersive games — Pong, Air Hockey, Tic-Tac-Toe via WebSocket.

Game state is synchronized in real-time between two players.
All results are stored in Supabase game_sessions with XP awarded.
"""
import json
import math
import random
import asyncio
from datetime import datetime
from typing import Dict, Set
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends

from realtime_communication.models.schemas import CreateLiveGameRequest
from realtime_communication.services.supabase_client import get_supabase
from realtime_communication.services.auth_service import get_current_user_id
from realtime_communication.services.xp_service import award_xp, check_and_level_up
from realtime_communication.services.notification_service import send_notification

router = APIRouter(prefix="/games/live", tags=["Live Immersive Games"])


# ─── Game State Manager ────────────────────────────────────────────────────────

class LiveGameManager:
    """Manages WebSocket connections and game state for live games."""
    
    def __init__(self):
        self.connections: Dict[str, Dict[str, WebSocket]] = {}  # session_id → {user_id: ws}
        self.game_states: Dict[str, dict] = {}                  # session_id → game state
        self.game_loops: Dict[str, asyncio.Task] = {}           # session_id → loop task
    
    async def connect(self, ws: WebSocket, session_id: str, user_id: str):
        await ws.accept()
        if session_id not in self.connections:
            self.connections[session_id] = {}
        self.connections[session_id][user_id] = ws
    
    def disconnect(self, session_id: str, user_id: str):
        if session_id in self.connections:
            self.connections[session_id].pop(user_id, None)
            if not self.connections[session_id]:
                del self.connections[session_id]
                self.game_states.pop(session_id, None)
                # Cancel game loop
                task = self.game_loops.pop(session_id, None)
                if task:
                    task.cancel()
    
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


# ─── Game Initializers ─────────────────────────────────────────────────────────

def init_pong_state(player_a: str, player_b: str) -> dict:
    return {
        "type": "pong",
        "canvas": {"width": 800, "height": 400},
        "ball": {"x": 400, "y": 200, "vx": 4, "vy": 3, "radius": 8},
        "paddles": {
            player_a: {"y": 170, "height": 60, "width": 10, "x": 20, "speed": 6},
            player_b: {"y": 170, "height": 60, "width": 10, "x": 770, "speed": 6},
        },
        "scores": {player_a: 0, player_b: 0},
        "max_score": 5,
        "status": "playing",
        "player_a": player_a,
        "player_b": player_b,
    }


def init_air_hockey_state(player_a: str, player_b: str) -> dict:
    return {
        "type": "air_hockey",
        "canvas": {"width": 400, "height": 700},
        "puck": {"x": 200, "y": 350, "vx": 0, "vy": 0, "radius": 12},
        "mallets": {
            player_a: {"x": 200, "y": 600, "radius": 25},
            player_b: {"x": 200, "y": 100, "radius": 25},
        },
        "goals": {
            player_a: {"y": 0, "width": 120},    # top goal (player_a defends bottom)
            player_b: {"y": 700, "width": 120},   # bottom goal (player_b defends top)
        },
        "scores": {player_a: 0, player_b: 0},
        "max_score": 5,
        "status": "playing",
        "player_a": player_a,
        "player_b": player_b,
    }


def init_tictactoe_state(player_a: str, player_b: str) -> dict:
    return {
        "type": "tic_tac_toe",
        "board": [""] * 9,  # 3x3 grid as flat array
        "current_turn": player_a,
        "symbols": {player_a: "X", player_b: "O"},
        "player_a": player_a,
        "player_b": player_b,
        "status": "playing",
        "winner": None,
    }


GAME_INITIALIZERS = {
    "pong": init_pong_state,
    "air_hockey": init_air_hockey_state,
    "tic_tac_toe": init_tictactoe_state,
}


# ─── Game Physics / Logic ──────────────────────────────────────────────────────

def update_pong(state: dict) -> dict:
    """Update pong ball physics for one tick."""
    if state["status"] != "playing":
        return state
    
    ball = state["ball"]
    canvas = state["canvas"]
    
    ball["x"] += ball["vx"]
    ball["y"] += ball["vy"]
    
    # Wall bounce (top/bottom)
    if ball["y"] - ball["radius"] <= 0 or ball["y"] + ball["radius"] >= canvas["height"]:
        ball["vy"] = -ball["vy"]
        ball["y"] = max(ball["radius"], min(canvas["height"] - ball["radius"], ball["y"]))
    
    pa = state["player_a"]
    pb = state["player_b"]
    
    # Paddle collision — left paddle (player_a)
    paddle_a = state["paddles"][pa]
    if (ball["x"] - ball["radius"] <= paddle_a["x"] + paddle_a["width"] and
        ball["x"] - ball["radius"] >= paddle_a["x"] and
        paddle_a["y"] <= ball["y"] <= paddle_a["y"] + paddle_a["height"]):
        ball["vx"] = abs(ball["vx"]) * 1.05  # speed up slightly
        # Angle adjustment based on hit position
        hit_pos = (ball["y"] - paddle_a["y"]) / paddle_a["height"]
        ball["vy"] = (hit_pos - 0.5) * 8
    
    # Paddle collision — right paddle (player_b)
    paddle_b = state["paddles"][pb]
    if (ball["x"] + ball["radius"] >= paddle_b["x"] and
        ball["x"] + ball["radius"] <= paddle_b["x"] + paddle_b["width"] and
        paddle_b["y"] <= ball["y"] <= paddle_b["y"] + paddle_b["height"]):
        ball["vx"] = -abs(ball["vx"]) * 1.05
        hit_pos = (ball["y"] - paddle_b["y"]) / paddle_b["height"]
        ball["vy"] = (hit_pos - 0.5) * 8
    
    # Scoring
    if ball["x"] - ball["radius"] <= 0:
        state["scores"][pb] += 1
        _reset_pong_ball(state)
    elif ball["x"] + ball["radius"] >= canvas["width"]:
        state["scores"][pa] += 1
        _reset_pong_ball(state)
    
    # Speed cap
    max_speed = 12
    ball["vx"] = max(-max_speed, min(max_speed, ball["vx"]))
    ball["vy"] = max(-max_speed, min(max_speed, ball["vy"]))
    
    # Check win
    if state["scores"][pa] >= state["max_score"] or state["scores"][pb] >= state["max_score"]:
        state["status"] = "finished"
        state["winner"] = pa if state["scores"][pa] >= state["max_score"] else pb
    
    return state


def _reset_pong_ball(state: dict):
    canvas = state["canvas"]
    state["ball"]["x"] = canvas["width"] // 2
    state["ball"]["y"] = canvas["height"] // 2
    state["ball"]["vx"] = random.choice([-4, 4])
    state["ball"]["vy"] = random.choice([-3, 3])


def update_air_hockey(state: dict) -> dict:
    """Update air hockey puck physics."""
    if state["status"] != "playing":
        return state
    
    puck = state["puck"]
    canvas = state["canvas"]
    
    # Apply friction
    puck["vx"] *= 0.99
    puck["vy"] *= 0.99
    
    puck["x"] += puck["vx"]
    puck["y"] += puck["vy"]
    
    # Wall bounce (left/right)
    if puck["x"] - puck["radius"] <= 0 or puck["x"] + puck["radius"] >= canvas["width"]:
        puck["vx"] = -puck["vx"] * 0.9
        puck["x"] = max(puck["radius"], min(canvas["width"] - puck["radius"], puck["x"]))
    
    pa = state["player_a"]
    pb = state["player_b"]
    
    # Mallet collision
    for pid in [pa, pb]:
        m = state["mallets"][pid]
        dx = puck["x"] - m["x"]
        dy = puck["y"] - m["y"]
        dist = math.sqrt(dx*dx + dy*dy)
        if dist < puck["radius"] + m["radius"] and dist > 0:
            # Bounce off mallet
            nx = dx / dist
            ny = dy / dist
            puck["vx"] = nx * 8
            puck["vy"] = ny * 8
            # Push puck out of mallet
            overlap = puck["radius"] + m["radius"] - dist
            puck["x"] += nx * overlap
            puck["y"] += ny * overlap
    
    # Goal detection — top goal (player_b scores)
    goal_width = 120
    goal_center = canvas["width"] // 2
    if puck["y"] - puck["radius"] <= 0:
        if abs(puck["x"] - goal_center) < goal_width // 2:
            state["scores"][pb] += 1  # player_b scores in top goal
            _reset_hockey_puck(state)
        else:
            puck["vy"] = abs(puck["vy"])
    
    # Bottom goal (player_a scores)
    if puck["y"] + puck["radius"] >= canvas["height"]:
        if abs(puck["x"] - goal_center) < goal_width // 2:
            state["scores"][pa] += 1  # player_a scores in bottom goal
            _reset_hockey_puck(state)
        else:
            puck["vy"] = -abs(puck["vy"])
    
    # Check win
    if state["scores"][pa] >= state["max_score"] or state["scores"][pb] >= state["max_score"]:
        state["status"] = "finished"
        state["winner"] = pa if state["scores"][pa] >= state["max_score"] else pb
    
    return state


def _reset_hockey_puck(state: dict):
    canvas = state["canvas"]
    state["puck"]["x"] = canvas["width"] // 2
    state["puck"]["y"] = canvas["height"] // 2
    state["puck"]["vx"] = 0
    state["puck"]["vy"] = 0


def check_tictactoe_winner(board: list) -> str | None:
    """Check for a tic-tac-toe winner. Returns symbol or None."""
    lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],  # rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8],  # cols
        [0, 4, 8], [2, 4, 6],              # diags
    ]
    for a, b, c in lines:
        if board[a] and board[a] == board[b] == board[c]:
            return board[a]
    return None


# ─── REST Endpoints ────────────────────────────────────────────────────────────

@router.get("/available")
async def get_available_games():
    """List available immersive live games."""
    return {
        "games": [
            {
                "type": "pong",
                "title": "🏓 Pong",
                "description": "Classic pong! First to 5 points wins.",
                "players": 2,
                "estimated_minutes": 3,
                "xp_reward": 15,
            },
            {
                "type": "air_hockey",
                "title": "🥅 Air Hockey",
                "description": "Fast-paced air hockey! Score goals to win.",
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
    
    if req.game_type not in GAME_INITIALIZERS:
        raise HTTPException(status_code=400, detail=f"Unknown game type. Available: {list(GAME_INITIALIZERS.keys())}")
    
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
    session = db.table("game_sessions_realtime").insert({
        "game_id": game_id,
        "relationship_id": req.relationship_id,
        "players": [
            {"user_id": current_user, "score": 0},
            {"user_id": partner_id, "score": 0},
        ],
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
    
    return {"session_id": session_id, "game_type": req.game_type}


# ─── WebSocket Game Endpoint ──────────────────────────────────────────────────

@router.websocket("/ws/{session_id}/{user_id}")
async def live_game_ws(websocket: WebSocket, session_id: str, user_id: str):
    """WebSocket endpoint for real-time game play.
    
    Client sends:
      - {"type": "move", "data": {...}}  (paddle position, mallet position, cell index)
      - {"type": "ready"}                (player ready to start)
    
    Server sends:
      - {"type": "state", "state": {...}}     (full game state every tick)
      - {"type": "game_over", "winner": ...}  (when game ends)
      - {"type": "waiting_for_opponent"}      (when waiting)
    """
    db = get_supabase()
    
    # Validate session
    session = db.table("game_sessions_realtime").select("*").eq("id", session_id).execute()
    if not session.data:
        await websocket.close(code=4004, reason="Session not found")
        return
    
    session_data = session.data[0]
    player_ids = [p["user_id"] for p in session_data.get("players", [])]
    
    if user_id not in player_ids:
        await websocket.close(code=4003, reason="Not a player in this game")
        return
    
    await manager.connect(websocket, session_id, user_id)
    
    try:
        # Wait for both players
        conns = manager.connections.get(session_id, {})
        if len(conns) < 2:
            await websocket.send_json({"type": "waiting_for_opponent"})
        
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            if msg.get("type") == "ready":
                conns = manager.connections.get(session_id, {})
                if len(conns) >= 2:
                    # Both players ready — initialize game
                    game_type = session_data.get("game_data", {}).get("game_type", "pong")
                    initializer = GAME_INITIALIZERS.get(game_type, init_pong_state)
                    state = initializer(player_ids[0], player_ids[1])
                    manager.game_states[session_id] = state
                    
                    # Update session status
                    db.table("game_sessions_realtime").update({
                        "status": "active",
                        "started_at": datetime.utcnow().isoformat(),
                    }).eq("id", session_id).execute()
                    
                    await manager.broadcast(session_id, {"type": "game_start", "state": state})
                    
                    # Start physics loop for action games
                    if game_type in ("pong", "air_hockey"):
                        if session_id not in manager.game_loops:
                            task = asyncio.create_task(_game_loop(session_id, game_type, db))
                            manager.game_loops[session_id] = task
                else:
                    await websocket.send_json({"type": "waiting_for_opponent"})
            
            elif msg.get("type") == "move":
                state = manager.game_states.get(session_id)
                if not state or state.get("status") != "playing":
                    continue
                
                move_data = msg.get("data", {})
                game_type = state.get("type", "pong")
                
                if game_type == "pong":
                    # Update paddle position
                    if user_id in state.get("paddles", {}):
                        y = move_data.get("y")
                        if y is not None:
                            paddle = state["paddles"][user_id]
                            canvas_h = state["canvas"]["height"]
                            paddle["y"] = max(0, min(canvas_h - paddle["height"], y))
                
                elif game_type == "air_hockey":
                    # Update mallet position
                    if user_id in state.get("mallets", {}):
                        x = move_data.get("x")
                        y = move_data.get("y")
                        if x is not None and y is not None:
                            mallet = state["mallets"][user_id]
                            canvas = state["canvas"]
                            mallet["x"] = max(mallet["radius"], min(canvas["width"] - mallet["radius"], x))
                            # Restrict to own half
                            if user_id == state["player_a"]:
                                mallet["y"] = max(canvas["height"] // 2 + mallet["radius"],
                                                  min(canvas["height"] - mallet["radius"], y))
                            else:
                                mallet["y"] = max(mallet["radius"],
                                                  min(canvas["height"] // 2 - mallet["radius"], y))
                
                elif game_type == "tic_tac_toe":
                    cell = move_data.get("cell")
                    if cell is not None and 0 <= cell < 9:
                        if state["current_turn"] == user_id and state["board"][cell] == "":
                            state["board"][cell] = state["symbols"][user_id]
                            
                            # Check winner
                            winner_symbol = check_tictactoe_winner(state["board"])
                            if winner_symbol:
                                state["status"] = "finished"
                                # Find winner user_id from symbol
                                for pid, sym in state["symbols"].items():
                                    if sym == winner_symbol:
                                        state["winner"] = pid
                                        break
                                await manager.broadcast(session_id, {"type": "state", "state": state})
                                await _finish_game(session_id, state, db)
                            elif "" not in state["board"]:
                                # Draw
                                state["status"] = "finished"
                                state["winner"] = "draw"
                                await manager.broadcast(session_id, {"type": "state", "state": state})
                                await _finish_game(session_id, state, db)
                            else:
                                # Switch turn
                                state["current_turn"] = (
                                    state["player_b"] if user_id == state["player_a"]
                                    else state["player_a"]
                                )
                                await manager.broadcast(session_id, {"type": "state", "state": state})
    
    except WebSocketDisconnect:
        manager.disconnect(session_id, user_id)
        await manager.broadcast(session_id, {
            "type": "opponent_disconnected",
            "user_id": user_id
        })
    except Exception as e:
        print(f"[LiveGame] Error: {e}")
        manager.disconnect(session_id, user_id)


async def _game_loop(session_id: str, game_type: str, db):
    """Physics update loop for action games (Pong, Air Hockey)."""
    tick_rate = 1 / 30  # 30 FPS
    
    try:
        while session_id in manager.game_states:
            state = manager.game_states[session_id]
            if state["status"] != "playing":
                break
            
            if game_type == "pong":
                state = update_pong(state)
            elif game_type == "air_hockey":
                state = update_air_hockey(state)
            
            manager.game_states[session_id] = state
            
            await manager.broadcast(session_id, {"type": "state", "state": state})
            
            if state["status"] == "finished":
                await _finish_game(session_id, state, db)
                break
            
            await asyncio.sleep(tick_rate)
    except asyncio.CancelledError:
        pass
    except Exception as e:
        print(f"[GameLoop] Error for {session_id}: {e}")


async def _finish_game(session_id: str, state: dict, db):
    """Handle game completion — save results, award XP, notify."""
    winner = state.get("winner")
    pa = state.get("player_a")
    pb = state.get("player_b")
    
    # Determine XP rewards
    xp_winner = 15 if state.get("type") != "tic_tac_toe" else 10
    xp_loser = 5
    xp_draw = 8
    
    winner_id = None
    if winner and winner != "draw":
        winner_id = winner
        loser_id = pb if winner == pa else pa
        await award_xp(winner, xp_winner, "game", "game_reward", source_id=session_id)
        await award_xp(loser_id, xp_loser, "game", "game_reward", source_id=session_id)
    elif winner == "draw":
        await award_xp(pa, xp_draw, "game", "game_reward", source_id=session_id)
        await award_xp(pb, xp_draw, "game", "game_reward", source_id=session_id)
    
    # Update session in DB
    scores = state.get("scores", {})
    db.table("game_sessions_realtime").update({
        "status": "completed",
        "winner_id": winner_id,
        "game_data": state,
        "xp_awarded_user_a": xp_winner if winner == pa else (xp_draw if winner == "draw" else xp_loser),
        "xp_awarded_user_b": xp_winner if winner == pb else (xp_draw if winner == "draw" else xp_loser),
        "bond_points_awarded": 5,
        "completed_at": datetime.utcnow().isoformat(),
    }).eq("id", session_id).execute()
    
    # Award bond points to relationship
    session = db.table("game_sessions_realtime").select("relationship_id").eq("id", session_id).execute()
    if session.data and session.data[0].get("relationship_id"):
        rel_id = session.data[0]["relationship_id"]
        rel = db.table("relationships_realtime").select("bond_points").eq("id", rel_id).execute()
        if rel.data:
            new_bp = rel.data[0].get("bond_points", 0) + 5
            db.table("relationships_realtime").update({"bond_points": new_bp}).eq("id", rel_id).execute()
            await check_and_level_up(rel_id)
    
    # Update realtime_xp game stats
    for uid in [pa, pb]:
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
    for uid in [pa, pb]:
        if uid:
            game_name = state.get("type", "game").replace("_", " ").title()
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
