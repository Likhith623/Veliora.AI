#logs.py
from fastapi import APIRouter
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/logs", tags=["Frontend Logs"])

class FrontendError(BaseModel):
    message: str | None = None
    source: str | None = None
    line_number: int | str | None = None
    column_number: int | str | None = None
    stack_trace: str | None = None
    browser: str | None = None
    url: str | None = None
    additional_context: dict | None = None
    timestamp: str | None = None

@router.post("/frontend-error")
async def log_frontend_error(error: FrontendError):
    logger.error(f"Frontend Error: {error.message} URL: {error.url} Stack: {error.stack_trace}")
    return {"status": "ok"}


# ─────────────────────────────────────────────────────────────────
# NEW: Async AI insights endpoint (loads separately from main dashboard)
# ─────────────────────────────────────────────────────────────────
from services.llm_engine import generate_dashboard_insights  # adjust import path if needed

class InsightsRequest(BaseModel):
    # Fields from the main telemetry response
    recent_emotion: str | None = "neutral"
    recent_valence: float | None = 0.0
    daily: list | None = []
    weekly: list | None = []
    by_bot: list | None = []
    history: list | None = []
    # Fields from the analytics response (optional — frontend sends both merged)
    risk_level: str | None = "low"
    risk_reason: str | None = ""
    negative_streak_days: int | None = 0
    time_of_day: dict | None = {}
    journey_summary: list | None = []
    bot_comparison: list | None = []

@router.post("/dashboard-insights")
async def get_dashboard_insights(payload: InsightsRequest):
    """
    Called by the frontend AFTER the main dashboard data loads.
    Runs Gemini analysis and returns narrative / prediction / suggestions.
    Kept in a separate route so the main dashboard page renders instantly.
    """
    try:
        summary = {
            "recent_emotion": payload.recent_emotion,
            "recent_valence": payload.recent_valence,
            "daily_trend": payload.daily[-7:] if payload.daily else [],
            "weekly_trend": payload.weekly[-4:] if payload.weekly else [],
            "bot_breakdown": payload.by_bot or [],
            "risk_level": payload.risk_level,
            "negative_streak_days": payload.negative_streak_days,
            "time_of_day_valence": payload.time_of_day or {},
            "journey_summary": payload.journey_summary or [],
        }
        insights = await generate_dashboard_insights(summary)
        return {"status": "ok", "insights": insights}
    except Exception as e:
        logger.error(f"Insights endpoint error: {e}")
        return {
            "status": "error",
            "insights": {
                "narrative": "Unable to generate insights right now.",
                "prediction": "Please try again later.",
                "suggestions": ["Continue your conversations.", "Check back soon."],
            }
        }
class InsightFeedbackRequest(BaseModel):
    user_id: str
    insight_text: str
    is_accurate: bool

@router.post("/insight-feedback")
async def submit_insight_feedback(payload: InsightFeedbackRequest):
    """Records user feedback on AI-generated insights"""
    try:
        from services.supabase_client import get_supabase_admin
        supabase = get_supabase_admin()
        
        supabase.table("insight_feedbacks").insert({
            "user_id": payload.user_id,
            "insight_text": payload.insight_text,
            "is_accurate": payload.is_accurate
        }).execute()
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Failed to record insight feedback: {e}")
        return {"status": "error", "message": "Failed to record feedback"}
