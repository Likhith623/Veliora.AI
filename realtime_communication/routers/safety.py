"""Safety router - Reports, moderation, bond severing with proper auth."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from realtime_communication.models.schemas import ReportRequest, SeverBondRequest
from realtime_communication.services.supabase_client import get_supabase
from realtime_communication.services.auth_service import get_current_user_id
from realtime_communication.services.notification_service import send_notification

router = APIRouter(prefix="/safety", tags=["Safety"])


@router.post("/report")
async def report_user(req: ReportRequest, user_id: str = Depends(get_current_user_id)):
    """Report a user for inappropriate behavior."""
    db = get_supabase()
    
    report = db.table("reports_realtime").insert({
        "reporter_id": user_id,
        "reported_user_id": req.reported_user_id,
        "relationship_id": req.relationship_id,
        "reason": req.reason,
        "description": req.description,
        "status": "pending"
    }).execute()
    
    if report.data:
        db.table("moderation_queue_realtime").insert({
            "user_id": req.reported_user_id,
            "queue_type": "report_review",
            "priority": "high" if req.reason in ["harassment", "threatening", "underage"] else "normal",
            "reference_id": report.data[0]["id"],
            "reference_type": "report",
            "status": "pending"
        }).execute()
        
        db.table("matching_queue_realtime") \
            .update({"status": "cancelled"}) \
            .eq("user_id", req.reported_user_id) \
            .eq("status", "searching") \
            .execute()
    
    return {
        "status": "reported",
        "message": "Thank you for reporting. Our human moderators will review this within 24 hours.",
        "report_id": report.data[0]["id"] if report.data else None
    }


@router.post("/sever")
async def sever_bond(req: SeverBondRequest, user_id: str = Depends(get_current_user_id)):
    """One-tap sever a relationship bond."""
    db = get_supabase()
    
    rel = db.table("relationships_realtime").select("*").eq("id", req.relationship_id).execute()
    if not rel.data:
        raise HTTPException(status_code=404, detail="Relationship not found")
    
    rel_data = rel.data[0]
    
    if user_id not in [rel_data["user_a_id"], rel_data["user_b_id"]]:
        raise HTTPException(status_code=403, detail="You are not part of this relationship")
    
    partner_id = rel_data["user_b_id"] if rel_data["user_a_id"] == user_id else rel_data["user_a_id"]
    
    farewell_field = "farewell_message_a" if rel_data["user_a_id"] == user_id else "farewell_message_b"
    
    db.table("relationships_realtime").update({
        "status": "ended",
        "ended_by": user_id,
        "end_reason": "severed",
        farewell_field: req.farewell_message or "It was nice knowing you. Best wishes!",
        "ended_at": datetime.utcnow().isoformat()
    }).eq("id", req.relationship_id).execute()
    
    await send_notification(
        partner_id, "relationship_ended",
        data={"relationship_id": req.relationship_id}
    )
    
    return {
        "status": "severed",
        "cooldown": "24 hours before next match",
        "message": "The bond has been ended. You have a 24-hour cooldown before matching again."
    }


@router.post("/exit-survey")
async def submit_exit_survey(
    relationship_id: str,
    reason: str,
    additional_feedback: str = None,
    would_recommend: bool = True,
    rating: int = 3,
    user_id: str = Depends(get_current_user_id)
):
    """Submit an exit survey after ending a relationship."""
    db = get_supabase()
    
    survey = db.table("exit_surveys_realtime").insert({
        "user_id": user_id,
        "relationship_id": relationship_id,
        "reason": reason,
        "additional_feedback": additional_feedback,
        "would_recommend": would_recommend,
        "rating": rating
    }).execute()
    
    return {"status": "submitted", "survey": survey.data[0] if survey.data else None}


@router.get("/reliability/{user_id}")
async def get_reliability_info(user_id: str, current_user: str = Depends(get_current_user_id)):
    """Get user's reliability information."""
    db = get_supabase()
    
    profile = db.table("profiles_realtime") \
        .select("reliability_score, status, status_message, last_active_at, status_return_date") \
        .eq("id", user_id) \
        .execute()
    
    if not profile.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    profile_data = profile.data[0]
    
    return {
        "reliability_score": profile_data["reliability_score"],
        "current_status": profile_data["status"],
        "status_message": profile_data["status_message"],
        "last_active": profile_data["last_active_at"],
        "return_date": profile_data["status_return_date"],
        "ghosting_protection": {
            "grace_period_days": 7,
            "available_statuses": [
                {"value": "active", "label": "Active", "emoji": "🟢"},
                {"value": "busy", "label": "Busy (will reply slower)", "emoji": "🟡"},
                {"value": "away", "label": "Away (back in X days)", "emoji": "🟠"},
                {"value": "break", "label": "Taking a break", "emoji": "🔴"}
            ],
            "policy": "No response + No status update for 7 days → Relationship auto-paused"
        }
    }


@router.get("/minor-protection/{user_id}")
async def get_minor_protection_settings(user_id: str, current_user: str = Depends(get_current_user_id)):
    """Get minor protection settings."""
    db = get_supabase()
    
    profile = db.table("profiles_realtime") \
        .select("is_minor, parent_email, parent_approved, date_of_birth") \
        .eq("id", user_id) \
        .execute()
    
    if not profile.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    profile_data = profile.data[0]
    
    if not profile_data["is_minor"]:
        return {"is_minor": False, "protections": None}
    
    return {
        "is_minor": True,
        "parent_approved": profile_data["parent_approved"],
        "parent_email": profile_data["parent_email"],
        "protections": {
            "cannot_match": ["Adults in parent roles without verified mentor badge"],
            "cannot_access": ["Voice calls until Level 3", "Photo sharing until Level 2"],
            "must_have": ["AI monitoring on all chats", "Weekly parent reports"],
        }
    }
