from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from datetime import datetime, timedelta
import logging

from services.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/emotion-dashboard", tags=["Mental Health Dashboard"])

@router.get("/{user_id}", response_model=Dict[str, Any])
async def get_mental_health_dashboard(user_id: str, bot_id: str = None) -> Dict[str, Any]:
    """
    Fetches the mental health emotional telemetry for a particular user.
    If bot_id is provided, filters for that specific bot interaction.
    Aggregates data into daily and weekly granularities for smooth frontend charting.
    """
    try:
        # Prevent database crash if user_id is not a valid UUID (e.g. 'guest')
        if not user_id or user_id == "guest":
            return {
                "daily": [{"date": "Today", "avg_valence": 0.0, "dominant": "neutral"}],
                "weekly": [{"week_start": "This Week", "avg_valence": 0.0}],
                "by_bot": [],
                "recent_emotion": "Neutral",
                "recent_valence": 0.0,
                "history": []
            }
            
        supabase = get_supabase_admin()
        
        # 1. Fetch raw logs for the past 30 days maximum to build charts
        thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
        
        query = supabase.table("emotion_telemetry").select("*").eq("user_id", user_id).gte("created_at", thirty_days_ago)
        
        if bot_id:
            query = query.eq("bot_id", bot_id)
            
        result = query.order("created_at", desc=True).limit(3000).execute()
        logs = result.data
        
        # Return safe defaults if we have no logs yet
        if not logs:
            return {
                "daily": [{"date": "Today", "avg_valence": 0.0, "dominant": "neutral"}],
                "weekly": [{"week_start": "This Week", "avg_valence": 0.0}],
                "by_bot": [],
                "recent_emotion": "Neutral",
                "recent_valence": 0.0,
                "history": []
            }
            
        # 2. Aggregations
        daily_map = {}
        weekly_map = {}
        bot_map = {}
        history = []
        
        for l in logs:
            # Parse created_at
            # "2026-04-16T12:34:56.789Z" -> "+00:00"
            date_str = l["created_at"].split("T")[0]
            dt = datetime.fromisoformat(date_str)
            week_start = (dt - timedelta(days=dt.weekday())).isoformat().split("T")[0]
            
            b_id = l.get("bot_id", "Unknown")
            val = float(l.get("fused_valence", 0.0))
            dom = l.get("dominant_emotion", "neutral")
            
            text_msg = l.get("text_message") or l.get("speech_text") or "No text content"
            
            history.append({
                "timestamp": l["created_at"],
                "bot_id": b_id,
                "emotion": dom,
                "valence": val,
                "text": text_msg
            })
            
            # Daily
            if date_str not in daily_map:
                daily_map[date_str] = {"total_valence": 0, "count": 0, "emotions": {}}
            daily_map[date_str]["total_valence"] += val
            daily_map[date_str]["count"] += 1
            daily_map[date_str]["emotions"][dom] = daily_map[date_str]["emotions"].get(dom, 0) + 1
            
            # Weekly
            if week_start not in weekly_map:
                weekly_map[week_start] = {"total_valence": 0, "count": 0}
            weekly_map[week_start]["total_valence"] += val
            weekly_map[week_start]["count"] += 1
            
            # Per Bot
            if b_id not in bot_map:
                bot_map[b_id] = {"total_valence": 0, "count": 0, "emotions": {}}
            bot_map[b_id]["total_valence"] += val
            bot_map[b_id]["count"] += 1
            bot_map[b_id]["emotions"][dom] = bot_map[b_id]["emotions"].get(dom, 0) + 1

        # Calculate final averages
        daily_series = [
            {
                "date": k, 
                "avg_valence": round(v["total_valence"] / v["count"], 2), 
                "dominant": max(v["emotions"], key=v["emotions"].get) if v["emotions"] else "neutral"
            }
            for k, v in sorted(daily_map.items())
        ]
        
        weekly_series = [
            {
                "week_start": k, 
                "avg_valence": round(v["total_valence"] / v["count"], 2)
            }
            for k, v in sorted(weekly_map.items())
        ]
        
        bot_series = [
            {
                "bot_id": k, 
                "avg_valence": round(v["total_valence"] / v["count"], 2),
                "dominant": max(v["emotions"], key=v["emotions"].get) if v["emotions"] else "neutral"
            }
            for k, v in bot_map.items()
        ]
        
        return {
            "daily": daily_series[-7:],     # Last 7 days
            "weekly": weekly_series[-4:],   # Last 4 weeks
            "by_bot": bot_series,
            "recent_emotion": logs[0].get("dominant_emotion", "neutral"),
            "recent_valence": round(logs[0].get("fused_valence", 0.0), 2),
            "history": history
        }
        
    except Exception as e:
        logger.error(f"Error fetching dashboard telemetry: {e}")
        raise HTTPException(status_code=500, detail="Failed to aggregate emotion telemetry")
