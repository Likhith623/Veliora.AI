"""Centralized notification service — every event in the system routed through here."""
from datetime import datetime
from realtime_communication.services.supabase_client import get_supabase


# ─── Notification Types ────────────────────────────────────────────────────────
NOTIF_TYPES = {
    # Friends
    "friend_request_received":  ("👋 Friend Request", "{sender} wants to add you as a friend!"),
    "friend_request_accepted":  ("✅ Request Accepted", "{sender} accepted your friend request!"),
    "friend_request_rejected":  ("❌ Request Declined", "{sender} declined your friend request."),
    # Messages
    "new_message":              ("💬 New Message", "{sender}: {preview}"),
    "message_reaction":         ("😊 Reaction", "{sender} reacted {emoji} to your message"),
    # XP
    "xp_gifted":                ("🎁 XP Gift!", "{sender} gifted you {amount} XP!"),
    "xp_earned":                ("⭐ XP Earned", "You earned {amount} XP from {source}!"),
    # Games
    "game_invite":              ("🎮 Game Invite", "{sender} wants to play {game}!"),
    "game_completed":           ("🏆 Game Over", "{game} finished! {result}"),
    "live_game_invite":         ("🕹️ Live Game", "{sender} challenges you to {game}!"),
    # Contests
    "contest_started":          ("📝 Contest Started", "A new {type} contest is ready!"),
    "contest_completed":        ("🎯 Contest Complete", "You scored {score} points!"),
    # Relationships
    "new_match":                ("🎉 New Match!", "You've been connected with {partner}!"),
    "relationship_ended":       ("💔 Bond Ended", "A connection has chosen to part ways."),
    "level_up":                 ("🆙 Level Up!", "Your bond reached Level {level}!"),
    "streak_milestone":         ("🔥 Streak!", "{days}-day streak! Keep it going!"),
    # Polls
    "poll_created":             ("📊 New Poll", "{sender} created a poll: {question}"),
    "poll_vote":                ("📊 Poll Vote", "{sender} voted on your poll"),
    # Rooms
    "family_room_invite":       ("🏠 Room Invite", "You've been invited to a Family Room!"),
    "family_room_added":        ("🏠 Room Added", "You've been added to a Family Room"),
    "potluck_reminder":         ("🍽️ Potluck", "Cultural Potluck: {theme}"),
    "join_code_used":           ("🔗 Code Used", "Someone joined your room using a code"),
    # Calls
    "incoming_call":            ("📞 Incoming Call", "{sender} is calling you!"),
    "missed_call":              ("📵 Missed Call", "You missed a call from {sender}"),
    # Personal Q&A
    "question_answered":        ("❓ Q&A", "{sender} answered your question!"),
}


async def send_notification(
    user_id: str,
    notif_type: str,
    data: dict = None,
    **format_kwargs
) -> dict | None:
    """Create a notification in Supabase and return the row.
    
    Args:
        user_id: Target user's UUID
        notif_type: Key from NOTIF_TYPES
        data: Extra JSON data attached to the notification
        **format_kwargs: Values to interpolate into title/body templates
    """
    db = get_supabase()
    
    template = NOTIF_TYPES.get(notif_type)
    if template:
        title, body = template
        try:
            title = title.format(**format_kwargs)
        except (KeyError, IndexError):
            pass
        try:
            body = body.format(**format_kwargs)
        except (KeyError, IndexError):
            pass
    else:
        title = notif_type
        body = str(format_kwargs)
    
    try:
        result = db.table("notifications").insert({
            "user_id": user_id,
            "type": notif_type,
            "title": title,
            "body": body,
            "data": data or {}
        }).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[Notification] Failed to send {notif_type} to {user_id}: {e}")
        return None


async def send_notification_bulk(user_ids: list[str], notif_type: str, data: dict = None, **kw):
    """Send the same notification to multiple users."""
    for uid in user_ids:
        await send_notification(uid, notif_type, data=data, **kw)
