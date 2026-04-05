"""Friends router — Search users, send/accept/reject friend requests, view friend profiles.

Two paths to friendship:
  1. Search for users → send friend request → they accept → chat opens
  2. Existing relationship role matching (unchanged)

Privacy:
  - Public profiles: instant add → auto-accepted
  - Private profiles: request → wait for acceptance
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime
from typing import Optional

from realtime_communication.models.schemas import FriendRequestCreate, FriendRequestRespond
from realtime_communication.services.supabase_client import get_supabase
from realtime_communication.services.auth_service import get_current_user_id
from realtime_communication.services.notification_service import send_notification
from realtime_communication.services.matching_service import create_relationship

router = APIRouter(prefix="/friends", tags=["Friends"])


# ─── Search Users ──────────────────────────────────────────────────────────────

@router.get("/search")
async def search_users(
    q: str = Query(..., min_length=1, description="Search by username or display name"),
    current_user: str = Depends(get_current_user_id)
):
    """Search for users by username or display_name.
    Returns avatar, name, and bio for each result.
    Respects privacy settings (allow_search).
    """
    db = get_supabase()
    
    # Search by username match or display_name match (case-insensitive via ilike)
    results = db.table("profiles") \
        .select("id, username, display_name, bio, avatar_config, country, city, is_verified, care_score, profile_photo_url") \
        .eq("is_banned", False) \
        .neq("id", current_user) \
        .or_(f"username.ilike.%{q}%,display_name.ilike.%{q}%") \
        .limit(20) \
        .execute()
    
    # Filter by privacy (allow_search)
    filtered = []
    for profile in (results.data or []):
        privacy = db.table("privacy_settings") \
            .select("allow_search, profile_visibility") \
            .eq("user_id", profile["id"]) \
            .execute()
        
        # Default: searchable
        is_searchable = True
        visibility = "public"
        if privacy.data:
            is_searchable = privacy.data[0].get("allow_search", True)
            visibility = privacy.data[0].get("profile_visibility", "public")
        
        if is_searchable:
            # Check existing relationship
            existing_rel = db.table("relationships") \
                .select("id, status") \
                .or_(
                    f"and(user_a_id.eq.{current_user},user_b_id.eq.{profile['id']}),"
                    f"and(user_a_id.eq.{profile['id']},user_b_id.eq.{current_user})"
                ) \
                .execute()
            
            # Check pending friend request
            pending_req = db.table("friend_requests") \
                .select("id, status, sender_id") \
                .or_(
                    f"and(sender_id.eq.{current_user},receiver_id.eq.{profile['id']}),"
                    f"and(sender_id.eq.{profile['id']},receiver_id.eq.{current_user})"
                ) \
                .eq("status", "pending") \
                .execute()
            
            # Determine friendship status
            friendship_status = "none"
            active_rels = [r for r in (existing_rel.data or []) if r["status"] == "active"]
            if active_rels:
                friendship_status = "friends"
            elif pending_req.data:
                if pending_req.data[0]["sender_id"] == current_user:
                    friendship_status = "request_sent"
                else:
                    friendship_status = "request_received"
            
            filtered.append({
                **profile,
                "profile_visibility": visibility,
                "friendship_status": friendship_status,
            })
    
    return {"results": filtered, "count": len(filtered)}


# ─── Send Friend Request ──────────────────────────────────────────────────────

@router.post("/request/{target_id}")
async def send_friend_request(
    target_id: str,
    req: Optional[FriendRequestCreate] = None,
    current_user: str = Depends(get_current_user_id)
):
    """Send a friend request to another user.
    
    - If target's profile is PUBLIC → auto-accept, create relationship, open chat
    - If target's profile is PRIVATE → create pending request, wait for acceptance
    """
    if current_user == target_id:
        raise HTTPException(status_code=400, detail="Cannot send a friend request to yourself")
    
    db = get_supabase()
    
    # Check target exists
    target = db.table("profiles") \
        .select("id, display_name, is_banned") \
        .eq("id", target_id) \
        .execute()
    if not target.data:
        raise HTTPException(status_code=404, detail="User not found")
    if target.data[0].get("is_banned"):
        raise HTTPException(status_code=400, detail="This user is not available")
    
    # Check existing relationship
    existing = db.table("relationships") \
        .select("id, status") \
        .or_(
            f"and(user_a_id.eq.{current_user},user_b_id.eq.{target_id}),"
            f"and(user_a_id.eq.{target_id},user_b_id.eq.{current_user})"
        ) \
        .execute()
    
    for rel in (existing.data or []):
        if rel["status"] == "active":
            return {"status": "already_friends", "relationship_id": rel["id"]}
    
    # Check existing pending request
    pending = db.table("friend_requests") \
        .select("id") \
        .or_(
            f"and(sender_id.eq.{current_user},receiver_id.eq.{target_id}),"
            f"and(sender_id.eq.{target_id},receiver_id.eq.{current_user})"
        ) \
        .eq("status", "pending") \
        .execute()
    if pending.data:
        raise HTTPException(status_code=400, detail="A friend request already exists between you two")
    
    # Check privacy: if target allows friend requests
    privacy = db.table("privacy_settings") \
        .select("profile_visibility, allow_friend_requests") \
        .eq("user_id", target_id) \
        .execute()
    
    visibility = "public"
    allows_requests = True
    if privacy.data:
        visibility = privacy.data[0].get("profile_visibility", "public")
        allows_requests = privacy.data[0].get("allow_friend_requests", True)
    
    if not allows_requests:
        raise HTTPException(status_code=403, detail="This user does not accept friend requests")
    
    # Get sender name
    sender = db.table("profiles").select("display_name").eq("id", current_user).execute()
    sender_name = sender.data[0]["display_name"] if sender.data else "Someone"
    
    if visibility == "public":
        # AUTO-ACCEPT: create relationship immediately
        relationship = await create_relationship(
            user_a_id=current_user,
            user_b_id=target_id,
            role_a="friend",
            role_b="friend"
        )
        
        # Create a friend request record (already accepted)
        db.table("friend_requests").insert({
            "sender_id": current_user,
            "receiver_id": target_id,
            "status": "accepted",
            "message": req.message if req else None,
            "responded_at": datetime.utcnow().isoformat(),
        }).execute()
        
        await send_notification(
            target_id, "friend_request_accepted",
            data={"sender_id": current_user, "relationship_id": relationship.get("id")},
            sender=sender_name
        )
        
        return {
            "status": "accepted",
            "message": f"You are now friends with {target.data[0]['display_name']}!",
            "relationship": relationship,
        }
    else:
        # PRIVATE: create pending request
        fr = db.table("friend_requests").insert({
            "sender_id": current_user,
            "receiver_id": target_id,
            "status": "pending",
            "message": req.message if req else None,
        }).execute()
        
        await send_notification(
            target_id, "friend_request_received",
            data={"request_id": fr.data[0]["id"] if fr.data else None, "sender_id": current_user},
            sender=sender_name
        )
        
        return {
            "status": "pending",
            "message": f"Friend request sent to {target.data[0]['display_name']}!",
            "request": fr.data[0] if fr.data else None,
        }


# ─── Respond to Friend Request ────────────────────────────────────────────────

@router.post("/respond/{request_id}")
async def respond_to_request(
    request_id: str,
    req: FriendRequestRespond,
    current_user: str = Depends(get_current_user_id)
):
    """Accept or reject a friend request."""
    db = get_supabase()
    
    fr = db.table("friend_requests").select("*").eq("id", request_id).execute()
    if not fr.data:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    fr_data = fr.data[0]
    
    if fr_data["receiver_id"] != current_user:
        raise HTTPException(status_code=403, detail="You can only respond to your own requests")
    
    if fr_data["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Request already {fr_data['status']}")
    
    sender_id = fr_data["sender_id"]
    
    # Get names
    receiver = db.table("profiles").select("display_name").eq("id", current_user).execute()
    receiver_name = receiver.data[0]["display_name"] if receiver.data else "Someone"
    
    if req.action == "accept":
        # Create relationship
        relationship = await create_relationship(
            user_a_id=sender_id,
            user_b_id=current_user,
            role_a="friend",
            role_b="friend"
        )
        
        db.table("friend_requests").update({
            "status": "accepted",
            "responded_at": datetime.utcnow().isoformat(),
        }).eq("id", request_id).execute()
        
        await send_notification(
            sender_id, "friend_request_accepted",
            data={"relationship_id": relationship.get("id"), "friend_id": current_user},
            sender=receiver_name
        )
        
        return {
            "status": "accepted",
            "relationship": relationship,
            "message": f"You are now friends with the sender!",
        }
    
    elif req.action == "reject":
        db.table("friend_requests").update({
            "status": "rejected",
            "responded_at": datetime.utcnow().isoformat(),
        }).eq("id", request_id).execute()
        
        await send_notification(
            sender_id, "friend_request_rejected",
            data={"friend_id": current_user},
            sender=receiver_name
        )
        
        return {"status": "rejected"}
    
    else:
        raise HTTPException(status_code=400, detail="Action must be 'accept' or 'reject'")


# ─── Get Pending Requests ─────────────────────────────────────────────────────

@router.get("/requests")
async def get_friend_requests(
    direction: str = Query("incoming", description="'incoming' or 'outgoing'"),
    current_user: str = Depends(get_current_user_id)
):
    """Get pending friend requests."""
    db = get_supabase()
    
    if direction == "incoming":
        results = db.table("friend_requests") \
            .select("*") \
            .eq("receiver_id", current_user) \
            .eq("status", "pending") \
            .order("created_at", desc=True) \
            .execute()
        
        # Enrich with sender info
        enriched = []
        for fr in (results.data or []):
            sender = db.table("profiles") \
                .select("id, display_name, username, avatar_config, country, bio, profile_photo_url, is_verified") \
                .eq("id", fr["sender_id"]) \
                .execute()
            enriched.append({
                **fr,
                "sender_profile": sender.data[0] if sender.data else None
            })
        
        return {"requests": enriched, "count": len(enriched)}
    
    elif direction == "outgoing":
        results = db.table("friend_requests") \
            .select("*") \
            .eq("sender_id", current_user) \
            .eq("status", "pending") \
            .order("created_at", desc=True) \
            .execute()
        
        enriched = []
        for fr in (results.data or []):
            receiver = db.table("profiles") \
                .select("id, display_name, username, avatar_config, country, bio, profile_photo_url") \
                .eq("id", fr["receiver_id"]) \
                .execute()
            enriched.append({
                **fr,
                "receiver_profile": receiver.data[0] if receiver.data else None
            })
        
        return {"requests": enriched, "count": len(enriched)}
    
    raise HTTPException(status_code=400, detail="direction must be 'incoming' or 'outgoing'")


# ─── List All Friends ──────────────────────────────────────────────────────────

@router.get("/list")
async def list_friends(current_user: str = Depends(get_current_user_id)):
    """Get all friends with their profiles (avatar, name, bio, status, XP)."""
    db = get_supabase()
    
    rels = db.table("relationships") \
        .select("*") \
        .or_(f"user_a_id.eq.{current_user},user_b_id.eq.{current_user}") \
        .eq("status", "active") \
        .order("last_interaction_at", desc=True) \
        .execute()
    
    friends = []
    for rel in (rels.data or []):
        friend_id = rel["user_b_id"] if rel["user_a_id"] == current_user else rel["user_a_id"]
        
        profile = db.table("profiles") \
            .select("id, display_name, username, avatar_config, country, city, bio, "
                    "is_verified, care_score, status, last_active_at, profile_photo_url") \
            .eq("id", friend_id) \
            .execute()
        
        # Get XP
        xp = db.table("realtime_xp") \
            .select("current_xp, streak_days") \
            .eq("user_id", friend_id) \
            .execute()
        
        my_role = rel["user_a_role"] if rel["user_a_id"] == current_user else rel["user_b_role"]
        partner_role = rel["user_b_role"] if rel["user_a_id"] == current_user else rel["user_a_role"]
        
        friends.append({
            "relationship_id": rel["id"],
            "level": rel.get("level", 1),
            "bond_points": rel.get("bond_points", 0),
            "streak_days": rel.get("streak_days", 0),
            "my_role": my_role,
            "partner_role": partner_role,
            "profile": profile.data[0] if profile.data else None,
            "xp": xp.data[0] if xp.data else {"current_xp": 0, "streak_days": 0},
        })
    
    return {"friends": friends, "count": len(friends)}


# ─── View Friend's Full Profile ────────────────────────────────────────────────

@router.get("/{friend_id}/profile")
async def get_friend_profile(friend_id: str, current_user: str = Depends(get_current_user_id)):
    """View a friend's full profile (avatar, bio, languages, achievements, XP, care_score).
    Only accessible if you are friends (active relationship).
    """
    db = get_supabase()
    
    # Verify friendship
    rel = db.table("relationships") \
        .select("id, level, bond_points, streak_days, messages_exchanged, matched_at") \
        .or_(
            f"and(user_a_id.eq.{current_user},user_b_id.eq.{friend_id}),"
            f"and(user_a_id.eq.{friend_id},user_b_id.eq.{current_user})"
        ) \
        .eq("status", "active") \
        .execute()
    
    if not rel.data:
        raise HTTPException(status_code=403, detail="You are not friends with this user")
    
    # Get full profile
    profile = db.table("profiles") \
        .select("id, username, display_name, country, city, timezone, bio, "
                "voice_bio_url, profile_photo_url, avatar_config, is_verified, "
                "care_score, reliability_score, total_bond_points, status, "
                "status_message, last_active_at, created_at") \
        .eq("id", friend_id) \
        .execute()
    
    if not profile.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Get languages
    languages = db.table("user_languages").select("*").eq("user_id", friend_id).execute()
    
    # Get achievements
    achievements = db.table("user_achievements") \
        .select("*, achievements(name, icon_emoji, rarity, description)") \
        .eq("user_id", friend_id) \
        .execute()
    
    # Get XP
    xp = db.table("realtime_xp").select("*").eq("user_id", friend_id).execute()
    
    # Respect privacy settings
    privacy = db.table("privacy_settings").select("*").eq("user_id", friend_id).execute()
    privacy_data = privacy.data[0] if privacy.data else {}
    
    profile_data = profile.data[0]
    if not privacy_data.get("show_care_score", True):
        profile_data.pop("care_score", None)
    if not privacy_data.get("show_bio", True):
        profile_data.pop("bio", None)
    if not privacy_data.get("show_last_active", True):
        profile_data.pop("last_active_at", None)
    
    return {
        "profile": profile_data,
        "languages": languages.data or [],
        "achievements": achievements.data or [] if privacy_data.get("show_achievements", True) else [],
        "xp": xp.data[0] if xp.data else None,
        "relationship": rel.data[0],
    }


# ─── Unfriend ──────────────────────────────────────────────────────────────────

@router.delete("/{relationship_id}")
async def unfriend(relationship_id: str, current_user: str = Depends(get_current_user_id)):
    """End a friendship."""
    db = get_supabase()
    
    rel = db.table("relationships").select("*").eq("id", relationship_id).execute()
    if not rel.data:
        raise HTTPException(status_code=404, detail="Relationship not found")
    
    rel_data = rel.data[0]
    if current_user not in [rel_data["user_a_id"], rel_data["user_b_id"]]:
        raise HTTPException(status_code=403, detail="You are not part of this relationship")
    
    db.table("relationships").update({
        "status": "ended",
        "ended_by": current_user,
        "end_reason": "unfriended",
        "ended_at": datetime.utcnow().isoformat(),
    }).eq("id", relationship_id).execute()
    
    partner_id = rel_data["user_b_id"] if rel_data["user_a_id"] == current_user else rel_data["user_a_id"]
    
    await send_notification(
        partner_id, "relationship_ended",
        data={"relationship_id": relationship_id}
    )
    
    return {"status": "unfriended"}
