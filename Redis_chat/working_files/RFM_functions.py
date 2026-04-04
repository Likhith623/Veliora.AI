"""
Redis_chat — RFM (Recency, Frequency, Magnitude) Scoring Functions
Evaluates memory importance using a weighted RFM score.

Adapted for Veliora.AI backend — uses settings for API key.
"""

from google import genai
from datetime import datetime, timezone
import os

from config.settings import get_settings

_settings = get_settings()
_client = genai.Client(api_key=_settings.effective_google_api_key)


async def get_magnitude_for_query(prompt: str) -> float:
    """
    Use Gemini to rate the importance of a user memory on a 0-5 scale.
    Higher scores = more personal, emotionally significant, or informative.
    """
    prompt_text = f"""
You are an expert assistant evaluating how important or urgent a given user prompt is.

Rate the importance of the following prompt on a scale from 0 (not important) to 5 (very important), using your own reasoning:

Focus on the user's point of view, not external facts.

Messages that are highly personal, emotionally significant, or reveal things the user would typically share only with someone close should score higher.

Messages that are informative about the user — such as their preferences, goals, values, or memories — also warrant a higher score.

General, casual, or non-personal messages should score lower.

Prompt: "{prompt}"

Only output a single number between 0 and 5.
"""
    try:
        response = _client.models.generate_content(
            model="gemini-2.0-flash", contents=prompt_text
        )
        magnitude = float(response.text.strip())
        return round(max(0, min(5, magnitude)), 2)
    except Exception:
        return 0.0


def get_recency_score(timestamp_input) -> int:
    """
    Compute a recency score (1-5) based on how many days ago the timestamp was.
    Accepts either a datetime object or an ISO 8601 string.
    """
    if isinstance(timestamp_input, str):
        try:
            timestamp = datetime.fromisoformat(timestamp_input)
        except ValueError:
            timestamp = datetime.strptime(timestamp_input[:10], "%Y-%m-%d")
    elif isinstance(timestamp_input, datetime):
        timestamp = timestamp_input
    else:
        raise TypeError("timestamp_input must be a string or datetime object")

    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)

    now = datetime.now(timezone.utc)
    days_ago = (now - timestamp).days

    if days_ago <= 1:
        return 5
    elif days_ago <= 3:
        return 4
    elif days_ago <= 7:
        return 3
    elif days_ago <= 14:
        return 2
    else:
        return 1


def get_rfm_score(recency_timestamp: str, frequency: int, magnitude: float) -> float:
    """
    Compute weighted RFM score.
    rfm_score = recency * 0.3 + frequency * 0.2 + magnitude * 0.5
    """
    recency_score = get_recency_score(recency_timestamp)
    rfm_score = recency_score * 0.3 + frequency * 0.2 + magnitude * 0.5
    return round(rfm_score, 2)
