"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/support/UserContext";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { useBot } from "@/support/BotContext";
import { supabase } from "../../../supabaseClient";
import { velioraClient } from "@/lib/veliora-client";
import {
  IconLoader,
  IconExclamationCircle,
  IconProgressCheck,
  IconUser,
  IconLock,
  IconSettings,
  IconBell,
  IconCreditCard,
  IconLogout,
  IconCalendar,
  IconGenderMale,
  IconGenderFemale,
  IconMenu2,
  IconX,
} from "@tabler/icons-react";

function Profile({ onClose }) {
  const router = useRouter();
  const { userDetails, setUserDetails } = useUser();
  const [session, setSession] = useState();
  const { selectedBotId } = useBot();
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [dateOfBirth, setDateOfBirth] = useState(
    userDetails.date_of_birth || ""
  );
  const [gender, setGender] = useState(userDetails.gender || "");
  const [isEditing, setIsEditing] = useState(false);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] =
    useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    const registerServiceWorker = async () => {
      try {
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.register("/sw.js");
          console.log(
            "Service Worker registered with scope:",
            registration.scope
          );

          // Check if user has already subscribed
          const subscription = await registration.pushManager.getSubscription();
          setPushNotificationsEnabled(!!subscription);
        }
      } catch (error) {
        console.error("Service Worker registration failed:", error);
      }
    };

    registerServiceWorker();
  }, []);

  const handlePushNotificationToggle = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Push notifications are not supported in your browser");
      return;
    }

    setIsSubscribing(true);
    try {
      const registration = await navigator.serviceWorker.ready;

      if (!pushNotificationsEnabled) {
        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          throw new Error("Notification permission denied");
        }

        // Convert VAPID public key to Uint8Array
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          throw new Error("VAPID public key is not configured");
        }

        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

        // Subscribe to push notifications
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });

        console.log("Push Notification subscription:", subscription);

        // Store subscription in localStorage
        localStorage.setItem("pushSubscription", JSON.stringify(subscription));

        setPushNotificationsEnabled(true);
      } else {
        // Unsubscribe from push notifications
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          await subscription.unsubscribe();
          localStorage.removeItem("pushSubscription");
          setPushNotificationsEnabled(false);
        }
      }
    } catch (error) {
      console.error("Error toggling push notifications:", error);
      alert("Failed to update push notification settings: " + error.message);
    } finally {
      setIsSubscribing(false);
    }
  };

  // Helper function to convert VAPID key
  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const handleLogout = async () => {
    localStorage.removeItem("userDetails");
    await supabase.auth.signOut();
    setSession(null);
    window.location.reload();
    router.push("/signup");
  };

  const handleUpdateProfile = async () => {
    try {
      const updatedProfile = await velioraClient.updateProfile({
        date_of_birth: dateOfBirth,
        gender: gender,
      });

      setIsEditing(false);
      // Update local user details
      const updatedUserDetails = {
        ...userDetails,
        date_of_birth: updatedProfile.date_of_birth,
        gender: updatedProfile.gender,
      };
      localStorage.setItem("userDetails", JSON.stringify(updatedUserDetails));
      if (setUserDetails) {
        setUserDetails(updatedUserDetails);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile: " + error.message);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      alert("Please fill in both password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await velioraClient.updatePassword(newPassword);
      alert("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error updating password:", error);
      alert("Failed to update password: " + error.message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const renderProfileContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-lg backdrop-blur-sm border border-white/20 dark:border-gray-700/20">
                {userDetails.name?.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                {userDetails.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {userDetails.email}
              </p>
            </div>
            <div className="space-y-4">
              <div className="p-6 bg-gray-300 dark:bg-gray-900 rounded-xl shadow-lg border border-gray-400 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-gray-800 dark:text-gray-200">
                    Personal Information
                  </h3>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                  >
                    {isEditing ? "Cancel" : "Edit"}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <IconCalendar size={16} />
                      Date of Birth
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full p-3 mt-1 rounded-lg bg-gray-200 dark:bg-gray-800 border border-gray-400 dark:border-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-gray-800 dark:text-gray-200"
                        max={new Date().toISOString().split("T")[0]}
                      />
                    ) : (
                      <div className="mt-1 p-3 rounded-lg bg-gray-200 dark:bg-gray-800 border border-gray-400 dark:border-gray-600">
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                          {dateOfBirth
                            ? new Date(dateOfBirth).toLocaleDateString()
                            : "Not set"}
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <IconGenderMale size={16} />
                      Gender
                    </label>
                    {isEditing ? (
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full p-3 mt-1 rounded-lg bg-gray-200 dark:bg-gray-800 border border-gray-400 dark:border-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-gray-800 dark:text-gray-200"
                      >
                        <option
                          value=""
                          className="text-gray-800 dark:text-gray-200"
                        >
                          Select gender
                        </option>
                        <option
                          value="male"
                          className="text-gray-800 dark:text-gray-200"
                        >
                          Male
                        </option>
                        <option
                          value="female"
                          className="text-gray-800 dark:text-gray-200"
                        >
                          Female
                        </option>
                        <option
                          value="other"
                          className="text-gray-800 dark:text-gray-200"
                        >
                          Other
                        </option>
                        <option
                          value="prefer_not_to_say"
                          className="text-gray-800 dark:text-gray-200"
                        >
                          Prefer not to say
                        </option>
                      </select>
                    ) : (
                      <div className="mt-1 p-3 rounded-lg bg-gray-200 dark:bg-gray-800 border border-gray-400 dark:border-gray-600">
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                          {gender
                            ? gender.charAt(0).toUpperCase() + gender.slice(1)
                            : "Not set"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                {isEditing && (
                  <Button
                    onClick={handleUpdateProfile}
                    className="w-full mt-6 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 hover:from-purple-500 hover:via-pink-500 hover:to-orange-500 text-white rounded-lg shadow-lg border border-white/20 dark:border-gray-700/20 transition-all duration-300"
                  >
                    Save Changes
                  </Button>
                )}
              </div>
              <div className="p-6 bg-gray-300 dark:bg-gray-900 rounded-xl shadow-lg border border-gray-400 dark:border-gray-700">
                <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-200">
                  About
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Member since{" "}
                  {new Date(userDetails.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        );
      case "security":
        return (
          <div className="space-y-6">
            <div className="p-6 bg-gray-300 dark:bg-gray-900 rounded-xl shadow-lg border border-gray-400 dark:border-gray-700">
              <h3 className="font-medium mb-4 text-gray-800 dark:text-gray-200">
                Security Settings
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">
                    Change Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-3 mt-1 rounded-lg bg-gray-200 dark:bg-gray-800 border border-gray-400 dark:border-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-gray-800 dark:text-gray-200"
                    placeholder="New Password"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-3 mt-1 rounded-lg bg-gray-200 dark:bg-gray-800 border border-gray-400 dark:border-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-gray-800 dark:text-gray-200"
                    placeholder="Confirm New Password"
                  />
                </div>
                <Button 
                  onClick={handleUpdatePassword}
                  disabled={isUpdatingPassword}
                  className={`w-full bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 hover:from-purple-500 hover:via-pink-500 hover:to-orange-500 text-white rounded-lg shadow-lg border border-white/20 dark:border-gray-700/20 transition-all duration-300 ${isUpdatingPassword ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isUpdatingPassword ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </div>
          </div>
        );
      case "preferences":
        return (
          <div className="space-y-6">
            <div className="p-6 bg-gray-300 dark:bg-gray-900 rounded-xl shadow-lg border border-gray-400 dark:border-gray-700">
              <h3 className="font-medium mb-4 text-gray-800 dark:text-gray-200">
                Notification Preferences
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Push Notifications
                  </span>
                  <button
                    onClick={handlePushNotificationToggle}
                    disabled={isSubscribing}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:ring-offset-2 ${
                      pushNotificationsEnabled
                        ? "bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400"
                        : "bg-gray-400 dark:bg-gray-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        pushNotificationsEnabled
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                {isSubscribing && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Updating notification settings...
                  </p>
                )}
                {!isSubscribing && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {pushNotificationsEnabled
                      ? "Push notifications are enabled"
                      : "Push notifications are disabled"}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      case "subscription":
        return (
          <div className="space-y-6">
            <div className="p-6 bg-gray-300 dark:bg-gray-900 rounded-xl shadow-lg border border-gray-400 dark:border-gray-700">
              <h3 className="font-medium mb-4 text-gray-800 dark:text-gray-200">
                Subscription Details
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-200 dark:bg-gray-800 rounded-lg border border-gray-400 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Current Plan
                  </span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Free Plan
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-200 dark:bg-gray-800 rounded-lg border border-gray-400 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Next Billing Date
                  </span>
                  <span className="text-sm text-gray-800 dark:text-gray-200">
                    -
                  </span>
                </div>
                <Button className="w-full bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 hover:from-purple-500 hover:via-pink-500 hover:to-orange-500 text-white rounded-lg shadow-lg border border-white/20 dark:border-gray-700/20 transition-all duration-300">
                  Upgrade Plan
                </Button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      suppressHydrationWarning
      className="bg-gray-200 dark:bg-gray-800 backdrop-blur-md p-4 sm:p-6 md:p-8 md:rounded-xl md:shadow-lg md:border md:border-gray-300 md:dark:border-gray-700 w-screen h-screen md:w-[800px] md:h-[600px] md:mx-auto overflow-hidden"
    >
      {/* Mobile Header with Menu Button */}
      <div className="flex items-center justify-between mb-4 md:hidden">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Profile
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-600"
          >
            {isMobileMenuOpen ? <IconX size={20} /> : <IconMenu2 size={20} />}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
          >
            <IconX size={20} />
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-8 h-full">
        {/* Sidebar Navigation */}
        <div
          className={`w-full md:w-48 space-y-2 overflow-y-auto transition-all duration-300 ${
            isMobileMenuOpen ? "block" : "hidden md:block"
          }`}
        >
          <button
            onClick={() => {
              setActiveTab("profile");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2 p-3 rounded-lg transition-all duration-300 ${
              activeTab === "profile"
                ? "bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 text-white shadow-lg"
                : "hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            }`}
          >
            <IconUser size={20} />
            <span>Profile</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("security");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2 p-3 rounded-lg transition-all duration-300 ${
              activeTab === "security"
                ? "bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 text-white shadow-lg"
                : "hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            }`}
          >
            <IconLock size={20} />
            <span>Security</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("preferences");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2 p-3 rounded-lg transition-all duration-300 ${
              activeTab === "preferences"
                ? "bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 text-white shadow-lg"
                : "hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            }`}
          >
            <IconBell size={20} />
            <span>Preferences</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("subscription");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2 p-3 rounded-lg transition-all duration-300 ${
              activeTab === "subscription"
                ? "bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 text-white shadow-lg"
                : "hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            }`}
          >
            <IconCreditCard size={20} />
            <span>Subscription</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 p-3 rounded-lg transition-all duration-300 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 hover:shadow-lg"
          >
            <IconLogout size={20} />
            <span>Log out</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto pb-4 md:pb-0">
          {renderProfileContent()}
        </div>
      </div>
    </div>
  );
}

export default Profile;
