"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useSpring, useMotionValue } from "framer-motion";
import {
  BrainCircuit,
  Activity,
  Calendar,
  Waves,
  HeartPulse,
  User,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
} from "lucide-react";

/* ─── helpers ─── */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const norm = (v) => clamp((v + 1) / 2, 0, 1); // -1…+1 → 0…1

const emotionGradient = (n) => {
  if (n > 0.65) return { bar: "from-emerald-400 to-teal-300", glow: "rgba(52,211,153,0.35)", text: "text-emerald-300" };
  if (n < 0.38) return { bar: "from-rose-500 to-pink-400",    glow: "rgba(244,63,94,0.35)",  text: "text-rose-300"   };
  return              { bar: "from-violet-500 to-indigo-400",  glow: "rgba(139,92,246,0.35)", text: "text-violet-300" };
};

const TrendIcon = ({ val }) => {
  if (val > 0.05)  return <TrendingUp  className="w-4 h-4 text-emerald-400" />;
  if (val < -0.05) return <TrendingDown className="w-4 h-4 text-rose-400" />;
  return <Minus className="w-4 h-4 text-white/40" />;
};

/* ─── animated valence number ─── */
function AnimatedNumber({ value, decimals = 2 }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 80, damping: 20 });
  const [display, setDisplay] = useState("0.00");

  useEffect(() => { mv.set(value); }, [value]);
  useEffect(() => spring.on("change", (v) => setDisplay(v.toFixed(decimals))), [spring]);

  return <span>{display}</span>;
}

/* ─── bar chart ─── */
function ValenceBar({ item, idx, labelKey }) {
  const n = norm(item.avg_valence ?? 0);
  const h = clamp(n * 100, 6, 100);
  const style = emotionGradient(n);
  const label = item[labelKey] ?? "—";
  const short = String(label).slice(-5);

  return (
    <motion.div
      key={idx}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.045, type: "spring", stiffness: 70 }}
      className="flex flex-col items-center gap-2 flex-1 group"
    >
      {/* Valence tooltip on hover */}
      <div className="relative w-full flex flex-col items-center">
        <span className="absolute -top-7 scale-0 group-hover:scale-100 transition-transform origin-bottom bg-white/10 backdrop-blur-sm border border-white/10 text-white/80 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg">
          {(item.avg_valence ?? 0).toFixed(3)}
        </span>

        {/* Bar container (fixed height) */}
        <div className="w-full flex items-end justify-center" style={{ height: 140 }}>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ type: "spring", stiffness: 55, damping: 18, delay: idx * 0.045 }}
            className={`w-full max-w-[44px] rounded-t-2xl bg-gradient-to-t ${style.bar} relative overflow-hidden cursor-pointer`}
            style={{ boxShadow: `0 0 18px 0 ${style.glow}` }}
          >
            {/* shimmer */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent opacity-60" />
            {/* pulse on hover */}
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </motion.div>
        </div>
      </div>

      {/* Label */}
      <span className="text-[10px] text-white/40 group-hover:text-white/70 transition-colors truncate w-full text-center font-mono">
        {short}
      </span>
    </motion.div>
  );
}

/* ─── glass card ─── */
function GlassCard({ children, className = "", delay = 0, noPad = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 60, damping: 18 }}
      className={`
        relative rounded-3xl
        border border-white/[0.07]
        bg-white/[0.04]
        backdrop-blur-2xl
        overflow-hidden
        ${noPad ? "" : "p-6"}
        ${className}
      `}
    >
      {/* inner highlight rim */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/[0.06]" />
      {children}
    </motion.div>
  );
}

/* ─── stat card ─── */
function StatCard({ icon: Icon, iconColor, label, value, sub, delay }) {
  return (
    <GlassCard delay={delay}>
      <div className="flex items-start justify-between mb-5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-white/35 leading-none">{label}</span>
        <div className={`p-2 rounded-xl bg-white/5 border border-white/8 ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-[2.2rem] font-bold tracking-tight text-white/90 leading-none mb-2">{value}</div>
      <div className="text-[11px] text-white/30 leading-snug">{sub}</div>
    </GlassCard>
  );
}

/* ─── tab pill ─── */
function TabPill({ id, label, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`relative px-5 py-2 text-[13px] font-semibold rounded-xl transition-all duration-200 ${
        active
          ? "text-white"
          : "text-white/35 hover:text-white/65"
      }`}
    >
      {active && (
        <motion.div
          layoutId="tab-bg"
          className="absolute inset-0 rounded-xl bg-white/12 border border-white/10"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </button>
  );
}

/* ─── main dashboard ─── */
export default function MentalHealthDashboard({ userId }) {
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("daily");
  const cursorRef = useRef(null);

  /* cursor glow */
  useEffect(() => {
    const move = (e) => {
      if (!cursorRef.current) return;
      cursorRef.current.style.transform = `translate(${e.clientX - 200}px, ${e.clientY - 200}px)`;
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:8000/emotion-dashboard/${userId || "guest"}`);
        const data = await res.json();
        setTelemetry(data);
      } catch {
        setTelemetry({
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
            { bot_id: "Calm", avg_valence: 0.81 },
            { bot_id: "Focus", avg_valence: 0.29 },
            { bot_id: "Sleep", avg_valence: -0.12 },
          ],
          recent_emotion: "Calm",
          recent_valence: 0.69,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchTelemetry();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#080811]">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ ease: "linear", duration: 1.4, repeat: Infinity }}
            className="w-9 h-9 rounded-full border-t-2 border-r-2 border-violet-400/70"
          />
          <span className="text-white/25 text-xs tracking-widest uppercase font-semibold">Loading insights</span>
        </div>
      </div>
    );
  }

  if (!telemetry) return null;

  const chartData =
    view === "bot"
      ? telemetry.by_bot
      : view === "weekly"
      ? telemetry.weekly
      : telemetry.daily;

  const labelKey = view === "bot" ? "bot_id" : view === "weekly" ? "week_start" : "date";

  const valenceStyle = emotionGradient(norm(telemetry.recent_valence));
  const trend = telemetry.daily?.length > 1
    ? (telemetry.daily.at(-1)?.avg_valence ?? 0) - (telemetry.daily.at(-2)?.avg_valence ?? 0)
    : 0;

  const views = [
    { id: "daily", label: "Daily" },
    { id: "weekly", label: "Weekly" },
    { id: "bot", label: "By Bot" },
  ];

  return (
    <div className="relative min-h-screen bg-[#080811] text-white overflow-hidden font-[var(--font-sans)]">

      {/* ── ambient orbs ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* cursor glow */}
        <div
          ref={cursorRef}
          className="absolute w-[400px] h-[400px] rounded-full pointer-events-none transition-transform duration-300 ease-out"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)" }}
        />
        {/* static ambient orbs */}
        <div className="absolute top-[-180px] left-[-120px] w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(109,40,217,0.14) 0%, transparent 65%)" }} />
        <div className="absolute bottom-[-200px] right-[-150px] w-[700px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(14,165,233,0.07) 0%, transparent 60%)" }} />
        <div className="absolute top-[40%] left-[55%] w-[350px] h-[350px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(236,72,153,0.05) 0%, transparent 70%)" }} />
        {/* subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-5 md:px-10 py-10 space-y-5">

        {/* ── HEADER ── */}
        <GlassCard noPad className="px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            {/* Brand */}
            <div className="flex items-center gap-4">
              <div className="relative p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                <BrainCircuit className="w-6 h-6 text-violet-400" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white/92 leading-tight">
                  Mental Health Insights
                </h1>
                <p className="text-[12px] text-white/35 mt-0.5 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-violet-400" />
                  Predominantly{" "}
                  <span className={`font-semibold capitalize ${valenceStyle.text}`}>
                    {telemetry.recent_emotion}
                  </span>{" "}
                  · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                </p>
              </div>
            </div>

            {/* Tab switcher */}
            <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
              {views.map((v) => (
                <TabPill key={v.id} id={v.id} label={v.label} active={view === v.id} onClick={setView} />
              ))}
            </div>
          </div>
        </GlassCard>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={Activity}
            iconColor="text-sky-400"
            label="Valence Score"
            value={<AnimatedNumber value={telemetry.recent_valence} />}
            sub="Range: −1.0 (low) → +1.0 (high)"
            delay={0.06}
          />
          <StatCard
            icon={HeartPulse}
            iconColor="text-rose-400"
            label="Latest Emotion"
            value={<span className="capitalize">{telemetry.recent_emotion}</span>}
            sub="Recorded from most recent session"
            delay={0.12}
          />
          <StatCard
            icon={User}
            iconColor="text-violet-400"
            label="Bots Monitored"
            value={telemetry.by_bot.length}
            sub="Active therapy assistants"
            delay={0.18}
          />
        </div>

        {/* ── CHART PANEL ── */}
        <GlassCard noPad className="overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between px-7 pt-7 pb-5">
            <div className="flex items-center gap-3">
              {view === "daily"   && <Calendar className="w-5 h-5 text-violet-400" />}
              {view === "weekly"  && <Waves    className="w-5 h-5 text-sky-400"    />}
              {view === "bot"     && <User     className="w-5 h-5 text-emerald-400"/>}
              <div>
                <h2 className="text-[15px] font-semibold text-white/80 capitalize leading-none">
                  {view === "bot" ? "Per-Bot" : view} Valence Trend
                </h2>
                <p className="text-[11px] text-white/30 mt-1">
                  {chartData.length} data point{chartData.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Trend badge */}
            {view === "daily" && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 text-[11px] font-semibold text-white/50">
                <TrendIcon val={trend} />
                <span>{trend >= 0 ? "+" : ""}{trend.toFixed(2)} vs prev.</span>
              </div>
            )}
          </div>

          {/* Y-axis labels + bars */}
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="px-7 pb-7"
            >
              <div className="relative">
                {/* Horizontal gridlines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ height: 140 }}>
                  {[100, 75, 50, 25, 0].map((p) => (
                    <div key={p} className="flex items-center gap-3">
                      <span className="text-[10px] text-white/15 w-8 text-right font-mono">{p}%</span>
                      <div className="flex-1 border-t border-white/[0.04]" />
                    </div>
                  ))}
                </div>

                {/* Bars */}
                <div className="flex items-end gap-2 ml-11" style={{ height: 140 }}>
                  {chartData.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
                      No data available
                    </div>
                  ) : (
                    chartData.map((item, idx) => (
                      <ValenceBar key={idx} item={item} idx={idx} labelKey={labelKey} />
                    ))
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-6 pt-5 border-t border-white/[0.05] flex flex-wrap gap-4 justify-center">
                {[
                  { color: "bg-emerald-400", label: "Positive  (>0.65)" },
                  { color: "bg-violet-400",  label: "Neutral  (0.38–0.65)" },
                  { color: "bg-rose-400",    label: "Negative  (<0.38)" },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2 text-[11px] text-white/30">
                    <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    {label}
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </GlassCard>

        {/* ── BOT BREAKDOWN MINI-CARDS (only in bot view) ── */}
        <AnimatePresence>
          {view === "bot" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 60 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              {telemetry.by_bot.map((bot, i) => {
                const n = norm(bot.avg_valence);
                const style = emotionGradient(n);
                return (
                  <div
                    key={i}
                    className="relative rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl px-4 py-4 overflow-hidden group hover:border-white/15 transition-colors"
                  >
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity`}
                      style={{ background: `radial-gradient(circle at 50% 120%, ${emotionGradient(n).glow} 0%, transparent 70%)` }} />
                    <p className="text-[11px] text-white/35 font-semibold uppercase tracking-wider mb-2">{bot.bot_id}</p>
                    <p className={`text-2xl font-bold ${style.text} leading-none`}>
                      {bot.avg_valence.toFixed(2)}
                    </p>
                    <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${n * 100}%` }}
                        transition={{ delay: i * 0.08, type: "spring", stiffness: 60 }}
                        className={`h-full rounded-full bg-gradient-to-r ${style.bar}`}
                      />
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── FOOTER ── */}
        <p className="text-center text-[11px] text-white/15 pb-2 tracking-wide">
          Data refreshes each session · Emotional analysis powered by AI telemetry
        </p>
      </div>
    </div>
  );
}