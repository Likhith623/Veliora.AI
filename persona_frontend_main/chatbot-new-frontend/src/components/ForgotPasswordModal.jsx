"use client";
import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";

export default function ForgotPasswordModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Fetch user by email
      const { data: user, error: userError } = await supabase
        .from("user_details") // Supabase stores users in "auth.users" but we query "users" table if using a public copy
        .select("id, email, auth_provider")
        .eq("email", email)
        .single();

      if (userError || !user) {
        throw new Error("User not found. Please check your email.");
      }

      // Check if the provider is email
      if (user?.auth_provider !== "email") {
        throw new Error("Please log in with Google.");
      }

      // Proceed with password reset if provider is email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw new Error(error.message);

      setSuccess(true); // Show success message
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center  z-50">
      <div className=" bg-red-100 shadow-md p-8 rounded-lg w-full max-w-lg">
        <div className="flex justify-between mb-4">
          <h2 className="text-2xl text-black font-bold ">Forgot Password</h2>
          <button
            className=" text-amber-600 cursor-pointer"
            onClick={onClose}
          >Close</button>
        </div>
        {success ? (
          <p className="text-green-500">
            A password reset link has been sent to your email.
          </p>
        ) : (
          <form onSubmit={handleResetPassword}>
            <LabelInputContainer className="mb-4">
              <Label htmlFor="email" className="mb-1 text-slate-700">
                Email Address
              </Label>
              <Input
                className="border bg-white text-black rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                id="email"
                placeholder="projectmayhem@fc.com"
                type="email"
                required={true}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </LabelInputContainer>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <button
              type="submit"
              className={`w-1/2 justify-center py-2 px-4 bg-gradient-to-r from-orange-400/80 via-pink-400/80 to-purple-400/80 
      hover:from-orange-400/90 hover:via-pink-400/90 hover:to-purple-400/90 backdrop-blur-md 
      text-white font-medium text-lg rounded mt-2 shadow-md transition-all  ${
        loading ? "opacity-50" : ""
      }`}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const LabelInputContainer = ({ children, className }) => {
  return (
    <div className={cn("flex flex-col space-y-2 w-full", className)}>
      {children}
    </div>
  );
};
