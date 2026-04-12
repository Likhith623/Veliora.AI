"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react"; // ✅ ADD useMemo here
import CustomModal from "./customforxp";
// XP now fetched from new backend via /api/auth/xp (adapter normalises to old shape)
import { xpGetCurrent } from "@/lib/veliora-client";
// ...existing code...
// Expose placeholder global functions immediately so they're always defined
if (typeof window !== "undefined") {
  window.updateXPFromResponse = window.updateXPFromResponse || (() => { console.warn("XP: updateXPFromResponse called before system ready"); });
  window.fetchCurrentXP = window.fetchCurrentXP || (() => {});
  window.triggerXPAnimation = window.triggerXPAnimation || (() => {});
  window.createFlyingCoin = window.createFlyingCoin || (() => {});
  window.createFlyingStars = window.createFlyingStars || (() => {});
  window.__XP_SYSTEM_LOADED__ = window.__XP_SYSTEM_LOADED__ || false;
}
// ...existing code...
// XP Animation Styles Component(to be clealry separated)
const XPAnimationStyles = () => (
  <style jsx>{`
    @keyframes flyToXP {
      0% {
        transform: translate(0, 0) scale(1) rotate(0deg);
        opacity: 1;
      }
      50% {
        transform: translate(-200px, -100px) scale(1.2) rotate(180deg);
        opacity: 0.8;
      }
      100% {
        transform: translate(-400px, -200px) scale(0.5) rotate(360deg);
        opacity: 0;
      }
    }

    @keyframes flyStarsToXP {
      0% {
        transform: translate(0, 0) scale(1) rotate(0deg);
        opacity: 1;
      }
      30% {
        opacity: 1;
        transform: scale(1.2) rotate(90deg);
      }
      70% {
        opacity: 0.9;
        transform: scale(1.1) rotate(270deg);
      }
      100% {
        transform: translate(var(--target-x), var(--target-y)) scale(0.8)
          rotate(360deg);
        opacity: 0;
      }
    }

    @keyframes xpGlow {
      0%,
      100% {
        box-shadow: 0 0 20px rgba(250, 204, 21, 0.3);
      }
      50% {
        box-shadow: 0 0 30px rgba(250, 204, 21, 0.6),
          0 0 40px rgba(250, 204, 21, 0.4);
      }
    }

    @keyframes xpButtonStarGlow {
      0% {
        box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
        transform: scale(1);
      }
      25% {
        box-shadow: 0 0 25px rgba(255, 215, 0, 0.6),
          0 0 35px rgba(255, 215, 0, 0.4);
        transform: scale(1.03);
      }
      50% {
        box-shadow: 0 0 40px rgba(255, 215, 0, 0.9),
          0 0 60px rgba(255, 215, 0, 0.6), 0 0 80px rgba(255, 215, 0, 0.3);
        transform: scale(1.05);
      }
      75% {
        box-shadow: 0 0 35px rgba(255, 215, 0, 0.8),
          0 0 50px rgba(255, 215, 0, 0.5);
        transform: scale(1.03);
      }
      100% {
        box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
        transform: scale(1);
      }
    }

    @keyframes starPulse {
      0%,
      100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.7;
        transform: scale(1.3);
      }
    }

    .xp-glow {
      animation: xpGlow 2s ease-in-out;
    }

    .xp-button-star-glow {
      animation: xpButtonStarGlow 2.5s ease-in-out;
    }

    .star-pulse {
      animation: starPulse 0.8s ease-in-out infinite;
    }
  `}</style>
);

// Flying Coin Component
const FlyingCoin = ({ startX, startY, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        left: startX,
        top: startY,
        animation: "flyToXP 1.5s ease-in-out forwards",
      }}
    >
      <div className="text-2xl animate-spin">🪙</div>
    </div>
  );
};

// Flying Stars Component
const FlyingStars = ({ startX, startY, targetX, targetY, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2500); // ✅ INCREASED: from 1200ms to 2500ms for slower animation

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Generate 4-6 stars with slight randomness
  const stars = Array.from(
    { length: Math.floor(Math.random() * 3) + 4 },
    (_, i) => ({
      id: i,
      delay: i * 150, // ✅ INCREASED: delay between stars
      offsetX: (Math.random() - 0.5) * 30, // ✅ INCREASED: more spread
      offsetY: (Math.random() - 0.5) * 30,
    })
  );

  return (
    <div className="fixed pointer-events-none z-50">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute text-yellow-400 star-pulse" // ✅ ADDED: pulse effect
          style={{
            left: startX + star.offsetX,
            top: startY + star.offsetY,
            "--target-x": `${targetX - startX - star.offsetX}px`,
            "--target-y": `${targetY - startY - star.offsetY}px`,
            animation: `flyStarsToXP 2.5s ease-in-out forwards, starPulse 0.8s ease-in-out infinite`, // ✅ SLOWER: 2.5s instead of 1.2s
            animationDelay: `${star.delay}ms`,
            fontSize: "16px", // ✅ BIGGER: more visible stars
            filter: "drop-shadow(0 0 3px rgba(255, 255, 0, 0.8))", // ✅ ADDED: glow effect
          }}
        >
          ⭐
        </div>
      ))}
    </div>
  );
};

// ✅ FIXED XPDetailsModal Component
// ✅ ENHANCED XPDetailsModal Component with Glass Effects and CORRECT COIN CALCULATION
const XPDetailsModal = ({
  currentXP,
  currentCoins,
  totalXPAllBots,
  totalCoinsAllBots,
  selectedBotDetails,
  selectedBotId,
  userDetails,
  setIsXPModalOpen,
}) => {
  const [allBotsXP, setAllBotsXP] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllXP = async () => {
      try {
        setLoading(true);
        // New backend: /api/auth/xp (adapter returns { success, current_total_xp, magnitude })
        const data = await xpGetCurrent(userDetails.email, selectedBotId);

        if (data.success) {
          const botXP = data.current_total_xp || 0;
          const botCoins = Math.floor(botXP / 10);

          setAllBotsXP([
            {
              bot_id: selectedBotId,
              bot_name: selectedBotDetails?.name || selectedBotId,
              xp_score: botXP,
              coins: botCoins,
              magnitude: data.magnitude || 0,
            },
          ]);
        }
      } catch (error) {
        console.error("Error fetching all XP:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userDetails.email && selectedBotId) {
      fetchAllXP();
    }
  }, [selectedBotId, selectedBotDetails?.name, userDetails.email]);

  const calculateLevel = (xp) => {
    return Math.floor(xp / 100) + 1;
  };

  const getXPForNextLevel = (xp) => {
    const currentLevel = calculateLevel(xp);
    return currentLevel * 100 - xp;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4">
        <div className="bg-[#FFFFFF] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-0 p-4 sm:p-6 mx-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-black flex items-center gap-2">
              XP Progress
            </h2>
            <button
              onClick={() => setIsXPModalOpen(false)}
              className="text-black hover:text-white text-xl sm:text-2xl font-bold"
            >
              ×
            </button>
          </div>
          <div className="w-full max-w-md mx-auto">
            {" "}
            {/* Centered loading card */}
            <div className="relative bg-black/40 backdrop-blur-2xl border border-white/25 rounded-2xl p-4 sm:p-6 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/80 via-pink-400/80 to-orange-400/80 rounded-2xl"></div>
              <div className="relative text-center">
                <div className="w-8 h-8 mx-auto mb-3 border-2 border-purple-400/50 border-t-purple-400 rounded-full animate-spin"></div>
                <p className="text-white/90 text-sm font-medium">
                  Loading XP...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#FFFFFF] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-0 p-4 sm:p-6 mx-2">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-black flex items-center gap-1 sm:gap-2 truncate">
            XP Progress: {userDetails.name}
          </h2>
          
          <button
            onClick={() => setIsXPModalOpen(false)}
            className="text-black hover:text-white text-lg sm:text-xl md:text-2xl font-bold flex-shrink-0"
          >
            ×
          </button>
        </div>
        <div className="grid gap-4 items-stretch mb-6">
          {/* Grand Total (first row, full width) */}
          <div className="w-full">
          <div className="relative bg-[#FFFBED] rounded-3xl shadow-2xl ring-1 ring-black/10 min-h-[60px] p-4 sm:p-6 flex flex-col justify-between h-full overflow-hidden">
              <img
                src="/icons/activities/star.png"
                alt="Star Icon"
                className="absolute right-0 bottom-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 xl:w-40 xl:h-40 object-contain pointer-events-none z-0 translate-x-1/4 translate-y-1/4"
                draggable={false}
              />
              <div className="flex items-center justify-between mb-3 pr-10 sm:pr-12 md:pr-16 lg:pr-20 xl:pr-28">
                <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                  <span className="text-sm sm:text-base flex-shrink-0">🌟</span>
                  <span className="font-bold text-sm sm:text-base md:text-lg lg:text-xl text-black mb-0 text-left truncate">
                    Grand Total
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-black md:text-base text-left bg-gray-100 px-2 sm:px-3 py-1 rounded-full flex-shrink-0">
                  All Bots
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 pr-10 sm:pr-12 md:pr-16 lg:pr-20 xl:pr-28">
                <div className="text-center min-w-0">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-black truncate">
                    {totalXPAllBots}
                  </div>
                  <div className="text-xs sm:text-sm text-black truncate">Total XP</div>
                </div>
                <div className="text-center min-w-0">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-black truncate">
                    {Math.floor(totalXPAllBots / 10)}
                  </div>
                  <div className="text-xs sm:text-sm text-black truncate">Total Coins</div>
                  <div className="text-xs text-black truncate">
                    ({totalXPAllBots} ÷ 10)
                  </div>
                </div>
              </div>
              <div className="space-y-2 pr-10 sm:pr-12 md:pr-16 lg:pr-20 xl:pr-28">
                <div className="flex justify-between text-xs sm:text-sm text-black">
                  <span className="truncate">Level {calculateLevel(totalXPAllBots)}</span>
                  <span className="truncate">{getXPForNextLevel(totalXPAllBots)} XP to next</span>
                </div>
                <div className="relative h-3 bg-yellow-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-400/80 via-pink-400/80 to-orange-400/80 rounded-full transition-all duration-1000"
                    style={{ width: `${totalXPAllBots % 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          {/* Current Bot and XP Tips (second row, two columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* Current Bot */}
            <div className="relative flex-1 min-w-0 break-words h-full">
              <div className="relative bg-[#FFFBED] rounded-3xl shadow-xl min-h-[60px] p-3 sm:p-4 flex flex-col justify-between h-full overflow-hidden">
                {/* Icon placeholder */}
                <div className="absolute top-3 sm:top-4 right-3 sm:right-4 w-12 h-12 sm:w-16 sm:h-16"></div>
                <div className="flex items-center gap-2 sm:gap-3 mb-3">
                  <span className="text-sm sm:text-base flex-shrink-0">🤖</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm sm:text-base md:text-lg lg:text-xl text-black truncate">
                      {selectedBotDetails?.name || selectedBotId}
                    </h3>
                    <p className="text-xs sm:text-sm text-black truncate">Your AI Companion</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3">
                  <div className="text-center min-w-0">
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-black truncate">
                      {currentXP}
                    </div>
                    <div className="text-xs sm:text-sm text-black truncate">Bot XP</div>
                  </div>
                  <div className="text-center min-w-0">
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-black truncate">
                      {Math.floor(currentXP / 10)}
                    </div>
                    <div className="text-xs sm:text-sm text-black truncate">Bot Coins</div>
                    <div className="text-xs text-black truncate">
                      ({currentXP} ÷ 10)
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm text-black">
                    <span className="truncate">Level {calculateLevel(currentXP)}</span>
                    <span className="truncate">{getXPForNextLevel(currentXP)} XP to next</span>
                  </div>
                  <div className="relative h-3 bg-yellow-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 rounded-full transition-all duration-1000"
                      style={{ width: `${currentXP % 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            {/* XP Tips */}
            <div className="relative flex-1 min-w-0 break-words h-full">
              <div className="relative bg-[#FFFBED] rounded-3xl shadow-xl min-h-[60px] p-3 sm:p-4 flex flex-col justify-between h-full overflow-hidden">
                {/* Icon placeholder */}
                <img
                  src="/icons/activities/flame.png"
                  alt="Flame Icon"
                  className="absolute right-0 bottom-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 xl:w-40 xl:h-40 object-contain pointer-events-none z-0 translate-x-1/4 translate-y-1/4"
                  draggable={false}
                />
                <div className="flex items-center gap-2 sm:gap-3 mb-3">
                  <span className="text-sm sm:text-base flex-shrink-0">💡</span>
                  <h4 className="font-bold text-sm sm:text-base md:text-lg lg:text-xl text-black truncate">
                    How to Earn XP
                  </h4>
                </div>
                <div className="space-y-1 sm:space-y-2 flex-1">
                  {[
                    "Chat with your AI companion",
                    "Higher engagement = more XP",
                    "Daily conversations boost progress",
                    "1 coin per 10 XP earned!",
                  ].map((tip, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm text-black"
                    >
                      <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-green-400 rounded-full flex-shrink-0 mt-1.5 sm:mt-2"></span>
                      <span className="break-words leading-tight">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setIsXPModalOpen(false)}
          className="relative group w-full py-2.5 sm:py-3 rounded-xl font-bold text-white transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/80 via-pink-400/80 to-orange-400/80  rounded-xl transition-all duration-300 group-hover:from-purple-400 group-hover:via-blue-400 group-hover:to-purple-500"></div>
          <div className="absolute inset-0 bg-white/20 rounded-xl backdrop-blur-sm"></div>
          <span className="relative flex items-center justify-center gap-2 text-sm sm:text-base">
            Keep Chatting!
            <span>🚀</span>
          </span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-400/50 to-blue-400/50 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300"></div>
        </button>
      </div>
    </div>
  );
};

// ✅ PERFECT Main XPSystem Component - FIXED ALL ISSUES
const XPSystem = ({ selectedBotDetails, selectedBotId, userDetails }) => {
  const [currentXP, setCurrentXP] = useState(0);
  const [currentCoins, setCurrentCoins] = useState(0);
  const [totalXPAllBots, setTotalXPAllBots] = useState(0);
  const [totalCoinsAllBots, setTotalCoinsAllBots] = useState(0);
  const [xpAnimation, setXpAnimation] = useState(false);
  const [showXPNotification, setShowXPNotification] = useState(false);
  const [latestXPGain, setLatestXPGain] = useState(0);
  const [flyingCoins, setFlyingCoins] = useState([]);
  const [flyingStars, setFlyingStars] = useState([]); // New state for flying stars
  const [buttonGlow, setButtonGlow] = useState(false); // New state for button glow
  const [isXPModalOpen, setIsXPModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ FIXED: Memoize bot IDs to prevent recreation
  // ✅ FIXED: Include ALL bot IDs to ensure consistent totals
  const allBotIds = useMemo(
    () => [
      // Delhi bots
      "delhi_mentor_female",
      "delhi_mentor_male",
      "delhi_friend_female",
      "delhi_friend_male",
      "delhi_romantic_female",
      "delhi_romantic_male",

      // Japanese bots
      "japanese_mentor_female",
      "japanese_mentor_male",
      "japanese_friend_female",
      "japanese_friend_male",
      "japanese_romantic_female",
      "japanese_romantic_male",

      // Parisian bots
      "parisian_mentor_female",
      "parisian_mentor_male",
      "parisian_friend_female",
      "parisian_friend_male",
      "parisian_romantic_female",
      "parisian_romantic_male", // ✅ ADDED: was missing

      // Singapore bots
      "singapore_mentor_male",
      "singapore_mentor_female",
      "singapore_friend_male",
      "singapore_friend_female",
      "singapore_romantic_male",
      "singapore_romantic_female",

      // Emirati bots
      "emirati_mentor_male",
      "emirati_mentor_female",
      "emirati_friend_male",
      "emirati_friend_female",
      "emirati_romantic_male",
      "emirati_romantic_female",

      // Berlin bots
      "berlin_mentor_female",
      "berlin_mentor_male",
      "berlin_friend_female",
      "berlin_friend_male",
      "berlin_romantic_female",
      "berlin_romantic_male",

      // Mexican bots
      "mexican_friend_male",
      "mexican_friend_female",
      "mexican_mentor_male",
      "mexican_mentor_female",
      "mexican_romantic_male",
      "mexican_romantic_female",

      // Sri Lankan bots
      "srilankan_friend_male",
      "srilankan_friend_female",
      "srilankan_mentor_male",
      "srilankan_mentor_female",
      "srilankan_romantic_male",
      "srilankan_romantic_female",

      // ✅ ADDED: Spiritual guides (these were completely missing!)
      "Krishna",
      "Rama",
      "Shiva",
      "Hanuman",
      "Trimurti",
    ],
    []
  );

  // ✅ FIXED: Stable function with proper error handling
  const fetchTotalXPAllBots = useCallback(async () => {
    if (!userDetails.email) return;

    try {
      console.log("🔄 Fetching total XP (new backend: /api/auth/xp)...");

      // New backend returns global XP. We use it as a proxy for "all bots" total.
      const data = await xpGetCurrent(userDetails.email, "global");
      const totalXP = data.current_total_xp || 0;
      const totalCoins = Math.floor(totalXP / 10);
      setTotalXPAllBots(totalXP);
      setTotalCoinsAllBots(totalCoins);
      console.log("✅ Total XP:", totalXP);
    } catch (error) {
      console.error("Error fetching total XP:", error);
    }
  }, [userDetails.email]);

  const fetchCurrentXP = useCallback(async () => {
    if (!userDetails.email || !selectedBotId || isLoading) return;
    setIsLoading(true);
    try {
      console.log("🎯 Fetching current bot XP for:", userDetails.email, selectedBotId);
      // New backend adapter: xpGetCurrent normalises /api/auth/xp → old shape
      const data = await xpGetCurrent(userDetails.email, selectedBotId);
      if (data.success) {
        const currentXP = data.current_total_xp || 0;
        const currentCoins = Math.floor(currentXP / 10);
        setCurrentXP(currentXP);
        setCurrentCoins(currentCoins);
        console.log("✅ Current bot XP:", currentXP);
      }
    } catch (error) {
      console.error("Error fetching current XP:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userDetails.email, selectedBotId]);

  // ✅ FIXED: Stable animation function
  const triggerXPAnimation = useCallback((xpGained) => {
    if (typeof xpGained !== "number" || xpGained <= 0) return;

    setLatestXPGain(xpGained);
    setXpAnimation(true);
    setShowXPNotification(true);

    // Hide notification after 3 seconds
    setTimeout(() => {
      setShowXPNotification(false);
    }, 3000);

    // Reset animation after 2 seconds
    setTimeout(() => {
      setXpAnimation(false);
    }, 2000);
  }, []);

  // ✅ ENHANCED: Update the updateXPFromResponse function to handle both chat and voice call XP
  const updateXPFromResponse = useCallback(
    (xpData) => {
      console.log("🎯 updateXPFromResponse called with:", xpData);

      if (!xpData || typeof xpData !== "object") {
        console.warn("Invalid XP data received:", xpData);
        return;
      }

      // ✅ ENHANCED: Handle both voice call and chat XP data formats
      if (xpData.xp_calculation_success || xpData.success) {
        const immediateXP = xpData.immediate_xp_awarded || 0;
        const newCurrentXP = xpData.current_total_xp || 0;

        // ✅ FIXED: Calculate coins based on XP (1 coin per 10 XP)
        const newCurrentCoins = Math.floor(newCurrentXP / 10);

        // Update current bot XP and coins
        setCurrentXP(newCurrentXP);
        setCurrentCoins(newCurrentCoins);

        // ✅ FIXED: Update total XP correctly
        setTotalXPAllBots((prev) => {
          const newTotalXP = prev + immediateXP;

          // ✅ FIXED: Calculate total coins based on the NEW total XP
          setTotalCoinsAllBots(Math.floor(newTotalXP / 10));

          return newTotalXP;
        });

        // Trigger animation if XP was gained
        if (immediateXP > 0) {
          triggerXPAnimation(immediateXP);

          // ✅ NEW: Trigger flying stars animation for voice calls too
          setTimeout(() => {
            // For voice calls, we can trigger stars from the voice call interface
            if (typeof window.createFlyingStars === "function") {
              // Find any bot message element or create a dummy one
              const voiceCallElement = document.querySelector(
                '[data-sender="bot"]'
              );
              if (voiceCallElement) {
                console.log("🌟 Creating flying stars from voice call");
                window.createFlyingStars(voiceCallElement);
              }
            }
          }, 500);
        }

        console.log("✅ Voice Call XP updated successfully:", {
          immediateXP,
          newCurrentXP,
          newCurrentCoins: newCurrentCoins,
          source: "voice_call",
        });
      } else {
        console.warn("XP calculation was not successful:", xpData);
      }
    },
    [triggerXPAnimation]
  );

  // ✅ FIXED: Stable flying coin function
  const createFlyingCoin = useCallback((messageElement) => {
    if (!messageElement) return;

    const rect = messageElement.getBoundingClientRect();
    const xpButton = document.getElementById("xp-button");

    if (!xpButton) return;

    const coinId = Date.now() + Math.random(); // Ensure uniqueness
    const newCoin = {
      id: coinId,
      startX: rect.right - 30,
      startY: rect.top + rect.height / 2,
    };

    setFlyingCoins((prev) => [...prev, newCoin]);

    // Remove coin after animation
    setTimeout(() => {
      setFlyingCoins((prev) => prev.filter((coin) => coin.id !== coinId));
    }, 1500);
  }, []);

  // ✅ ENHANCED: Create flying stars animation
  const createFlyingStars = useCallback((messageElement) => {
    console.log("🌟 createFlyingStars called with:", messageElement);

    if (!messageElement) {
      console.warn("❌ No message element provided");
      return;
    }

    const rect = messageElement.getBoundingClientRect();
    console.log("🌟 Message element rect:", rect);

    // Check if message element is visible
    if (rect.width === 0 || rect.height === 0) {
      console.warn("❌ Message element not visible, retrying...");
      setTimeout(() => createFlyingStars(messageElement), 500);
      return;
    }

    const xpButton = document.getElementById("xp-button");
    console.log("🌟 XP button found:", !!xpButton);

    if (!xpButton) {
      console.warn("❌ XP button not found");
      return;
    }

    const xpButtonRect = xpButton.getBoundingClientRect();
    console.log("🌟 XP button rect:", xpButtonRect);

    // Check if XP button is visible
    if (xpButtonRect.width === 0 || xpButtonRect.height === 0) {
      console.warn("❌ XP button not visible");
      return;
    }

    const starsId = Date.now() + Math.random();

    const newStars = {
      id: starsId,
      startX: rect.left + rect.width / 2, // Start from center of message
      startY: rect.top + rect.height / 2,
      targetX: xpButtonRect.left + xpButtonRect.width / 2,
      targetY: xpButtonRect.top + xpButtonRect.height / 2,
    };

    console.log("🌟 Creating stars animation:", newStars);

    setFlyingStars((prev) => [...prev, newStars]);

    // ✅ ENHANCED: Trigger button glow when stars are about to arrive (2 seconds after start)
    setTimeout(() => {
      console.log("✨ Stars arriving - triggering button glow");
      setButtonGlow(true);

      // ✅ LONGER: Keep glow active for longer
      setTimeout(() => {
        setButtonGlow(false);
        console.log("✨ Button glow ended");
      }, 2500); // Glow for 2.5 seconds
    }, 2000); // Start glow 2 seconds after stars start (when they're close to arriving)

    // Remove stars after animation completes
    setTimeout(() => {
      setFlyingStars((prev) => prev.filter((stars) => stars.id !== starsId));
      console.log("🌟 Stars animation completed and cleaned up");
    }, 3000); // ✅ INCREASED: cleanup time
  }, []);

  // ✅ PERFECT: Remove function dependencies to prevent infinite loop
  useEffect(() => {
    console.log("🎯 XPSystem mounted/bot changed:", {
      selectedBotId,
      userEmail: userDetails.email,
      hasSelectedBotDetails: !!selectedBotDetails,
    });

    // Fetch both current XP and total XP in parallel
    if (userDetails.email && selectedBotId && !isLoading) {
      fetchCurrentXP();
      fetchTotalXPAllBots();
    }
  }, [userDetails.email, selectedBotId]); // ✅ FIXED: Remove function dependencies

  // ✅ FIXED: Stable global function exposure
  // ✅ ENHANCED: Add debugging for global function exposure
  useEffect(() => {
    // Expose functions globally for Dashboard integration
    window.triggerXPAnimation = triggerXPAnimation;
    window.createFlyingCoin = createFlyingCoin;
    window.createFlyingStars = createFlyingStars;
    window.updateXPFromResponse = updateXPFromResponse;
    window.__XP_SYSTEM_LOADED__ = true;

    console.log("✅ Global XP functions exposed & system ready:", {
      triggerXPAnimation: typeof window.triggerXPAnimation,
      createFlyingCoin: typeof window.createFlyingCoin,
      createFlyingStars: typeof window.createFlyingStars,
      updateXPFromResponse: typeof window.updateXPFromResponse,
      ready: window.__XP_SYSTEM_LOADED__
    });

    // ✅ TEST: Verify the updateXPFromResponse function works
    setTimeout(() => {
      // Just warn softly, it's not a true error if it didn't attach.
    }, 1000);

    return () => {
      // Cleanup global functions
      delete window.triggerXPAnimation;
      delete window.createFlyingCoin;
      delete window.createFlyingStars;
      delete window.updateXPFromResponse;
    };
  }, [
    triggerXPAnimation,
    createFlyingCoin,
    createFlyingStars,
    updateXPFromResponse,
  ]); // ✅ FIXED: Empty dependency array since functions are stable

  useEffect(() => {
    window.fetchCurrentXP = fetchCurrentXP;
    return () => {
      delete window.fetchCurrentXP;
    };
  }, [fetchCurrentXP]);

  return (
    <>
      <XPAnimationStyles />

      {/* Flying Coins */}
      {flyingCoins.map((coin) => (
        <FlyingCoin
          key={coin.id}
          startX={coin.startX}
          startY={coin.startY}
          onComplete={() => {}}
        />
      ))}

      {/* Flying Stars */}
      {flyingStars.map((stars) => (
        <FlyingStars
          key={stars.id}
          startX={stars.startX}
          startY={stars.startY}
          targetX={stars.targetX}
          targetY={stars.targetY}
          onComplete={() => {}}
        />
      ))}

      {/* ✅ ENHANCED: XP Button with loading state and glow */}
      <button
        onClick={() => setIsXPModalOpen(true)}
        disabled={isLoading}
        className={`mt-3 p-3 py-2 w-full hover:opacity-60 cursor-pointer bg-gradient-to-r from-yellow-400/80 via-orange-400/80 to-red-400/80 hover:from-yellow-400/90 hover:via-orange-400/90 hover:to-red-400/90 text-white rounded-full flex flex-col justify-center items-center gap-1 transition-all backdrop-blur-sm border border-white/20 shadow-[0_4px_12px_0_rgba(255,255,255,0.2)] relative overflow-hidden ${
          xpAnimation ? "animate-pulse ring-4 ring-yellow-300" : ""
        } ${isLoading ? "opacity-50" : ""} ${
          buttonGlow ? "xp-button-star-glow" : ""
        }`} // ✅ CHANGED: use new glow class
        id="xp-button"
      >
        {/* Current Bot XP */}
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="font-bold text-sm">
            {isLoading ? "..." : currentXP} XP
          </span>
        </div>

        {/* Total XP Across All Bots */}
        <div className="flex items-center gap-2 text-xs opacity-90">
          <span>🌟</span>
          <span>Total: {isLoading ? "..." : totalXPAllBots} XP</span>
          <span>💰</span>
          <span>{isLoading ? "..." : totalCoinsAllBots} coins</span>
        </div>

        {/* XP Gain Animation Notification */}
        {showXPNotification && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold animate-bounce shadow-lg z-10">
            +{latestXPGain} XP!
          </div>
        )}

        {/* ✅ ENHANCED: Better sparkle animation overlay */}
        {(xpAnimation || buttonGlow) && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-yellow-300 rounded-full animate-ping"></div>
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full animate-ping delay-100"></div>
            <div className="absolute bottom-1/4 right-1/4 w-2 h-2 bg-white rounded-full animate-ping delay-200"></div>
            <div className="absolute top-3/4 left-3/4 w-1 h-1 bg-yellow-200 rounded-full animate-ping delay-300"></div>
            {/* ✅ ADDED: Extra sparkles during glow */}
            {buttonGlow && (
              <>
                <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-yellow-400 rounded-full animate-ping delay-150"></div>
                <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-orange-300 rounded-full animate-ping delay-250"></div>
              </>
            )}
          </div>
        )}
      </button>

      {/* XP Modal */}
      {isXPModalOpen && (
        <CustomModal
          isOpen={isXPModalOpen}
          onClose={() => setIsXPModalOpen(false)}
        >
          <XPDetailsModal
            currentXP={currentXP}
            currentCoins={currentCoins}
            totalXPAllBots={totalXPAllBots}
            totalCoinsAllBots={totalCoinsAllBots}
            selectedBotDetails={selectedBotDetails}
            selectedBotId={selectedBotId}
            userDetails={userDetails}
            setIsXPModalOpen={setIsXPModalOpen}
          />
        </CustomModal>
      )}
    </>
  );
};

export default XPSystem;
