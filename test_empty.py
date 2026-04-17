import asyncio
from services.llm_engine import generate_dashboard_insights

async def test():
    summary = {
        "recent_emotion": "neutral",
        "recent_valence": 0.0,
        "daily_trend": [{"date": "Today", "avg_valence": 0.0, "dominant": "neutral"}],
        "weekly_trend": [{"week_start": "This Week", "avg_valence": 0.0}],
        "bot_breakdown": [],
        "risk_level": "none",
        "negative_streak_days": 0,
        "time_of_day_valence": {"morning": 0.0, "afternoon": 0.0, "evening": 0.0},
        "journey_summary": []
    }
    try:
        res = await generate_dashboard_insights(summary)
        print("Result:", res)
    except Exception as e:
        print("Exception:", e)

asyncio.run(test())
