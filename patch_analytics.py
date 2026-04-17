import re

with open("api/emotion_dashboard.py", "r") as f:
    text = f.read()

old_str = """@router.get("/{user_id}/analytics", response_model=Dict[str, Any])
async def get_emotion_analytics(user_id: str) -> Dict[str, Any]:
    \"\"\"
    Enriched analytics: risk level, streaks, time-of-day breakdown,
    bot comparison stats. Feeds the new dashboard panels.
    \"\"\"
    if not user_id or user_id == "guest":
        return {
            "risk_level": "none", "risk_reason": "",
            "negative_streak_days": 0,
            "time_of_day": {"morning": 0.0, "afternoon": 0.0, "evening": 0.0},
            "bot_comparison": [],
            "journey_summary": []
        }

    try:
        supabase = get_supabase_admin()
        thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
        result = (
            supabase.table("emotion_telemetry")
            .select("*")
            .eq("user_id", user_id)
            .gte("created_at", thirty_days_ago)
            .order("created_at", desc=True)
            .limit(3000)
            .execute()
        )
        logs = result.data"""

new_str = """@router.get("/{user_id}/analytics", response_model=Dict[str, Any])
async def get_emotion_analytics(user_id: str, bot_id: str = None) -> Dict[str, Any]:
    \"\"\"
    Enriched analytics: risk level, streaks, time-of-day breakdown,
    bot comparison stats. Feeds the new dashboard panels.
    \"\"\"
    if not user_id or user_id == "guest":
        return {
            "risk_level": "none", "risk_reason": "",
            "negative_streak_days": 0,
            "time_of_day": {"morning": 0.0, "afternoon": 0.0, "evening": 0.0},
            "bot_comparison": [],
            "journey_summary": []
        }

    try:
        supabase = get_supabase_admin()
        thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
        query = (
            supabase.table("emotion_telemetry")
            .select("*")
            .eq("user_id", user_id)
            .gte("created_at", thirty_days_ago)
        )
        if bot_id and bot_id != "all":
            query = query.eq("bot_id", bot_id)
            
        result = query.order("created_at", desc=True).limit(3000).execute()
        logs = result.data"""

text = text.replace(old_str, new_str)

with open("api/emotion_dashboard.py", "w") as f:
    f.write(text)

