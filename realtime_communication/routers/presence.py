"""Global Presence & Notifications WS Router.

Tracks which users are currently online across the entire application and
handles routing global game invitations to them.
"""
import uuid
from typing import Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
import asyncio

from realtime_communication.services.supabase_client import get_supabase
from realtime_communication.services.auth_service import get_current_user_id

router = APIRouter(prefix="/presence", tags=["Global Presence"])

# ─── Presence Manager ────────────────────────────────────────────────────────

class PresenceManager:
    def __init__(self):
        # Maps user_id -> WebSocket
        self.active_users: Dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_users[user_id] = websocket

    def disconnect(self, user_id: str):
        self.active_users.pop(user_id, None)

    async def send_to_user(self, user_id: str, data: dict):
        if user_id in self.active_users:
            try:
                await self.active_users[user_id].send_json(data)
                return True
            except Exception:
                self.disconnect(user_id)
        return False

presence_manager = PresenceManager()


# ─── Global WebSocket Endpoint ───────────────────────────────────────────────

@router.websocket("/ws/{user_id}")
async def global_presence_ws(websocket: WebSocket, user_id: str):
    """Maintains a persistent connection for cross-page notifications."""
    await presence_manager.connect(user_id, websocket)
    db = get_supabase()

    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type")

            if event_type == "invite_game":
                # Sender is asking to invite 'target_user_id'
                target_user_id = data.get("target_user_id")
                game_type = data.get("game_type", "bonding_synchrony")
                
                # Fetch sender details
                sender = db.table("profiles_realtime").select("display_name").eq("id", user_id).execute()
                sender_name = sender.data[0]["display_name"] if sender.data else "A Friend"

                session_id = str(uuid.uuid4())

                # Push invite to target
                success = await presence_manager.send_to_user(target_user_id, {
                    "type": "game_invite_received",
                    "sender_id": user_id,
                    "sender_name": sender_name,
                    "game_type": game_type,
                    "session_id": session_id
                })

                if not success:
                    # Notify sender they are offline
                    await websocket.send_json({
                        "type": "game_invite_failed",
                        "error": "User is offline or unreachable."
                    })
            
            elif event_type == "respond_invite":
                # Target responds to the invite
                inviter_id = data.get("inviter_id")
                accept = data.get("accept", False)
                session_id = data.get("session_id")
                
                # Notify the inviter
                await presence_manager.send_to_user(inviter_id, {
                    "type": "invite_response",
                    "accept": accept,
                    "session_id": session_id,
                    "responder_id": user_id
                })

    except WebSocketDisconnect:
        presence_manager.disconnect(user_id)
    except Exception as e:
        print(f"[Presence WS Error] {e}")
        presence_manager.disconnect(user_id)


from pydantic import BaseModel

class InviteRequest(BaseModel):
    target_user_id: str
    game_type: str = "bonding_synchrony"

@router.post("/invite")
async def send_game_invite(req: InviteRequest, user_id: str = Depends(get_current_user_id)):
    """API endpoint to trigger a game invite through the presence network."""
    db = get_supabase()
    
    sender = db.table("profiles_realtime").select("display_name").eq("id", user_id).execute()
    sender_name = sender.data[0]["display_name"] if sender.data else "A Friend"

    # Find relationship_id between user_id and req.target_user_id
    rel = db.table("relationships_realtime").select("id").or_(
        f"and(user_a_id.eq.{user_id},user_b_id.eq.{req.target_user_id}),"
        f"and(user_a_id.eq.{req.target_user_id},user_b_id.eq.{user_id})"
    ).eq("status", "active").execute()
    
    relationship_id = rel.data[0]["id"] if rel.data else None

    # Resolve Game ID
    game_catalog = db.table("games_realtime_communication").select("id").eq("game_type", req.game_type).execute()
    if not game_catalog.data:
        # Create it if it doesn't exist
        cat = db.table("games_realtime_communication").insert({
            "game_type": req.game_type,
            "title": "Bonding Synchrony",
            "category": "immersive",
            "description": "Live synchrony matching game",
            "min_players": 2,
            "max_players": 2,
            "estimated_minutes": 3,
            "bond_points_reward": 10,
            "xp_reward": 15,
            "is_active": True,
            "is_immersive": True
        }).execute()
        game_id = cat.data[0]["id"] if cat.data else None
    else:
        game_id = game_catalog.data[0]["id"]

    # Insert preliminary session
    session = db.table("game_sessions_realtime").insert({
        "game_id": game_id,
        "relationship_id": relationship_id,
        "players": [
            {"user_id": user_id, "score": 0},
            {"user_id": req.target_user_id, "score": 0},
        ],
        "status": "waiting",
        "game_data": {"game_type": req.game_type}
    }).execute()
    
    if not session.data:
        return {"status": "error", "message": "Failed to draft game session"}
        
    session_id = session.data[0]["id"]

    success = await presence_manager.send_to_user(req.target_user_id, {
        "type": "game_invite_received",
        "sender_id": user_id,
        "sender_name": sender_name,
        "game_type": req.game_type,
        "session_id": session_id
    })
    
    if not success:
        return {"status": "error", "message": "User is offline"}
    
    # Also notify the sender of the session_id so they can auto-route
    return {"status": "ok", "session_id": session_id}

# ─── HTTP API ────────────────────────────────────────────────────────────────

@router.get("/active-friends")
async def get_active_friends(user_id: str = Depends(get_current_user_id)):
    """Returns a list of friends that are currently actively connected."""
    db = get_supabase()
    
    # 1. Fetch relationships
    rel_res = db.table("relationships_realtime").select("*, user_a:profiles_realtime!user_a_id(*), user_b:profiles_realtime!user_b_id(*)").or_(f"user_a_id.eq.{user_id},user_b_id.eq.{user_id}").eq("status", "active").execute()
    
    active_friends = []
    
    for rel in (rel_res.data or []):
        friend_id = rel["user_b_id"] if rel["user_a_id"] == user_id else rel["user_a_id"]
        friend_profile = rel["user_b"] if rel["user_a_id"] == user_id else rel["user_a"]
        
        # 2. Check presence manager
        if friend_id in presence_manager.active_users and friend_profile:
            active_friends.append({
                "relationship_id": rel["id"],
                "friend_id": friend_id,
                "display_name": friend_profile.get("display_name"),
                "avatar_url": friend_profile.get("avatar_url"),
            })
            
    return {"active_friends": active_friends}
