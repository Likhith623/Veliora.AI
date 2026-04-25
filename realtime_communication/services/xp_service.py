"""XP service — award, gift, leaderboard, level calculation.

All XP mutations go through this service to ensure consistency.
Every change is logged to xp_transactions and realtime_xp is updated.
"""
from datetime import datetime
from realtime_communication.services.supabase_client import get_supabase
from realtime_communication.services.notification_service import send_notification


# ─── Level Thresholds (bond_points → level) ────────────────────────────────────
LEVEL_THRESHOLDS = {
    1: 0,       # Stranger – Text only
    2: 50,      # Acquaintance – Emojis
    3: 150,     # Bonded – Audio calls
    4: 300,     # Close – Video calls
    5: 500,     # Family – Join Global Room
    6: 750,     # Trusted – Custom Themes
    7: 1000,    # Kindred – Priority Match
    8: 1500,    # Soulbound – Mentor
    9: 2000,    # Eternal – Cultural Ambassador
    10: 3000,   # Legendary – Digital Family Book
}

LEVEL_NAMES = {
    1: "Stranger", 2: "Acquaintance", 3: "Bonded", 4: "Close",
    5: "Family", 6: "Trusted", 7: "Kindred", 8: "Soulbound",
    9: "Eternal", 10: "Legendary",
}

LEVEL_FEATURES = {
    1: ["text"],
    2: ["text", "emojis"],
    3: ["text", "emojis", "audio_calls"],
    4: ["text", "emojis", "audio_calls", "video_calls"],
    5: ["text", "emojis", "audio_calls", "video_calls", "family_room"],
    6: ["text", "emojis", "audio_calls", "video_calls", "family_room", "custom_themes"],
    7: ["text", "emojis", "audio_calls", "video_calls", "family_room", "custom_themes", "priority_match"],
    8: ["text", "emojis", "audio_calls", "video_calls", "family_room", "custom_themes", "priority_match", "mentor"],
    9: ["text", "emojis", "audio_calls", "video_calls", "family_room", "custom_themes", "priority_match", "mentor", "cultural_ambassador"],
    10: ["text", "emojis", "audio_calls", "video_calls", "family_room", "custom_themes", "priority_match", "mentor", "cultural_ambassador", "digital_family_book"],
}


def calculate_level(bond_points: int) -> int:
    """Determine relationship level from bond_points."""
    level = 1
    for lvl, threshold in sorted(LEVEL_THRESHOLDS.items()):
        if bond_points >= threshold:
            level = lvl
    return level


def _ensure_xp_row(db, user_id: str) -> dict:
    """Get or create the realtime_xp row for a user."""
    row = db.table("realtime_xp_realtime").select("*").eq("user_id", user_id).execute()
    if row.data:
        return row.data[0]
    # Create
    new = db.table("realtime_xp_realtime").insert({"user_id": user_id}).execute()
    return new.data[0] if new.data else {"current_xp": 0}


async def award_xp(
    user_id: str,
    amount: int,
    source: str,
    transaction_type: str = "earned",
    source_id: str = None,
    counterpart_id: str = None,
    metadata: dict = None,
) -> dict:
    """Award XP to a user. Logs transaction and updates realtime_xp."""
    db = get_supabase()
    xp_row = _ensure_xp_row(db, user_id)
    new_xp = xp_row["current_xp"] + amount
    new_total = xp_row.get("total_xp_earned", 0) + (amount if amount > 0 else 0)

    # Update realtime_xp
    db.table("realtime_xp_realtime").update({
        "current_xp": max(0, new_xp),
        "total_xp_earned": new_total,
        "last_activity_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("user_id", user_id).execute()

    # Log transaction
    tx = db.table("xp_transactions_realtime").insert({
        "user_id": user_id,
        "amount": amount,
        "transaction_type": transaction_type,
        "source": source,
        "source_id": source_id,
        "counterpart_id": counterpart_id,
        "balance_after": max(0, new_xp),
        "metadata": metadata or {},
    }).execute()

    # Notify if earned (not decay)
    if amount > 0:
        await send_notification(
            user_id, "xp_earned",
            data={"amount": amount, "source": source},
            amount=amount, source=source
        )

    return {"new_xp": max(0, new_xp), "transaction": tx.data[0] if tx.data else None}


async def gift_xp(sender_id: str, receiver_id: str, amount: int) -> dict:
    """Transfer XP from sender to receiver. Deducts from sender, adds to receiver."""
    db = get_supabase()

    # Verify sender has enough XP
    sender_xp = _ensure_xp_row(db, sender_id)
    if sender_xp["current_xp"] < amount:
        return {"error": f"Insufficient XP. You have {sender_xp['current_xp']} XP."}

    # Deduct from sender
    sender_new = sender_xp["current_xp"] - amount
    db.table("realtime_xp_realtime").update({
        "current_xp": sender_new,
        "total_xp_gifted": sender_xp.get("total_xp_gifted", 0) + amount,
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("user_id", sender_id).execute()

    db.table("xp_transactions_realtime").insert({
        "user_id": sender_id,
        "amount": -amount,
        "transaction_type": "gifted_out",
        "source": "gift",
        "counterpart_id": receiver_id,
        "balance_after": sender_new,
        "metadata": {"receiver_id": receiver_id},
    }).execute()

    # Add to receiver
    receiver_xp = _ensure_xp_row(db, receiver_id)
    receiver_new = receiver_xp["current_xp"] + amount
    db.table("realtime_xp_realtime").update({
        "current_xp": receiver_new,
        "total_xp_received": receiver_xp.get("total_xp_received", 0) + amount,
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("user_id", receiver_id).execute()

    db.table("xp_transactions_realtime").insert({
        "user_id": receiver_id,
        "amount": amount,
        "transaction_type": "gifted_in",
        "source": "gift",
        "counterpart_id": sender_id,
        "balance_after": receiver_new,
        "metadata": {"sender_id": sender_id},
    }).execute()

    # Get sender name for notification
    sender_profile = db.table("profiles_realtime").select("display_name").eq("id", sender_id).execute()
    sender_name = sender_profile.data[0]["display_name"] if sender_profile.data else "Someone"

    await send_notification(
        receiver_id, "xp_gifted",
        data={"sender_id": sender_id, "amount": amount},
        sender=sender_name, amount=amount
    )

    return {
        "success": True,
        "sender_balance": sender_new,
        "receiver_balance": receiver_new,
        "amount": amount,
    }

async def award_relationship_points(relationship_id: str, bond_points: int, care_score_inc: int = 1):
    """Award bond points to a relationship and update users' total bond points and care score."""
    db = get_supabase()
    rel = db.table("relationships_realtime").select("bond_points, user_a_id, user_b_id").eq("id", relationship_id).execute()
    if rel.data:
        new_bp = rel.data[0].get("bond_points", 0) + bond_points
        db.table("relationships_realtime").update({"bond_points": new_bp}).eq("id", relationship_id).execute()
        
        uid_a = rel.data[0]["user_a_id"]
        uid_b = rel.data[0]["user_b_id"]
        
        for uid in [uid_a, uid_b]:
            profile = db.table("profiles_realtime").select("total_bond_points, care_score").eq("id", uid).execute()
            if profile.data:
                p_data = profile.data[0]
                db.table("profiles_realtime").update({
                    "total_bond_points": (p_data.get("total_bond_points") or 0) + bond_points,
                    "care_score": min(100, (p_data.get("care_score") or 0) + care_score_inc)
                }).eq("id", uid).execute()
        
        await check_and_level_up(relationship_id)

async def get_friend_leaderboard(user_id: str) -> list[dict]:
    """Get XP leaderboard of user's friends (active relationships)."""
    db = get_supabase()

    # Get all friends (active relationships)
    rels = db.table("relationships_realtime") \
        .select("user_a_id, user_b_id") \
        .or_(f"user_a_id.eq.{user_id},user_b_id.eq.{user_id}") \
        .eq("status", "active") \
        .execute()

    friend_ids = set()
    for r in (rels.data or []):
        friend_ids.add(r["user_b_id"] if r["user_a_id"] == user_id else r["user_a_id"])
    friend_ids.add(user_id)  # Include self

    if not friend_ids:
        return []

    # Get XP data for all friends
    leaderboard = []
    for fid in friend_ids:
        xp = db.table("realtime_xp_realtime").select("current_xp, games_won, contests_won, streak_days") \
            .eq("user_id", fid).execute()
        profile = db.table("profiles_realtime").select("display_name, avatar_config, country") \
            .eq("id", fid).execute()

        xp_data = xp.data[0] if xp.data else {"current_xp": 0, "games_won": 0, "contests_won": 0, "streak_days": 0}
        prof = profile.data[0] if profile.data else {}

        leaderboard.append({
            "user_id": fid,
            "display_name": prof.get("display_name", "Unknown"),
            "avatar_config": prof.get("avatar_config"),
            "country": prof.get("country"),
            "current_xp": xp_data.get("current_xp", 0),
            "total_xp": xp_data.get("current_xp", 0),
            "level": (xp_data.get("current_xp", 0) // 100) + 1,
            "games_won": xp_data.get("games_won", 0),
            "contests_won": xp_data.get("contests_won", 0),
            "streak_days": xp_data.get("streak_days", 0),
            "is_self": fid == user_id,
        })

    leaderboard.sort(key=lambda x: x["current_xp"], reverse=True)

    # Assign ranks
    for i, entry in enumerate(leaderboard):
        entry["rank"] = i + 1

    return leaderboard


async def check_and_level_up(relationship_id: str) -> dict | None:
    """Check if a relationship should level up based on bond_points."""
    db = get_supabase()

    rel = db.table("relationships_realtime").select("*").eq("id", relationship_id).execute()
    if not rel.data:
        return None

    rel_data = rel.data[0]
    current_level = rel_data.get("level", 1)
    new_level = calculate_level(rel_data.get("bond_points", 0))

    if new_level > current_level:
        # Level up!
        db.table("relationships_realtime").update({
            "level": new_level,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", relationship_id).execute()

        # Create milestone
        db.table("relationship_milestones_realtime").insert({
            "relationship_id": relationship_id,
            "milestone_type": "level_up",
            "title": f"🆙 Level {new_level}: {LEVEL_NAMES.get(new_level, '')}!",
            "description": f"Your bond has reached Level {new_level}!",
            "icon_emoji": "🆙",
            "bond_points_awarded": 0,
        }).execute()

        # Notify both users
        for uid in [rel_data["user_a_id"], rel_data["user_b_id"]]:
            await send_notification(
                uid, "level_up",
                data={"relationship_id": relationship_id, "level": new_level,
                      "features": LEVEL_FEATURES.get(new_level, [])},
                level=new_level
            )

        return {
            "leveled_up": True,
            "old_level": current_level,
            "new_level": new_level,
            "name": LEVEL_NAMES.get(new_level, ""),
            "new_features": LEVEL_FEATURES.get(new_level, []),
        }

    return None
