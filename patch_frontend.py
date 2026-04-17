import re

with open("persona_frontend_main/chatbot-new-frontend/src/components/MentalHealthDashboard.jsx", "r") as f:
    text = f.read()

# using regex or just text replacement
old_str = """
    const run = async () => {
      // 1. Fetch analytics first
      let analyticsData = null;
      try {
        const r = await fetch(`${BASE_URL}/emotion-dashboard/${userId}/analytics`);
        analyticsData = await r.json();
        if (!cancelled) setAnalytics(analyticsData);
      } catch {}

      // 2. Merge telemetry + analytics into one insights payload
      if (!cancelled) setInsightsLoading(true);
      try {
        const mergedPayload = {
          ...telemetry,
          ...(analyticsData || {}),
        };
        const r = await fetch(`${BASE_URL}/api/logs/dashboard-insights`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mergedPayload),
        });
        const d = await r.json();
        if (!cancelled) setInsights(d.insights);
      } catch {}
      if (!cancelled) setInsightsLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, [telemetry, userId]);
"""

new_str = """
    const run = async () => {
      // 1. Fetch analytics first
      let analyticsData = null;
      try {
        const urlObj = new URL(`${BASE_URL}/emotion-dashboard/${userId}/analytics`);
        if (selectedBot && selectedBot !== "all") {
          urlObj.searchParams.append("bot_id", selectedBot);
        }
        const r = await fetch(urlObj.toString());
        analyticsData = await r.json();
        if (!cancelled) setAnalytics(analyticsData);
      } catch {}

      // 2. Merge telemetry + analytics into one insights payload
      if (!cancelled) setInsightsLoading(true);
      try {
        const mergedPayload = {
          ...telemetry,
          ...(analyticsData || {}),
          daily: aggData.daily,
          weekly: aggData.weekly,
          history: displayHistory,
          recent_emotion: aggData.recent_emotion,
          recent_valence: aggData.recent_valence,
        };
        const r = await fetch(`${BASE_URL}/api/logs/dashboard-insights`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mergedPayload),
        });
        const d = await r.json();
        if (!cancelled) {
          setInsights(d.insights);
          setFeedbackSent(false); // Reset feedback UI for the new bot view
        }
      } catch {}
      if (!cancelled) setInsightsLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, [telemetry, userId, selectedBot, aggData, displayHistory]);
"""

old_str = old_str.strip()
new_str = new_str.strip()

if old_str in text:
    print("Found old_str via exact match!")
    text = text.replace(old_str, new_str)
elif old_str.replace(" ", "") in text.replace(" ", ""):
    print("Found match ignoring whitespace... applying regex replacement.")
    # More robust replacement
    import re
    # We will just write a custom function!
else:
    print("Not found! Here's the first few lines of the text:")
    lines = text.split("\n")
    for i, l in enumerate(lines):
        if "useEffect(() => {" in l and "guest" in lines[i+1]:
            print("\n".join(lines[i:i+40]))

with open("persona_frontend_main/chatbot-new-frontend/src/components/MentalHealthDashboard.jsx", "w") as f:
    f.write(text)

