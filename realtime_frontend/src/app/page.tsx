'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Globe, Heart, Users, Shield, Sparkles, ArrowRight, MessageCircle, Trophy, Gamepad2, Languages, Star, ChevronRight, Quote, Zap } from 'lucide-react';

/* ─────────────────────────────────────────────
   DATA
   ───────────────────────────────────────────── */

const FLOATING_FLAGS = [
  { flag: '🇧🇷', x: 12, y: 18, delay: 0, size: 'text-3xl' },
  { flag: '🇮🇳', x: 78, y: 14, delay: 0.3, size: 'text-4xl' },
  { flag: '🇯🇵', x: 88, y: 42, delay: 0.6, size: 'text-2xl' },
  { flag: '🇰🇪', x: 8, y: 55, delay: 0.9, size: 'text-3xl' },
  { flag: '🇩🇪', x: 92, y: 72, delay: 1.2, size: 'text-2xl' },
  { flag: '🇰🇷', x: 18, y: 78, delay: 1.5, size: 'text-3xl' },
  { flag: '🇲🇽', x: 70, y: 82, delay: 1.8, size: 'text-2xl' },
  { flag: '🇮🇹', x: 50, y: 8, delay: 2.1, size: 'text-2xl' },
  { flag: '🇳🇬', x: 35, y: 85, delay: 2.4, size: 'text-3xl' },
  { flag: '🇻🇳', x: 62, y: 12, delay: 2.7, size: 'text-2xl' },
  { flag: '🇹🇷', x: 5, y: 38, delay: 3.0, size: 'text-2xl' },
  { flag: '🇫🇷', x: 42, y: 90, delay: 3.3, size: 'text-2xl' },
];

const FEATURES = [
  {
    icon: <Shield className="w-7 h-7" />,
    title: 'Verified Humans Only',
    description: 'Video/voice intro ensures every person is real. No bots, no fakes — just genuine souls looking for connection.',
    color: 'from-green-500 to-emerald-500',
    accent: 'group-hover:shadow-green-500/20',
  },
  {
    icon: <Languages className="w-7 h-7" />,
    title: 'Magic Translation Bridge',
    description: 'Type in Hindi, they read Portuguese. AI explains cultural idioms so nothing is lost in translation.',
    color: 'from-blue-500 to-cyan-500',
    accent: 'group-hover:shadow-blue-500/20',
  },
  {
    icon: <Trophy className="w-7 h-7" />,
    title: 'Bonding Contests',
    description: 'Weekly quizzes test how well you know each other. Climb leaderboards and win real rewards together!',
    color: 'from-amber-500 to-orange-500',
    accent: 'group-hover:shadow-amber-500/20',
  },
  {
    icon: <Heart className="w-7 h-7" />,
    title: 'Relationship Levels',
    description: 'Grow from strangers to family. Unlock voice calls, family rooms, and permanent Digital Heirlooms.',
    color: 'from-pink-500 to-rose-500',
    accent: 'group-hover:shadow-pink-500/20',
  },
  {
    icon: <Users className="w-7 h-7" />,
    title: 'Global Family Rooms',
    description: 'Join a digital living room with family from 4 different countries. Share meals, music, and stories.',
    color: 'from-purple-500 to-violet-500',
    accent: 'group-hover:shadow-purple-500/20',
  },
  {
    icon: <Gamepad2 className="w-7 h-7" />,
    title: 'Fun & Emotional Games',
    description: 'Emotion Charades, Story Chain, Music Swap, and 12+ bonding games designed to deepen your connection.',
    color: 'from-indigo-500 to-blue-500',
    accent: 'group-hover:shadow-indigo-500/20',
  },
];

const DEMO_CHAT = [
  {
    sender: 'Raj',
    lang: 'Hindi',
    original: 'आज मैं अकेला महसूस कर रहा हूं',
    translated: 'Today I feel lonely',
    flag: '🇮🇳',
  },
  {
    sender: 'Maria',
    lang: 'Portuguese',
    original: 'Não se preocupe, meu filho. Estou aqui.',
    translated: "Don't worry, my son. I'm here.",
    flag: '🇧🇷',
  },
  {
    sender: 'Raj',
    lang: 'Hindi',
    original: 'आपकी बात सुनकर दिल खुश हो गया',
    translated: 'My heart is happy hearing from you',
    flag: '🇮🇳',
    note: 'This Hindi expression "दिल खुश हो गया" literally means "my heart became happy" — it conveys deep emotional warmth and gratitude, common in South Asian cultures when speaking to elders.',
  },
];

const STEPS = [
  { step: 1, emoji: '📱', title: 'Sign Up & Verify', desc: 'Record a voice intro sharing why you want to connect. Earn your "Verified Human" badge instantly.' },
  { step: 2, emoji: '🎯', title: 'Choose Your Role', desc: 'Want to be a Digital Mother? Looking for a Mentor? Pick the relationship that speaks to your heart.' },
  { step: 3, emoji: '🌍', title: 'Get Matched', desc: 'Our algorithm finds your perfect match across borders. A Grandmother in Italy meets a Student in Vietnam.' },
  { step: 4, emoji: '💬', title: 'Chat Freely', desc: 'Speak your language — they read theirs. AI handles translation and explains cultural nuances beautifully.' },
  { step: 5, emoji: '🏆', title: 'Bond & Level Up', desc: 'Win contests, play games, build your Care Score. Unlock voice calls, family rooms, and exclusive rewards.' },
  { step: 6, emoji: '👨‍👩‍👧‍👦', title: 'Build Your Global Family', desc: 'Bring your bonds together in a Digital Living Room. Share cultures, traditions, meals, and love.' },
];

const STATS = [
  { value: '12,000+', label: 'Bonds Formed', icon: <Heart className="w-5 h-5" /> },
  { value: '190+', label: 'Countries', icon: <Globe className="w-5 h-5" /> },
  { value: '50+', label: 'Languages', icon: <Languages className="w-5 h-5" /> },
  { value: '98%', label: 'Say It Changed Their Life', icon: <Star className="w-5 h-5" /> },
];

const EMOTIONAL_STORIES = [
  {
    quote: "I lost my grandmother when I was 15. Maria filled that void in my heart. She taught me recipes, shared her wisdom, and celebrated my graduation from Brazil — all through Familia.",
    author: "Yuki Tanaka",
    location: "Tokyo, Japan",
    flag: "🇯🇵",
    role: "Digital Granddaughter",
    avatar: "👧",
    color: "from-pink-500/20 to-rose-500/20",
  },
  {
    quote: "As a 68-year-old widow, I felt invisible. Now I have three 'children' from India, Kenya, and Mexico who call me every week. They gave me a reason to wake up smiling.",
    author: "Elena Rossi",
    location: "Rome, Italy",
    flag: "🇮🇹",
    role: "Digital Mother",
    avatar: "👵",
    color: "from-amber-500/20 to-orange-500/20",
  },
  {
    quote: "Growing up in foster care, I never had a family. Through Familia, I found a father figure in Germany, a sister in Nigeria, and a grandmother in Brazil. For the first time, I belong.",
    author: "James Okonkwo",
    location: "London, UK",
    flag: "🇬🇧",
    role: "Digital Son",
    avatar: "👦",
    color: "from-blue-500/20 to-indigo-500/20",
  },
];

/* ─────────────────────────────────────────────
   COMPONENT
   ───────────────────────────────────────────── */

export default function HomePage() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [chatStep, setChatStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % FEATURES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let step = 0;
    const runChat = () => {
      if (step < DEMO_CHAT.length) {
        setIsTranslating(true);
        setTimeout(() => {
          setIsTranslating(false);
          setChatStep(step + 1);
          step++;
          setTimeout(runChat, 2200);
        }, 1200);
      } else {
        step = 0;
        setChatStep(0);
        setTimeout(runChat, 1500);
      }
    };
    const initial = setTimeout(runChat, 800);
    return () => clearTimeout(initial);
  }, [mounted]);

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ═══════════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 overflow-hidden">
        {/* Ambient gradient orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-familia-500/[0.07] via-heart-500/[0.05] to-transparent blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-bond-500/[0.06] to-transparent blur-3xl" />
        </div>

        {/* Floating country flags */}
        <div className="absolute inset-0 pointer-events-none">
          {mounted && FLOATING_FLAGS.map((item, i) => (
            <motion.div
              key={i}
              className={`absolute ${item.size} select-none`}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 0.6, 0.4, 0.6],
                scale: 1,
                x: [0, Math.sin(i * 0.8) * 25, -Math.sin(i * 0.5) * 15, 0],
                y: [0, -Math.cos(i * 0.6) * 20, Math.cos(i * 0.9) * 25, 0],
              }}
              transition={{
                delay: item.delay,
                duration: 8 + i * 0.5,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
              }}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
              }}
            >
              {item.flag}
            </motion.div>
          ))}
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Logo */}
            <motion.div
              className="inline-flex items-center gap-3 mb-10"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="relative">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-familia-500 to-heart-500 flex items-center justify-center shadow-lg shadow-familia-500/30">
                  <Globe className="w-8 h-8 sm:w-9 sm:h-9 text-white" />
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-familia-500 to-heart-500 opacity-20 blur-lg animate-glow-pulse" />
              </div>
              <span className="text-4xl sm:text-5xl font-black tracking-tight">Familia</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-[1.05] tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.8 }}
            >
              <span className="gradient-text text-glow">Family Has</span>{' '}
              <br className="sm:hidden" />
              <span className="gradient-text-cool">No Borders.</span>
              <br />
              <span className="text-white/90">Love Has No Language.</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              className="text-lg sm:text-xl md:text-2xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              In a world of 8 billion, no one should feel alone. Find your grandmother in Brazil, 
              your mentor in Japan, your sibling in Nigeria.
              <br className="hidden sm:block" />
              <span className="text-familia-400 font-medium">Because family isn&apos;t born —</span>{' '}
              <span className="text-bond-400 font-medium">it&apos;s chosen.</span>
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.8 }}
            >
              <Link href="/signup">
                <motion.button
                  className="btn-primary text-lg px-10 py-4 flex items-center gap-2 shadow-xl shadow-familia-500/20"
                  whileHover={{ scale: 1.05, boxShadow: '0 20px 60px rgba(255,107,53,0.3)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Sparkles className="w-5 h-5" />
                  Join Familia — It&apos;s Free
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
              <Link href="/login">
                <motion.button
                  className="btn-secondary text-lg px-10 py-4"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Sign In
                </motion.button>
              </Link>
            </motion.div>

            {/* Trusted-by social proof */}
            <motion.div
              className="flex flex-col items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.8 }}
            >
              <div className="flex -space-x-2">
                {['👩🏽', '👨🏻', '👧🏿', '👴🏼', '👦🏾'].map((emoji, i) => (
                  <motion.div
                    key={i}
                    className="w-9 h-9 rounded-full bg-gradient-to-br from-white/10 to-white/5 border-2 border-[#0A0A1A] flex items-center justify-center text-lg"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.08 }}
                  >
                    {emoji}
                  </motion.div>
                ))}
              </div>
              <p className="text-white/30 text-sm">
                Trusted by <span className="text-white/50 font-semibold">12,000+</span> people across{' '}
                <span className="text-white/50 font-semibold">190 countries</span>
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/10 flex items-start justify-center p-1.5">
            <motion.div
              className="w-1.5 h-3 rounded-full bg-white/30"
              animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════
          STATS / SOCIAL PROOF BAR
          ═══════════════════════════════════════════ */}
      <section className="py-16 px-4 sm:px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent" />
        <motion.div
          className="max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
        >
          <div className="glass-card !py-8 !px-6 sm:!px-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
              {STATS.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className="text-center relative"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  {/* Divider line between items on desktop */}
                  {i > 0 && (
                    <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-12 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                  )}
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-familia-500/10 to-heart-500/10 border border-white/5 text-familia-400 mb-3">
                    {stat.icon}
                  </div>
                  <div className="text-2xl sm:text-3xl font-black gradient-text">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-white/40 mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════
          DEMO CHAT SECTION
          ═══════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-bond-500/[0.04] to-transparent blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <motion.span
              className="inline-flex items-center gap-2 text-sm font-semibold text-familia-400 bg-familia-500/10 border border-familia-500/15 rounded-full px-4 py-1.5 mb-5"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Zap className="w-3.5 h-3.5" />
              Live Translation Preview
            </motion.span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">
              Watch the <span className="gradient-text text-glow">Magic</span> Happen
            </h2>
            <p className="text-white/40 text-base sm:text-lg max-w-xl mx-auto">
              Real-time AI translation with cultural nuance detection — every message carries its full meaning
            </p>
          </motion.div>

          <div className="max-w-lg mx-auto">
            <motion.div
              className="relative"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              {/* Glow behind chat card */}
              <div className="absolute -inset-4 bg-gradient-to-b from-familia-500/5 via-bond-500/5 to-transparent rounded-3xl blur-2xl" />

              <div className="glass-card !p-0 overflow-hidden relative border border-white/[0.08]">
                {/* Chat header */}
                <div className="p-4 sm:p-5 border-b border-white/[0.06] bg-white/[0.02] flex items-center gap-3">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-xl shadow-lg shadow-green-500/20">
                      👩
                    </div>
                    {/* Online dot */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[#0A0A1A]">
                      <div className="w-full h-full rounded-full bg-green-400 animate-ping opacity-75" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold flex items-center gap-2 text-[15px]">
                      Maria
                      <span className="badge-verified text-[10px]">✅ Verified</span>
                    </div>
                    <div className="text-xs text-white/35">Digital Mother · Brazil 🇧🇷</div>
                  </div>
                  <div className="badge-level text-[11px]">Level 3 🌟</div>
                </div>

                {/* Chat messages */}
                <div className="p-4 sm:p-5 space-y-4 min-h-[340px] flex flex-col justify-end">
                  <AnimatePresence mode="popLayout">
                    {DEMO_CHAT.slice(0, chatStep).map((msg, i) => (
                      <motion.div
                        key={`msg-${i}-${chatStep}`}
                        initial={{ opacity: 0, y: 16, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className={`flex ${msg.sender === 'Raj' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] sm:max-w-[80%] ${msg.sender === 'Raj' ? 'message-sent' : 'message-received'} p-3.5`}>
                          {/* Language label */}
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-[11px]">{msg.flag}</span>
                            <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">{msg.lang}</span>
                          </div>
                          {/* Original text */}
                          <div className="text-xs text-white/40 mb-1 italic">
                            &ldquo;{msg.original}&rdquo;
                          </div>
                          {/* Translated text */}
                          <div className="text-[15px] font-medium leading-snug text-white/90">{msg.translated}</div>

                          {/* Cultural note */}
                          {msg.note && (
                            <motion.div
                              initial={{ opacity: 0, height: 0, marginTop: 0 }}
                              animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
                              transition={{ delay: 0.3, duration: 0.5 }}
                              className="relative"
                            >
                              <div className="rounded-xl p-3 bg-gradient-to-r from-amber-500/[0.08] to-orange-500/[0.05] border border-amber-500/20">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <span className="text-amber-400 text-xs">💡</span>
                                  <span className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider">Cultural Insight</span>
                                </div>
                                <p className="text-xs text-amber-200/70 leading-relaxed">
                                  {msg.note}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* AI Translating indicator */}
                  <AnimatePresence>
                    {isTranslating && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="flex justify-start"
                      >
                        <div className="glass-card-sm !py-2.5 !px-4 flex items-center gap-2.5">
                          <div className="flex gap-1">
                            <motion.div className="w-1.5 h-1.5 rounded-full bg-bond-400" animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0 }} />
                            <motion.div className="w-1.5 h-1.5 rounded-full bg-bond-400" animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }} />
                            <motion.div className="w-1.5 h-1.5 rounded-full bg-bond-400" animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }} />
                          </div>
                          <span className="text-[11px] font-medium text-bond-400/80">
                            <Languages className="w-3 h-3 inline mr-1 -mt-0.5" />
                            AI translating…
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Chat input mock */}
                <div className="p-3 sm:p-4 border-t border-white/[0.06] bg-white/[0.01]">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center px-4">
                      <span className="text-white/20 text-sm">Type a message in any language…</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-familia-500 to-heart-500 flex items-center justify-center opacity-50">
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FEATURES GRID
          ═══════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 relative">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <motion.span
              className="inline-flex items-center gap-2 text-sm font-semibold text-bond-400 bg-bond-500/10 border border-bond-500/15 rounded-full px-4 py-1.5 mb-5"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Platform Features
            </motion.span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">
              Everything You Need for{' '}
              <br className="hidden sm:block" />
              <span className="gradient-text-cool">Real Connection</span>
            </h2>
            <p className="text-white/40 text-base sm:text-lg max-w-xl mx-auto">
              Technology as a bridge, humans as the heart
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-5">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                className={`group relative cursor-pointer ${feature.accent}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                onHoverStart={() => setActiveFeature(i)}
              >
                {/* Gradient border on hover */}
                <div className="absolute -inset-[1px] rounded-[1.3rem] bg-gradient-to-br from-white/[0.08] via-transparent to-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative glass-card !p-6 sm:!p-7 h-full transition-all duration-500 group-hover:border-transparent group-hover:translate-y-[-2px] group-hover:shadow-xl">
                  <div className="flex items-start gap-5">
                    {/* Icon in gradient circle */}
                    <div className="flex-shrink-0">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} p-[1px]`}>
                        <div className="w-full h-full rounded-2xl bg-[#0f0f25] flex items-center justify-center group-hover:bg-transparent transition-colors duration-500">
                          <div className="text-white">{feature.icon}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold mb-2 text-white/90 group-hover:text-white transition-colors">{feature.title}</h3>
                      <p className="text-white/40 text-sm leading-relaxed group-hover:text-white/55 transition-colors">{feature.description}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          HOW IT WORKS — TIMELINE STEPPER
          ═══════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-gradient-to-b from-familia-500/[0.03] to-transparent blur-3xl" />
        </div>

        <div className="max-w-3xl mx-auto relative">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <motion.span
              className="inline-flex items-center gap-2 text-sm font-semibold text-heart-400 bg-heart-500/10 border border-heart-500/15 rounded-full px-4 py-1.5 mb-5"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Star className="w-3.5 h-3.5" />
              Getting Started
            </motion.span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">
              How <span className="gradient-text text-glow">Familia</span> Works
            </h2>
            <p className="text-white/40 text-base sm:text-lg max-w-lg mx-auto">
              From signup to global family in six simple steps
            </p>
          </motion.div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical connecting line */}
            <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-familia-500/30 via-heart-500/20 to-bond-500/30" />

            <div className="space-y-2">
              {STEPS.map((item, i) => (
                <motion.div
                  key={item.step}
                  className="relative flex gap-5 sm:gap-7 items-start group"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                >
                  {/* Step number with glow */}
                  <div className="flex-shrink-0 relative z-10">
                    <motion.div
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-familia-500 to-heart-500 flex items-center justify-center shadow-lg shadow-familia-500/20 group-hover:shadow-familia-500/40 transition-shadow duration-500"
                      whileInView={{ scale: [0.8, 1.05, 1] }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 + 0.2, duration: 0.5 }}
                    >
                      <span className="text-xl sm:text-2xl">{item.emoji}</span>
                    </motion.div>
                    {/* Glow behind step */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-familia-500 to-heart-500 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500" />
                  </div>

                  {/* Content card */}
                  <div className="flex-1 pb-8 sm:pb-10">
                    <div className="glass-card !p-4 sm:!p-5 group-hover:border-white/[0.1] transition-all duration-300">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] sm:text-xs text-familia-400 font-bold tracking-widest uppercase">Step {item.step}</span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold mb-1.5 text-white/90">{item.title}</h3>
                      <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          EMOTIONAL STORIES
          ═══════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-0 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-heart-500/[0.04] to-transparent blur-3xl" />
          <div className="absolute top-1/2 right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-l from-bond-500/[0.04] to-transparent blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto relative">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <motion.span
              className="inline-flex items-center gap-2 text-sm font-semibold text-heart-400 bg-heart-500/10 border border-heart-500/15 rounded-full px-4 py-1.5 mb-5"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Heart className="w-3.5 h-3.5" />
              Real Stories, Real Hearts
            </motion.span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">
              <span className="text-white/90">Every Bond Tells a</span>{' '}
              <span className="gradient-text text-glow">Beautiful Story</span>
            </h2>
            <p className="text-white/40 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              These aren&apos;t just connections — they&apos;re lives transformed, hearts healed, 
              and families reborn across oceans and languages.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {EMOTIONAL_STORIES.map((story, i) => (
              <motion.div
                key={story.author}
                className="relative group"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
              >
                {/* Card glow on hover */}
                <div className={`absolute -inset-1 rounded-[1.5rem] bg-gradient-to-br ${story.color} opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500`} />
                
                <div className="relative glass-card !p-6 sm:!p-7 h-full transition-all duration-300 group-hover:border-white/[0.12] group-hover:-translate-y-1">
                  {/* Quote icon */}
                  <Quote className="w-8 h-8 text-familia-500/20 mb-4" />
                  
                  {/* Story quote */}
                  <p className="text-white/60 text-sm sm:text-[15px] leading-relaxed mb-6 italic">
                    &ldquo;{story.quote}&rdquo;
                  </p>
                  
                  {/* Author info */}
                  <div className="flex items-center gap-3 mt-auto">
                    <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${story.color} flex items-center justify-center text-xl`}>
                      {story.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-white/90 text-sm flex items-center gap-1.5">
                        {story.author}
                        <span>{story.flag}</span>
                      </div>
                      <div className="text-xs text-white/40">{story.role} · {story.location}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Emotional statement */}
          <motion.div
            className="text-center mt-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-2xl sm:text-3xl font-bold text-white/80 max-w-3xl mx-auto leading-snug">
              In a world where <span className="text-heart-400">8 billion hearts</span> beat, 
              no one should beat <span className="text-white/40">alone</span>.
            </p>
            <p className="text-white/30 text-base mt-4">
              Every stranger is just a family member you haven&apos;t met yet.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          CTA SECTION
          ═══════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6">
        <motion.div
          className="max-w-4xl mx-auto relative"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          {/* Dramatic glow */}
          <div className="absolute -inset-6 bg-gradient-to-r from-familia-500/10 via-heart-500/10 to-bond-500/10 rounded-[2rem] blur-3xl opacity-60" />

          <div className="relative rounded-[1.75rem] overflow-hidden border border-white/[0.08]">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-familia-500/[0.12] via-heart-500/[0.08] to-bond-500/[0.12]" />
            <div className="absolute inset-0 bg-[#0A0A1A]/70" />

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-familia-500/10 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-bond-500/10 to-transparent rounded-full blur-3xl" />

            <div className="relative z-10 py-14 sm:py-20 px-6 sm:px-12 text-center">
              {/* Globe animation */}
              <motion.div
                className="text-6xl sm:text-7xl mb-8 inline-block"
                animate={{
                  scale: [1, 1.12, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                🌍
              </motion.div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-5 leading-tight">
                Ready to Find Your{' '}
                <br className="hidden sm:block" />
                <span className="gradient-text text-glow">Global Family</span>?
              </h2>

              {/* Testimonial quote */}
              <motion.div
                className="max-w-xl mx-auto mb-10"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <div className="relative">
                  <Quote className="w-6 h-6 text-familia-500/30 absolute -top-2 -left-2" />
                  <p className="text-white/50 text-base sm:text-lg italic leading-relaxed px-4">
                    Maria from Brazil became the mother I always needed. We speak different languages, but Familia made us understand each other&apos;s hearts.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 mt-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-familia-500/30 to-heart-500/30 flex items-center justify-center text-sm">
                    👦
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-white/70">Raj K.</div>
                    <div className="text-xs text-white/30">Mumbai, India 🇮🇳</div>
                  </div>
                </div>
              </motion.div>

              <Link href="/signup">
                <motion.button
                  className="btn-primary text-lg sm:text-xl px-10 sm:px-14 py-5 inline-flex items-center gap-3 shadow-2xl shadow-familia-500/25"
                  whileHover={{ scale: 1.05, boxShadow: '0 25px 80px rgba(255,107,53,0.35)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Heart className="w-5 h-5 sm:w-6 sm:h-6" />
                  Start Your Journey
                  <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </motion.button>
              </Link>

              <p className="text-white/25 text-sm mt-5">Free forever · No credit card needed</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════ */}
      <footer className="pt-16 pb-10 px-4 sm:px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-familia-500 to-heart-500 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-black">Familia</span>
              </div>
              <p className="text-white/30 text-sm leading-relaxed">
                Real people. Real bonds.<br />No borders.
              </p>
            </div>

            {/* Platform */}
            <div>
              <h4 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Platform</h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'Matching', href: '/matching' },
                  { label: 'Chat', href: '/dashboard' },
                  { label: 'Games', href: '/games' },
                  { label: 'Contests', href: '/contests' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-white/30 hover:text-white/60 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Community */}
            <div>
              <h4 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Community</h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'Family Rooms', href: '/family-rooms' },
                  { label: 'Profiles', href: '/profile' },
                  { label: 'Leaderboard', href: '/contests' },
                  { label: 'Stories', href: '#' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-white/30 hover:text-white/60 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Legal</h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'Privacy', href: '#' },
                  { label: 'Terms', href: '#' },
                  { label: 'Safety', href: '#' },
                  { label: 'Contact', href: '#' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-white/30 hover:text-white/60 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-white/25">
              <Globe className="w-3.5 h-3.5" />
              <span>© 2026 Familia. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-white/25">
              Made with <Heart className="w-3.5 h-3.5 text-heart-500/60 mx-0.5" /> for a borderless world
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
