"""
Lightweight stateful helpers to improve activity UX:
- Detect user satisfaction signals to gracefully complete an activity
- Cooldown recently completed activities to avoid immediate repeats

Note: This is in-memory per-process state. For multi-instance deployments,
persist this in a shared store keyed by (username/persona/activity).
"""

# In-memory state: {(username, persona_name, activity_name): {"last_completion_ts": float}}
_ACTIVITY_STATE = {}

_SATISFACTION_WORDS = [
    "enough", "stop", "done", "already did", "finished", "that's it", "no more", "complete", "good"
]
_CONTINUING_WORDS = [
    "more", "next", "continue", "what else", "keep going"
]

_COOLDOWN_SECONDS = 300  # 5 minutes


def _state_key(username: str, persona_name: str, activity_name: str) -> tuple:
    return (username or "", persona_name or "", activity_name or "")


def _now_ts() -> float:
    import time as _t
    return _t.time()


def detect_user_satisfaction(user_input: str) -> str:
    text = (user_input or "").lower()
    if any(ind in text for ind in _SATISFACTION_WORDS):
        return "satisfied"
    if any(ind in text for ind in _CONTINUING_WORDS):
        return "continuing"
    return "neutral"


def _is_on_cooldown(username: str, persona_name: str, activity_name: str) -> bool:
    key = _state_key(username, persona_name, activity_name)
    state = _ACTIVITY_STATE.get(key)
    if not state:
        return False
    last_ts = state.get("last_completion_ts", 0)
    return (_now_ts() - last_ts) < _COOLDOWN_SECONDS


def _mark_completed(username: str, persona_name: str, activity_name: str) -> None:
    key = _state_key(username, persona_name, activity_name)
    state = _ACTIVITY_STATE.get(key, {})
    state["last_completion_ts"] = _now_ts()
    _ACTIVITY_STATE[key] = state


def _cooldown_message(activity_name: str) -> str:
    options = [
        f"We just finished {activity_name.replace('_', ' ')}! How about trying something different?",
        "You already completed that one! Want to explore a new activity?",
        "That activity is fresh in our minds! Let's try something else for variety.",
    ]
    import random as _r
    return _r.choice(options)


