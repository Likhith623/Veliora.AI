"""
Veliora.AI — Supabase Client & Storage Helpers
Handles all Supabase PostgreSQL queries and Storage uploads.
"""

import httpx
from supabase import create_client, Client
from config.settings import get_settings
from typing import Optional
import json
import logging

logger = logging.getLogger(__name__)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CLIENT INITIALIZATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

_supabase_client: Optional[Client] = None


def get_supabase() -> Client:
    """Get or create the Supabase client singleton."""
    global _supabase_client
    if _supabase_client is None:
        settings = get_settings()
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    return _supabase_client


def get_supabase_admin() -> Client:
    """Get Supabase client with service role key for admin operations."""
    settings = get_settings()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AUTH HELPERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def sign_up_user(email: str, password: str) -> dict:
    """Register a new user via Supabase Auth."""
    client = get_supabase()
    response = client.auth.sign_up({"email": email, "password": password})
    return {
        "user": response.user,
        "session": response.session,
    }


async def sign_in_user(email: str, password: str) -> dict:
    """Sign in a user and return session tokens."""
    client = get_supabase()
    response = client.auth.sign_in_with_password({"email": email, "password": password})
    return {
        "user": response.user,
        "session": response.session,
    }


async def create_user_profile(user_id: str, profile_data: dict) -> dict:
    """Insert a user profile into the users table."""
    client = get_supabase_admin()
    data = {**profile_data, "id": user_id}
    result = client.table("users").insert(data).execute()
    return result.data[0] if result.data else {}


async def get_user_profile(user_id: str) -> Optional[dict]:
    """Fetch user profile from users table."""
    client = get_supabase()
    result = client.table("users").select("*").eq("id", user_id).single().execute()
    return result.data


async def update_user_profile(user_id: str, updates: dict) -> dict:
    """Update user profile in users table."""
    client = get_supabase()
    result = client.table("users").update(updates).eq("id", user_id).execute()
    return result.data[0] if result.data else {}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MESSAGE OPERATIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def insert_message(
    user_id: str,
    bot_id: str,
    role: str,
    content: str,
    embedding: Optional[list[float]] = None,
    language: Optional[str] = None,
) -> dict:
    """Insert a message (user or bot) into the messages table."""
    client = get_supabase_admin()
    data = {
        "user_id": user_id,
        "bot_id": bot_id,
        "role": role,
        "content": content,
        "language": language,
    }
    if embedding:
        data["embedding"] = embedding
    result = client.table("messages").insert(data).execute()
    return result.data[0] if result.data else {}


async def get_message_history(
    user_id: str,
    bot_id: str,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """Fetch paginated message history for a user-bot pair."""
    client = get_supabase()
    result = (
        client.table("messages")
        .select("id, role, content, bot_id, created_at")
        .eq("user_id", user_id)
        .eq("bot_id", bot_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return list(reversed(result.data)) if result.data else []


async def get_message_count(user_id: str, bot_id: str) -> int:
    """Get total message count for pagination."""
    client = get_supabase()
    result = (
        client.table("messages")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("bot_id", bot_id)
        .execute()
    )
    return result.count or 0


async def get_today_messages(user_id: str, bot_id: str) -> list[dict]:
    """Fetch today's messages for diary generation."""
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    client = get_supabase()
    result = (
        client.table("messages")
        .select("role, content, created_at")
        .eq("user_id", user_id)
        .eq("bot_id", bot_id)
        .gte("created_at", f"{today}T00:00:00Z")
        .order("created_at")
        .execute()
    )
    return result.data or []


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# VECTOR SEARCH (Supabase RPC)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def match_messages(
    query_embedding: list[float],
    user_id: str,
    bot_id: str,
    match_count: int = 50,
) -> list[dict]:
    """Call the Supabase RPC function for HNSW vector similarity search."""
    client = get_supabase()
    result = client.rpc(
        "match_messages",
        {
            "query_embedding": query_embedding,
            "match_user_id": user_id,
            "match_bot_id": bot_id,
            "match_count": match_count,
        },
    ).execute()
    return result.data or []


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DIARY OPERATIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def insert_diary_entry(
    user_id: str, bot_id: str, entry_date: str, content: str, mood: Optional[str] = None
) -> dict:
    """Insert a persona diary entry."""
    client = get_supabase_admin()
    data = {
        "user_id": user_id,
        "bot_id": bot_id,
        "entry_date": entry_date,
        "content": content,
        "mood": mood,
    }
    result = client.table("diaries").insert(data).execute()
    return result.data[0] if result.data else {}


async def get_diary_entries(user_id: str, bot_id: str, limit: int = 30) -> list[dict]:
    """Fetch diary entries for a user-bot pair."""
    client = get_supabase()
    result = (
        client.table("diaries")
        .select("*")
        .eq("user_id", user_id)
        .eq("bot_id", bot_id)
        .order("entry_date", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GAME OPERATIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def get_games_by_archetype(archetype: str) -> list[dict]:
    """Fetch games matching a persona archetype."""
    client = get_supabase()
    result = (
        client.table("games")
        .select("*")
        .eq("archetype", archetype)
        .eq("is_active", True)
        .execute()
    )
    return result.data or []


async def get_game_by_id(game_id: str) -> Optional[dict]:
    """Fetch a single game by ID."""
    client = get_supabase()
    result = client.table("games").select("*").eq("id", game_id).single().execute()
    return result.data


async def create_game_session(
    user_id: str, bot_id: str, game_id: str, session_id: str
) -> dict:
    """Create a new game session."""
    client = get_supabase_admin()
    data = {
        "id": session_id,
        "user_id": user_id,
        "bot_id": bot_id,
        "game_id": game_id,
        "status": "active",
        "turn_count": 0,
        "xp_earned": 0,
    }
    result = client.table("user_game_sessions").insert(data).execute()
    return result.data[0] if result.data else {}


async def update_game_session(session_id: str, updates: dict) -> dict:
    """Update a game session (turn count, status, xp)."""
    client = get_supabase_admin()
    result = (
        client.table("user_game_sessions")
        .update(updates)
        .eq("id", session_id)
        .execute()
    )
    return result.data[0] if result.data else {}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# XP OPERATIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def upsert_user_xp(user_id: str, bot_id: str, xp_to_add: int) -> dict:
    """Upsert XP for a user-bot pair. Uses RPC for atomic increment."""
    client = get_supabase_admin()
    result = client.rpc(
        "increment_user_xp",
        {
            "p_user_id": user_id,
            "p_bot_id": bot_id,
            "p_xp_amount": xp_to_add,
        },
    ).execute()
    return result.data if result.data else {}


async def get_user_xp(user_id: str, bot_id: Optional[str] = None) -> list[dict]:
    """Get XP records for a user (optionally filtered by bot)."""
    client = get_supabase()
    query = client.table("user_xp").select("*").eq("user_id", user_id)
    if bot_id:
        query = query.eq("bot_id", bot_id)
    result = query.execute()
    return result.data or []


async def update_user_streak(user_id: str, streak_days: int, last_login: str) -> dict:
    """Update the user's login streak."""
    client = get_supabase_admin()
    result = (
        client.table("users")
        .update({"streak_days": streak_days, "last_login_date": last_login})
        .eq("id", user_id)
        .execute()
    )
    return result.data[0] if result.data else {}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STORAGE HELPERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def upload_to_storage(
    bucket: str, file_bytes: bytes, path: str, content_type: str = "image/png"
) -> str:
    """Upload a file to Supabase Storage and return the public URL."""
    client = get_supabase_admin()
    client.storage.from_(bucket).upload(
        path, file_bytes, {"content-type": content_type}
    )
    return get_public_url(bucket, path)


def get_public_url(bucket: str, path: str) -> str:
    """Get the public URL for a file in Supabase Storage."""
    settings = get_settings()
    return f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}"


async def upload_avatar(user_id: str, file_bytes: bytes, content_type: str) -> str:
    """Upload user avatar to the avatars bucket."""
    ext = "jpg" if "jpeg" in content_type else content_type.split("/")[-1]
    path = f"{user_id}/avatar.{ext}"
    url = await upload_to_storage("avatars", file_bytes, path, content_type)
    # Update user profile with avatar URL
    await update_user_profile(user_id, {"avatar_url": url})
    return url


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PERSONA OPERATIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async def get_persona(bot_id: str) -> Optional[dict]:
    """Fetch persona metadata."""
    client = get_supabase()
    result = client.table("personas").select("*").eq("bot_id", bot_id).single().execute()
    return result.data


async def get_all_user_bot_pairs() -> list[dict]:
    """Get all distinct user-bot pairs that have messages (for diary CRON)."""
    client = get_supabase_admin()
    result = client.rpc("get_active_user_bot_pairs").execute()
    return result.data or []
