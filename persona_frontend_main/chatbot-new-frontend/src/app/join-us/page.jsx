"use client"
import React from "react";
import {
  Brain,
  Code,
  Database,
  Layout,
  ArrowRight,
  BookOpen,
  Clock,
} from "lucide-react";
import CoreValues from "@/components/CoreValues";
import FooterLayout from "@/components/FooterLayout";
import Header from "@/components/Header";
import { useRef } from "react";
import Head from "next/head";

const jobPostings = [
  {
    title: "Intern - Data Scientist",
    icon: Brain,
    description:
      "Join our data science team to develop cutting-edge AI models for emotional intelligence and memory systems.",
    link: "https://tally.so/r/w4OX2r",
    color: "from-[#F6EFFF] to-[#FFF1F1]",
  },
  {
    title: "Intern - Full Stack Engineer",
    icon: Code,
    description:
      "Build scalable applications that power our AI companion platform from front to back.",
    link: "https://tally.so/r/wA9Ply",
    color: "from-[#FFF1F1] to-[#FFF7F5]",
  },
  {
    title: "Intern - Backend Engineer",
    icon: Database,
    description:
      "Design and implement robust backend systems for our memory-augmented conversational AI.",
    link: "https://tally.so/r/3NP5V0",
    color: "from-[#F6EFFF] to-[#FFF7F5]",
  },
  {
    title: "Intern - Frontend Engineer",
    icon: Layout,
    description:
      "Create beautiful and intuitive interfaces for our AI companion platform.",
    link: "https://tally.so/r/3qzZPg",
    color: "from-[#FFF1F1] to-[#F6EFFF]",
  },
];

function WorkAreaCard({ icon: Icon, title, description }) {
  return (
    <div className="bg-gradient-to-r from-orange-200 to-pink-200 min-h-[350px] rounded-lg p-6 md:p-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
      <div className="bg-white/40 rounded-full w-10 h-10 flex items-center justify-center mb-6">
        <Icon className="w-5 h-5 text-gray-800" />
      </div>
      <h3 className="text-2xl md:text-2xl font-bold mb-4 text-gray-800">
        {title}
      </h3>
      <p className="text-base text-justify md:text-xl text-gray-700 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function JobCard({ title, icon: Icon, description, link }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-300 hover:border-gray-300 hover:shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-r from-orange-50 to-pink-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative p-6 md:p-8">
        <div className="mb-4">
          <Icon className="h-8 w-8 text-gray-600" />
        </div>

        <div className="mb-6">
          <h3 className="text-lg md:text-2xl font-semibold text-gray-900 mb-3">
            {title}
          </h3>
          <p className="text-base text-justify md:text-xl text-gray-600">{description}</p>
        </div>

        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm md:text-base font-medium text-gray-900 group-hover:text-[#7F56D9]"
        >
          Apply Now
          <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </a>
      </div>
    </div>
  );
}

export default function Careers() {
  
  const sectionRef = useRef(null);
  const scrollToSection = () => {
    sectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <>
      <Head>
        <title>Veliora | Join VELIORA – Your Gen Z AI Friend</title>
        <meta
          name="description"
          content="Join us to meet your Gen Z AI chatbot and explore a whole new world of aesthetic AI companion interaction. Our AI best friend you can vibe with feels like talking to an AI like Snapchat streaks. Enjoy the Gen Z AI girlfriend/boyfriend experience and talk to an AI like a friend."
        />
        <meta
          name="keywords"
          content="Gen Z AI chatbot, Aesthetic AI companion, AI best friend you can vibe with, Talk to an AI like Snapchat streaks, Gen Z AI girlfriend/boyfriend, Talk to an AI like a friend"
        />
        <meta
          property="og:title"
          content="Join VELIORA – Your Gen Z AI Friend | Veliora"
        />
        <meta
          property="og:description"
          content="Become part of our community and vibe with a culturally tuned, emotionally intuitive AI for Gen Z connection."
        />
        <meta property="og:url" content="http://localhost:3000/join-us" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen font-[family-name:var(--font-garamond)]  bg-[#FFFBF7]">
        {/* Header */}
        <Header />

        <section className="pt-32 min-h-screen md:pt-60 px-4 md:px-8 bg-gradient-to-r from-orange-200 to-pink-200">
          <div className="max-w-7xl mx-auto text-center py-20 md:py-10">
            <h1 className="text-2xl md:text-5xl font-bold text-[#1D2939] mb-6">
              Join Veliora's Team of <br></br> Thinkers and Doers
            </h1>
            <p className="text-base md:text-xl text-[#475467] max-w-3xl mx-auto px-4">
              We're on a mission to create an AI that's more than just smart –
              it's empathetic, remembers your stories, and actually gets you.
              Think of it as your ultimate AI bestie, blending memory-augmented
              convos with agentic workflows to make your life easier and more
              meaningful.
            </p>

            <button
              onClick={scrollToSection}
              className="bg-gray-800 text-white rounded-full py-2 px-4 mt-20 md:py-3 md:px-5 hover:bg-black transition-colors shadow-md hover:shadow-lg duration-200 ease-in-out hover:scale-105 active:scale-95"
            >
              View Open Roles
            </button>
          </div>
        </section>

        {/* About */}
        <section className="px-4 min-h-screen md:px-8 py-16 md:py-24 bg-white/30 backdrop-blur-sm flex items-center">
          <div className="max-w-7xl mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-start">
              <div className="flex flex-col self-start">
                <h2 className="text-2xl font-semibold mb-10 lg:mb-0 lg:min-h-[150px] md:text-5xl text-[#1D2939]">
                  About Veliora
                </h2>
                <p className="text-[#475467] text-justify lg:min-h-[200px] text-base md:text-xl">
                  Veliora is all about reimagining personal AI companionship.
                  We're at the intersection of long-term memory systems,
                  autonomous agents, and emotionally intelligent interactions.
                  Our goal? To create an AI that's not just useful but genuinely
                  supportive and engaging.
                </p>
              </div>
              <div className="flex flex-col self-start">
                <p className="text-[#475467] text-justify lg:min-h-[150px] text-base md:text-xl">
                  We're still in the early stages (like, super early –
                  bootstrapped and pre-launch), so this is your chance to jump
                  in, make a huge impact, and help define how AI can truly
                  support people in their daily lives.
                </p>
                <p className="text-[#475467] text-justify lg:min-h-[200px] text-base md:text-xl">
                  We're a small, research-driven team building cutting-edge tech
                  from the ground up. Think conversational AI, memory networks,
                  RAG (Retrieval-Augmented Generation), and the ReAct framework.
                  But it's not just about the tech – it's about making something
                  that feels human and helps people feel less lonely.
                </p>
              </div>
            </div>
            <div className="bg-gray-800 h-[0.2px] mt-12 md:mt-20"></div>
          </div>
        </section>

        {/* Work Areas */}
        <section className="py-12 md:py-20 px-4 md:px-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl md:text-5xl font-semibold mb-8 md:mb-16 text-[#1D2939]">
              You'll Be Designing & Implementing
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <WorkAreaCard
                icon={BookOpen}
                title="Long-Term Memory"
                description="Build scalable systems that enable the AI to remember life stories and maintain context across conversations, creating truly meaningful interactions."
              />
              <WorkAreaCard
                icon={Clock}
                title="Autonomous Agents"
                description="Develop intelligent pipelines that empower the AI to plan and execute tasks independently, from scheduling reminders to conducting research."
              />
              <WorkAreaCard
                icon={Brain}
                title="Emotional Conversations"
                description="Create sophisticated dialogue models that make interactions with Veliora feel natural, empathetic, and as comfortable as chatting with a close friend."
              />
            </div>
            <p className="text-[#475467] text-justify text-base md:text-2xl md:text-center mt-12 md:mt-36">
              Since we're early-stage, you will be super hands-on. One week you
              might be prototyping a memory retrieval algorithm, and the next
              you could be refining the UX. It's fast-paced, creative, and full
              of opportunities to shape something that could totally change how
              people interact with AI.
            </p>
          </div>
        </section>

        <CoreValues />

        {/* Open Positions */}
        <section
          ref={sectionRef}
          className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-white/50"
        >
          <div className="max-w-7xl mx-auto">
            <div className=" mb-12 md:mb-16">
              <h2 className="text-2xl md:text-4xl font-bold text-[#1D2939] mb-4">
                Open Positions
              </h2>
              <p className="text-base md:text-xl text-[#475467] max-w-7xl mx-auto">
                Join our team and help shape the future of AI companionship
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {jobPostings.map((job, index) => (
                <JobCard key={index} {...job} />
              ))}
            </div>
          </div>
        </section>

        {/* Why Join Us */}
        <section className="py-16 md:py-36 px-4 md:px-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl md:text-4xl font-bold text-[#1D2939] mb-6">
              Why Join Us?
            </h2>
            <p className="text-base text-justify md:text-xl text-[#475467] mb-6 md:mb-8">
              If you're hyped about working at the frontier of AI memory,
              autonomy, and emotional intelligence, this is your chance to make
              a real impact. You'll be building something that could genuinely
              improve people's lives – and you'll be doing it from the ground
              up.
            </p>
            <p className="text-base text-justify md:text-xl text-[#475467]">
              So, if you're ready to dive into the future of personal AI, hit us
              up. Let's create something extraordinary together at Veliora.
            </p>
          </div>
        </section>

        <FooterLayout />
      </div>
    </>
  );
}
