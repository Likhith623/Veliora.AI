"""Background tasks — streaks, care score decay, level-up checks, random questions.

These run as asyncio background tasks started by FastAPI on_startup.
"""
import asyncio
import random
from datetime import datetime, timedelta
from realtime_communication.services.supabase_client import get_supabase
from realtime_communication.services.xp_service import check_and_level_up, award_xp
from realtime_communication.services.notification_service import send_notification


# ─── Random Questions for New Users ────────────────────────────────────────────
DEFAULT_QUESTIONS = [
    ("What's your all-time favorite movie?", "personal"),
    ("What's your comfort food?", "personal"),
    ("If you could visit any country, where would you go?", "travel"),
    ("What's your biggest fear?", "personal"),
    ("What's your dream job?", "career"),
    ("What's your favorite season and why?", "personal"),
    ("What's the best gift you've ever received?", "personal"),
    ("Do you prefer mornings or nights?", "lifestyle"),
    ("What's a skill you wish you had?", "personal"),
    ("What's your favorite childhood memory?", "personal"),
    ("What music do you listen to when you're sad?", "music"),
    ("What's one thing that always makes you laugh?", "personal"),
    ("What's your hidden talent?", "personal"),
    ("What does your ideal weekend look like?", "lifestyle"),
    ("If you could have dinner with anyone, who would it be?", "personal"),
]


async def update_streaks():
    """Daily task: update streak_days for all active relationships.
    
    - If both users interacted yesterday → increment streak
    - If only one or neither interacted → reset streak to 0
    """
    db = get_supabase()
    yesterday = (datetime.utcnow() - timedelta(days=1)).isoformat()
    
    rels = db.table("relationships_realtime") \
        .select("id, user_a_id, user_b_id, streak_days, longest_streak, last_interaction_at") \
        .eq("status", "active") \
        .execute()
    
    for rel in (rels.data or []):
        last = rel.get("last_interaction_at")
        if last and last >= yesterday:
            # Interaction happened — increment streak
            new_streak = rel.get("streak_days", 0) + 1
            longest = max(rel.get("longest_streak", 0), new_streak)
            
            db.table("relationships_realtime").update({
                "streak_days": new_streak,
                "longest_streak": longest,
                "updated_at": datetime.utcnow().isoformat(),
            }).eq("id", rel["id"]).execute()
            
            # Streak milestones (7, 14, 30, 60, 100 days)
            if new_streak in [7, 14, 30, 60, 100]:
                for uid in [rel["user_a_id"], rel["user_b_id"]]:
                    await send_notification(
                        uid, "streak_milestone",
                        data={"streak_days": new_streak, "relationship_id": rel["id"]},
                        days=new_streak
                    )
                    await award_xp(uid, new_streak, "streak", "streak_bonus",
                                   source_id=rel["id"])
        else:
            # No interaction — reset streak
            if rel.get("streak_days", 0) > 0:
                db.table("relationships_realtime").update({
                    "streak_days": 0,
                    "updated_at": datetime.utcnow().isoformat(),
                }).eq("id", rel["id"]).execute()


async def decay_care_scores():
    """Daily task: decay care_score if no interaction for 3+ days."""
    db = get_supabase()
    three_days_ago = (datetime.utcnow() - timedelta(days=3)).isoformat()
    
    # Find stale relationships
    stale = db.table("relationships_realtime") \
        .select("id, user_a_id, user_b_id, care_score") \
        .eq("status", "active") \
        .lt("last_interaction_at", three_days_ago) \
        .gt("care_score", 0) \
        .execute()
    
    for rel in (stale.data or []):
        new_care = max(0, rel["care_score"] - 2)
        db.table("relationships_realtime").update({
            "care_score": new_care,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", rel["id"]).execute()


async def check_all_level_ups():
    """Periodic task: check all active relationships for level-up opportunities."""
    db = get_supabase()
    
    rels = db.table("relationships_realtime") \
        .select("id") \
        .eq("status", "active") \
        .execute()
    
    for rel in (rels.data or []):
        try:
            await check_and_level_up(rel["id"])
        except Exception as e:
            print(f"[BG] Level check failed for {rel['id']}: {e}")


async def generate_random_questions_for_new_users():
    """One-time task: generate random questions for users who have no custom questions."""
    db = get_supabase()
    
    # Get all users
    profiles = db.table("profiles_realtime").select("id").execute()
    
    for p in (profiles.data or []):
        uid = p["id"]
        existing = db.table("user_questions_realtime").select("id").eq("user_id", uid).limit(1).execute()
        if not existing.data:
            # Pick 5 random questions
            selected = random.sample(DEFAULT_QUESTIONS, min(5, len(DEFAULT_QUESTIONS)))
            for q_text, cat in selected:
                db.table("user_questions_realtime").insert({
                    "user_id": uid,
                    "question_text": q_text,
                    "correct_answer": "",  # User needs to answer these later
                    "category": cat,
                    "is_active": True,
                }).execute()


# ─── Background Loop ──────────────────────────────────────────────────────────

async def run_daily_tasks():
    """Run all daily background tasks. Called once per day."""
    print("[BG] Running daily tasks...")
    try:
        await update_streaks()
        print("[BG] ✓ Streaks updated")
    except Exception as e:
        print(f"[BG] ✗ Streaks failed: {e}")
    
    try:
        await decay_care_scores()
        print("[BG] ✓ Care scores decayed")
    except Exception as e:
        print(f"[BG] ✗ Care decay failed: {e}")
    
    try:
        await check_all_level_ups()
        print("[BG] ✓ Level-ups checked")
    except Exception as e:
        print(f"[BG] ✗ Level-ups failed: {e}")
    
    try:
        await generate_random_questions_for_new_users()
        print("[BG] ✓ Random questions generated")
    except Exception as e:
        print(f"[BG] ✗ Random questions failed: {e}")


async def background_scheduler():
    """Background loop that runs daily tasks every 24 hours."""
    # Wait 10 seconds for app startup
    await asyncio.sleep(10)
    print("[BG] Background scheduler started")
    
    while True:
        try:
            await run_daily_tasks()
        except Exception as e:
            print(f"[BG] Scheduler error: {e}")
        # Sleep 24 hours
        await asyncio.sleep(86400)
