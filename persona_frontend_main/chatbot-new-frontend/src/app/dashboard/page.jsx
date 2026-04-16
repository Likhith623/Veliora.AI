"use client";

import React, { useEffect, useState } from "react";
import MentalHealthDashboard from "@/components/MentalHealthDashboard";
import { createClient } from "@supabase/supabase-js";

// Use public keys just to fetch the current user's ID safely
// Adjust this to how you normally get the user in your app!
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default function DashboardPage() {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) {
        setUserId(data.user.id);
      } else {
        // Fallback for local testing if no session exists yet
        const storedId = localStorage.getItem("userId");
        if(storedId) setUserId(storedId);
      }
    });
  }, []);

  return (
    <div className="bg-black min-h-screen text-white font-sans selection:bg-purple-500/30">
      <div className="relative pt-8 pb-16">
        <MentalHealthDashboard userId={userId} />
      </div>
    </div>
  );
}