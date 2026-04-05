"""Contests router - Enhanced Bonding Challenge Ecosystem."""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime
from realtime_communication.models.schemas import ContestRequest, AnswerRequest
from realtime_communication.services.supabase_client import get_supabase
from realtime_communication.services.contest_service import generate_contest, submit_answer, finish_contest
from realtime_communication.services.auth_service import get_current_user_id

router = APIRouter(prefix="/contests", tags=["Contests"])

async def _update_leaderboard(db, user_id: str, contest_type: str, score_to_add: int):
    """O(1) Check and Upsert into contest_leaderboard_realtime created in Phase 7."""
    period = "weekly" if contest_type == "weekly" else "monthly" if "monthly" in contest_type else "daily"
    
    # Grab existing record inside proper table
    existing = db.table("contest_leaderboard").select("id, score").eq("user_id", user_id).eq("contest_type", contest_type).eq("period", period).execute()
    
    if existing.data and len(existing.data) > 0:
        new_score = existing.data[0].get("score", 0) + score_to_add
        db.table("contest_leaderboard").update({
            "score": new_score, 
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", existing.data[0]["id"]).execute()
    else:
        db.table("contest_leaderboard").insert({
            "user_id": user_id,
            "contest_type": contest_type,
            "period": period,
            "score": score_to_add
        }).execute()


@router.post("/create")
async def create_contest(req: ContestRequest, user_id: str = Depends(get_current_user_id)):
    """Create or retrieve a generated sequence of daily/weekly/monthly bond challenges."""
    db = get_supabase()
    
    # Enforce Security & Reality Constraints
    rel = db.table("relationships").select("user_a_id, user_b_id").eq("id", req.relationship_id).eq("status", "active").execute()
    if not rel.data:
        raise HTTPException(status_code=404, detail="Relationship not active or found")
    
    if user_id not in [rel.data[0]["user_a_id"], rel.data[0]["user_b_id"]]:
        raise HTTPException(status_code=403, detail="Unauthorized relationship access")
    
    # Generate deeply contextual contest mapping
    result = await generate_contest(req.relationship_id, req.contest_type)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/relationship/{relationship_id}")
async def get_contests(relationship_id: str, user_id: str = Depends(get_current_user_id)):
    """Fetch historic and scheduled challenges mapped across the bond."""
    db = get_supabase()
    
    rel = db.table("relationships").select("user_a_id, user_b_id").eq("id", relationship_id).execute()
    if not rel.data or user_id not in [rel.data[0]["user_a_id"], rel.data[0]["user_b_id"]]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    contests = db.table("contests").select("*").eq("relationship_id", relationship_id).order("created_at", desc=True).execute()
    return {"contests": contests.data or []}


@router.get("/{contest_id}")
async def get_contest_details(contest_id: str, user_id: str = Depends(get_current_user_id)):
    """View precise status and deep contest parameters."""
    db = get_supabase()
    
    contest = db.table("contests").select("*").eq("id", contest_id).execute()
    if not contest.data:
        raise HTTPException(status_code=404, detail="Contest missing")
    
    c_data = contest.data[0]
    rel = db.table("relationships").select("user_a_id, user_b_id").eq("id", c_data["relationship_id"]).execute()
    if not rel.data or user_id not in [rel.data[0]["user_a_id"], rel.data[0]["user_b_id"]]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    questions = db.table("contest_questions") \
        .select("id, question_text, question_type, options, points, question_order, question_about_user") \
        .eq("contest_id", contest_id).order("question_order").execute()
    
    return {"contest": c_data, "questions": questions.data or []}


@router.post("/answer")
async def answer_question(req: AnswerRequest, user_id: str = Depends(get_current_user_id)):
    """Evaluate and store an answer submitted against dynamic contest logic."""
    result = await submit_answer(req.question_id, user_id, req.answer)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/{contest_id}/complete")
async def complete_contest_wrapper(contest_id: str, user_id: str = Depends(get_current_user_id)):
    """Evaluate, Calculate Totals, Mutate Streaks, Broadcast Leaderboard Stats."""
    result = await finish_contest(contest_id, user_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/leaderboard/{period}")
async def get_global_leaderboard(period: str, contest_type: Optional[str] = "weekly", limit: int = 10):
    """Highly optimized O(log n) real-time query against indexed Leaderboard ranks (Phase 7 table)."""
    db = get_supabase()
    
    # We query .table("contest_leaderboard") and it correctly maps to contest_leaderboard_realtime
    lb_ranked = db.table("contest_leaderboard") \
        .select("user_id, score, rank, profiles(display_name, avatar_config, country)") \
        .eq("period", period) \
        .eq("contest_type", contest_type) \
        .order("score", desc=True) \
        .limit(limit) \
        .execute()
        
    return {
        "period": period,
        "contest_type": contest_type,
        "leaderboard": lb_ranked.data or []
    }


@router.get("/schedule/configuration")
async def get_schedule_config():
    """Retrieve algorithmic constraints that structure Veliora.AI's engagement matrix."""
    return {
        "daily": {
            "title": "Quick Bond Sync",
            "questions": 3,
            "time_limit_minutes": 5,
            "max_points": 30,
            "streak_multiplier": True
        },
        "weekly": {
            "title": "Veliora Challenge",
            "questions": 5,
            "time_limit_minutes": 10,
            "max_points": 50,
            "streak_multiplier": True
        },
        "monthly": {
            "title": "Global Championship",
            "questions": 10,
            "time_limit_minutes": 20,
            "max_points": 100,
            "requirements": "70+ Care Score"
        }
    }
