"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Globe, Eye, EyeOff, ArrowRight, Shield, Heart, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import toast from "react-hot-toast";

const FLOATING_FLAGS = ["🇮🇳", "🇧🇷", "🇯🇵", "🇰🇪", "🇩🇪", "🇲🇽"];

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      await login(form.email, form.password);
      toast.success("Welcome back to Familia!");
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Login failed. Please check your credentials.");
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    // Use a test account for demo - this requires the backend to be running
    // and the test user to exist in the database
    setLoading(true);
    setError("");
    
    try {
      // Try to login with a demo account
      await login("demo@familia.app", "demo123456");
      toast.success("Demo mode activated!");
      window.location.href = "/dashboard";
    } catch (err: any) {
      // If demo account doesn't exist, show a friendly message
      setError("Demo account not available. Please sign up for a new account.");
      toast.error("Demo account not found. Please create an account.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Floating flags */}
      {FLOATING_FLAGS.map((flag, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl opacity-[0.08] pointer-events-none select-none"
          style={{
            left: `${10 + i * 15}%`,
            top: `${15 + (i % 3) * 25}%`,
          }}
          animate={{
            y: [0, -20, 0],
            rotate: [0, i % 2 === 0 ? 10 : -10, 0],
          }}
          transition={{
            duration: 5 + i,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {flag}
        </motion.div>
      ))}

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo & Heading */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6 group">
            <motion.div
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-familia-500 to-heart-500 flex items-center justify-center shadow-lg shadow-familia-500/20 group-hover:shadow-familia-500/30 transition-shadow"
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <Globe className="w-5 h-5 text-white" />
            </motion.div>
            <span className="text-2xl font-bold tracking-tight">Familia</span>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Welcome Back 👋</h1>
          <p className="text-muted">Your global family is waiting for you</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="glass-card space-y-5">
          <div>
            <label className="text-sm text-muted mb-1.5 block font-medium">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="your@email.com"
              className="input-familia"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm text-muted font-medium">Password</label>
              <button type="button" className="text-xs text-familia-400 hover:text-familia-300 transition">
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Your password"
                className="input-familia pr-12"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[var(--text-secondary)] transition"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            className="btn-primary w-full flex items-center justify-center gap-2 !py-3.5"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Sign In <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>

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

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-themed" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-[var(--bg-primary)] text-subtle">or try instantly</span>
            </div>
          </div>

          {/* Demo button */}
          <motion.button
            type="button"
            onClick={handleDemo}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-themed bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-muted hover:text-[var(--text-secondary)] transition-all text-sm font-medium"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Sparkles className="w-4 h-4 text-familia-400" />
            Explore Demo (as Raj Patel 🇮🇳)
          </motion.button>
        </form>

        {/* Social proof */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-subtle">
          <span className="flex items-center gap-1.5"><Shield className="w-3 h-3" /> Verified humans only</span>
          <span className="flex items-center gap-1.5"><Heart className="w-3 h-3" /> 12K+ bonds formed</span>
        </div>

        <p className="text-center text-muted text-sm mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-familia-400 hover:text-familia-300 font-medium transition">
            Join Familia
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
