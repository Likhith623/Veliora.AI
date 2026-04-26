"""Chat router — Messages with real-time translation, polls, media, reactions, replies.

Enhanced features:
  - Image/video uploads stored in Supabase
  - Polls (WhatsApp-style) with voting
  - Emoji reactions on messages
  - Reply-to-message threading
  - Message forwarding
  - Read receipts via WebSocket
  - XP gifting as chat messages
"""
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends, UploadFile, File, Form
from datetime import datetime
from typing import Dict, Set, Optional
import json

from realtime_communication.models.schemas import (
    SendMessageRequest, CreatePollRequest, VotePollRequest,
    ReactRequest, ForwardMessageRequest, GiftXPRequest, GiftXPInChatRequest
)
from realtime_communication.services.supabase_client import get_supabase
from realtime_communication.services.translation_service import translate_text, extract_facts_from_message, detect_language
from realtime_communication.services.auth_service import get_current_user_id
from realtime_communication.services.notification_service import send_notification
from realtime_communication.services.xp_service import award_xp, gift_xp, check_and_level_up

router = APIRouter(prefix="/chat", tags=["Chat"])


# ─── WebSocket Connection Manager ─────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, relationship_id: str):
        await websocket.accept()
        if relationship_id not in self.active_connections:
            self.active_connections[relationship_id] = set()
        self.active_connections[relationship_id].add(websocket)
    
    def disconnect(self, websocket: WebSocket, relationship_id: str):
        if relationship_id in self.active_connections:
            self.active_connections[relationship_id].discard(websocket)
    
    async def broadcast(self, relationship_id: str, message: dict, exclude: WebSocket = None):
        if relationship_id in self.active_connections:
            for conn in self.active_connections[relationship_id]:
                if conn != exclude:
                    try:
                        await conn.send_json(message)
                    except Exception:
                        pass


manager = ConnectionManager()


# ─── Helper: verify user is in relationship ────────────────────────────────────

def _verify_relationship(db, relationship_id: str, user_id: str):
    rel = db.table("relationships_realtime") \
        .select("*") \
        .eq("id", relationship_id) \
        .eq("status", "active") \
        .execute()
    if not rel.data:
        raise HTTPException(status_code=404, detail="Relationship not found or inactive")
    rel_data = rel.data[0]
    if user_id not in [rel_data["user_a_id"], rel_data["user_b_id"]]:
        raise HTTPException(status_code=403, detail="You are not part of this relationship")
    return rel_data


# ═══════════════════════════════════════════════════════════════════════════════
#  Send Message (Text, Image, Video, Voice)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/send")
async def send_message(req: SendMessageRequest, current_user: str = Depends(get_current_user_id)):
    """Send a message with auto-translation. Supports text, image, video, voice."""
    db = get_supabase()
    user_id = current_user
    
    rel_data = _verify_relationship(db, req.relationship_id, user_id)
    
    # Determine partner
    is_user_a = user_id == rel_data["user_a_id"]
    partner_id = rel_data["user_b_id"] if is_user_a else rel_data["user_a_id"]
    
    # Detect language
    source_lang = req.original_language
    if not source_lang and req.original_text:
        try:
            source_lang = await detect_language(req.original_text)
        except Exception:
            source_lang = "en"
    source_lang = source_lang or "en"
    
    # Get partner's preferred translation language (from privacy settings)
    target_lang = "en"
    try:
        # First check privacy_settings for translation_language
        priv = db.table("privacy_settings_realtime") \
            .select("translation_language") \
            .eq("user_id", partner_id) \
            .execute()
        if priv.data and priv.data[0].get("translation_language"):
            target_lang = priv.data[0]["translation_language"]
        else:
            # Fallback to primary language
            partner_lang = db.table("user_languages_realtime") \
                .select("language_code") \
                .eq("user_id", partner_id) \
                .eq("is_primary", True) \
                .limit(1) \
                .execute()
            if partner_lang.data:
                target_lang = partner_lang.data[0]["language_code"]
    except Exception:
        pass
    
    # Translate
    translation = {
        "translated_text": req.original_text,
        "has_idiom": False,
        "idiom_explanation": None,
        "cultural_note": None,
    }
    if req.original_text and source_lang != target_lang:
        try:
            translation = await translate_text(req.original_text, source_lang, target_lang)
        except Exception as e:
            print(f"[Chat] Translation failed: {e}")
    
    # Extract facts
    facts = []
    if req.original_text:
        try:
            facts = await extract_facts_from_message(req.original_text, user_id)
        except Exception:
            pass
    
    # Save message
    msg_payload = {
        "relationship_id": req.relationship_id,
        "sender_id": user_id,
        "content_type": req.content_type,
        "original_text": req.original_text,
        "original_language": source_lang,
        "translated_text": translation["translated_text"],
        "target_language": target_lang,
        "has_idiom": translation.get("has_idiom", False),
        "idiom_explanation": translation.get("idiom_explanation"),
        "cultural_note": translation.get("cultural_note"),
        "voice_url": req.voice_url,
        "image_url": req.image_url,
        "video_url": req.video_url,
        "reply_to_id": req.reply_to_id,
        "extracted_facts": [{"fact": f["category"], "value": f["value"]} for f in facts] if facts else [],
    }
    
    message = db.table("messages_realtime_comunicatio_realtime").insert(msg_payload).execute()
    if not message.data:
        raise HTTPException(status_code=500, detail="Failed to send message")
    
    msg_data = message.data[0]
    
    # Update relationship stats
    try:
        db.table("relationships_realtime").update({
            "messages_exchanged": rel_data.get("messages_exchanged", 0) + 1,
            "last_interaction_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", req.relationship_id).execute()
    except Exception:
        pass
    
    # Save extracted facts
    for fact in facts:
        try:
            db.table("chat_facts_realtime").insert({
                "user_id": user_id,
                "relationship_id": req.relationship_id,
                "source_message_id": msg_data["id"],
                "fact_category": fact["category"],
                "fact_value": fact["value"],
                "confidence": 0.85
            }).execute()
        except Exception:
            pass
    
    # Award small XP for chatting
    try:
        await award_xp(user_id, 1, "chat", "earned", source_id=req.relationship_id)
    except Exception:
        pass
    
    # Check level up
    try:
        await check_and_level_up(req.relationship_id)
    except Exception:
        pass
    
    # Notification
    try:
        sender_profile = db.table("profiles_realtime").select("display_name").eq("id", user_id).execute()
        sender_name = sender_profile.data[0]["display_name"] if sender_profile.data else "Someone"
        
        preview = (translation["translated_text"] or req.original_text or "")[:100]
        if req.content_type == "image":
            preview = "📷 Image"
        elif req.content_type == "video":
            preview = "🎥 Video"
        elif req.content_type == "voice":
            preview = "🎤 Voice message"
        
        await send_notification(
            partner_id, "new_message",
            data={"relationship_id": req.relationship_id, "message_id": msg_data["id"]},
            sender=sender_name, preview=preview
        )
    except Exception:
        pass
    
    # Broadcast via WebSocket
    try:
        await manager.broadcast(req.relationship_id, {
            "type": "new_message",
            "message": msg_data
        })
    except Exception:
        pass
    
    return {"message": msg_data}


# ═══════════════════════════════════════════════════════════════════════════════
#  Upload Media (Image/Video)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/upload-media")
async def upload_media(
    relationship_id: str = Form(...),
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    media_type: Optional[str] = Form(None),
    current_user: str = Depends(get_current_user_id)
):
    """Upload image/video/voice and send as a chat message."""
    db = get_supabase()
    rel_data = _verify_relationship(db, relationship_id, current_user)
    
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    
    # Determine content type
    mime = file.content_type or "application/octet-stream"
    is_image = mime.startswith("image/")
    is_video = mime.startswith("video/")
    is_voice = mime.startswith("audio/")
    
    if not is_image and not is_video and not is_voice:
        raise HTTPException(status_code=400, detail="Only images, videos, and audio are supported")
    
    # Upload to Supabase Storage
    ext_fallback = "jpg" if is_image else ("mp4" if is_video else "webm")
    ext = file.filename.split(".")[-1] if file.filename else ext_fallback
    file_path = f"chat/{relationship_id}/{current_user}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.{ext}"
    
    try:
        db.storage.from_("chat-media").upload(file_path, content, {"content-type": mime})
        public_url = db.storage.from_("chat-media").get_public_url(file_path)
    except Exception as e:
        # Fallback: store as data URL or use a placeholder
        public_url = f"upload://{file_path}"
        print(f"[Chat] Storage upload failed: {e}")
    
    # Determine content_type string for message
    resolved_content_type = media_type or ("image" if is_image else ("video" if is_video else "voice"))
    
    # Send as message
    req = SendMessageRequest(
        relationship_id=relationship_id,
        content_type=resolved_content_type,
        original_text=caption or "",
        image_url=public_url if is_image else None,
        video_url=public_url if is_video else None,
        voice_url=public_url if is_voice else None,
    )
    
    return await send_message(req, current_user)


# ═══════════════════════════════════════════════════════════════════════════════
#  Get Messages
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/messages/{relationship_id}")
async def get_messages(
    relationship_id: str,
    limit: int = 50,
    offset: int = 0,
    current_user: str = Depends(get_current_user_id)
):
    """Get messages for a relationship with pagination."""
    db = get_supabase()
    _verify_relationship(db, relationship_id, current_user)
    
    messages = db.table("messages_realtime_comunicatio_realtime") \
        .select("*") \
        .eq("relationship_id", relationship_id) \
        .eq("is_deleted", False) \
        .order("created_at", desc=True) \
        .range(offset, offset + limit - 1) \
        .execute()
    
    # Mark unread as read
    try:
        db.table("messages_realtime_comunicatio_realtime") \
            .update({"is_read": True, "read_at": datetime.utcnow().isoformat()}) \
            .eq("relationship_id", relationship_id) \
            .neq("sender_id", current_user) \
            .eq("is_read", False) \
            .execute()
    except Exception:
        pass
    
    return {"messages": list(reversed(messages.data or []))}


# ═══════════════════════════════════════════════════════════════════════════════
#  Relationship Details
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/relationship/{relationship_id}")
async def get_relationship_details(relationship_id: str, current_user: str = Depends(get_current_user_id)):
    """Get full relationship details including partner info and unlocked features."""
    db = get_supabase()
    rel_data = _verify_relationship(db, relationship_id, current_user)
    
    partner_id = rel_data["user_b_id"] if rel_data["user_a_id"] == current_user else rel_data["user_a_id"]
    partner = db.table("profiles_realtime") \
        .select("id, display_name, country, city, timezone, avatar_config, is_verified, care_score, status, status_message, last_active_at, profile_photo_url") \
        .eq("id", partner_id) \
        .execute()
    
    milestones = db.table("relationship_milestones_realtime") \
        .select("*") \
        .eq("relationship_id", relationship_id) \
        .order("achieved_at", desc=True) \
        .execute()
    
    my_role = rel_data["user_a_role"] if rel_data["user_a_id"] == current_user else rel_data["user_b_role"]
    partner_role = rel_data["user_b_role"] if rel_data["user_a_id"] == current_user else rel_data["user_a_role"]
    level = rel_data.get("level", 1)
    
    return {
        "relationship": rel_data,
        "partner": partner.data[0] if partner.data else None,
        "milestones": milestones.data or [],
        "my_role": my_role,
        "partner_role": partner_role,
        "features_unlocked": {
            "text": True,
            "emojis": level >= 2,
            "audio_calls": level >= 3,
            "video_calls": level >= 4,
            "family_room": level >= 5,
            "custom_themes": level >= 6,
            "priority_match": level >= 7,
            "mentor": level >= 8,
            "cultural_ambassador": level >= 9,
            "digital_family_book": level >= 10,
        }
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  Polls
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/poll/create")
async def create_poll(req: CreatePollRequest, current_user: str = Depends(get_current_user_id)):
    """Create a poll in a chat (like WhatsApp)."""
    db = get_supabase()
    
    if len(req.options) < 2:
        raise HTTPException(status_code=400, detail="Poll needs at least 2 options")
    if len(req.options) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 options")
    
    if req.relationship_id:
        _verify_relationship(db, req.relationship_id, current_user)
    
    poll = db.table("polls_realtime").insert({
        "creator_id": current_user,
        "relationship_id": req.relationship_id,
        "room_id": req.room_id,
        "question": req.question,
        "options": req.options,
        "allow_multiple": req.allow_multiple,
        "is_anonymous": req.is_anonymous,
        "expires_at": req.expires_at,
    }).execute()
    
    if not poll.data:
        raise HTTPException(status_code=500, detail="Failed to create poll")
    
    poll_data = poll.data[0]
    
    # Create a message with the poll
    if req.relationship_id:
        msg = db.table("messages_realtime_comunicatio_realtime").insert({
            "relationship_id": req.relationship_id,
            "sender_id": current_user,
            "content_type": "poll",
            "original_text": f"📊 Poll: {req.question}",
            "poll_id": poll_data["id"],
        }).execute()
        
        # Broadcast
        if msg.data:
            await manager.broadcast(req.relationship_id, {
                "type": "poll_created",
                "poll": poll_data,
                "message": msg.data[0],
            })
        
        # Notify partner
        rel = db.table("relationships_realtime").select("user_a_id, user_b_id").eq("id", req.relationship_id).execute()
        if rel.data:
            partner_id = rel.data[0]["user_b_id"] if rel.data[0]["user_a_id"] == current_user else rel.data[0]["user_a_id"]
            sender = db.table("profiles_realtime").select("display_name").eq("id", current_user).execute()
            sender_name = sender.data[0]["display_name"] if sender.data else "Someone"
            await send_notification(
                partner_id, "poll_created",
                data={"poll_id": poll_data["id"], "relationship_id": req.relationship_id},
                sender=sender_name, question=req.question[:50]
            )
    
    return {"poll": poll_data}


@router.post("/poll/{poll_id}/vote")
async def vote_poll(poll_id: str, req: VotePollRequest, current_user: str = Depends(get_current_user_id)):
    """Vote on a poll option."""
    db = get_supabase()
    
    poll = db.table("polls_realtime").select("*").eq("id", poll_id).execute()
    if not poll.data:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    poll_data = poll.data[0]
    
    if poll_data.get("is_closed"):
        raise HTTPException(status_code=400, detail="This poll is closed")
    
    if req.selected_option < 0 or req.selected_option >= len(poll_data["options"]):
        raise HTTPException(status_code=400, detail="Invalid option index")
    
    # Check if already voted (if not allow_multiple)
    if not poll_data.get("allow_multiple"):
        existing = db.table("poll_votes_realtime") \
            .select("id") \
            .eq("poll_id", poll_id) \
            .eq("user_id", current_user) \
            .execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="You already voted on this poll")
    
    # Record vote
    vote = db.table("poll_votes_realtime").insert({
        "poll_id": poll_id,
        "user_id": current_user,
        "selected_option": req.selected_option,
    }).execute()
    
    # Get updated results
    all_votes = db.table("poll_votes_realtime") \
        .select("selected_option, user_id") \
        .eq("poll_id", poll_id) \
        .execute()
    
    results = {}
    for v in (all_votes.data or []):
        opt = v["selected_option"]
        results[opt] = results.get(opt, 0) + 1
    
    # Broadcast poll update
    if poll_data.get("relationship_id"):
        await manager.broadcast(poll_data["relationship_id"], {
            "type": "poll_vote",
            "poll_id": poll_id,
            "results": results,
            "total_votes": len(all_votes.data or []),
        })
    
    return {
        "voted": True,
        "results": results,
        "total_votes": len(all_votes.data or []),
    }


@router.get("/poll/{poll_id}")
async def get_poll(poll_id: str, current_user: str = Depends(get_current_user_id)):
    """Get poll details with current results."""
    db = get_supabase()
    
    poll = db.table("polls_realtime").select("*").eq("id", poll_id).execute()
    if not poll.data:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    poll_data = poll.data[0]
    
    votes = db.table("poll_votes_realtime").select("selected_option, user_id").eq("poll_id", poll_id).execute()
    
    results = {}
    voter_data = {}
    for v in (votes.data or []):
        opt = v["selected_option"]
        results[opt] = results.get(opt, 0) + 1
        if not poll_data.get("is_anonymous"):
            voter_data.setdefault(opt, []).append(v["user_id"])
    
    # Check if current user voted
    user_vote = None
    for v in (votes.data or []):
        if v["user_id"] == current_user:
            user_vote = v["selected_option"]
            break
    
    return {
        "poll": poll_data,
        "results": results,
        "voters": voter_data if not poll_data.get("is_anonymous") else {},
        "total_votes": len(votes.data or []),
        "user_vote": user_vote,
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  Reactions
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/message/{message_id}/react")
async def react_to_message(
    message_id: str,
    req: ReactRequest,
    current_user: str = Depends(get_current_user_id)
):
    """Add or toggle an emoji reaction on a message."""
    db = get_supabase()
    
    msg = db.table("messages_realtime_comunicatio_realtime").select("id, reactions, relationship_id, sender_id").eq("id", message_id).execute()
    if not msg.data:
        raise HTTPException(status_code=404, detail="Message not found")
    
    msg_data = msg.data[0]
    reactions = msg_data.get("reactions") or {}
    
    # Toggle reaction
    if req.emoji in reactions:
        if current_user in reactions[req.emoji]:
            reactions[req.emoji].remove(current_user)
            if not reactions[req.emoji]:
                del reactions[req.emoji]
        else:
            reactions[req.emoji].append(current_user)
    else:
        reactions[req.emoji] = [current_user]
    
    db.table("messages_realtime_comunicatio_realtime").update({"reactions": reactions}).eq("id", message_id).execute()
    
    # Broadcast
    if msg_data.get("relationship_id"):
        await manager.broadcast(msg_data["relationship_id"], {
            "type": "reaction",
            "message_id": message_id,
            "reactions": reactions,
            "user_id": current_user,
            "emoji": req.emoji,
        })
    
    # Notify message sender
    if msg_data["sender_id"] != current_user:
        sender = db.table("profiles_realtime").select("display_name").eq("id", current_user).execute()
        sender_name = sender.data[0]["display_name"] if sender.data else "Someone"
        await send_notification(
            msg_data["sender_id"], "message_reaction",
            data={"message_id": message_id, "emoji": req.emoji},
            sender=sender_name, emoji=req.emoji
        )
    
    return {"reactions": reactions}


# ═══════════════════════════════════════════════════════════════════════════════
#  Delete Message
# ═══════════════════════════════════════════════════════════════════════════════

@router.delete("/message/{message_id}")
async def delete_message(message_id: str, current_user: str = Depends(get_current_user_id)):
    """Soft-delete a message (only by sender)."""
    db = get_supabase()
    
    msg = db.table("messages_realtime_comunicatio_realtime").select("sender_id, relationship_id").eq("id", message_id).execute()
    if not msg.data:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if msg.data[0]["sender_id"] != current_user:
        raise HTTPException(status_code=403, detail="You can only delete your own messages")
    
    db.table("messages_realtime_comunicatio_realtime").update({"is_deleted": True}).eq("id", message_id).execute()
    
    await manager.broadcast(msg.data[0]["relationship_id"], {
        "type": "message_deleted",
        "message_id": message_id,
    })
    
    return {"status": "deleted"}


# ═══════════════════════════════════════════════════════════════════════════════
#  Forward Message
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/message/{message_id}/forward")
async def forward_message(
    message_id: str,
    req: ForwardMessageRequest,
    current_user: str = Depends(get_current_user_id)
):
    """Forward a message to another relationship."""
    db = get_supabase()
    
    msg = db.table("messages_realtime_comunicatio_realtime").select("*").eq("id", message_id).execute()
    if not msg.data:
        raise HTTPException(status_code=404, detail="Message not found")
    
    _verify_relationship(db, req.target_relationship_id, current_user)
    
    original = msg.data[0]
    
    forwarded = db.table("messages_realtime_comunicatio_realtime").insert({
        "relationship_id": req.target_relationship_id,
        "sender_id": current_user,
        "content_type": original["content_type"],
        "original_text": original["original_text"],
        "original_language": original.get("original_language"),
        "image_url": original.get("image_url"),
        "video_url": original.get("video_url"),
        "voice_url": original.get("voice_url"),
        "forwarded_from": message_id,
    }).execute()
    
    if forwarded.data:
        await manager.broadcast(req.target_relationship_id, {
            "type": "new_message",
            "message": forwarded.data[0]
        })
    
    return {"message": forwarded.data[0] if forwarded.data else None}


# ═══════════════════════════════════════════════════════════════════════════════
#  Gift XP in Chat
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/gift-xp")
async def gift_xp_in_chat(req: GiftXPInChatRequest, current_user: str = Depends(get_current_user_id)):
    """Gift XP to chat partner. Creates a system message showing the gift."""
    db = get_supabase()
    
    # Find relationship
    rel = db.table("relationships_realtime") \
        .select("id, user_a_id, user_b_id") \
        .eq("id", req.relationship_id) \
        .eq("status", "active") \
        .execute()
    
    if not rel.data:
        raise HTTPException(status_code=404, detail="Relationship not found")
        
    rel_data = rel.data[0]
    if current_user not in [rel_data["user_a_id"], rel_data["user_b_id"]]:
        raise HTTPException(status_code=403, detail="Not your relationship")
        
    receiver_id = rel_data["user_b_id"] if current_user == rel_data["user_a_id"] else rel_data["user_a_id"]
    
    result = await gift_xp(current_user, receiver_id, req.amount)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    
    if rel.data:
        sender = db.table("profiles_realtime").select("display_name").eq("id", current_user).execute()
        sender_name = sender.data[0]["display_name"] if sender.data else "Someone"
        
        msg_text = f"🎁 {sender_name} gifted {req.amount} XP!"
        if req.message:
            msg_text += f"\n\"{req.message}\""
            
        # Create a system message
        msg = db.table("messages_realtime_comunicatio_realtime").insert({
            "relationship_id": rel.data[0]["id"],
            "sender_id": current_user,
            "content_type": "xp_gift",
            "original_text": msg_text,
        }).execute()
        
        if msg.data:
            await manager.broadcast(rel.data[0]["id"], {
                "type": "xp_gift",
                "message": msg.data[0],
                "amount": req.amount,
                "sender_id": current_user,
            })
    
    return result


# ═══════════════════════════════════════════════════════════════════════════════
#  WebSocket Chat
# ═══════════════════════════════════════════════════════════════════════════════

@router.websocket("/ws/{relationship_id}/{user_id}")
async def websocket_chat(websocket: WebSocket, relationship_id: str, user_id: str):
    """WebSocket for real-time chat.
    
    Supported message types:
      - typing, message, read_receipt, reaction, poll_vote
    """
    await manager.connect(websocket, relationship_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            msg_type = message_data.get("type")
            
            if msg_type == "typing":
                await manager.broadcast(relationship_id, {
                    "type": "typing",
                    "user_id": user_id
                }, exclude=websocket)
            
            elif msg_type == "stopped_typing":
                await manager.broadcast(relationship_id, {
                    "type": "stopped_typing",
                    "user_id": user_id
                }, exclude=websocket)
            
            elif msg_type == "read_receipt":
                # Mark messages as read
                db = get_supabase()
                try:
                    db.table("messages_realtime_comunicatio_realtime") \
                        .update({"is_read": True, "read_at": datetime.utcnow().isoformat()}) \
                        .eq("relationship_id", relationship_id) \
                        .neq("sender_id", user_id) \
                        .eq("is_read", False) \
                        .execute()
                except Exception:
                    pass
                
                await manager.broadcast(relationship_id, {
                    "type": "read_receipt",
                    "user_id": user_id,
                    "timestamp": datetime.utcnow().isoformat(),
                }, exclude=websocket)
            
            elif msg_type == "message":
                db = get_supabase()
                
                original_text = message_data.get("text", "")
                content_type = message_data.get("content_type", "text")
                original_language = message_data.get("language")
                image_url = message_data.get("image_url")
                video_url = message_data.get("video_url")
                reply_to_id = message_data.get("reply_to_id")
                
                rel = db.table("relationships_realtime").select("*").eq("id", relationship_id).eq("status", "active").execute()
                if not rel.data:
                    await websocket.send_json({"type": "error", "message": "Relationship not found"})
                    continue
                
                rel_data = rel.data[0]
                partner_id = rel_data["user_b_id"] if user_id == rel_data["user_a_id"] else rel_data["user_a_id"]
                
                # Detect language
                source_lang = original_language or "en"
                if not original_language and original_text:
                    try:
                        source_lang = await detect_language(original_text)
                    except Exception:
                        pass
                
                # Target language
                target_lang = "en"
                try:
                    priv = db.table("privacy_settings_realtime").select("translation_language").eq("user_id", partner_id).execute()
                    if priv.data and priv.data[0].get("translation_language"):
                        target_lang = priv.data[0]["translation_language"]
                    else:
                        pl = db.table("user_languages_realtime").select("language_code").eq("user_id", partner_id).eq("is_primary", True).limit(1).execute()
                        if pl.data:
                            target_lang = pl.data[0]["language_code"]
                except Exception:
                    pass
                
                # Translate
                translation = {"translated_text": original_text, "has_idiom": False, "idiom_explanation": None, "cultural_note": None}
                if original_text and source_lang != target_lang:
                    try:
                        translation = await translate_text(original_text, source_lang, target_lang)
                    except Exception:
                        pass
                
                # Save
                message = db.table("messages_realtime_comunicatio_realtime").insert({
                    "relationship_id": relationship_id,
                    "sender_id": user_id,
                    "content_type": content_type,
                    "original_text": original_text,
                    "original_language": source_lang,
                    "translated_text": translation["translated_text"],
                    "target_language": target_lang,
                    "has_idiom": translation.get("has_idiom", False),
                    "idiom_explanation": translation.get("idiom_explanation"),
                    "cultural_note": translation.get("cultural_note"),
                    "image_url": image_url,
                    "video_url": video_url,
                    "reply_to_id": reply_to_id,
                }).execute()
                
                if message.data:
                    await manager.broadcast(relationship_id, {
                        "type": "new_message",
                        "message": message.data[0]
                    })
                    
                    # Update relationship
                    try:
                        db.table("relationships_realtime").update({
                            "messages_exchanged": rel_data.get("messages_exchanged", 0) + 1,
                            "last_interaction_at": datetime.utcnow().isoformat(),
                        }).eq("id", relationship_id).execute()
                    except Exception:
                        pass
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, relationship_id)
    except Exception:
        manager.disconnect(websocket, relationship_id)
