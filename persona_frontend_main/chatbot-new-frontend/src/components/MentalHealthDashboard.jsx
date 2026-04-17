"use client";

import { useTheme } from "./theme-provider";
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";

/* ─────────────────────────────────────────────
   THEME TOKENS
───────────────────────────────────────────── */
const DARK = {
  bg:          "#07080f",
  bgDeep:      "#04050a",
  surface:     "rgba(255,255,255,0.038)",
  surfaceHov:  "rgba(255,255,255,0.065)",
  border:      "rgba(255,255,255,0.07)",
  borderHov:   "rgba(255,255,255,0.14)",
  borderAccent:"rgba(139,92,246,0.35)",
  text:        "rgba(255,255,255,0.90)",
  textMid:     "rgba(255,255,255,0.55)",
  textMuted:   "rgba(255,255,255,0.30)",
  textHint:    "rgba(255,255,255,0.14)",
  gridLine:    "rgba(255,255,255,0.035)",
  scrollThumb: "rgba(255,255,255,0.1)",
  tagBg:       "rgba(255,255,255,0.06)",
  tooltipBg:   "rgba(8,8,20,0.85)",
  tooltipText: "rgba(255,255,255,0.85)",
  shimmer:     "rgba(255,255,255,0.22)",
};

const LIGHT = {
  bg:          "#f0f2fa",
  bgDeep:      "#e6e8f5",
  surface:     "rgba(255,255,255,0.75)",
  surfaceHov:  "rgba(255,255,255,0.92)",
  border:      "rgba(0,0,0,0.07)",
  borderHov:   "rgba(0,0,0,0.14)",
  borderAccent:"rgba(109,40,217,0.3)",
  text:        "rgba(12,10,28,0.92)",
  textMid:     "rgba(12,10,28,0.55)",
  textMuted:   "rgba(12,10,28,0.38)",
  textHint:    "rgba(12,10,28,0.16)",
  gridLine:    "rgba(0,0,0,0.055)",
  scrollThumb: "rgba(0,0,0,0.12)",
  tagBg:       "rgba(0,0,0,0.05)",
  tooltipBg:   "rgba(255,255,255,0.95)",
  tooltipText: "rgba(12,10,28,0.85)",
  shimmer:     "rgba(255,255,255,0.55)",
};

/* ─────────────────────────────────────────────
   COLOUR LOGIC
───────────────────────────────────────────── */
const BASE_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BACKEND_URL) ||
  "http://localhost:8000";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const norm  = (v) => clamp((v + 1) / 2, 0, 1);

const emotionPalette = (emo) => {
  const e = (emo || "").toLowerCase();
  const is = (words) => words.some(w => e.includes(w));

  if (is(["happy", "joy", "excit", "hope", "reliev", "glad", "laugh", "cheer"])) return {
    grad:     "linear-gradient(to top, #059669, #34d399)",
    gradH:    "linear-gradient(135deg, #059669, #34d399)",
    glow:     "rgba(52,211,153,0.38)",
    glowLight:"rgba(5,150,105,0.22)",
    text:     "#34d399",
    textLight:"#059669",
    tag:      "rgba(52,211,153,0.12)",
  };
  if (is(["sad", "depress", "grief", "disappoint", "cry", "sorrow"])) return {
    grad:     "linear-gradient(to top, #2563eb, #60a5fa)",
    gradH:    "linear-gradient(135deg, #2563eb, #60a5fa)",
    glow:     "rgba(96,165,250,0.38)",
    glowLight:"rgba(37,99,235,0.20)",
    text:     "#60a5fa",
    textLight:"#2563eb",
    tag:      "rgba(96,165,250,0.12)",
  };
  if (is(["ang", "frustrat", "annoy", "mad", "furious", "hate", "irritat"])) return {
    grad:     "linear-gradient(to top, #be123c, #f43f5e)",
    gradH:    "linear-gradient(135deg, #be123c, #f43f5e)",
    glow:     "rgba(244,63,94,0.38)",
    glowLight:"rgba(190,18,60,0.20)",
    text:     "#f43f5e",
    textLight:"#be123c",
    tag:      "rgba(244,63,94,0.12)",
  };
  if (is(["anxi", "stress", "fear", "worr", "nervous", "panic", "tense"])) return {
    grad:     "linear-gradient(to top, #ea580c, #fb923c)",
    gradH:    "linear-gradient(135deg, #ea580c, #fb923c)",
    glow:     "rgba(251,146,60,0.38)",
    glowLight:"rgba(234,88,12,0.20)",
    text:     "#fb923c",
    textLight:"#ea580c",
    tag:      "rgba(251,146,60,0.12)",
  };
  if (is(["calm", "content", "relax", "peace", "chill"])) return {
    grad:     "linear-gradient(to top, #0284c7, #38bdf8)",
    gradH:    "linear-gradient(135deg, #0284c7, #38bdf8)",
    glow:     "rgba(56,189,248,0.38)",
    glowLight:"rgba(2,132,199,0.20)",
    text:     "#38bdf8",
    textLight:"#0284c7",
    tag:      "rgba(56,189,248,0.12)",
  };
  return {
    grad:     "linear-gradient(to top, #6d28d9, #a78bfa)",
    gradH:    "linear-gradient(135deg, #6d28d9, #a78bfa)",
    glow:     "rgba(139,92,246,0.38)",
    glowLight:"rgba(109,40,217,0.20)",
    text:     "#a78bfa",
    textLight:"#7c3aed",
    tag:      "rgba(139,92,246,0.12)",
  };
};

/* ─────────────────────────────────────────────
   DEMO DATA (replace with real fetch)
───────────────────────────────────────────── */
const DEMO = {
  daily: [
    { date: "04-10", avg_valence: 0.42 },
    { date: "04-11", avg_valence: -0.15 },
    { date: "04-12", avg_valence: 0.61 },
    { date: "04-13", avg_valence: 0.78 },
    { date: "04-14", avg_valence: 0.23 },
    { date: "04-15", avg_valence: 0.55 },
    { date: "04-16", avg_valence: 0.69 },
  ],
  weekly: [
    { week_start: "W13", avg_valence: 0.33 },
    { week_start: "W14", avg_valence: 0.51 },
    { week_start: "W15", avg_valence: -0.08 },
    { week_start: "W16", avg_valence: 0.72 },
  ],
  by_bot: [
    { bot_id: "Reflect", avg_valence: 0.65 },
    { bot_id: "Calm",    avg_valence: 0.81 },
    { bot_id: "Focus",   avg_valence: 0.29 },
    { bot_id: "Sleep",   avg_valence: -0.12 },
  ],
  recent_emotion: "Calm",
  recent_valence: 0.69,
  history: [
    { bot_id:"Calm",    timestamp:"2024-04-16T09:12:00Z", text:"I've been feeling more centred after our breathing exercises. It really helped to sit with the discomfort instead of avoiding it.", emotion:"Content",   valence: 0.72 },
    { bot_id:"Reflect", timestamp:"2024-04-15T20:44:00Z", text:"Today was hard. I kept replaying the argument in my head even though I know it's not productive. Exhausted.", emotion:"Anxious",   valence:-0.28 },
    { bot_id:"Focus",   timestamp:"2024-04-15T14:30:00Z", text:"Managed to get into a flow state for two hours. Small win but I'll take it.", emotion:"Hopeful",   valence: 0.55 },
    { bot_id:"Sleep",   timestamp:"2024-04-14T23:10:00Z", text:"Couldn't sleep again. Racing thoughts about work deadlines.", emotion:"Stressed",   valence:-0.41 },
    { bot_id:"Calm",    timestamp:"2024-04-14T10:05:00Z", text:"The morning walk really helped shift my mood. Feeling lighter.", emotion:"Calm",      valence: 0.68 },
    { bot_id:"Reflect", timestamp:"2024-04-13T19:22:00Z", text:"Grateful for the small things today. Sunshine, good coffee, a kind message from a friend.", emotion:"Joyful",    valence: 0.81 },
    { bot_id:"Focus",   timestamp:"2024-04-12T16:15:00Z", text:"Procrastinated most of the day. Feeling guilty but trying to be gentle with myself.", emotion:"Neutral",    valence: 0.10 },
    { bot_id:"Sleep",   timestamp:"2024-04-11T22:55:00Z", text:"Slept seven hours for the first time this week. Body feels less like concrete.", emotion:"Relieved",   valence: 0.60 },
  ],
};

/* ─────────────────────────────────────────────
   ANIMATED NUMBER (spring counter)
───────────────────────────────────────────── */
function useSpringNumber(target, decimals = 2, delay = 0) {
  const [display, setDisplay] = useState("0.00");
  const rafRef = useRef(null);

  useEffect(() => {
    let start = null;
    const from = parseFloat(display) || 0;
    const dur  = 900;

    const tick = (now) => {
      if (!start) start = now + delay;
      const elapsed = now - start;
      if (elapsed < 0) { rafRef.current = requestAnimationFrame(tick); return; }
      const t = Math.min(1, elapsed / dur);
      // ease out expo
      const ease = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setDisplay((from + (target - from) * ease).toFixed(decimals));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}

function AnimatedValence({ value }) {
  const display = useSpringNumber(value, 2, 200);
  return <span>{display}</span>;
}

/* ─────────────────────────────────────────────
   ICONS (inline SVG, no external dep)
───────────────────────────────────────────── */
const Icon = {
  Brain: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-3.16Z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-3.16Z"/>
    </svg>
  ),
  Activity: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  Heart: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  User: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Message: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Filter: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  ),
  Sun: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ),
  Moon: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  ),
  TrendUp: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  TrendDown: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
    </svg>
  ),
  Minus: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Waves: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
      <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
      <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
    </svg>
  ),
  Bot: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/>
      <line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/>
    </svg>
  ),
};

/* ─────────────────────────────────────────────
   GLASS CARD
───────────────────────────────────────────── */
function GlassCard({ children, style = {}, className = "", animate = true }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        borderRadius: 22,
        overflow: "hidden",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        transition: animate ? "opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.4,0.64,1), background 0.45s, border 0.45s" : "background 0.45s, border 0.45s",
        opacity: animate ? (mounted ? 1 : 0) : 1,
        transform: animate ? (mounted ? "translateY(0)" : "translateY(14px)") : undefined,
        ...style,
      }}
    >
      {/* Diagonal shine */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none",
        background: "linear-gradient(135deg, rgba(255,255,255,0.09) 0%, transparent 55%)",
        zIndex: 0,
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   BAR CHART
───────────────────────────────────────────── */
function ValenceChart({ items, labelKey, t }) {
  const [hovered, setHovered] = useState(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    setAnimated(false);
    const id = setTimeout(() => setAnimated(true), 60);
    return () => clearTimeout(id);
  }, [items, labelKey]);

  return (
    <div style={{ position: "relative" }}>
      {/* Grid lines */}
      <div style={{ position: "absolute", inset: "0 0 24px 38px", display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
        {[100, 75, 50, 25, 0].map((pct) => (
          <div key={pct} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9, color: t.textHint, fontFamily: "monospace", width: 0, transform: "translateX(-38px)", whiteSpace: "nowrap" }}>{pct}%</span>
            <div style={{ flex: 1, height: 1, background: t.gridLine }} />
          </div>
        ))}
      </div>

      {/* Bars */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 8, paddingLeft: 38, height: 180, paddingBottom: 0 }}>
        {items.map((item, i) => {
          const v   = item.avg_valence ?? 0;
          const n   = norm(v);
          const domEmo = item.dominant || item.emotion || "neutral";
          const pal = emotionPalette(domEmo);
          // Set a minimum height of 2% so even lowest scores remain visible as a sliver
          const h   = Math.max(2, n * 100);
          const label = String(item[labelKey] ?? "").slice(-5);
          const isHov = hovered === i;

          return (
            <div
              key={i}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", position: "relative" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Tooltip */}
              {isHov && (
                <div style={{
                  position: "absolute", top: -34, left: "50%",
                  transform: "translateX(-50%)",
                  background: t.tooltipBg, color: t.tooltipText,
                  fontSize: 10, padding: "4px 9px", borderRadius: 7,
                  border: `1px solid ${t.border}`,
                  backdropFilter: "blur(12px)", whiteSpace: "nowrap",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.25)", zIndex: 20,
                  animation: "tooltipFade 0.15s ease",
                }}>                  <div style={{ fontWeight: 600, marginBottom: 2, textTransform: "capitalize", color: pal.text }}>{domEmo}</div>                  {v >= 0 ? "+" : ""}{v.toFixed(3)}
                </div>
              )}

              {/* Bar wrapper */}
              <div style={{ width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", flex: 1 }}>
                <div style={{
                  width: "100%", maxWidth: 44,
                  height: animated ? `${h}%` : "0%",
                  borderRadius: "9px 9px 0 0",
                  background: pal.grad,
                  position: "relative", overflow: "hidden",
                  boxShadow: isHov ? `0 0 28px 0 ${pal.glow}` : `0 0 14px 0 ${pal.glow.replace("0.38","0.22")}`,
                  transition: "height 0.75s cubic-bezier(0.34,1.2,0.64,1), box-shadow 0.2s",
                  transitionDelay: `${i * 0.055}s`,
                  filter: isHov ? "brightness(1.15)" : "brightness(1)",
                }}>
                  <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, ${t.shimmer} 0%, transparent 55%)`, borderRadius: "inherit" }} />
                </div>
              </div>

              <span style={{ fontSize: 9, color: isHov ? t.textMid : t.textMuted, fontFamily: "monospace", transition: "color 0.2s", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%", textAlign: "center" }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   STAT CARD
───────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, accentColor, t, delay = 0 }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(id);
  }, [delay]);

  return (
    <div style={{
      borderRadius: 20, padding: "20px 22px",
      background: t.surface, border: `1px solid ${t.border}`,
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      position: "relative", overflow: "hidden",
      transition: "all 0.5s cubic-bezier(0.34,1.4,0.64,1)",
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0)" : "translateY(18px)",
      display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 118,
    }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 55%)", pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: t.textMuted, display: "block", marginBottom: 16, transition: "color 0.4s" }}>
            {label}
          </span>
          <div style={{ padding: "7px", borderRadius: 11, background: `${accentColor}18`, border: `1px solid ${accentColor}30`, color: accentColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {icon}
          </div>
        </div>
        <div style={{ fontSize: 34, fontWeight: 600, color: t.text, lineHeight: 1, letterSpacing: "-0.02em", transition: "color 0.4s" }}>
          {value}
        </div>
      </div>
      <div style={{ fontSize: 10, color: t.textHint, marginTop: 8, transition: "color 0.4s" }}>{sub}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   BOT CARDS
───────────────────────────────────────────── */
function BotCard({ bot, t, delay = 0 }) {
  const [hov, setHov] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(id);
  }, [delay]);

  const n = norm(bot.avg_valence);
  const pal = emotionPalette(bot.dominant || "neutral");
  const textColor = t === LIGHT ? pal.textLight : pal.text;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 18, padding: "16px 18px",
        background: hov ? t.surfaceHov : t.surface,
        border: `1px solid ${hov ? t.borderAccent : t.border}`,
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        position: "relative", overflow: "hidden", cursor: "pointer",
        transition: "all 0.4s cubic-bezier(0.34,1.2,0.64,1)",
        opacity: mounted ? 1 : 0,
        transform: mounted ? (hov ? "translateY(-3px)" : "translateY(0)") : "translateY(16px)",
      }}
    >
      {/* Hover glow */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none",
        background: `radial-gradient(circle at 50% 130%, ${pal.glow} 0%, transparent 65%)`,
        opacity: hov ? 1 : 0, transition: "opacity 0.35s",
      }} />
      <div style={{ position: "relative" }}>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: t.textMuted, marginBottom: 8, transition: "color 0.4s" }}>{bot.bot_id}</p>
        <p style={{ fontSize: 26, fontWeight: 600, color: textColor, lineHeight: 1, marginBottom: 12, transition: "color 0.4s" }}>
          {bot.avg_valence >= 0 ? "+" : ""}{bot.avg_valence.toFixed(2)}
        </p>
        {/* Mini progress bar */}
        <div style={{ height: 3, borderRadius: 3, background: t.gridLine, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${n * 100}%`, borderRadius: 3,
            background: pal.grad, transition: "width 1s cubic-bezier(0.34,1.2,0.64,1)",
          }} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MESSAGE ROW
───────────────────────────────────────────── */
function MessageRow({ h, t, idx }) {
  const [hov, setHov] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 40 + idx * 35);
    return () => clearTimeout(id);
  }, [idx]);

  const n = norm(h.valence);
  const pal = emotionPalette(h.emotion);
  const textColor = t === LIGHT ? pal.textLight : pal.text;

  const ts = (() => {
    try {
      return new Date(h.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return h.timestamp;
    }
  })();

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", flexDirection: "column",
        padding: "14px 18px", borderRadius: 14,
        background: hov ? t.surfaceHov : "transparent",
        border: `1px solid ${hov ? t.border : "transparent"}`,
        transition: "all 0.22s ease",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateX(0)" : "translateX(-10px)",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        {/* Left meta */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: t.textMuted }}>{ts}</span>
          <span style={{
            fontSize: 9, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase",
            padding: "2px 8px", borderRadius: 6,
            background: t.tagBg, color: t.textMid,
            border: `1px solid ${t.border}`,
          }}>{h.bot_id}</span>
        </div>
        {/* Right emotion */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: textColor, transition: "color 0.4s" }}>{h.emotion}</div>
            <div style={{ fontSize: 10, color: t.textHint, transition: "color 0.4s" }}>val: {h.valence.toFixed(3)}</div>
          </div>
          {/* Colored pip */}
          <div style={{ width: 6, height: 36, borderRadius: 4, background: pal.grad, boxShadow: `0 0 10px ${pal.glow}`, flexShrink: 0 }} />
        </div>
      </div>

      {/* Message text */}
      <p style={{ fontSize: 13, color: t.textMid, lineHeight: 1.65, margin: 0, transition: "color 0.4s" }}>
        {h.text}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────────── */
export default function MentalHealthDashboard({ userId }) {
  const [telemetry, setTelemetry]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const { theme } = useTheme();
  const dark = theme === "dark" || theme === undefined;
  const [view, setView]             = useState("daily");
  const [selectedBot, setSelectedBot] = useState("all");
  const orbRef = useRef(null);

  const t = dark ? DARK : LIGHT;

  /* cursor-tracked orb */
  useEffect(() => {
    const move = (e) => {
      if (!orbRef.current) return;
      orbRef.current.style.transform = `translate(${e.clientX - 200}px, ${e.clientY - 200}px)`;
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch(`${BASE_URL}/emotion-dashboard/${userId || "guest"}`);
        if (!res.ok) throw new Error("API Error");
        const data = await res.json();
        
        if (userId === "guest" || !data.history || data.history.length === 0) {
          setTelemetry(DEMO);
        } else {
          setTelemetry(data);
        }
      } catch {
        setTelemetry(DEMO);
      } finally {
        setLoading(false);
      }
    };
    fetchTelemetry();
  }, [userId]);

  const allBots = useMemo(
    () => Array.from(new Set((telemetry?.history || []).map((h) => h.bot_id))),
    [telemetry]
  );

  const displayHistory = useMemo(
    () => (telemetry?.history || []).filter((h) => selectedBot === "all" || h.bot_id === selectedBot),
    [telemetry, selectedBot]
  );

  // Recalculate daily/weekly when we select a specific bot
  const aggData = useMemo(() => {
    if (selectedBot === "all") {
      return { 
        daily: telemetry?.daily || [], 
        weekly: telemetry?.weekly || [], 
        recent_emotion: telemetry?.recent_emotion || "Neutral", 
        recent_valence: telemetry?.recent_valence || 0 
      };
    }
    
    if (displayHistory.length === 0) {
      return { daily: [], weekly: [], recent_emotion: "Neutral", recent_valence: 0 };
    }
    
    // Group up the history manually for the selected bot
    const dailyMap = {};
    const weeklyMap = {};
    
    displayHistory.forEach(l => {
      const dt = new Date(l.timestamp);
      // Daily key: YYYY-MM-DD
      const dateStr = dt.toISOString().split("T")[0];
      // Weekly key
      const day = dt.getDay(); // 0 is Sunday
      const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
      const weekStartDt = new Date(dt.getTime());
      weekStartDt.setDate(diff);
      const weekStartStr = weekStartDt.toISOString().split("T")[0];
      
      if (!dailyMap[dateStr]) dailyMap[dateStr] = { total: 0, count: 0 };
      dailyMap[dateStr].total += l.valence;
      dailyMap[dateStr].count += 1;
      
      if (!weeklyMap[weekStartStr]) weeklyMap[weekStartStr] = { total: 0, count: 0 };
      weeklyMap[weekStartStr].total += l.valence;
      weeklyMap[weekStartStr].count += 1;
    });
    
    const daily = Object.keys(dailyMap).sort().map(k => ({ 
      date: k, 
      avg_valence: dailyMap[k].total / dailyMap[k].count 
    })).slice(-7);
    
    const weekly = Object.keys(weeklyMap).sort().map(k => ({ 
      week_start: k, 
      avg_valence: weeklyMap[k].total / weeklyMap[k].count 
    })).slice(-4);
    
    return {
      daily,
      weekly,
      recent_emotion: displayHistory[0]?.emotion || "Neutral",
      recent_valence: displayHistory[0]?.valence || 0
    };
  }, [telemetry, displayHistory, selectedBot]);

  const chartData = useMemo(() => {
    if (!telemetry) return [];
    if (view === "weekly") return aggData.weekly;
    if (view === "bot")    return telemetry.by_bot || [];
    return aggData.daily;
  }, [telemetry, view, aggData]);

  const labelKey = view === "bot" ? "bot_id" : view === "weekly" ? "week_start" : "date";

  const trend = useMemo(() => {
    if (!aggData.daily || aggData.daily.length < 2) return 0;
    return (aggData.daily.at(-1)?.avg_valence ?? 0) - (aggData.daily.at(-2)?.avg_valence ?? 0);
  }, [aggData]);

  const recentPal = emotionPalette(aggData.recent_emotion || "neutral");
  const recentTextColor = dark ? recentPal.text : recentPal.textLight;

  /* Loading */
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.bg, transition: "background 0.5s" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", borderTop: "2px solid #a78bfa", borderRight: "2px solid #a78bfa", borderBottom: "2px solid transparent", borderLeft: "2px solid transparent", animation: "spin 1.3s linear infinite" }} />
          <span style={{ fontSize: 11, color: t.textHint, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>Loading insights</span>
        </div>
      </div>
    );
  }

  if (!telemetry) return null;

  const VIEWS = [
    { id: "daily",  label: "Daily",   icon: <Icon.Calendar /> },
    { id: "weekly", label: "Weekly",  icon: <Icon.Waves /> },
    { id: "bot",    label: "By Bot",  icon: <Icon.Bot /> },
  ];

  const chartTitles = { daily: "Daily valence trend", weekly: "Weekly valence trend", bot: "Per-bot breakdown" };

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "system-ui,-apple-system,sans-serif", overflowX: "hidden", position: "relative", transition: "background 0.5s, color 0.5s" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes tooltipFade { from { opacity:0; transform:translateX(-50%) translateY(4px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes pulseDot { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.45; transform:scale(0.65); } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; border-radius: 6px; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        select option { background: ${dark ? "#0f0f1e" : "#fff"}; color: ${dark ? "#e0e0f0" : "#111"}; }
      `}</style>

      {/* ── Ambient Orbs ── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div ref={orbRef} style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.09) 0%, transparent 70%)", transition: "transform 0.3s ease-out" }} />
        <div style={{ position: "absolute", top: -180, left: -120, width: 600, height: 600, borderRadius: "50%", background: dark ? "radial-gradient(circle, rgba(109,40,217,0.13) 0%, transparent 65%)" : "radial-gradient(circle, rgba(167,139,250,0.18) 0%, transparent 65%)" }} />
        <div style={{ position: "absolute", bottom: -200, right: -150, width: 700, height: 700, borderRadius: "50%", background: dark ? "radial-gradient(circle, rgba(14,165,233,0.07) 0%, transparent 60%)" : "radial-gradient(circle, rgba(14,165,233,0.10) 0%, transparent 60%)" }} />
        <div style={{ position: "absolute", top: "38%", left: "52%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(236,72,153,0.05) 0%, transparent 70%)" }} />
        {/* Dot grid */}
        <div style={{ position: "absolute", inset: 0, opacity: dark ? 0.022 : 0.06, backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* ── HEADER ── */}
        <GlassCard style={{ background: t.surface, border: `1px solid ${t.border}`, padding: "18px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            {/* Brand */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {dark && (
                <div style={{ position: "relative", padding: 12, borderRadius: 16, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", color: "#a78bfa" }}>
                  <Icon.Brain />
                  <span style={{ position: "absolute", top: 9, right: 9, width: 7, height: 7, borderRadius: "50%", background: "#34d399", animation: "pulseDot 2.2s infinite" }} />
                </div>
              )}
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 600, color: t.text, letterSpacing: "-0.02em", lineHeight: 1.2, transition: "color 0.4s" }}>Emotion Dashboard</h1>
                <p style={{ fontSize: 11, color: t.textMuted, marginTop: 4, display: "flex", alignItems: "center", gap: 5, transition: "color 0.4s" }}>
                  ✦ Current state:
                  <span style={{ fontWeight: 600, color: recentTextColor, textTransform: "capitalize", transition: "color 0.4s" }}>
                    {aggData.recent_emotion}
                  </span>
                  · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                </p>
              </div>
            </div>

            {/* Right controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {/* Tab switcher */}
              <div style={{ display: "flex", alignItems: "center", gap: 3, background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", border: `1px solid ${t.border}`, borderRadius: 14, padding: 4 }}>
                {VIEWS.map((v) => {
                  const active = view === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setView(v.id)}
                      style={{
                        padding: "6px 14px", borderRadius: 10, border: active ? `1px solid rgba(139,92,246,0.3)` : "1px solid transparent",
                        background: active ? "rgba(139,92,246,0.18)" : "transparent",
                        color: active ? "#c4b5fd" : t.textMuted, cursor: "pointer",
                        fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 5,
                        transition: "all 0.22s ease",
                      }}
                    >
                      <span style={{ color: active ? "#a78bfa" : "inherit", display: "flex" }}>{v.icon}</span>
                      {v.label}
                    </button>
                  );
                })}
              </div>

              {/* Bot filter */}
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 12, background: t.surface, border: `1px solid ${t.border}`, color: t.textMuted }}>
                <Icon.Filter />
                <select
                  value={selectedBot}
                  onChange={(e) => setSelectedBot(e.target.value)}
                  style={{ background: "transparent", border: "none", outline: "none", fontSize: 12, color: t.textMid, cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}
                >
                  <option value="all">All Bots</option>
                  {allBots.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

            </div>
          </div>
        </GlassCard>

        {/* ── STAT CARDS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          <StatCard icon={<Icon.Activity />} label="Valence Score"   value={<AnimatedValence value={aggData.recent_valence} />} sub="Range: −1.0 (low) → +1.0 (high)" accentColor="#38bdf8" t={t} delay={80} />
          <StatCard icon={<Icon.Heart />}    label="Latest Emotion"  value={<span style={{ textTransform: "capitalize" }}>{aggData.recent_emotion}</span>} sub="Exact tracked emotion" accentColor="#f43f5e" t={t} delay={160} />
          <StatCard icon={<Icon.User />}     label="Bots Monitored"  value={allBots.length || (telemetry.by_bot || []).length} sub="Active therapy assistants" accentColor="#a78bfa" t={t} delay={240} />
        </div>

        {/* ── CHART PANEL ── */}
        <GlassCard style={{ background: t.surface, border: `1px solid ${t.border}`, padding: "22px 26px" }}>
          {/* Panel header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: view === "daily" ? "#a78bfa" : view === "weekly" ? "#38bdf8" : "#34d399", display: "flex" }}>
                {view === "daily" ? <Icon.Calendar /> : view === "weekly" ? <Icon.Waves /> : <Icon.Bot />}
              </span>
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 500, color: t.text, lineHeight: 1, transition: "color 0.4s" }}>{chartTitles[view]}</h2>
                <p style={{ fontSize: 10, color: t.textMuted, marginTop: 3 }}>{chartData.length} data point{chartData.length !== 1 ? "s" : ""}</p>
              </div>
            </div>

            {/* Trend badge (daily only) */}
            {view === "daily" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 10, background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: `1px solid ${t.border}`, fontSize: 11, color: t.textMuted }}>
                {trend > 0.05 ? <Icon.TrendUp /> : trend < -0.05 ? <Icon.TrendDown /> : <Icon.Minus />}
                {trend >= 0 ? "+" : ""}{trend.toFixed(2)} vs prev.
              </div>
            )}
          </div>

          <ValenceChart items={chartData} labelKey={labelKey} t={t} />

          {/* Legend */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", marginTop: 18, paddingTop: 16, borderTop: `1px solid ${t.border}` }}>
            {[
              { color: "#34d399", label: "Happy / Calm" }, 
              { color: "#60a5fa", label: "Sad / Grief" },
              { color: "#f43f5e", label: "Anger / Frustration" },
              { color: "#fb923c", label: "Anxiety / Fear" },
              { color: "#a78bfa", label: "Neutral" }
            ].map(({ color, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: t.textMuted }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                {label}
              </div>
            ))}
          </div>
        </GlassCard>

        {/* ── BOT BREAKDOWN (bot view only) ── */}
        {view === "bot" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {(telemetry.by_bot || []).map((bot, i) => (
              <BotCard key={bot.bot_id} bot={bot} t={t} delay={60 + i * 60} />
            ))}
          </div>
        )}

        {/* ── MESSAGE LOG ── */}
        <GlassCard style={{ background: t.surface, border: `1px solid ${t.border}`, padding: 0, overflow: "hidden" }}>
          {/* Log header */}
          <div style={{ padding: "18px 24px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#38bdf8", display: "flex" }}><Icon.Message /></span>
              <h2 style={{ fontSize: 14, fontWeight: 500, color: t.text, transition: "color 0.4s" }}>Message History</h2>
            </div>
            <span style={{ fontSize: 11, color: t.textMuted }}>{displayHistory.length} record{displayHistory.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Scrollable rows */}
          <div style={{ maxHeight: 460, overflowY: "auto", padding: "10px 12px" }}>
            {displayHistory.length === 0 ? (
              <div style={{ padding: "60px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>No emotion history for this filter.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {displayHistory.map((h, i) => (
                  <MessageRow key={i} h={h} t={t} idx={i} />
                ))}
              </div>
            )}
          </div>
        </GlassCard>

        {/* Footer */}
        <p style={{ textAlign: "center", fontSize: 10, color: t.textHint, paddingBottom: 8, letterSpacing: "0.05em", transition: "color 0.4s" }}>
          Data refreshes each session · Emotional analysis powered by AI telemetry
        </p>
      </div>
    </div>
  );
}