"use client";
import React, { Suspense } from "react";
import { SelectBot } from "@/components/SelectBot";
import { useSearchParams } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import Head from "next/head";
import { motion } from "framer-motion";

// Create a separate component to handle the search parameters
function FilteredBotList({ color }) {
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter");
  const { theme } = useTheme();

  return (
    <SelectBot
      color={theme === "dark" ? "#E5E7EB" : "#1B1B1B"}
      initialFilter={filter}
    />
  );
}

const MainComponent = () => {
  const { theme } = useTheme();

  return (
    <>
      <Head>
        <title>Veliora | Customize VELIORA – Your AI Partner</title>
        <meta
          name="description"
          content="Create a customizable AI chatbot that adapts to your needs. Select an AI with personality traits and customize your AI’s personality to build an AI BFF with moods and drama. Our AI companion with voice & face also acts as a choose-your-story AI bestie."
        />
        <meta
          name="keywords"
          content="Customizable AI chatbot, AI with personality traits, Customize your AI’s personality, AI BFF with moods and drama, AI companion with voice & face, Choose-your-story AI bestie"
        />
        <meta
          property="og:title"
          content="Customize VELIORA – Your AI Partner | Veliora"
        />
        <meta
          property="og:description"
          content="Personalize VELIORA’s voice, mood, and personality to build the perfect virtual friend tailored to you."
        />
        <meta property="og:url" content="http://localhost:3000/details" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div
        suppressHydrationWarning
        className={`min-h-screen flex ${
          theme === "dark" ? "bg-gray-900" : "bg-gray-100"
        } items-center justify-center p-4 relative overflow-hidden font-[family-name:var(--font-garamond)]`}
      >
        <div className="absolute inset-0 -z-0">
          <div
            className={`absolute w-[500px] h-[500px] ${
              theme === "dark" ? "bg-pink-900" : "bg-pink-400"
            } rounded-full blur-[150px] top-10 left-20 opacity-50`}
          ></div>
          <div
            className={`absolute w-[500px] h-[500px] ${
              theme === "dark" ? "bg-orange-900" : "bg-orange-300"
            } rounded-full blur-[150px] bottom-10 left-20 opacity-50`}
          ></div>

          <div
            className={`absolute w-[500px] h-[500px] ${
              theme === "dark" ? "bg-pink-900" : "bg-pink-400"
            } rounded-full blur-[150px] top-10 right-20 opacity-50`}
          ></div>
          <div
            className={`absolute w-[500px] h-[500px] ${
              theme === "dark" ? "bg-orange-900" : "bg-orange-300"
            } rounded-full blur-[150px] bottom-10 right-20 opacity-50`}
          ></div>
        </div>

        {/* Main content */}
        <div className="relative z-10">
          <Suspense fallback={<div>Loading...</div>}>
            <FilteredBotList />
          </Suspense>
        </div>
      </div>
    </>
  );
};

export default MainComponent;
