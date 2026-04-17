"use client";

import React, { useEffect, useState } from "react";
import MentalHealthDashboard from "@/components/MentalHealthDashboard";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default function DashboardPage() {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUserId = async () => {
      let uid = null;
      if (supabase) {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.id) {
          uid = data.user.id;
        }
      }
      
      // Fallback for Veliora local storage integration
      if (!uid) {
        const storedUser = localStorage.getItem("userDetails");
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            if (parsed.id) uid = parsed.id;
          } catch (e) {
             console.error("Failed to parse userDetails", e);
          }
        }
      }
      
      setUserId(uid || "guest");
    };

    fetchUserId();
  }, []);

  return (
    <div className="min-h-screen font-sans selection:bg-purple-500/30 transition-colors duration-500">
      <div className="relative pt-8 pb-16">
        <MentalHealthDashboard userId={userId} />
      </div>
    </div>
  );
}
