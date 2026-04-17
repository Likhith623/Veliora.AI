import asyncio
from config.settings import get_settings
from services.llm_engine import generate_dashboard_insights

async def test():
    summary = {
        "recent_emotion": "happy",
        "recent_valence": 0.8,
        "daily_trend": [{"date": "2026-04-18", "avg_valence": 0.8, "dominant": "happy"}],
        "weekly_trend": [],
        "bot_breakdown": [],
        "risk_level": "low",
        "negative_streak_days": 0,
        "time_of_day_valence": {},
        "journey_summary": []
    }
    res = await generate_dashboard_insights(summary)
    print("Result:")
    print(res)

asyncio.run(test())
