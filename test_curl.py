import requests

payload = {
  "recent_emotion": "neutral",
  "recent_valence": 0,
  "daily": [
    {
      "date": "Today",
      "avg_valence": 0,
      "dominant": "neutral"
    }
  ],
  "weekly": [
    {
      "week_start": "This Week",
      "avg_valence": 0
    }
  ],
  "by_bot": [],
  "history": [],
  "risk_level": "none",
  "risk_reason": "Not enough data",
  "negative_streak_days": 0,
  "time_of_day": {
    "morning": 0,
    "afternoon": 0,
    "evening": 0
  },
  "journey_summary": [],
  "bot_comparison": []
}

res = requests.post("http://127.0.0.1:8000/api/logs/dashboard-insights", json=payload)
print(res.text)
