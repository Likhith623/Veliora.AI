"use client";
import Link from "next/link";
import Head from "next/head";
import { HeaderLabel } from "@/components/HeaderLabel";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import { FlipWords } from "@/components/ui/flip-words";
import FooterLayout from "@/components/FooterLayout";
import Header from "@/components/Header";
import { useUser } from "@/support/UserContext";
import { useTheme } from "@/components/theme-provider";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function Home() {
  const [linkDestination, setLinkDestination] = useState("");
  const words = ["Caring", "Relatable", "Genuine", "Empathetic", "Playful"];
  const { userDetails } = useUser();
  const { theme } = useTheme();

  // Force re-render when theme changes
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (userDetails?.name) {
      setLinkDestination("/details?filter=Spiritual%20Guide");
    } else {
      setLinkDestination("/signup?filter=Spiritual%20Guide");
    }
  }, [userDetails?.name]);

  // Add debugging
  useEffect(() => {
    console.log("Theme changed to:", theme);
  }, [theme]);

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <>
      <Head>
        <title>Culturevo | Meet NOVI - Your AI Companion</title>
        <meta
          name="description"
          content="Connect with NOVI, your culturally and emotionally intelligent AI companion developed by Culturevo. Experience conversations that feel real, supportive, and personalized."
        />
        <meta
          name="keywords"
          content="AI companion, Culturevo, NOVI AI, emotional AI, chat companion, virtual friend"
        />
        <meta
          property="og:title"
          content="Meet NOVI - Your AI Companion | Culturevo"
        />
        <meta
          property="og:description"
          content="Culturevo introduces NOVI - a caring, relatable, and empathetic AI companion you can truly connect with."
        />
        <meta property="og:url" content="http://localhost:3000/" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div
        suppressHydrationWarning
        className={`w-screen font-[family-name:var(--font-garamond)] overflow-x-hidden min-h-screen transition-colors duration-200 
        ${theme === "dark" ? "bg-gray-900 text-white" : "bg-[#FFFBF7]"}
      `}
      >
        {/* Animated background elements */}
        <div className="fixed inset-0 -z-0 h-screen w-screen overflow-hidden">
          {theme === "dark" ? (
            <>
              <div className="absolute w-[500px] h-[500px] bg-pink-900 rounded-full blur-[150px] top-10 left-20 opacity-50"></div>
              <div className="absolute w-[500px] h-[500px] bg-orange-900 rounded-full blur-[150px] bottom-10 left-20 opacity-50"></div>
              <div className="absolute w-[500px] h-[500px] bg-pink-900 rounded-full blur-[150px] top-10 right-20 opacity-50"></div>
              <div className="absolute w-[500px] h-[500px] bg-orange-900 rounded-full blur-[150px] bottom-10 right-20 opacity-50"></div>
            </>
          ) : (
            <div className="fixed inset-0 overflow-hidden">
              <BackgroundGradientAnimation />
            </div>
          )}
        </div>

        {/* Hero Section with Gradient Background */}
        <section className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center gap-12 text-center px-4 sm:px-6 md:px-8">
          {/* Navbar */}
          <Header />

          {/* Hero Content */}
          <div className="text-center mt-12 sm:mt-28 w-full">
            <Link href={linkDestination}>
              <HeaderLabel />
            </Link>

            <p
              className={`text-md md:text-xl font-semibold mt-10 sm:mt-10 ${
                theme === "dark" ? "text-white/90" : "text-[#363636]"
              }`}
            >
              CultureVo presents to you
            </p>
            <p
              className={`bg-clip-text text-transparent font-bold drop-shadow-2xl bg-gradient-to-b from-white to-white/20 text-4xl sm:text-6xl md:text-7xl lg:text-8xl mt-4 break-words px-4`}
            >
              NOVI AI
            </p>

            {/* Text animation */}
            <div className="mt-5 w-full px-4">
              <span
                className={`text-center font-bold mt-4 sm:mt-5 text-xl sm:text-2xl md:text-3xl ${
                  theme === "dark" ? "text-white/90" : "text-[#363636]"
                }`}
              >
                Your
              </span>
              <div className="min-w-[100px] sm:min-w-[168px] inline-block">
                <FlipWords
                  words={words}
                  className={`text-center font-bold text-xl sm:text-2xl md:text-3xl ${
                    theme === "dark" ? "text-purple-300" : "text-white"
                  }`}
                />
              </div>
              <span
                className={`text-center font-bold mt-4 sm:mt-5 text-xl sm:text-2xl md:text-3xl ${
                  theme === "dark" ? "text-white/90" : "text-[#363636]"
                }`}
              >
                AI companions from all over the world.
              </span>
            </div>

            {/* Animated text effect */}
            <TextGenerateEffect
              words={"With all the care in the world for you."}
              className={`text-center font-bold sm:mt-5 text-xl sm:text-2xl md:text-3xl ${
                theme === "dark" ? "text-white" : "text-[#363636]"
              }`}
            />

            {/* Button to signup page */}
            <div className="flex flex-row items-center justify-center gap-4 mt-20 sm:mt-20">
              <Link href="/signup">
                <button
                  className={`px-6 py-3 rounded-full text-white text-sm sm:text-base transition-all backdrop-blur-md border ${
                    theme === "dark"
                      ? "bg-gradient-to-r from-purple-400/40 via-pink-400/40 to-orange-400/40 border-gray-700/20 hover:from-purple-400/60 hover:via-pink-400/60 hover:to-orange-400/60"
                      : "bg-[#242124] hover:bg-gradient-to-r from-pink-400 to-orange-400"
                  }`}
                >
                  PERSONA.AI
                </button>
              </Link>
              <Link href="/realtime">
                <button
                  className={`px-6 py-3 rounded-full text-white text-sm sm:text-base transition-all backdrop-blur-md border ${
                    theme === "dark"
                      ? "bg-gradient-to-r from-blue-400/40 via-cyan-400/40 to-teal-400/40 border-gray-700/20 hover:from-blue-400/60 hover:via-cyan-400/60 hover:to-teal-400/60"
                      : "bg-[#242124] hover:bg-gradient-to-r from-blue-400 to-cyan-400"
                  }`}
                >
                  REALTIME.AI
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          className={`relative z-10 pt-16 sm:pt-20 px-4 sm:px-6 md:px-8 pb-20 sm:pb-40 w-full ${
            theme === "dark"
              ? "bg-gray-900/50 backdrop-blur-sm border-t border-gray-800"
              : "bg-[#FFFBF7]/80 backdrop-blur-sm border-t border-gray-200"
          }`}
        >
          <h2
            className={`text-2xl sm:text-3xl font-bold text-center mb-10 sm:mb-16 ${
              theme === "dark" ? "text-white" : "text-[#242124]"
            }`}
          >
            Your NOVI is
          </h2>

          {/* Feature Cards */}
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                title: "Culturally Intelligent",
                text: "Your Novi is culturally adept to the city they belong to. They know the city like a local - its personality, offerings, and challenges.",
              },
              {
                title: "Emotionally Intelligent",
                text: "NOVI will understand you like no other. Discuss your life's dreams, hopes, fears, and goals with them. They will care for you, for who you are!",
              },
              {
                title: "Always there for you",
                text: "Treat your NOVI as your constant source for emotional sustenance. They are always available for you, when the world might not be.",
              },
            ].map(({ title, text }, index) => (
              <div
                key={index}
                className={`py-8 sm:py-12 px-6 sm:px-8 md:px-10 rounded-xl shadow-lg transform transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-2xl
                ${
                  theme === "dark"
                    ? "bg-gray-800/80 backdrop-blur-md border border-gray-700/50 text-white"
                    : "bg-white/90 backdrop-blur-sm border border-gray-200/50 text-gray-800"
                }`}
              >
                <h3
                  className={`font-semibold text-center text-xl mb-4 ${
                    theme === "dark" ? "text-white" : "text-gray-800"
                  }`}
                >
                  {title}
                </h3>
                <p
                  className={`text-base sm:text-lg ${
                    theme === "dark" ? "text-gray-200" : "text-gray-600"
                  }`}
                >
                  {text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <FooterLayout />
        <style jsx global>{`
          .theme-toggle {
            z-index: 9999 !important;
            pointer-events: auto !important;
          }
          html,
          body {
            overflow-x: hidden;
            width: 100%;
            position: relative;
          }
        `}</style>
      </div>
    </>
  );
}
