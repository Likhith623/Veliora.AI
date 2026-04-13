"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ArrowLeft, Globe, Heart, Shield, Star, Flame, Trophy, Medal,
  Languages, MapPin, Calendar, Settings, LogOut, Edit, ChevronRight,
  Sparkles, Users, Award, Zap, Loader2, X, Plus, Trash2, Bell,
  BellOff, Eye, EyeOff, Lock, Volume2, VolumeX, Check, Moon, Sun
} from "lucide-react";
import { LEVEL_NAMES } from "@/types";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_emoji: string;
  earned_at?: string;
}

const DEFAULT_ACHIEVEMENTS = [
  { id: "first-bond", icon_emoji: "🤝", name: "First Bond", description: "Made your first connection", earned: false },
  { id: "polyglot", icon_emoji: "🌐", name: "Polyglot", description: "Chat in 3+ languages", earned: false },
  { id: "loyal-friend", icon_emoji: "💎", name: "Loyal Friend", description: "30-day streak with a bond", earned: false },
  { id: "culture-chef", icon_emoji: "🍳", name: "Culture Chef", description: "Share 5 recipes", earned: false },
  { id: "storyteller", icon_emoji: "📖", name: "Storyteller", description: "Share 10 cultural stories", earned: false },
  { id: "quiz-master", icon_emoji: "🧠", name: "Quiz Master", description: "Win 10 bond contests", earned: false },
  { id: "global-heart", icon_emoji: "❤️", name: "Global Heart", description: "Care score above 75", earned: false },
  { id: "world-family", icon_emoji: "🌍", name: "World Family", description: "Bonds in 5+ countries", earned: false },
];

const AVAILABLE_LANGUAGES = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese",
  "Chinese", "Japanese", "Korean", "Hindi", "Arabic", "Russian",
  "Turkish", "Dutch", "Swedish", "Polish", "Thai", "Vietnamese",
  "Indonesian", "Malay", "Swahili", "Tamil", "Telugu", "Bengali",
  "Urdu", "Persian", "Hebrew", "Greek", "Czech", "Romanian",
];

type SettingsPanel = null | "language" | "privacy" | "notifications" | "translation";

export default function ProfilePage() {
  const { user, relationships, logout, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [achievements, setAchievements] = useState<any[]>(DEFAULT_ACHIEVEMENTS);
  const [isLoading, setIsLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<SettingsPanel>(null);

  // Settings states
  const [userLanguages, setUserLanguages] = useState<string[]>([]);
  const [newLang, setNewLang] = useState("");
  const [langSearch, setLangSearch] = useState("");
  const [savingLang, setSavingLang] = useState(false);

  // Privacy settings (local state, synced to profile)
  const [privacySettings, setPrivacySettings] = useState({
    showOnlineStatus: true,
    showLocation: true,
    allowMatching: true,
    profileVisibility: "public" as "public" | "bonds-only" | "private",
  });

  // Notification settings
  const [notifSettings, setNotifSettings] = useState({
    newMessages: true,
    matchRequests: true,
    bondUpdates: true,
    contests: true,
    systemAlerts: true,
    sounds: true,
  });

  // Translation settings
  const [translationSettings, setTranslationSettings] = useState({
    autoTranslate: true,
    preferredLanguage: "English",
    showOriginal: true,
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) { setIsLoading(false); return; }
      try {
        await refreshUser();
        setUserLanguages(user.languages || []);
        // Load saved settings from localStorage
        const savedPrivacy = localStorage.getItem("familia_privacy");
        if (savedPrivacy) setPrivacySettings(JSON.parse(savedPrivacy));
        const savedNotif = localStorage.getItem("familia_notif_settings");
        if (savedNotif) setNotifSettings(JSON.parse(savedNotif));
        const savedTranslation = localStorage.getItem("familia_translation");
        if (savedTranslation) setTranslationSettings(JSON.parse(savedTranslation));
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, [user?.id]);

  useEffect(() => {
    if (user?.languages) setUserLanguages(user.languages);
  }, [user?.languages]);

  const handleLogout = () => {
    logout();
    toast.success("Signed out successfully");
    window.location.href = "/";
  };

  const handleAddLanguage = async (lang: string) => {
    if (!user?.id || userLanguages.includes(lang)) return;
    setSavingLang(true);
    try {
      await api.addLanguage(user.id, { language_code: lang, language_name: lang, proficiency: "intermediate" });
      setUserLanguages(prev => [...prev, lang]);
      await refreshUser();
      toast.success(`Added ${lang}`);
      setLangSearch("");
    } catch (err: any) {
      toast.error(err.message || "Failed to add language");
    } finally {
      setSavingLang(false);
    }
  };

  const handleRemoveLanguage = async (lang: string) => {
    if (!user?.id) return;
    try {
      await api.removeLanguage(user.id, lang);
      setUserLanguages(prev => prev.filter(l => l !== lang));
      await refreshUser();
      toast.success(`Removed ${lang}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove language");
    }
  };

  const savePrivacySettings = (settings: typeof privacySettings) => {
    setPrivacySettings(settings);
    localStorage.setItem("familia_privacy", JSON.stringify(settings));
    toast.success("Privacy settings saved");
  };

  const saveNotifSettings = (settings: typeof notifSettings) => {
    setNotifSettings(settings);
    localStorage.setItem("familia_notif_settings", JSON.stringify(settings));
    toast.success("Notification settings saved");
  };

  const saveTranslationSettings = (settings: typeof translationSettings) => {
    setTranslationSettings(settings);
    localStorage.setItem("familia_translation", JSON.stringify(settings));
    toast.success("Translation settings saved");
  };

  const filteredLanguages = AVAILABLE_LANGUAGES.filter(
    l => l.toLowerCase().includes(langSearch.toLowerCase()) && !userLanguages.includes(l)
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-familia-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass-card max-w-md">
          <h2 className="text-xl font-bold mb-2">Not logged in</h2>
          <p className="text-muted mb-4">Please log in to view your profile</p>
          <Link href="/login" className="btn-primary inline-flex items-center gap-2">
            Sign In <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      </div>
    );
  }

  const joinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "Recently";

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 glass border-b border-themed z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <motion.button className="p-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition" whileTap={{ scale: 0.95 }}>
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
            </Link>
            <h1 className="font-bold text-lg">My Profile</h1>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition"
              whileTap={{ scale: 0.9 }}
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </motion.button>
            <Link href="/avatar">
              <motion.button
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-familia-500/10 to-heart-500/10 text-familia-400 text-xs flex items-center gap-1.5 hover:from-familia-500/20 hover:to-heart-500/20 transition border border-familia-500/20"
                whileTap={{ scale: 0.95 }}
              >
                <Sparkles className="w-3 h-3" /> Edit Avatar
              </motion.button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* ── Profile Card ── */}
        <motion.div className="glass-card relative overflow-hidden mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="absolute inset-0 bg-gradient-to-br from-familia-500/5 via-transparent to-heart-500/5" />
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-familia-500/[0.06] to-transparent rounded-t-2xl" />
          <div className="relative z-10 flex items-center gap-6">
            <Link href="/avatar">
              <div className="relative group cursor-pointer">
                <div className="avatar-ring">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-familia-500 to-bond-500 flex items-center justify-center text-4xl font-bold shadow-glow-sm group-hover:shadow-glow-md transition-shadow duration-300">
                    {user.display_name?.[0] || "R"}
                  </div>
                </div>
                {user.is_verified && (
                  <motion.div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center border-2 border-[var(--bg-primary)]" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.3 }}>
                    <Shield className="w-3.5 h-3.5 text-white" />
                  </motion.div>
                )}
                <div className="absolute inset-0 rounded-2xl bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <Edit className="w-5 h-5 text-white" />
                </div>
              </div>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold">{user.display_name}</h2>
                {user.is_verified && <span className="badge-verified text-xs">✅ Verified</span>}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted mb-2">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {user.city || user.country}, {user.country}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Joined {joinedDate}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(userLanguages.length > 0 ? userLanguages : ["Not set"]).map(lang => (
                  <span key={lang} className="text-[10px] px-2 py-1 rounded-full bg-familia-500/10 text-familia-300 border border-familia-500/20">
                    🌐 {lang}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Care Score", value: user.care_score ?? 0, icon: <Heart className="w-4 h-4" />, color: "text-heart-400", bg: "bg-heart-500/10", border: "border-heart-500/10" },
            { label: "Bond Points", value: user.total_bond_points ?? 0, icon: <Zap className="w-4 h-4" />, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/10" },
            { label: "Reliability", value: `${user.reliability_score ?? 100}%`, icon: <Shield className="w-4 h-4" />, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/10" },
            { label: "Best Streak", value: `${relationships.reduce((max, r) => Math.max(max, r.streak_days || 0), 0)} days`, icon: <Flame className="w-4 h-4" />, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/10" },
          ].map((stat, i) => (
            <motion.div key={stat.label} className={`glass-card !p-4 text-center border ${stat.border}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} whileHover={{ y: -2, transition: { duration: 0.2 } }}>
              <div className={`w-10 h-10 mx-auto mb-2 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color}`}>{stat.icon}</div>
              <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] text-muted">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* ── Active Bonds ── */}
        <motion.div className="glass-card mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-bond-400" /> Active Bonds
            </h3>
            <Link href="/matching" className="text-xs text-familia-400 hover:text-familia-300 flex items-center gap-1">
              Find more <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {relationships.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No bonds yet</p>
                <Link href="/matching" className="text-xs text-familia-400 hover:underline">Start connecting →</Link>
              </div>
            ) : (
              relationships.slice(0, 3).map(bond => (
                <Link key={bond.id} href={`/chat/${bond.id}`}>
                  <motion.div className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-card-hover)] transition cursor-pointer group" whileHover={{ x: 2 }}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-familia-500 to-bond-500 flex items-center justify-center text-lg group-hover:shadow-glow-sm transition-shadow">
                      {bond.partner?.display_name?.[0] || "👤"}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{bond.partner?.display_name || "Unknown"}</div>
                      <div className="text-xs text-muted">{bond.partner?.country || "Unknown"} • Your {bond.my_role}</div>
                    </div>
                    <div className="text-right">
                      <div className="badge-level text-[10px]">Lv.{bond.level} {LEVEL_NAMES[bond.level] || "Stranger"}</div>
                      <div className="text-[10px] text-orange-400 flex items-center gap-1 justify-end mt-0.5">
                        <Flame className="w-3 h-3" /> {bond.streak_days || 0}d
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))
            )}
          </div>
        </motion.div>

        {/* ── Achievements ── */}
        <motion.div className="glass-card mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="font-bold flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-amber-400" /> Achievements
            <span className="text-xs text-muted ml-auto">{achievements.filter(a => a.earned_at || a.earned).length}/{achievements.length}</span>
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {achievements.map((ach, i) => {
              const earned = ach.earned_at || ach.earned;
              return (
                <motion.div key={ach.id} className={`text-center p-2 rounded-xl transition-all ${earned ? "bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10" : "bg-[var(--bg-card)] border border-themed opacity-40 grayscale"}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: earned ? 1 : 0.4, scale: 1 }} transition={{ delay: 0.3 + i * 0.05 }} whileHover={earned ? { scale: 1.05, y: -2 } : {}}>
                  <div className="text-2xl mb-1">{ach.icon_emoji}</div>
                  <div className="text-[10px] font-medium">{ach.name}</div>
                  <div className="text-[8px] text-muted">{ach.description}</div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Settings ── */}
        <motion.div className="glass-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h3 className="font-bold flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-muted" /> Settings
          </h3>
          <div className="space-y-1">
            {[
              { id: "language" as SettingsPanel, icon: <Globe className="w-4 h-4" />, label: "Language Preferences", desc: `${userLanguages.length} languages set` },
              { id: "privacy" as SettingsPanel, icon: <Shield className="w-4 h-4" />, label: "Privacy & Safety", desc: `Profile: ${privacySettings.profileVisibility}` },
              { id: "notifications" as SettingsPanel, icon: <Bell className="w-4 h-4" />, label: "Notification Settings", desc: "Manage alerts" },
              { id: "translation" as SettingsPanel, icon: <Languages className="w-4 h-4" />, label: "Translation Settings", desc: translationSettings.autoTranslate ? "Auto-translate on" : "Manual" },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActivePanel(activePanel === item.id ? null : item.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition text-left group ${activePanel === item.id ? "bg-familia-500/5 border border-familia-500/10" : "hover:bg-[var(--bg-card-hover)]"}`}
              >
                <span className={`transition ${activePanel === item.id ? "text-familia-400" : "text-muted group-hover:text-[var(--text-secondary)]"}`}>{item.icon}</span>
                <div className="flex-1">
                  <span className="text-sm block">{item.label}</span>
                  <span className="text-[10px] text-muted">{item.desc}</span>
                </div>
                <ChevronRight className={`w-4 h-4 text-subtle transition-transform ${activePanel === item.id ? "rotate-90 text-familia-400" : "group-hover:translate-x-0.5"}`} />
              </button>
            ))}

            {/* Expandable Settings Panels */}
            <AnimatePresence>
              {activePanel === "language" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="p-4 mt-2 rounded-xl bg-[var(--bg-card)] border border-themed space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Your Languages</h4>
                      <button onClick={() => setActivePanel(null)} className="p-1 rounded hover:bg-[var(--bg-card-hover)]"><X className="w-4 h-4 text-muted" /></button>
                    </div>
                    {/* Current languages */}
                    <div className="flex flex-wrap gap-2">
                      {userLanguages.length === 0 ? (
                        <p className="text-xs text-muted">No languages added yet</p>
                      ) : (
                        userLanguages.map(lang => (
                          <motion.div key={lang} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-familia-500/10 border border-familia-500/20 text-sm" layout>
                            <span>🌐 {lang}</span>
                            <button onClick={() => handleRemoveLanguage(lang)} className="p-0.5 hover:bg-red-500/20 rounded-full transition">
                              <X className="w-3 h-3 text-red-400" />
                            </button>
                          </motion.div>
                        ))
                      )}
                    </div>
                    {/* Add language */}
                    <div>
                      <input
                        type="text"
                        value={langSearch}
                        onChange={e => setLangSearch(e.target.value)}
                        placeholder="Search languages..."
                        className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-themed text-sm focus:outline-none focus:border-familia-500/50 placeholder:text-muted"
                      />
                      {langSearch && (
                        <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                          {filteredLanguages.slice(0, 8).map(lang => (
                            <button
                              key={lang}
                              onClick={() => handleAddLanguage(lang)}
                              disabled={savingLang}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-familia-500/5 text-sm text-left transition"
                            >
                              <Plus className="w-3 h-3 text-familia-400" />
                              {lang}
                            </button>
                          ))}
                          {filteredLanguages.length === 0 && <p className="text-xs text-muted px-3 py-2">No matching languages</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activePanel === "privacy" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="p-4 mt-2 rounded-xl bg-[var(--bg-card)] border border-themed space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Privacy & Safety</h4>
                      <button onClick={() => setActivePanel(null)} className="p-1 rounded hover:bg-[var(--bg-card-hover)]"><X className="w-4 h-4 text-muted" /></button>
                    </div>
                    {/* Profile Visibility */}
                    <div>
                      <label className="text-xs text-muted block mb-2">Profile Visibility</label>
                      <div className="flex gap-2">
                        {(["public", "bonds-only", "private"] as const).map(vis => (
                          <button
                            key={vis}
                            onClick={() => savePrivacySettings({ ...privacySettings, profileVisibility: vis })}
                            className={`px-3 py-1.5 rounded-lg text-xs capitalize transition border ${privacySettings.profileVisibility === vis ? "bg-familia-500/10 border-familia-500/30 text-familia-400" : "border-themed hover:bg-[var(--bg-card-hover)] text-muted"}`}
                          >
                            {vis === "bonds-only" ? "Bonds Only" : vis}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Toggle items */}
                    {[
                      { key: "showOnlineStatus", label: "Show Online Status", icon: <Eye className="w-4 h-4" />, offIcon: <EyeOff className="w-4 h-4" /> },
                      { key: "showLocation", label: "Show Location", icon: <MapPin className="w-4 h-4" />, offIcon: <MapPin className="w-4 h-4" /> },
                      { key: "allowMatching", label: "Allow Matching", icon: <Users className="w-4 h-4" />, offIcon: <Lock className="w-4 h-4" /> },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted">{(privacySettings as any)[item.key] ? item.icon : item.offIcon}</span>
                          {item.label}
                        </div>
                        <button
                          onClick={() => savePrivacySettings({ ...privacySettings, [item.key]: !(privacySettings as any)[item.key] })}
                          className={`w-10 h-6 rounded-full transition-colors relative ${(privacySettings as any)[item.key] ? "bg-familia-500" : "bg-gray-600"}`}
                        >
                          <motion.div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow" animate={{ left: (privacySettings as any)[item.key] ? 18 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activePanel === "notifications" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="p-4 mt-2 rounded-xl bg-[var(--bg-card)] border border-themed space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Notification Settings</h4>
                      <button onClick={() => setActivePanel(null)} className="p-1 rounded hover:bg-[var(--bg-card-hover)]"><X className="w-4 h-4 text-muted" /></button>
                    </div>
                    {[
                      { key: "newMessages", label: "New Messages", icon: "💬" },
                      { key: "matchRequests", label: "Match Requests", icon: "🤝" },
                      { key: "bondUpdates", label: "Bond Updates", icon: "💫" },
                      { key: "contests", label: "Contests & Games", icon: "🏆" },
                      { key: "systemAlerts", label: "System Alerts", icon: "🔔" },
                      { key: "sounds", label: "Notification Sounds", icon: "🔊" },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-base">{item.icon}</span>
                          {item.label}
                        </div>
                        <button
                          onClick={() => saveNotifSettings({ ...notifSettings, [item.key]: !(notifSettings as any)[item.key] })}
                          className={`w-10 h-6 rounded-full transition-colors relative ${(notifSettings as any)[item.key] ? "bg-familia-500" : "bg-gray-600"}`}
                        >
                          <motion.div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow" animate={{ left: (notifSettings as any)[item.key] ? 18 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activePanel === "translation" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="p-4 mt-2 rounded-xl bg-[var(--bg-card)] border border-themed space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Translation Settings</h4>
                      <button onClick={() => setActivePanel(null)} className="p-1 rounded hover:bg-[var(--bg-card-hover)]"><X className="w-4 h-4 text-muted" /></button>
                    </div>
                    {/* Preferred Language */}
                    <div>
                      <label className="text-xs text-muted block mb-2">Preferred Translation Language</label>
                      <select
                        value={translationSettings.preferredLanguage}
                        onChange={e => saveTranslationSettings({ ...translationSettings, preferredLanguage: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-themed text-sm focus:outline-none focus:border-familia-500/50"
                      >
                        {AVAILABLE_LANGUAGES.map(lang => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>
                    </div>
                    {/* Toggles */}
                    {[
                      { key: "autoTranslate", label: "Auto-Translate Messages" },
                      { key: "showOriginal", label: "Show Original Text" },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between py-1.5">
                        <span className="text-sm">{item.label}</span>
                        <button
                          onClick={() => saveTranslationSettings({ ...translationSettings, [item.key]: !(translationSettings as any)[item.key] })}
                          className={`w-10 h-6 rounded-full transition-colors relative ${(translationSettings as any)[item.key] ? "bg-familia-500" : "bg-gray-600"}`}
                        >
                          <motion.div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow" animate={{ left: (translationSettings as any)[item.key] ? 18 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/5 transition text-left text-red-400/60 hover:text-red-400 mt-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
