"""Privacy settings router — control profile visibility and preferences."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime

from realtime_communication.models.schemas import PrivacySettingsUpdate
from realtime_communication.services.auth_service import get_current_user_id
from realtime_communication.services.supabase_client import get_supabase

router = APIRouter(prefix="/privacy", tags=["Privacy Settings"])


def _ensure_privacy_row(db, user_id: str) -> dict:
    """Get or create privacy settings for a user."""
    row = db.table("privacy_settings_realtime").select("*").eq("user_id", user_id).execute()
    if row.data:
        return row.data[0]
    new = db.table("privacy_settings_realtime").insert({"user_id": user_id}).execute()
    return new.data[0] if new.data else {
        "profile_visibility": "public",
        "show_last_active": True,
        "show_care_score": True,
        "show_achievements": True,
        "show_bio": True,
        "allow_friend_requests": True,
        "allow_search": True,
        "translation_language": "en",
    }


@router.get("/settings")
async def get_privacy_settings(current_user: str = Depends(get_current_user_id)):
    """Get current user's privacy settings."""
    db = get_supabase()
    settings = _ensure_privacy_row(db, current_user)
    return {"settings": settings}


@router.put("/settings")
async def update_privacy_settings(
    update: PrivacySettingsUpdate,
    current_user: str = Depends(get_current_user_id)
):
    """Update privacy settings. Only provided fields are updated."""
    db = get_supabase()
    
    # Ensure row exists
    _ensure_privacy_row(db, current_user)
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Validate profile_visibility
    if "profile_visibility" in update_data:
        if update_data["profile_visibility"] not in ("public", "private"):
            raise HTTPException(status_code=400, detail="profile_visibility must be 'public' or 'private'")
    
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    result = db.table("privacy_settings_realtime") \
        .update(update_data) \
        .eq("user_id", current_user) \
        .execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update privacy settings")
    
    return {"settings": result.data[0]}


@router.get("/settings/{user_id}")
async def get_user_privacy(user_id: str, current_user: str = Depends(get_current_user_id)):
    """Get another user's privacy settings (only what's public-facing).
    This is used by the frontend to determine what to show.
    """
    db = get_supabase()
    
    row = db.table("privacy_settings_realtime").select("*").eq("user_id", user_id).execute()
    
    if not row.data:
        # Default: everything visible
        return {
            "profile_visibility": "public",
            "show_last_active": True,
            "show_care_score": True,
            "show_achievements": True,
            "show_bio": True,
        }
    
    settings = row.data[0]
    # Only return public-facing fields (not user_id, id, etc.)
    return {
        "profile_visibility": settings.get("profile_visibility", "public"),
        "show_last_active": settings.get("show_last_active", True),
        "show_care_score": settings.get("show_care_score", True),
        "show_achievements": settings.get("show_achievements", True),
        "show_bio": settings.get("show_bio", True),
    }
