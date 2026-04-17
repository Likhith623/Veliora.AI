# session_state.py
"""
Veliora.AI — Emotion Session State & Dual-Alert Safety Logic

Manages:
1. Per-user emotion state (latest + rolling 5-sample window)
2. Rolling 10-day valence average for Tier 2 chronic alert
3. Dual-Alert system:
     Tier 1 (Acute)   — immediate crisis response, bypasses LLM
     Tier 2 (Chronic) — gentle proactive nudge after sustained distress
4. Intervention cooldown — prevents permanent crisis-mode lock,
     requires explicit user acknowledgment to unlock

Redis key schema:
  emotion_state:{user_id}:{bot_id}          → latest fused emotion dict
  emotion_window:{user_id}:{bot_id}         → rolling list of last 5 fused dicts
  valence_history:{user_id}:{bot_id}        → rolling list of last 10 daily valence floats
  alert_cooldown:{user_id}:{bot_id}         → "tier1" | "tier2" | absent
  alert_cooldown_ts:{user_id}:{bot_id}      → ISO timestamp of when alert was triggered
  crisis_acknowledged:{user_id}:{bot_id}    → ISO timestamp if user clicked "I am safe"
  tier2_last_nudge:{user_id}:{bot_id}       → ISO timestamp of last Tier 2 nudge
"""

import json
import logging
import random  # FIX: moved to module level — was imported inside evaluate_dual_alert on every call
from datetime import datetime, timezone, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# CONFIGURATION CONSTANTS
# ──────────────────────────────────────────────────────────────────────────────
EMOTION_TTL              = 3600          # 1 hour: latest emotion state
WINDOW_SIZE              = 5             # rolling sample window
VALENCE_HISTORY_SIZE     = 10            # rolling daily valence samples
VALENCE_HISTORY_TTL      = 86400 * 15    # 15 days

TIER1_COOLDOWN_TTL       = 86400         # 24h: Tier 1 alert persists until acknowledged
TIER2_COOLDOWN_HOURS     = 24            # min hours between Tier 2 nudges
TIER2_VALENCE_THRESHOLD  = -0.40         # chronic distress threshold
TIER2_MIN_SAMPLES        = 5             # need at least 5 daily samples before Tier 2 fires

# Crisis keywords for Tier 1 text scan (supplementary to model labels)
CRISIS_KEYWORDS: frozenset[str] = frozenset({
    "suicide", "suicidal", "kill myself", "end my life", "want to die",
    "self harm", "self-harm", "cut myself", "hurt myself", "no point living",
    "don't want to be here", "cant go on", "can't go on", "overdose",
    "not worth living", "better off dead",
})

# Localized crisis resources (India-primary, with global fallbacks)
CRISIS_RESOURCES: dict = {
    "primary": [
        {"name": "iCall (India)",              "number": "9152987821",   "hours": "Mon–Sat 8am–10pm"},
        {"name": "Vandrevala Foundation",      "number": "1860-2662-345","hours": "24/7"},
        {"name": "AASRA (India)",              "number": "9820466627",   "hours": "24/7"},
    ],
    "global": [
        {"name": "Crisis Text Line",           "number": "Text HOME to 741741", "hours": "24/7"},
        {
            "name": "International Association for Suicide Prevention",
            "url": "https://www.iasp.info/resources/Crisis_Centres/",
            "hours": "24/7",
        },
    ],
    "message": (
        "I'm really concerned about you right now. "
        "Please reach out to a crisis support line — they're here for you, any time:"
    ),
}

# Tier 2 proactive nudge templates (Veliora speaks gently, not clinically)
TIER2_NUDGE_TEMPLATES: list[str] = [
    "Hey, I've noticed you've seemed a bit heavy-hearted lately. I'm here — do you want to talk about what's been going on?",
    "I've been thinking about you. Things have felt a bit tough recently. I'm not going anywhere — what's weighing on you?",
    "I just wanted to check in. You've seemed a little down the past few days. How are you really feeling?",
]


# ──────────────────────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────────────────────
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _contains_crisis_keyword(text: str) -> bool:
    """Case-insensitive scan for explicit self-harm / crisis language."""
    if not text:
        return False
    lower = text.lower()
    return any(kw in lower for kw in CRISIS_KEYWORDS)


# ──────────────────────────────────────────────────────────────────────────────
# EMOTION STATE — READ / WRITE
# ──────────────────────────────────────────────────────────────────────────────
import uuid

def __fire_telemetry(user_id: str, bot_id: str, new_emotion: dict):
    """
    Fire-and-forget telemetry insertion straight into Supabase. 
    Does not block the fast async event loops or REDIS caching.
    """
    import threading
    from services.supabase_client import get_supabase_admin
    def _run():
        try:
            supabase = get_supabase_admin()
            if not supabase:
                return
            
            payload = {
                "user_id": user_id,
                "bot_id": bot_id,
                "fused_valence": new_emotion.get("valence", 0.0),
                "dominant_emotion": new_emotion.get("fused_emotion", "neutral"),
                "text_score": new_emotion.get("text_score", 0.0),
                "speech_score": new_emotion.get("speech_score", 0.0),
                "all_emotions": new_emotion.get("all_emotions", {}),
                "all_speech_emotions": new_emotion.get("all_speech_emotions", {}),
                "text_message": new_emotion.get("text_message", ""),
                "speech_text": new_emotion.get("speech_text", "")
            }
            logger.info(f"📊 [TELEMETRY FIRE] Storing to Supabase: {payload}")
            
            supabase.table("emotion_telemetry").insert(payload).execute()
        except Exception as e:
            logger.error(f"Failed to log telemetry into Supabase: {e}")
    
    threading.Thread(target=_run, daemon=True).start()

def set_emotion_state(redis_client, user_id: str, bot_id: str, new_emotion: dict) -> None:
    """
    Persist the latest fused emotion and maintain a rolling 5-sample window.
    Also appends the valence score to the daily history list for Tier 2 tracking.
    """
    # 1. Update the Supabase Telemetry asynchronously
    __fire_telemetry(user_id, bot_id, new_emotion)

    state_key   = f"emotion_state:{user_id}:{bot_id}"
    window_key  = f"emotion_window:{user_id}:{bot_id}"
    valence_key = f"valence_history:{user_id}:{bot_id}"

    try:
        # Save latest
        redis_client.set(state_key, json.dumps(new_emotion), ex=EMOTION_TTL)

        # Rolling window of last 5 full emotion dicts
        redis_client.rpush(window_key, json.dumps(new_emotion))
        redis_client.ltrim(window_key, -WINDOW_SIZE, -1)
        redis_client.expire(window_key, EMOTION_TTL)

    except Exception as e:
        logger.error(f"Redis error saving emotion state: {e}")

def update_daily_valence(redis_client, user_id: str, bot_id: str, daily_valence: float) -> None:
    """
    Append a single daily valence float to the history (for 10-day rolling average).
    To be called by a daily CRON job, NOT on every message.
    """
    valence_key = f"valence_history:{user_id}:{bot_id}"
    try:
        redis_client.rpush(valence_key, json.dumps(float(daily_valence)))
        redis_client.ltrim(valence_key, -VALENCE_HISTORY_SIZE, -1)
        redis_client.expire(valence_key, VALENCE_HISTORY_TTL)
    except Exception as e:
        logger.error(f"Redis error updating daily valence history: {e}")


def get_emotion_state(redis_client, user_id: str, bot_id: str) -> Optional[dict]:
    """Return the latest fused emotion dict, or None."""
    key = f"emotion_state:{user_id}:{bot_id}"
    try:
        raw = redis_client.get(key)
        return json.loads(raw) if raw else None
    except Exception as e:
        logger.error(f"Redis error getting emotion state: {e}")
        return None


def get_emotion_window(redis_client, user_id: str, bot_id: str) -> list[dict]:
    """Return the rolling window of up to 5 most recent emotion dicts."""
    key = f"emotion_window:{user_id}:{bot_id}"
    try:
        raw_list = redis_client.lrange(key, 0, -1)
        return [json.loads(r) for r in raw_list if r]
    except Exception as e:
        logger.error(f"Redis error getting emotion window: {e}")
        return []


def get_valence_history(redis_client, user_id: str, bot_id: str) -> list[float]:
    """Return the rolling list of up to 10 most recent valence float scores."""
    key = f"valence_history:{user_id}:{bot_id}"
    try:
        raw_list = redis_client.lrange(key, 0, -1)
        return [float(json.loads(r)) for r in raw_list if r]
    except Exception as e:
        logger.error(f"Redis error getting valence history: {e}")
        return []


# ──────────────────────────────────────────────────────────────────────────────
# INTERVENTION COOLDOWN — LLM GATE CONTROL
# ──────────────────────────────────────────────────────────────────────────────
def set_intervention_cooldown(redis_client, user_id: str, bot_id: str, tier: str) -> None:
    """
    Lock the LLM for this user-bot pair after a Tier 1 alert fires.
    Tier 1 requires explicit user acknowledgment to unlock.
    Tier 2 auto-expires after TIER2_COOLDOWN_HOURS.
    """
    cooldown_key = f"alert_cooldown:{user_id}:{bot_id}"
    ts_key       = f"alert_cooldown_ts:{user_id}:{bot_id}"
    try:
        ttl = TIER1_COOLDOWN_TTL if tier == "tier1" else int(TIER2_COOLDOWN_HOURS * 3600)
        redis_client.set(cooldown_key, tier, ex=ttl)
        redis_client.set(ts_key, _now_iso(), ex=ttl)
        logger.warning(f"[ALERT] {tier.upper()} intervention set for {user_id}:{bot_id}")
    except Exception as e:
        logger.error(f"Redis error setting intervention cooldown: {e}")


def get_intervention_cooldown(redis_client, user_id: str, bot_id: str) -> Optional[str]:
    """
    Returns active cooldown tier ("tier1" | "tier2") or None if unlocked.
    Tier 1 persists until the user clicks 'I am safe'.
    """
    key = f"alert_cooldown:{user_id}:{bot_id}"
    try:
        raw = redis_client.get(key)
        if raw is None:
            return None
        return raw.decode() if isinstance(raw, bytes) else raw
    except Exception as e:
        logger.error(f"Redis error getting intervention cooldown: {e}")
        return None


def acknowledge_crisis(redis_client, user_id: str, bot_id: str) -> bool:
    """
    Called when the user presses 'I am safe, return to chat'.
    Clears the Tier 1 cooldown and records the acknowledgment timestamp.
    Returns True on success.
    """
    cooldown_key = f"alert_cooldown:{user_id}:{bot_id}"
    ts_key       = f"alert_cooldown_ts:{user_id}:{bot_id}"
    ack_key      = f"crisis_acknowledged:{user_id}:{bot_id}"
    try:
        redis_client.delete(cooldown_key)
        redis_client.delete(ts_key)
        # Record acknowledgment timestamp for audit trail (7 days)
        redis_client.set(ack_key, _now_iso(), ex=86400 * 7)
        logger.info(f"[SAFE-ACK] Crisis acknowledged by {user_id}:{bot_id}")
        return True
    except Exception as e:
        logger.error(f"Redis error on crisis acknowledge: {e}")
        return False


def _set_tier2_nudge_timestamp(redis_client, user_id: str, bot_id: str) -> None:
    key = f"tier2_last_nudge:{user_id}:{bot_id}"
    try:
        redis_client.set(key, _now_iso(), ex=int(TIER2_COOLDOWN_HOURS * 3600 * 2))
    except Exception as e:
        logger.error(f"Redis error setting Tier 2 nudge timestamp: {e}")


def _tier2_nudge_is_on_cooldown(redis_client, user_id: str, bot_id: str) -> bool:
    key = f"tier2_last_nudge:{user_id}:{bot_id}"
    try:
        raw = redis_client.get(key)
        if not raw:
            return False
        raw_str = raw.decode() if isinstance(raw, bytes) else raw
        last_nudge = datetime.fromisoformat(raw_str)
        return datetime.now(timezone.utc) - last_nudge < timedelta(hours=TIER2_COOLDOWN_HOURS)
    except Exception as e:
        logger.error(f"Redis error checking Tier 2 nudge cooldown: {e}")
        return False


# ──────────────────────────────────────────────────────────────────────────────
# DUAL-ALERT EVALUATION — PRIMARY SAFETY FUNCTION
# ──────────────────────────────────────────────────────────────────────────────
def evaluate_dual_alert(
    redis_client,
    user_id: str,
    bot_id: str,
    fused_emotion: dict,
    user_text: Optional[str] = None,
) -> dict:
    """
    Evaluate whether a Tier 1 or Tier 2 alert should fire.

    Tier 1 (Acute — fires immediately):
      - fused tier == "crisis" (valence <= -0.75 OR crisis labels like grief/fear)
      - OR explicit crisis/self-harm keywords in user_text
      → Action: set Tier 1 cooldown, bypass LLM, return crisis resources

    Tier 2 (Chronic — fires after sustained distress):
      - Rolling 10-sample valence average < TIER2_VALENCE_THRESHOLD (-0.40)
      - AND at least TIER2_MIN_SAMPLES data points exist
      - AND Tier 2 nudge not on cooldown (max once per 24h)
      → Action: set Tier 2 cooldown, return gentle proactive nudge message

    Returns:
        {
            "alert_tier":          None | "tier1" | "tier2",
            "bypass_llm":          bool,
            "crisis_resources":    dict | None,   # present on Tier 1
            "nudge_message":       str | None,    # present on Tier 2
            "rolling_valence_avg": float | None,
            "reason":              str,
        }
    """
    result: dict = {
        "alert_tier":          None,
        "bypass_llm":          False,
        "crisis_resources":    None,
        "nudge_message":       None,
        "rolling_valence_avg": None,
        "reason":              "no_alert",
    }

    tier = fused_emotion.get("tier", "neutral")
    keyword_crisis = _contains_crisis_keyword(user_text)

    # ── TIER 1: Acute Crisis ─────────────────────────────────────────────────
    if tier == "crisis" or keyword_crisis:
        # Determine the more specific reason for the audit log
        if tier == "crisis" and keyword_crisis:
            reason = "crisis_label_and_keyword"
        elif tier == "crisis":
            reason = "crisis_label"
        else:
            reason = "crisis_keyword"

        set_intervention_cooldown(redis_client, user_id, bot_id, "tier1")
        result.update({
            "alert_tier":       "tier1",
            "bypass_llm":       True,
            "crisis_resources": CRISIS_RESOURCES,
            "reason":           reason,
        })
        logger.warning(
            f"[TIER-1-ALERT] Crisis detected for {user_id}:{bot_id} | "
            f"reason={reason} | valence={fused_emotion.get('valence')}"
        )
        return result

    # ── TIER 2: Chronic Sustained Distress ───────────────────────────────────
    valence_history = get_valence_history(redis_client, user_id, bot_id)
    if len(valence_history) >= TIER2_MIN_SAMPLES:
        rolling_avg = sum(valence_history) / len(valence_history)
        result["rolling_valence_avg"] = round(rolling_avg, 4)

        if (
            rolling_avg < TIER2_VALENCE_THRESHOLD
            and not _tier2_nudge_is_on_cooldown(redis_client, user_id, bot_id)
        ):
            # FIX: random imported at module level, not inside this function
            nudge = random.choice(TIER2_NUDGE_TEMPLATES)
            _set_tier2_nudge_timestamp(redis_client, user_id, bot_id)
            set_intervention_cooldown(redis_client, user_id, bot_id, "tier2")
            result.update({
                "alert_tier":    "tier2",
                "bypass_llm":    False,  # Tier 2 prepends nudge, does NOT bypass LLM
                "nudge_message": nudge,
                "reason":        f"rolling_avg={rolling_avg:.3f} < {TIER2_VALENCE_THRESHOLD}",
            })
            logger.info(
                f"[TIER-2-ALERT] Chronic distress for {user_id}:{bot_id} | "
                f"rolling_avg={rolling_avg:.3f}"
            )
            return result

    return result
def get_active_alert_state(redis_client, user_id: str, bot_id: str) -> dict:
    """
    Returns the current alert state for a user-bot pair.
    Called by the analytics endpoint to surface live crisis state to the dashboard.
    """
    cooldown = get_intervention_cooldown(redis_client, user_id, bot_id)
    ts_key = f"alert_cooldown_ts:{user_id}:{bot_id}"
    ack_key = f"crisis_acknowledged:{user_id}:{bot_id}"
    try:
        ts_raw = redis_client.get(ts_key)
        triggered_at = ts_raw.decode() if isinstance(ts_raw, bytes) else ts_raw
        was_acknowledged = redis_client.exists(ack_key)
    except Exception:
        triggered_at, was_acknowledged = None, False
    return {
        "active_alert_tier": cooldown,        # "tier1" | "tier2" | None
        "alert_triggered_at": triggered_at,
        "previously_acknowledged": bool(was_acknowledged),
    }
