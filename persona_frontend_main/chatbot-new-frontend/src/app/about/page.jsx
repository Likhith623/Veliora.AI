'use client';

import React from "react";
import Header from "@/components/Header";
import FooterLayout from "@/components/FooterLayout";
import Image from "next/image";
import Head from "next/head";
import TechBehindTheFeels from "@/photos/TechBehindTheFeels.png";
import Link from "next/link";

function About() {
  return (
    <>
      <Head>
        <title>Veliora | About VELIORA - Your Intelligent AI Companion</title>
        <meta
          name="description"
          content="Our platform offers an AI companion and a virtual AI friend designed to provide emotional support AI. With AI chatbot that remembers me and AI with emotional intelligence, we ensure a realistic AI friend experience for every user."
        />
        <meta
          name="keywords"
          content="AI companion, virtual AI friend, emotional support AI, AI chatbot that remembers me, AI with emotional intelligence, realistic AI friend experience"
        />
        <meta
          property="og:title"
          content="About VELIORA - Your Intelligent AI Companion | Veliora"
        />
        <meta
          property="og:description"
          content="Explore VELIORA's features — emotional intelligence, memory, and realism. A true digital companion for deeper connection."
        />
        <meta property="og:url" content="http://localhost:3000/about" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="font-[family-name:var(--font-garamond)] min-h-screen overflow-x-hidden w-full bg-[#FFFBF7]">
        {/* Header */}
        <Header />
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-orange-200 to-pink-200 flex flex-col py-36 sm:pt-28 md:pt-40 md:min-h-0 md:flex-row md:h-full gap-4 sm:gap-6 md:gap-16 sm:py-20 md:py-48 items-center px-4 sm:px-8 lg:px-36">
          <div className="text-center md:text-left w-full md:w-1/2">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-[#1D2939] inline-block relative">
              About Veliora
            </h1>
            <div className="h-1 bg-gradient-to-r from-pink-300 via-orange-300 to-transparent w-[150px] sm:w-[200px] md:w-[300px] mx-auto md:mx-0 mt-3 sm:mt-4"></div>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-[#475467] mt-4 sm:mt-6">
              Your AI BFF That Actually Gets You
            </h2>
          </div>
          <div className="text-left w-full md:w-1/2">
            <p className="text-sm sm:text-base md:text-xl text-justify text-[#475467]">
              Okay, so Veliora isn't just another AI startup trying to flex
              with fancy tech. Nope, our product Veliora.AI is hella different.
              Meet Veliora.AI, your AI-powered hype person, therapist, and personal
              assistant all rolled into one. It's not just about spitting out
              responses—it's about building a real connection. Think of it as
              that friend who gets you, talks in your vibe, and actually cares.
            </p>
          </div>
        </section>

        {/* Why Veliora hits different Section */}
        <section className="px-4 min-h-screen md:px-8 py-16 md:py-24 bg-white/30 backdrop-blur-sm flex items-center">
          <div className="max-w-7xl mx-auto w-full">
            <h1 className="text-xl sm:text-2xl md:text-4xl font-bold mb-6 sm:mb-8 md:mb-10">
              <h1 className="text-2xl sm:text-3xl md:text-4xl bg-gradient-to-r from-pink-300 via-orange-300 to-pink-300 text-transparent bg-clip-text">
                Why VELIORA hits different
              </h1>
            </h1>
            <p className="text-[#475467] text-base sm:text-base md:text-xl text-justify mb-6 sm:mb-8 md:mb-20">
              We had this idea, from of course the same movie as you're
              thinking, "Her", what if AI could be as supportive as your
              ride-or-die? Like, imagine an AI that doesn't just talk at you but
              truly listens—and remembers. VELIORA AI is designed to grow with you,
              learning your quirks, preferences, and even your mood swings.
              Whether you're ranting about your boss, planning a trip, or just
              need a pick-me-up, Veliora's got your back. It's not just a chatbot;
              it's your emotional sidekick. And here's the kicker: it remembers
              stuff. Like, if you told it weeks ago that you're obsessed with
              Taylor Swift or that your birthday's coming up, it'll bring it up
              at the perfect moment. Early AI bots couldn't do that. Veliora? It's
              got memory game.
            </p>

            <div className="h-[1px] bg-gray-800 w-full"></div>
          </div>
        </section>

        {/* The Tech behind the feels Grid */}
        <section className="px-4 min-h-screen md:px-8 py-16 md:py-24 bg-gradient-to-r from-orange-200 to-pink-200 flex items-center">
          <div className="max-w-7xl mx-auto w-full">
            {/* Section Title */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1D2939] mb-4 sm:mb-6">
              The Tech Behind the Feels
            </h2>
            <p className="text-sm sm:text-base md:text-xl text-justify text-[#475467] max-w-2xl mb-12 sm:mb-16 md:mb-20">
              Now, let's get into the sauce (but don't worry, we'll keep it
              chill). Veliora.AI isn't magic—it's just really smart tech designed
              to be, well, human.
            </p>

            {/* Long-Term Memory & Personalization */}
            <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6 sm:gap-8 md:gap-10">
              <div className="md:px-10">
                <Image
                  src={TechBehindTheFeels}
                  alt="Description of the image"
                  height={450}
                  width={450}
                  className="items-center"
                />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-[#1D2939] mb-3 sm:mb-4">
                  Long-Term Memory & Personalization
                </h3>
                <blockquote className="border-l-4 border-orange-400 pl-4 text-[#475467] italic text-justify text-sm sm:text-base md:text-xl">
                  Human relationships take time to build, and Veliora works the
                  same way. It doesn't just reset after every convo—it remembers
                  you (within your privacy settings, of course). Veliora builds a
                  "persona" for you— like a personality fingerprint. Using
                  retrieval-augmented generation (RAG), Veliora can pull info from
                  the web or its memory to give you accurate, up-to-date
                  answers. Pretty slick, right?
                </blockquote>
              </div>
            </div>

            {/* Agentic Workflows */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] items-center mt-20 sm:mt-32 md:mt-40 gap-6 sm:gap-8 md:gap-10">
              {/* Text Section */}
              <div className="max-w-lg">
                <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-[#1D2939] mb-3 sm:mb-4">
                  Agentic Workflows: Your AI Assistant on Steroids
                </h3>
                <blockquote className="border-l-4 text-justify border-orange-400 pl-4 text-sm sm:text-base md:text-xl text-[#475467] italic">
                  Veliora isn't just here to chat—it's here to get stuff done.
                  Think of it as your personal assistant who's always on top of
                  things. Here's how it works:
                </blockquote>
              </div>

              {/* Cards Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                {[
                  {
                    title: "ReAct",
                    description:
                      "Veliora can think out loud and plan tasks step-by-step. Like, if you ask it to plan a dinner party, it'll break it down: find a recipe, make a shopping list, and even add it to your calendar.",
                  },
                  {
                    title: "Auto-GPT",
                    description:
                      "Inspired by this open-source AI, Veliora can tackle big goals by breaking them into smaller tasks and executing them. You just tell it what you need, and it handles the rest.",
                  },
                  {
                    title: "HuggingGPT",
                    description:
                      "Veliora doesn't work alone—it's like the conductor of an AI orchestra. If it needs to analyze a photo or play a song, it can call in specialized AI models to get the job done.",
                  },
                  {
                    title: "Toolformer",
                    description:
                      "Veliora knows when to use external tools, like a calculator or a calendar, without needing you to micromanage it. It's like having a tech-savvy buddy who knows all the shortcuts.",
                  },
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="border text-justify border-pink-400 p-4 sm:p-5 md:p-6 rounded-xl text-gray-800 shadow-md hover:shadow-lg transition"
                  >
                    <h4 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 mb-2">
                      {feature.title}
                    </h4>
                    <p className="text-sm sm:text-base md:text-lg text-[#475467]">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Future Section */}
        <section className="px-4 md:px-8 py-16 md:py-24 flex items-center">
          <div className="max-w-7xl mx-auto w-full py-20">
            <h2 className="text-2xl text-[#1D2939] sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 ">
              The Future?{" "}
              <span className="text-2xl sm:text-3xl md:text-4xl bg-gradient-to-r from-pink-300 via-orange-300 to-pink-300 text-transparent bg-clip-text">
                It's all about Empathy!
              </span>
            </h2>
            <p className="text-sm text-[#475467] sm:text-base md:text-xl text-justify font-light mb-4 sm:mb-6">
              At <span className="font-semibold">Veliora</span>, we're all
              about making AI that's not just smart but caring. We're constantly
              leveling up Veliora's memory, understanding, and skills to make it
              even more relatable and helpful. The goal? To create a future
              where tech isn't just a tool but a trusted companion that makes
              life a little brighter.
            </p>
            <p className="text-sm sm:text-base md:text-xl font-light mb-6 sm:mb-8 md:mb-2">
              With <span className="font-semibold">Veliora.AI</span>, that future's
              already here—one conversation at a time. So, ready to meet your
              new AI BFF?
            </p>
            <Link href="/signup">
              <button className="bg-gray-800 text-white font-bas px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base md:text-lg rounded-full shadow-md hover:shadow-lg transition-transform duration-200 ease-in-out hover:scale-105 active:scale-95">
                Meet Veliora.AI
              </button>
            </Link>
          </div>
        </section>

        <FooterLayout />
      </div>
    </>
  );
}

export default About;
