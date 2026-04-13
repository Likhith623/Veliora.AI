"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Globe, Eye, EyeOff, ArrowRight, Sparkles, MapPin, Calendar, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import toast from "react-hot-toast";

const COUNTRIES = [
  "India","Brazil","Japan","Germany","Korea","Mexico","Italy","Kenya",
  "France","Vietnam","Thailand","Spain","Turkey","Russia","China",
  "United States","United Kingdom","Canada","Australia","Nigeria",
  "Egypt","Indonesia","Philippines","Bangladesh","Pakistan",
  "Argentina","Colombia","South Africa","Saudi Arabia","Netherlands",
];

const FLOATING = ["🌍","🤝","💕","🌏","✨","🌎"];

export default function SignUpPage() {
  const { signup } = useAuth();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    username: "", display_name: "", email: "", password: "",
    date_of_birth: "", gender: "", country: "", city: "", timezone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    
    try {
      // Detect timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      await signup({
        username: form.username,
        display_name: form.display_name,
        email: form.email,
        password: form.password,
        date_of_birth: form.date_of_birth,
        gender: form.gender || undefined,
        country: form.country,
        city: form.city || undefined,
        timezone: timezone,
      });
      
      toast.success("Welcome to Familia! 🎉");
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err.message || "Failed to create account. Please try again.");
      toast.error(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Floating emojis */}
      {FLOATING.map((emoji, i) => (
        <motion.div
          key={i}
          className="absolute text-3xl opacity-[0.06] pointer-events-none select-none"
          style={{ left: `${8 + i * 16}%`, top: `${12 + (i % 3) * 28}%` }}
          animate={{ y: [0, -25, 0], rotate: [0, i % 2 === 0 ? 15 : -15, 0] }}
          transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
        >
          {emoji}
        </motion.div>
      ))}

      <motion.div className="w-full max-w-md relative z-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <motion.div
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-familia-500 to-heart-500 flex items-center justify-center shadow-lg shadow-familia-500/20"
              whileHover={{ rotate: [0, -10, 10, 0] }}
            >
              <Globe className="w-5 h-5 text-white" />
            </motion.div>
            <span className="text-2xl font-bold">Familia</span>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Join the Family 🌍</h1>
          <p className="text-muted">Create your account to start connecting</p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2].map((s) => (
            <motion.div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                s <= step ? "bg-gradient-to-r from-familia-500 to-heart-500" : "bg-[var(--bg-card-hover)]"
              }`}
              initial={s <= step ? { scaleX: 0 } : {}}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.4, delay: s * 0.1 }}
            />
          ))}
        </div>

        <div className="glass-card">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">📝 Basic Info</h2>

              <div>
                <label className="text-sm text-muted mb-1 block">Display Name</label>
                <input name="display_name" value={form.display_name} onChange={handleChange} placeholder="How should we call you?" className="input-familia" />
              </div>
              <div>
                <label className="text-sm text-muted mb-1 block">Username</label>
                <input name="username" value={form.username} onChange={handleChange} placeholder="Choose a unique username" className="input-familia" />
              </div>
              <div>
                <label className="text-sm text-muted mb-1 block">Email</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="your@email.com" className="input-familia" />
              </div>
              <div>
                <label className="text-sm text-muted mb-1 block">Password</label>
                <div className="relative">
                  <input name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={handleChange} placeholder="Create a strong password" className="input-familia pr-12" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[var(--text-primary)]">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <motion.button
                onClick={() => setStep(2)}
                className="btn-primary w-full flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={!form.display_name || !form.email || !form.password}
              >
                Continue <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">🌍 Where Are You From?</h2>

              <div>
                <label className="text-sm text-muted mb-1 block">Date of Birth</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} className="input-familia pl-10" />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted mb-1 block">Country</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <select name="country" value={form.country} onChange={handleChange} className="input-familia pl-10 appearance-none">
                    <option value="">Select your country</option>
                    {COUNTRIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted mb-1 block">City (optional)</label>
                <input name="city" value={form.city} onChange={handleChange} placeholder="Your city" className="input-familia" />
              </div>
              <div>
                <label className="text-sm text-muted mb-1 block">Gender (optional)</label>
                <select name="gender" value={form.gender} onChange={handleChange} className="input-familia appearance-none">
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Error message */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-sm text-center"
                >
                  {error}
                </motion.p>
              )}

              <div className="flex gap-3">
                <motion.button onClick={() => setStep(1)} className="btn-secondary flex-1 flex items-center justify-center gap-1" whileTap={{ scale: 0.98 }}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </motion.button>
                <motion.button
                  onClick={handleSubmit}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading || !form.country || !form.date_of_birth}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Create Account</>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>

        <p className="text-center text-muted text-sm mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-familia-400 hover:text-familia-300 font-medium">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
