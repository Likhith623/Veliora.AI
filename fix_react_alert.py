import sys

with open("persona_frontend_main/chatbot-new-frontend/src/components/MentalHealthDashboard.jsx", "r") as f:
    text = f.read()

risk_banner = """        {/* ── 2) Risk Banner (Block B) ─────────────────────────── */}
        {analytics && analytics.risk_level !== "low" && analytics.risk_level !== "none" && ("""

alert_banner = """        {/* ── 2) Risk Banner (Block B) ─────────────────────────── */}
        
        {/* LIVE CRISIS ALERT */}
        {analytics?.active_alert_state?.active_alert_tier && (
          <div style={{
            maxWidth: 1100, margin: "0 auto 24px", padding: "16px 22px",
            borderRadius: 16, background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.5)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
            boxShadow: "0 8px 32px rgba(244,63,94,0.15)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f43f5e", boxShadow: "0 0 16px #f43f5e", animation: "pulseDot 1s infinite" }} />
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: "#f43f5e", marginBottom: 4, letterSpacing: "0.02em", textTransform: "uppercase" }}>
                  Active {analytics.active_alert_state.active_alert_tier === "tier1" ? "Tier 1 Safety Alert" : "Tier 2 Distress Flag"}
                </h4>
                <p style={{ fontSize: 13, color: t.text, opacity: 0.9 }}>
                  {analytics.active_alert_state.active_alert_tier === "tier1" 
                    ? "A critical emotional threshold was triggered. Please utilize emergency resources." 
                    : "Sustained high distress patterns detected. We are keeping an eye on you."}
                </p>
              </div>
            </div>
            {!analytics.active_alert_state.previously_acknowledged && (
              <div style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(244,63,94,0.2)", border: "1px solid rgba(244,63,94,0.4)", color: "#fda4af", fontSize: 11, fontWeight: 600 }}>
                Unacknowledged
              </div>
            )}
          </div>
        )}

        {analytics && analytics.risk_level !== "low" && analytics.risk_level !== "none" && ("""

text = text.replace(risk_banner, alert_banner)

with open("persona_frontend_main/chatbot-new-frontend/src/components/MentalHealthDashboard.jsx", "w") as f:
    f.write(text)

