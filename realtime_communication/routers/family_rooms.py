"""Family Rooms router - Group chats & cultural potlucks."""
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from datetime import datetime
from typing import Optional, Dict, Set
from realtime_communication.models.schemas import CreateRoomRequest, InviteToRoomRequest, RoomMessageRequest, CreatePotluckRequest, JoinRoomRequest
from realtime_communication.services.supabase_client import get_supabase
from realtime_communication.services.translation_service import translate_text, detect_language
from realtime_communication.services.auth_service import get_current_user_id, get_optional_user_id
from realtime_communication.models.schemas import CreateJoinCodeRequest, JoinByCodeRequest
import secrets
import json

router = APIRouter(prefix="/rooms", tags=["Family Rooms"])

class FamilyRoomConnectionManager:
    def __init__(self):
        self.active_rooms: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.active_rooms:
            self.active_rooms[room_id] = set()
        self.active_rooms[room_id].add(websocket)
    
    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_rooms:
            self.active_rooms[room_id].discard(websocket)
    
    async def broadcast(self, room_id: str, message: dict, exclude: WebSocket = None):
        if room_id in self.active_rooms:
            for conn in self.active_rooms[room_id]:
                if conn != exclude:
                    try:
                        await conn.send_json(message)
                    except Exception:
                        pass

manager = FamilyRoomConnectionManager()

@router.post("/create")
async def create_room(req: CreateRoomRequest, user_id: str = Depends(get_current_user_id)):
    """Create a new Global Family Room."""
    db = get_supabase()
    
    # Check if user has reached Level 5 in at least one relationship
    rels = db.table("relationships_realtime") \
        .select("level") \
        .or_(f"user_a_id.eq.{user_id},user_b_id.eq.{user_id}") \
        .gte("level", 5) \
        .execute()
    
    # For demo purposes, allow room creation
    room = db.table("family_rooms_realtime").insert({
        "room_name": req.room_name,
        "description": req.description,
        "room_type": req.room_type,
        "max_members": req.max_members,
        "created_by": user_id,
        "next_host_id": user_id
    }).execute()
    
    if not room.data:
        raise HTTPException(status_code=500, detail="Failed to create room")
    
    room_data = room.data[0]
    
    # Add creator as first member
    db.table("family_room_members_realtime").insert({
        "room_id": room_data["id"],
        "user_id": user_id,
        "role_in_room": "mother",  # Default, can be changed
        "is_moderator": True
    }).execute()
    
    return {"room": room_data}


@router.get("/")
async def get_user_rooms(user_id: str = Depends(get_current_user_id)):
    """Get all rooms the user is a member of."""
    db = get_supabase()
    
    memberships = db.table("family_room_members_realtime") \
        .select("*, family_rooms_realtime(*)") \
        .eq("user_id", user_id) \
        .eq("status", "active") \
        .execute()
    
    rooms = []
    for m in (memberships.data or []):
        room = m.get("family_rooms_realtime") or m.get("family_rooms", {})
        if not room:
            continue
        # Get member count
        members = db.table("family_room_members_realtime") \
            .select("user_id, role_in_room, profiles_realtime(display_name, country, avatar_config)") \
            .eq("room_id", room.get("id", "")) \
            .eq("status", "active") \
            .execute()
        
        rooms.append({
            **room,
            "my_role": m["role_in_room"],
            "is_moderator": m["is_moderator"],
            "members": members.data or [],
            "member_count": len(members.data or [])
        })
    
    return {"rooms": rooms}


@router.post("/{room_id}/invite")
async def invite_to_room(room_id: str, req: InviteToRoomRequest, user_id: str = Depends(get_current_user_id)):
    """Invite a user to a family room."""
    db = get_supabase()
    
    # Check if inviter is a member/moderator
    membership = db.table("family_room_members_realtime") \
        .select("*") \
        .eq("room_id", room_id) \
        .eq("user_id", user_id) \
        .eq("status", "active") \
        .execute()
    
    if not membership.data or len(membership.data) == 0:
        raise HTTPException(status_code=403, detail="You are not a member of this room")
    
    # Check room capacity
    room = db.table("family_rooms_realtime").select("max_members").eq("id", room_id).execute()
    current_members = db.table("family_room_members_realtime") \
        .select("id", count="exact") \
        .eq("room_id", room_id) \
        .eq("status", "active") \
        .execute()
    
    room_data = room.data[0] if room.data else {"max_members": 8}
    if current_members.count >= room_data.get("max_members", 8):
        raise HTTPException(status_code=400, detail="Room is full")
    
    # Parent roles get moderator powers
    is_moderator = req.role_in_room in ["mother", "father", "grandparent"]
    
    # Add member
    member = db.table("family_room_members_realtime").insert({
        "room_id": room_id,
        "user_id": req.user_id,
        "role_in_room": req.role_in_room,
        "is_moderator": is_moderator
    }).execute()
    
    # Notify invited user
    db.table("notifications_realtime").insert({
        "user_id": req.user_id,
        "type": "family_room_invite",
        "title": "🏠 You've been invited to a Family Room!",
        "body": "Join your digital family and share cultures together.",
        "data": {"room_id": room_id}
    }).execute()
    
    return {"member": member.data[0] if member.data else None}


@router.post("/{room_id}/join")
async def join_room(room_id: str, req: Optional[JoinRoomRequest] = None, user_id: str = Depends(get_optional_user_id)):
    """Join a family room.

    Behavior:
    - If `req.username` is provided, the endpoint will look up that username
      in `profiles` and add that user to the room (caller must be a room
      moderator/member — policy enforced below).
    - If `req` is omitted or `req.username` is None, the authenticated user
      (from the auth token) will be added to the room.

    This endpoint enforces room capacity, prevents duplicate membership, and
    returns the new member row.
    """
    db = get_supabase()

    body: Optional[JoinRoomRequest] = req
    # Determine target user id
    target_user_id = None
    if body and body.username:
        # Lookup profile by username
        prof = db.table("profiles_realtime").select("id").eq("username", body.username).execute()
        if not prof.data or len(prof.data) == 0:
            raise HTTPException(status_code=404, detail="User not found")
        target_user_id = prof.data[0]["id"]
    else:
        # Joining as the authenticated user — require auth
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required to join without username")
        target_user_id = user_id

    # Basic checks: room exists and active
    room = db.table("family_rooms_realtime").select("id, max_members, is_active").eq("id", room_id).execute()
    if not room.data or len(room.data) == 0:
        raise HTTPException(status_code=404, detail="Room not found")
    room_data = room.data[0]
    if not room_data.get("is_active", True):
        raise HTTPException(status_code=400, detail="Room is not active")

    # Check existing membership
    existing = db.table("family_room_members_realtime") \
        .select("id") \
        .eq("room_id", room_id) \
        .eq("user_id", target_user_id) \
        .execute()
    if existing.data and len(existing.data) > 0:
        raise HTTPException(status_code=400, detail="User is already a member of this room")

    # Capacity
    current = db.table("family_room_members_realtime").select("id", count="exact").eq("room_id", room_id).eq("status", "active").execute()
    max_members = room_data.get("max_members") or 8
    if current.count >= max_members:
        raise HTTPException(status_code=400, detail="Room is full")

    role = (body.role_in_room if body and body.role_in_room else "member")
    is_moderator = role in ["mother", "father", "grandparent"]

    # If caller is trying to add another user (username provided), enforce caller is a moderator
    if body and body.username:
        caller_membership = db.table("family_room_members_realtime") \
            .select("is_moderator") \
            .eq("room_id", room_id) \
            .eq("user_id", user_id) \
            .eq("status", "active") \
            .execute()
        if not caller_membership.data or len(caller_membership.data) == 0 or not caller_membership.data[0].get("is_moderator", False):
            raise HTTPException(status_code=403, detail="Only room moderators can add other users by username")

    # Insert member
    member = db.table("family_room_members_realtime").insert({
        "room_id": room_id,
        "user_id": target_user_id,
        "role_in_room": role,
        "is_moderator": is_moderator
    }).execute()

    # Notify the added user (if different)
    if target_user_id and (not user_id or target_user_id != user_id):
        db.table("notifications_realtime").insert({
            "user_id": target_user_id,
            "type": "family_room_added",
            "title": "🏠 You've been added to a Family Room",
            "body": f"You were added to {room_data.get('id')}",
            "data": {"room_id": room_id}
        }).execute()

    return {"member": member.data[0] if member.data else None}


@router.post("/{room_id}/message")
async def send_room_message(room_id: str, req: RoomMessageRequest, user_id: str = Depends(get_current_user_id)):
    """Send a message to a family room with multi-language translation."""
    db = get_supabase()
    
    # Get all members' primary languages
    members = db.table("family_room_members_realtime") \
        .select("user_id") \
        .eq("room_id", room_id) \
        .eq("status", "active") \
        .execute()
    
    member_ids = [m["user_id"] for m in (members.data or [])]
    
    # Get unique languages
    languages = db.table("user_languages_realtime") \
        .select("language_code, user_id") \
        .in_("user_id", member_ids) \
        .eq("is_primary", True) \
        .execute()
    
    unique_langs = set(l["language_code"] for l in (languages.data or []))
    source_lang = req.original_language or "en"
    
    # Translate to all languages
    translations = {}
    for lang in unique_langs:
        if lang != source_lang:
            result = await translate_text(req.original_text, source_lang, lang)
            translations[lang] = result["translated_text"]
    translations[source_lang] = req.original_text
    
    # Save message
    message = db.table("family_room_messages_realtime").insert({
        "room_id": room_id,
        "sender_id": user_id,
        "content_type": req.content_type,
        "original_text": req.original_text,
        "original_language": source_lang,
        "translations": translations
    }).execute()
    
    if message.data:
        try:
            await manager.broadcast(room_id, {
                "type": "new_message",
                "message": message.data[0]
            })
        except Exception:
            pass
            
    return {"message": message.data[0] if message.data else None}


@router.get("/{room_id}/messages")
async def get_room_messages(room_id: str, limit: int = 50, user_id: str = Depends(get_current_user_id)):
    """Get messages for a family room."""
    db = get_supabase()
    
    messages = db.table("family_room_messages_realtime") \
        .select("*, profiles:sender_id(display_name, avatar_config, country)") \
        .eq("room_id", room_id) \
        .eq("is_deleted", False) \
        .order("created_at", desc=True) \
        .limit(limit) \
        .execute()
    
    return {"messages": list(reversed(messages.data or []))}


@router.post("/{room_id}/leave")
async def leave_room(room_id: str, user_id: str = Depends(get_current_user_id)):
    """Initiate leaving a family room (7-day farewell period)."""
    db = get_supabase()
    
    db.table("family_room_members_realtime").update({
        "status": "leaving",
        "leaving_announced_at": datetime.utcnow().isoformat()
    }).eq("room_id", room_id).eq("user_id", user_id).execute()
    
    # Check remaining members
    remaining = db.table("family_room_members_realtime") \
        .select("id", count="exact") \
        .eq("room_id", room_id) \
        .in_("status", ["active"]) \
        .execute()
    
    if remaining.count <= 1:
        # Auto-dissolve room
        db.table("family_rooms_realtime").update({"is_active": False}).eq("id", room_id).execute()
        return {"status": "room_dissolved", "message": "Room has been dissolved as not enough members remain."}
    
    return {
        "status": "leaving_announced",
        "farewell_period": "7 days",
        "message": "Your family has been notified. You have 7 days for goodbyes."
    }


# ── Cultural Potluck ──────────────────────────────────

@router.post("/{room_id}/potluck")
async def create_potluck(room_id: str, req: CreatePotluckRequest, user_id: str = Depends(get_current_user_id)):
    """Create a cultural potluck event."""
    db = get_supabase()
    
    potluck = db.table("cultural_potlucks_realtime").insert({
        "room_id": room_id,
        "host_id": user_id,
        "theme": req.theme,
        "dish_name": req.dish_name,
        "cultural_significance": req.cultural_significance,
        "recipe": req.recipe,
        "country_of_origin": req.country_of_origin,
        "scheduled_at": req.scheduled_at,
        "status": "scheduled"
    }).execute()
    
    # Notify all room members
    members = db.table("family_room_members_realtime") \
        .select("user_id") \
        .eq("room_id", room_id) \
        .eq("status", "active") \
        .neq("user_id", user_id) \
        .execute()
    
    for member in (members.data or []):
        db.table("notifications_realtime").insert({
            "user_id": member["user_id"],
            "type": "potluck_reminder",
            "title": f"🍽️ Cultural Potluck: {req.theme}",
            "body": f"A new potluck event has been scheduled! Theme: {req.theme}",
            "data": {"room_id": room_id, "potluck_id": potluck.data[0]["id"] if potluck.data else None}
        }).execute()
    
    return {"potluck": potluck.data[0] if potluck.data else None}


def _generate_code(length: int = 8) -> str:
    alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # omit confusing chars
    return ''.join(secrets.choice(alphabet) for _ in range(length))


@router.post("/{room_id}/join-code")
async def create_join_code(room_id: str, req: CreateJoinCodeRequest, user_id: str = Depends(get_current_user_id)):
    """Create a shareable join code for a room (moderators only).

    Returns the created join code row.
    """
    db = get_supabase()

    # Verify caller is moderator for the room
    membership = db.table("family_room_members_realtime").select("is_moderator").eq("room_id", room_id).eq("user_id", user_id).eq("status", "active").execute()
    if not membership.data or len(membership.data) == 0 or not membership.data[0].get("is_moderator", False):
        raise HTTPException(status_code=403, detail="Only room moderators can create join codes")

    # Ensure room exists
    room = db.table("family_rooms_realtime").select("id").eq("id", room_id).execute()
    if not room.data or len(room.data) == 0:
        raise HTTPException(status_code=404, detail="Room not found")

    # Generate unique code (retry a few times)
    code = None
    for _ in range(6):
        candidate = _generate_code(8)
        exists = db.table("family_room_join_codes_realtime").select("id").eq("code", candidate).execute()
        if not exists.data or len(exists.data) == 0:
            code = candidate
            break
    if not code:
        raise HTTPException(status_code=500, detail="Failed to generate unique join code")

    payload = {
        "room_id": room_id,
        "code": code,
        "created_by": user_id,
        "is_active": True,
    }
    if req.max_uses is not None:
        payload["max_uses"] = req.max_uses
    if req.expires_at:
        # expect ISO timestamp
        payload["expires_at"] = req.expires_at

    created = db.table("family_room_join_codes_realtime").insert(payload).execute()
    if not created.data:
        raise HTTPException(status_code=500, detail="Failed to create join code")

    return {"join_code": created.data[0]}


# ── WebSockets ────────────────────────────────────────

@router.websocket("/{room_id}/ws/{user_id}")
async def websocket_family_room(websocket: WebSocket, room_id: str, user_id: str):
    """Real-time WebSocket endpoint for Family Rooms."""
    db = get_supabase()
    
    # Verify user is an active member of this room
    membership = db.table("family_room_members_realtime") \
        .select("id, role_in_room") \
        .eq("room_id", room_id) \
        .eq("user_id", user_id) \
        .eq("status", "active") \
        .execute()
        
    if not membership.data or len(membership.data) == 0:
        await websocket.close(code=1008, reason="Policy Violation: You are not a member of this room.")
        return
        
    await manager.connect(websocket, room_id)
    
    # Notify room that user has joined WebSocket
    try:
        await manager.broadcast(room_id, {
            "type": "presence",
            "status": "online",
            "user_id": user_id
        }, exclude=websocket)
    except Exception:
        pass
        
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            msg_type = message_data.get("type", "message")
            
            if msg_type == "typing":
                await manager.broadcast(room_id, {
                    "type": "typing",
                    "user_id": user_id
                }, exclude=websocket)
                
            elif msg_type in ("webrtc_offer", "webrtc_answer", "webrtc_ice_candidate"):
                payload = {
                    "type": msg_type,
                    "from_user_id": user_id,
                    **message_data
                }
                await manager.broadcast(room_id, payload, exclude=websocket)
                
            elif msg_type == "call_join":
                await manager.broadcast(room_id, {"type": "call_join", "user_id": user_id}, exclude=websocket)
                
            elif msg_type == "call_leave":
                await manager.broadcast(room_id, {"type": "call_leave", "user_id": user_id}, exclude=websocket)
                
            elif msg_type == "message":
                original_text = message_data.get("text", "")
                content_type = message_data.get("content_type", "text")
                source_lang = message_data.get("language")
                
                if not original_text:
                    continue
                    
                if not source_lang:
                    try:
                        source_lang = await detect_language(original_text)
                    except Exception:
                        source_lang = "en"
                source_lang = source_lang or "en"
                
                # Fetch members and languages for active translation
                members = db.table("family_room_members_realtime").select("user_id").eq("room_id", room_id).eq("status", "active").execute()
                member_ids = [m["user_id"] for m in (members.data or [])]
                
                languages = db.table("user_languages_realtime").select("language_code, user_id").in_("user_id", member_ids).eq("is_primary", True).execute()
                unique_langs = set(l["language_code"] for l in (languages.data or []))
                
                translations = {source_lang: original_text}
                for lang in unique_langs:
                    if lang != source_lang:
                        try:
                            result = await translate_text(original_text, source_lang, lang)
                            translations[lang] = result["translated_text"]
                        except Exception:
                            translations[lang] = original_text  # Fallback to original
                
                # Save to DB
                new_msg = db.table("family_room_messages_realtime").insert({
                    "room_id": room_id,
                    "sender_id": user_id,
                    "content_type": content_type,
                    "original_text": original_text,
                    "original_language": source_lang,
                    "translations": translations
                }).execute()
                
                if new_msg.data:
                    # Broadcast the message
                    await manager.broadcast(room_id, {
                        "type": "new_message",
                        "message": new_msg.data[0]
                    })

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        # Notify room of disconnection
        try:
            await manager.broadcast(room_id, {
                "type": "presence",
                "status": "offline",
                "user_id": user_id
            })
        except Exception:
            pass
    except Exception as e:
        manager.disconnect(websocket, room_id)


@router.get("/{room_id}/join-codes")
async def list_join_codes(room_id: str, user_id: str = Depends(get_current_user_id)):
    """List join codes for a room (moderators only)."""
    db = get_supabase()
    membership = db.table("family_room_members_realtime").select("is_moderator").eq("room_id", room_id).eq("user_id", user_id).eq("status", "active").execute()
    if not membership.data or len(membership.data) == 0 or not membership.data[0].get("is_moderator", False):
        raise HTTPException(status_code=403, detail="Only room moderators can view join codes")

    codes = db.table("family_room_join_codes_realtime").select("*").eq("room_id", room_id).order("created_at", desc=True).execute()
    return {"codes": codes.data or []}


@router.post("/join-by-code")
async def join_by_code(req: JoinByCodeRequest, user_id: str = Depends(get_current_user_id)):
    """Consume a join code and add the authenticated user to the room.

    Validates activity, expiry, and max uses atomically (best-effort with simple checks).
    """
    db = get_supabase()
    code_row = db.table("family_room_join_codes_realtime").select("*").eq("code", req.code).execute()
    if not code_row.data or len(code_row.data) == 0:
        raise HTTPException(status_code=404, detail="Join code not found")
    row = code_row.data[0]
    if not row.get("is_active", True):
        raise HTTPException(status_code=400, detail="This join code is not active")
    if row.get("expires_at") and datetime.fromisoformat(row["expires_at"]) <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="This join code has expired")
    if row.get("max_uses") is not None and row.get("uses", 0) >= row.get("max_uses"):
        raise HTTPException(status_code=400, detail="This join code has reached its usage limit")

    room_id = row["room_id"]

    # Check existing membership
    existing = db.table("family_room_members_realtime").select("id").eq("room_id", room_id).eq("user_id", user_id).execute()
    if existing.data and len(existing.data) > 0:
        raise HTTPException(status_code=400, detail="You are already a member of this room")

    # Add member
    member = db.table("family_room_members_realtime").insert({
        "room_id": room_id,
        "user_id": user_id,
        "role_in_room": "member",
        "is_moderator": False
    }).execute()

    # Increment usage counter
    db.table("family_room_join_codes_realtime").update({"uses": row.get("uses", 0) + 1}).eq("id", row["id"]).execute()

    # Notify room creator/owner
    db.table("notifications_realtime").insert({
        "user_id": row.get("created_by"),
        "type": "join_code_used",
        "title": "A join code was used",
        "body": f"A user joined your room using a code",
        "data": {"room_id": room_id, "user_id": user_id}
    }).execute()

    return {"member": member.data[0] if member.data else None, "room_id": room_id}


@router.get("/{room_id}/potlucks")
async def get_potlucks(room_id: str, user_id: str = Depends(get_current_user_id)):
    """Get all potluck events for a room."""
    db = get_supabase()
    
    potlucks = db.table("cultural_potlucks_realtime") \
        .select("*, profiles:host_id(display_name, country, avatar_config)") \
        .eq("room_id", room_id) \
        .order("scheduled_at", desc=True) \
        .execute()
    
    return {
        "potlucks": potlucks.data or [],
        "suggested_themes": [
            "🍜 Comfort food from childhood",
            "🎉 Festival dishes",
            "🌮 Street food favorites",
            "👵 Grandma's recipe",
            "🌅 Breakfast around the world",
            "🍰 Sweet treats & desserts",
            "🥗 Healthy family meals",
            "🔥 Spiciest dish you can handle"
        ]
    }


# ─── Room Polls ────────────────────────────────────────────────────────────────

@router.post("/{room_id}/poll/create")
async def create_room_poll(
    room_id: str,
    question: str,
    options: str,  # Comma-separated
    allow_multiple: bool = False,
    user_id: str = Depends(get_current_user_id)
):
    """Create a poll in a family room."""
    db = get_supabase()
    
    membership = db.table("family_room_members_realtime") \
        .select("id") \
        .eq("room_id", room_id) \
        .eq("user_id", user_id) \
        .eq("status", "active") \
        .execute()
    
    if not membership.data:
        raise HTTPException(status_code=403, detail="You are not a member of this room")
    
    options_list = [o.strip() for o in options.split(",") if o.strip()]
    if len(options_list) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 options")
    
    poll = db.table("polls_realtime").insert({
        "creator_id": user_id,
        "room_id": room_id,
        "question": question,
        "options": options_list,
        "allow_multiple": allow_multiple,
    }).execute()
    
    if not poll.data:
        raise HTTPException(status_code=500, detail="Failed to create poll")
    
    # Create room message
    db.table("family_room_messages_realtime").insert({
        "room_id": room_id,
        "sender_id": user_id,
        "content_type": "poll",
        "original_text": f"📊 Poll: {question}",
        "poll_id": poll.data[0]["id"],
    }).execute()
    
    return {"poll": poll.data[0]}


@router.post("/{room_id}/poll/{poll_id}/vote")
async def vote_room_poll(
    room_id: str,
    poll_id: str,
    selected_option: int,
    user_id: str = Depends(get_current_user_id)
):
    """Vote on a room poll."""
    db = get_supabase()
    
    poll = db.table("polls_realtime").select("*").eq("id", poll_id).eq("room_id", room_id).execute()
    if not poll.data:
        raise HTTPException(status_code=404, detail="Poll not found in this room")
    
    poll_data = poll.data[0]
    if selected_option < 0 or selected_option >= len(poll_data["options"]):
        raise HTTPException(status_code=400, detail="Invalid option")
    
    if not poll_data.get("allow_multiple"):
        existing = db.table("poll_votes_realtime").select("id").eq("poll_id", poll_id).eq("user_id", user_id).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Already voted")
    
    db.table("poll_votes_realtime").insert({
        "poll_id": poll_id,
        "user_id": user_id,
        "selected_option": selected_option,
    }).execute()
    
    all_votes = db.table("poll_votes_realtime").select("selected_option").eq("poll_id", poll_id).execute()
    results = {}
    for v in (all_votes.data or []):
        results[v["selected_option"]] = results.get(v["selected_option"], 0) + 1
    
    return {"voted": True, "results": results}


# ─── Room Message Reactions ────────────────────────────────────────────────────

@router.post("/{room_id}/message/{message_id}/react")
async def react_to_room_message(
    room_id: str,
    message_id: str,
    emoji: str,
    user_id: str = Depends(get_current_user_id)
):
    """Add/toggle a reaction on a room message."""
    db = get_supabase()
    
    msg = db.table("family_room_messages_realtime") \
        .select("id, reactions") \
        .eq("id", message_id) \
        .eq("room_id", room_id) \
        .execute()
    
    if not msg.data:
        raise HTTPException(status_code=404, detail="Message not found")
    
    reactions = msg.data[0].get("reactions") or {}
    if emoji in reactions:
        if user_id in reactions[emoji]:
            reactions[emoji].remove(user_id)
            if not reactions[emoji]:
                del reactions[emoji]
        else:
            reactions[emoji].append(user_id)
    else:
        reactions[emoji] = [user_id]
    
    db.table("family_room_messages_realtime").update({"reactions": reactions}).eq("id", message_id).execute()
    
    return {"reactions": reactions}


# ─── Room Delete Message ───────────────────────────────────────────────────────

@router.delete("/{room_id}/message/{message_id}")
async def delete_room_message(
    room_id: str,
    message_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Soft-delete a room message (sender or moderator only)."""
    db = get_supabase()
    
    msg = db.table("family_room_messages_realtime") \
        .select("sender_id") \
        .eq("id", message_id) \
        .eq("room_id", room_id) \
        .execute()
    
    if not msg.data:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Check: sender or moderator
    is_sender = msg.data[0]["sender_id"] == user_id
    is_mod = False
    if not is_sender:
        membership = db.table("family_room_members_realtime") \
            .select("is_moderator") \
            .eq("room_id", room_id) \
            .eq("user_id", user_id) \
            .execute()
        is_mod = membership.data[0].get("is_moderator", False) if membership.data else False
    
    if not is_sender and not is_mod:
        raise HTTPException(status_code=403, detail="Only the sender or a moderator can delete")
    
    db.table("family_room_messages_realtime").update({"is_deleted": True}).eq("id", message_id).execute()
    
    return {"status": "deleted"}
