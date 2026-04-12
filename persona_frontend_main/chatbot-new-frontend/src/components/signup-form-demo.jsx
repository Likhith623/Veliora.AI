// signupFormDemo.jsx
"use client";
import React from "react";
import { useState, useEffect } from "react";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { useRouter } from "next/navigation";
import { useUser } from "@/support/UserContext";
import Link from "next/link";
import ForgotPasswordModal from "./ForgotPasswordModal";
import { useTheme } from "@/components/theme-provider";
import { velioraClient } from "@/lib/veliora-client";

export default function SignupFormDemo({ filter }) {
  const [session, setSession] = useState(null);
  const { setUserDetails } = useUser();
  const router = useRouter();
  const [state, setState] = useState("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // Added error state
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  useEffect(() => {
    const checkSession = async () => {
      const token = velioraClient.getToken();
      if (token) {
        try {
          const profile = await velioraClient.getProfile();
          if (profile && profile.email) {
             localStorage.setItem("userDetails", JSON.stringify(profile));
             setUserDetails(profile);
          }
        } catch (error) {
          console.error("Session invalid:", error);
          velioraClient.logout();
        }
      }
    };

    checkSession();
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (state === "signup") {
        // Sign-up using velioraClient (New Backend logic)
        const response = await velioraClient.signup({
          email,
          password,
          name: email.split("@")[0],
          username: email.split("@")[0],
          age: 18,
          gender: "unspecified",
          location: "",
        });

        localStorage.setItem("userDetails", JSON.stringify(response.user));
        setUserDetails(response.user);

        // Redirect after successful signup
        if (filter) {
          router.push(`/user-details?filter=${filter}`);
        } else {
          router.push("/user-details");
        }
      } else {
        // Login using velioraClient (New Backend logic)
        const response = await velioraClient.login(email, password);
        localStorage.setItem("userDetails", JSON.stringify(response.user));
        setUserDetails(response.user);

        // Redirect after successful login
        if (filter) {
          router.replace(`/details?filter=${filter}`);
        } else {
          router.replace("/chat-history");
        }
      }
    } catch (err) {
      setError(err.message || "An error occurred. User might already exist or invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const googleAuth = async () => {
    setError("Google Sign-in API integration is pending for the new backend.");
  };

  const discordAuth = async () => {
    setError("Discord Sign-in API integration is pending for the new backend.");
  };

  // Update the handleStateToggle function to be more robust
  const handleStateToggle = (e) => {
    e.preventDefault(); // Prevent any default behavior
    e.stopPropagation(); // Stop event propagation

    // Use a callback to ensure we're working with the latest state
    setState((prevState) => {
      const newState = prevState === "login" ? "signup" : "login";
      // Clear form data after state change
      setEmail("");
      setPassword("");
      setError(null);
      return newState;
    });
  };

  return (
    <>
      <div
        className={`font-[family-name:var(--font-garamond)] ${
          isDarkMode ? "bg-gray-800/20" : "bg-white/40"
        } backdrop-blur-lg lg:p-8 lg:px-20 p-8 px-10 md:px-20 rounded-3xl shadow-lg border ${
          isDarkMode ? "border-gray-700/30" : "border-white/30"
        }`}
      >
        <p
          className={`text-center ${
            isDarkMode ? "text-white" : "text-[#333]"
          } text-2xl mb-2 font-bold`}
        >
          Welcome
        </p>
        <h1
          className={`text-xl ${
            isDarkMode ? "text-white" : "text-[#333]"
          } font-bold text-center`}
        >
          {state === "login" ? "Login" : "Sign Up"}
        </h1>

        {error && (
          <div className="text-red-500 text-center mb-4">
            <p>{error}</p>
          </div>
        )}

        <form className="my-8 border-none" onSubmit={handleSignup}>
          <LabelInputContainer className="mb-4">
            <Label
              htmlFor="email"
              className={`mb-1 ${
                isDarkMode ? "text-white" : "text-[#333]"
              } text-md`}
            >
              Email Address
            </Label>
            <Input
              className={`border ${
                isDarkMode
                  ? "border-gray-700 bg-gray-800/80"
                  : "border-gray-300 bg-white/80"
              } rounded-md p-2 text-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 ${
                isDarkMode ? "text-white" : "text-[#333]"
              }`}
              id="email"
              placeholder="projectmayhem@fc.com"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </LabelInputContainer>

          <LabelInputContainer className="mb-4">
            <Label
              htmlFor="password"
              className={`mb-1 ${
                isDarkMode ? "text-white" : "text-[#333]"
              } text-md`}
            >
              Password
            </Label>
            <Input
              className={`border ${
                isDarkMode
                  ? "border-gray-700 bg-gray-800/80"
                  : "border-gray-300 bg-white/80"
              } rounded-md p-2 text-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 ${
                isDarkMode ? "text-white" : "text-[#333]"
              }`}
              id="password"
              placeholder="••••••••"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {state === "login" && (
              <p
                className="text-orange-500 cursor-pointer text-sm mt-2"
                onClick={() => setShowForgotPasswordModal(true)}
              >
                Forgot Password?
              </p>
            )}
          </LabelInputContainer>

          <button
            type="submit"
            className={`relative group/btn flex items-center justify-center px-4 w-full ${
              isDarkMode ? "text-white" : "text-black"
            } rounded-md h-10 font-medium shadow-input ${
              isDarkMode ? "bg-gray-800/5" : "bg-gray-50"
            } dark:shadow-[0px_0px_1px_1px_var(--neutral-800)] ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : state === "login"
              ? "Login"
              : "Sign Up"}
            <BottomGradient />
          </button>
        </form>

        {/* OAuth buttons hidden/disabled as per user instructions for new backend */}

        <p
          className={`text-center mt-4 text-md ${
            isDarkMode ? "text-white" : "text-[#333]"
          }`}
        >
          {state === "login"
            ? "Don't have an account?"
            : "Already have an account?"}
          <button
            type="button"
            className="text-orange-500 hover:text-orange-600 font-medium cursor-pointer hover:underline ml-1 bg-transparent border-none p-0 focus:outline-none focus:ring-2 focus:ring-orange-400 rounded"
            onClick={handleStateToggle}
            aria-label={
              state === "login" ? "Switch to Sign Up" : "Switch to Login"
            }
          >
            {state === "login" ? "Sign Up" : "Login"}
          </button>
        </p>
      </div>
      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <ForgotPasswordModal
          onClose={() => setShowForgotPasswordModal(false)}
        />
      )}
    </>
  );
}

const BottomGradient = () => {
  return (
    <>
      <span className="group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
      <span className="group-hover/btn:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
    </>
  );
};

const LabelInputContainer = ({ children, className }) => {
  return (
    <div className={cn("flex flex-col space-y-2 w-full", className)}>
      {children}
    </div>
  );
};
