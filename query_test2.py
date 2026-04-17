import asyncio
from services.supabase_client import get_supabase_admin
import json
from services.llm_engine import generate_dashboard_insights
import logging

logging.basicConfig(level=logging.DEBUG)

async def main():
    sb = get_supabase_admin()
    user_id = '6dfa0107-6ca0-4c29-a6bc-9b33f4998685' # the user from earlier
    
    print("Fetching logs...")
    res = sb.table("emotion_telemetry").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(3000).execute()
    logs = res.data

    print(f"Found {len(logs)} logs")

    thirty_days_ago = "2026-03-01T00:00:00Z"
    
    # We will just pass the summary directly like emotion_dashboard builds it
    summary = {
        "recent_emotion": "neutral",
        "recent_valence": 0.0,
        "daily_trend": [{"date": "2026-04-18", "avg_valence": 0.0, "dominant": "neutral"}],
        "weekly_trend": [],
        "bot_breakdown": [],
        "risk_level": "low",
        "negative_streak_days": 0,
        "time_of_day_valence": {},
        "journey_summary": [{"date": l["created_at"][:10], "dominant": l.get("dominant_emotion", "neutral")} for l in logs[:7]]
    }

    try:
        insights = await generate_dashboard_insights(summary)
        print("Got insights:", insights)
    except Exception as e:
        print("Failed:", e)

asyncio.run(main())
