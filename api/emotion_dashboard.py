#emotion_dashboard.py
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from datetime import datetime, timedelta
import logging

from services.supabase_client import get_supabase_admin
from services.redis_cache import get_redis_manager
from emotion.session_state import get_active_alert_state

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/emotion-dashboard", tags=["Mental Health Dashboard"])

# NEW: Analytical enrichment endpoint (additive – existing route untouched)
# ─────────────────────────────────────────────────────────────────

@router.get("/{user_id}/analytics", response_model=Dict[str, Any])
async def get_emotion_analytics(user_id: str) -> Dict[str, Any]:
    """
    Enriched analytics: risk level, streaks, time-of-day breakdown,
    bot comparison stats. Feeds the new dashboard panels.
    """
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
        logs = result.data
        if not logs:
            return {
                "risk_level": "none", "risk_reason": "",
                "negative_streak_days": 0,
                "time_of_day": {"morning": 0.0, "afternoon": 0.0, "evening": 0.0},
                "bot_comparison": [], "journey_summary": []
            }

        # ── Streak detection ──────────────────────────────────────
        daily_valence: Dict[str, list] = {}
        for l in logs:
            d = l["created_at"].split("T")[0]
            daily_valence.setdefault(d, []).append(float(l.get("fused_valence", 0.0)))
        daily_avg = {d: sum(v)/len(v) for d, v in daily_valence.items()}
        sorted_days = sorted(daily_avg.keys(), reverse=True)

        streak = 0
        for d in sorted_days:
            if daily_avg[d] < -0.35:
                streak += 1
            else:
                break

        # ── Risk level ────────────────────────────────────────────
        if streak >= 5:
            risk_level, risk_reason = "high", f"{streak} consecutive low-valence days"
        elif streak >= 3:
            risk_level, risk_reason = "moderate", f"{streak} consecutive low-valence days"
        else:
            recent_vals = [float(l.get("fused_valence", 0.0)) for l in logs[:20]]
            avg_recent = sum(recent_vals) / len(recent_vals) if recent_vals else 0
            if avg_recent < -0.5:
                risk_level, risk_reason = "moderate", "Recent average valence is very low"
            else:
                risk_level, risk_reason = "low", "No sustained distress pattern detected"

        # ── Time-of-day breakdown ─────────────────────────────────
        tod: Dict[str, list] = {"morning": [], "afternoon": [], "evening": []}
        for l in logs:
            try:
                hour = int(l["created_at"][11:13])
                val = float(l.get("fused_valence", 0.0))
                if 5 <= hour < 12:
                    tod["morning"].append(val)
                elif 12 <= hour < 18:
                    tod["afternoon"].append(val)
                else:
                    tod["evening"].append(val)
            except Exception:
                pass

        time_of_day = {
            k: round(sum(v)/len(v), 3) if v else 0.0
            for k, v in tod.items()
        }

        # ── Bot comparison ────────────────────────────────────────
        bot_vals: Dict[str, list] = {}
        for l in logs:
            b = l.get("bot_id", "Unknown")
            bot_vals.setdefault(b, []).append(float(l.get("fused_valence", 0.0)))
        bot_comparison = sorted(
            [{"bot_id": b, "avg_valence": round(sum(v)/len(v), 3), "sessions": len(v)}
             for b, v in bot_vals.items()],
            key=lambda x: x["avg_valence"], reverse=True
        )

        # ── Journey summary (last 7 daily dominant emotions) ──────
        dom_map: Dict[str, Dict[str, int]] = {}
        for l in logs:
            d = l["created_at"].split("T")[0]
            dom = l.get("dominant_emotion", "neutral")
            dom_map.setdefault(d, {})
            dom_map[d][dom] = dom_map[d].get(dom, 0) + 1
        journey_summary = [
            {"date": d, "dominant": max(e, key=e.get)}
            for d, e in sorted(dom_map.items())
        ][-7:]

        # Fetch live alert state
        active_alert_state = None
        try:
            rm = get_redis_manager()
            if rm and rm.client:
                # We can check specific bot or general. Assuming general for simplicity here or we can just fetch if the dashboard provides bot_id.
                # It is requested to merge live alert state into the analytics response.
                active_alert_state = get_active_alert_state(rm.client, user_id, "default")
        except Exception as e:
            logger.error(f"Failed to fetch active alert state: {e}")

        return {
            "risk_level": risk_level,
            "risk_reason": risk_reason,
            "negative_streak_days": streak,
            "time_of_day": time_of_day,
            "bot_comparison": bot_comparison,
            "journey_summary": journey_summary,
            "active_alert_state": active_alert_state
        }

    except Exception as e:
        logger.error(f"Analytics error: {e}")
        return {
            "risk_level": "none", "risk_reason": "Not enough data",
            "negative_streak_days": 0,
            "time_of_day": {"morning": 0.0, "afternoon": 0.0, "evening": 0.0},
            "bot_comparison": [], "journey_summary": []
        }

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
                weekly_map[week_start] = {"total_valence": 0, "count": 0, "emotions": {}}
            weekly_map[week_start]["total_valence"] += val
            weekly_map[week_start]["count"] += 1
            weekly_map[week_start]["emotions"][dom] = weekly_map[week_start]["emotions"].get(dom, 0) + 1
            
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
                "avg_valence": round(v["total_valence"] / v["count"], 2),
                "dominant": max(v["emotions"], key=v["emotions"].get) if v["emotions"] else "neutral"
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







# ─────────────────────────────────────────────────────────────────
