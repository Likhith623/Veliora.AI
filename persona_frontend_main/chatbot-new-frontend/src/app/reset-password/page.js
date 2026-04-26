"use client";
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../supabaseClient.js";
import Head from "next/head";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if the user is already logged in
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        // If the user is already logged in, redirect them back to the previous page
        router.back(); // Go back to the previous page
      }
    };

    checkSession();
  }, [router]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw new Error(error.message);

      setSuccess(true);
      setTimeout(() => {
        router.push("/signup");
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Veliora | Reset Password – Reconnect with VELIORA</title>
        <meta
          name="description"
          content="Reset your password to reconnect with your voice-enabled AI companion and AI best friend you can vibe with. This AI bestie for late-night overthinking is also a Gen Z AI chatbot and an emotional support AI ready for real convos."
        />
        <meta
          name="keywords"
          content="Voice-enabled AI companion, AI best friend you can vibe with, AI bestie for late-night overthinking, Gen Z AI chatbot, Emotional support AI, AI chatbot that remembers convos"
        />
        <meta
          property="og:title"
          content="Reset Password – Reconnect with VELIORA | Veliora"
        />
        <meta
          property="og:description"
          content="Forgot your password? Reset now and continue chatting with VELIORA—your nightly companion for comfort, support, and real connection."
        />
        <meta
          property="og:url"
          content="http://localhost:3000/reset-password"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="relative w-full h-screen bg-gray-100 overflow-hidden">
        <div className="fixed inset-0 z-0">
          <div className="absolute w-[700px] h-[700px] bg-pink-300 rounded-full blur-[150px] top-10 left-1/4 opacity-50"></div>
          <div className="absolute w-[500px] h-[500px] bg-orange-300 rounded-full blur-[150px] bottom-10 left-1/4 opacity-50"></div>
          <div className="absolute w-[500px] h-[500px] bg-pink-300 rounded-full blur-[150px] top-10 right-1/4 opacity-50"></div>
          <div className="absolute w-[500px] h-[500px] bg-orange-300 rounded-full blur-[150px] bottom-10 right-1/4 opacity-50"></div>
        </div>
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-red-100 shadow-md p-8 rounded-lg w-full max-w-md z-50">
            <h2 className="text-2xl font-bold text-black mb-4">
              Reset Password
            </h2>
            {success ? (
              <p className="text-green-500">Password reset successfully!</p>
            ) : (
              <form onSubmit={handleResetPassword}>
                <div className="mb-4">
                  <label htmlFor="password" className="block text-black mb-1">
                    New Password
                  </label>
                  <input
                    className="w-full p-2 borderborder border-gray-500 bg-white text-black rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                    id="password"
                    type="password"
                    placeholder="enter password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error && <p className="text-red-500 mb-4">{error}</p>}
                <button
                  type="submit"
                  className={`w-full justify-center py-2 px-4 bg-gradient-to-r from-orange-400/80 via-pink-400/80 to-purple-400/80 
      hover:from-orange-400/90 hover:via-pink-400/90 hover:to-purple-400/90 backdrop-blur-md 
      text-white font-medium text-lg rounded mt-2 shadow-md transition-all ${
        loading ? "opacity-50" : ""
      }`}
                  disabled={loading}
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
