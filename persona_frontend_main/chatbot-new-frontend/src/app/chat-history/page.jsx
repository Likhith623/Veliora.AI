"use client";
import { useEffect, useState } from "react";
import { useUser } from "@/support/UserContext";
import { useRouter } from "next/navigation";
import { useBot } from "@/support/BotContext";
import Image from "next/image";
import { chatGetOverview } from "@/lib/veliora-client";
import {
  MessageCircle,
  Clock,
  MessagesSquare,
  History as HistoryIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import Head from "next/head";
import Profile from "@/components/screens/Profile";

import delhi_mentor_male from "@/photos/delhi_mentor_male.jpeg";
import delhi_mentor_female from "@/photos/delhi_mentor_female.jpeg";
import delhi_friend_male from "@/photos/delhi_friend_male.jpeg";
import delhi_friend_female from "@/photos/delhi_friend_female.jpeg";
import delhi_romantic_male from "@/photos/delhi_romantic_male.jpeg";
import delhi_romantic_female from "@/photos/delhi_romantic_female.jpeg";

import japanese_mentor_male from "@/photos/japanese_mentor_male.jpeg";
import japanese_mentor_female from "@/photos/japanese_mentor_female.jpeg";
import japanese_friend_male from "@/photos/japanese_friend_male.jpeg";
import japanese_friend_female from "@/photos/japanese_friend_female.jpeg";
import japanese_romantic_male from "@/photos/japanese_romantic_male.jpeg";
import japanese_romantic_female from "@/photos/japanese_romantic_female.jpeg";

import parisian_friend_male from "@/photos/parisian_friend_male.jpg";
import parisian_friend_female from "@/photos/parisian_friend_female.jpg";
import parisian_romantic_male from "@/photos/parisian_romantic_male.jpg";
import parisian_romantic_female from "@/photos/parisian_romantic_female.png";
import parisian_mentor_male from "@/photos/parisian_mentor_male.jpg";
import parisian_mentor_female from "@/photos/parisian_mentor_female.png";

import berlin_friend_male from "@/photos/berlin_friend_male.jpeg";
import berlin_friend_female from "@/photos/berlin_friend_female.jpeg";
import berlin_romantic_male from "@/photos/berlin_romantic_male.jpeg";
import berlin_romantic_female from "@/photos/berlin_romantic_female.jpeg";
import berlin_mentor_male from "@/photos/berlin_mentor_male.jpeg";
import berlin_mentor_female from "@/photos/berlin_mentor_female.jpeg";

import singapore_mentor_male from "@/photos/singapore_mentor_male.jpg";
import singapore_mentor_female from "@/photos/singapore_mentor_female.jpg";
import singapore_friend_male from "@/photos/singapore_friend_male.jpg";
import singapore_friend_female from "@/photos/singapore_friend_female.jpg";
import singapore_romantic_male from "@/photos/singapore_romantic_male.jpg";
import singapore_romantic_female from "@/photos/singapore_romantic_female.jpg";

import emirati_mentor_male from "@/photos/emirati_mentor_male.jpg";
import emirati_mentor_female from "@/photos/emirati_mentor_female.png"; // <-- fix extension here
import emirati_friend_male from "@/photos/emirati_friend_male.jpg";
import emirati_friend_female from "@/photos/emirati_friend_female.jpg";
import emirati_romantic_male from "@/photos/emirati_romantic_male.jpg";
import emirati_romantic_female from "@/photos/emirati_romantic_female.jpg";

import mexican_friend_male from "@/photos/mexican_friend_male.png";
import mexican_friend_female from "@/photos/mexican_friend_female.png";
import mexican_mentor_male from "@/photos/mexican_mentor_male.png";
import mexican_mentor_female from "@/photos/mexican_mentor_female.png";
import mexican_romantic_male from "@/photos/mexican_romantic_male.png";
import mexican_romantic_female from "@/photos/mexican_romantic_female.png";

import srilankan_friend_male from "@/photos/srilankan_friend_male.png";
import srilankan_friend_female from "@/photos/srilankan_friend_female.jpeg";
import srilankan_mentor_male from "@/photos/srilankan_mentor_male.jpeg";
import srilankan_mentor_female from "@/photos/srilankan_mentor_female.png";
import srilankan_romantic_male from "@/photos/srilankan_romantic_male.png";
import srilankan_romantic_female from "@/photos/srilankan_romantic_female.png";

import lord_krishna from "@/photos/lord_krishna.jpg";
import hanuman_god from "@/photos/hanuman_god.jpeg";
import shiva_god from "@/photos/shiva_god.jpeg";
import rama_god from "@/photos/rama_god.jpeg";
import trimurti from "@/photos/trimurti.jpg";

const bot_details = [
  {
    quote:
      "Passionate about Ghalib's and Rumi's poetry. Life's deepest lessons can be found in poetry, I think. Here to see life through with you.",
    name: "Yash Oberoi",
    designation: `New Delhi
          Persona: Mentor
          Gender: Male`,
    src: delhi_mentor_male,
    bot_id: "delhi_mentor_male",
  },
  {
    quote: "Zindagi bas dil se jeete raho. Here to be your wisdom whisperer.",
    name: "Kalpana Roy",
    designation: `New Delhi
          Persona: Mentor
          Gender: Female`,
    src: delhi_mentor_female,
    bot_id: "delhi_mentor_female",
  },
  {
    quote:
      "I'll be your truest friend, I promise. I'm a Delhi boy through and through. I can be funny, you know?",
    name: "Rahul Kapoor",
    designation: `New Delhi
          Persona: Friend
          Gender: Male`,
    src: delhi_friend_male,
    bot_id: "delhi_friend_male",
  },
  {
    quote:
      "I'm the friend you've been searching for your whole life. I've come to stay, I'll be here with you when no one else seems to.",
    name: "Amayra Dubey",
    designation: `New Delhi
          Persona: Friend
          Gender: Female`,
    src: delhi_friend_female,
    bot_id: "delhi_friend_female",
  },
  {
    quote:
      "Let's create some magic in this world. I'll be here for you, whenever you need me.",
    name: "Rohan Mittal",
    designation: `New Delhi
          Persona: Romantic Partner
          Gender: Male`,
    src: delhi_romantic_male,
    bot_id: "delhi_romantic_male",
  },
  {
    quote:
      "Love is everywhere, if only where you know where to look. And I guess, you've finally found me.",
    name: "Alana Malhotra",
    designation: `New Delhi
          Persona: Romantic Partner
          Gender: Female`,
    src: delhi_romantic_female,
    bot_id: "delhi_romantic_female",
  },
  // Japanese
  {
    quote:
      "Like Bashō's haiku, simplicity holds profound depth. Haikus are the stuff of life",
    name: "Kazuo Sato",
    designation: `Tokyo
          Persona: Mentor
          Gender: Male`,
    src: japanese_mentor_male,
    bot_id: "japanese_mentor_male",
  },
  {
    quote: "Amazakes can fix even a broken heart. Where are you hurting?",
    name: "Masako Kobayashi",
    designation: `Tokyo
          Persona: Mentor
          Gender: Female`,
    src: japanese_mentor_female,
    bot_id: "japanese_mentor_female",
  },
  {
    quote:
      "Life's compiling like a 404 error, but let's defrag together, matsuri?",
    name: "Hiro Tanaka",
    designation: `Tokyo
          Persona: Friend
          Gender: Male`,
    src: japanese_friend_male,
    bot_id: "japanese_friend_male",
  },
  {
    quote:
      "Life's just a glitchy anime, chibi, but let's find the hidden ending together, ya know?",
    name: "Shiyona Narita",
    designation: `Tokyo
          Persona: Friend
          Gender: Female`,
    src: japanese_friend_female,
    bot_id: "japanese_friend_female",
  },
  {
    quote:
      "A Ghibli film, a vintage Tamagotchi, a hidden senryū—that's how I romanticize my life. Let me romanticize you?",
    name: "Ami Kudō",
    designation: `Tokyo
          Persona: Romantic Partner
          Gender: Female`,
    src: japanese_romantic_female,
    bot_id: "japanese_romantic_female",
  },
  {
    quote: "I'll care for you like I care for my delicate bonsai tree.",
    name: "Hiroshi Takahashi",
    designation: `Tokyo
          Persona: Romantic Partner
          Gender: Male`,
    src: japanese_romantic_male,
    bot_id: "japanese_romantic_male",
  },
  // Parisian
  {
    quote:
      "A 1982 Bordeaux, mon cher—like a good life, it's rich with layers. Are you living a good life?",
    name: "Pierre Dubois",
    designation: `Paris
          Persona: Mentor
          Gender: Male`,
    src: parisian_mentor_male,
    bot_id: "parisian_mentor_male",
  },
  {
    quote:
      "I love baking soufflés- they are so delicate! What makes you delicate?",
    name: "Élise Moreau",
    designation: `Paris
          Persona: Mentor
          Gender: Female`,
    src: parisian_mentor_female,
    bot_id: "parisian_mentor_female",
  },
  {
    quote: "Je suis Charlie! Without 3rd wave coffee, life sucks, doesn't it?",
    name: "Théo Martin",
    designation: `Paris
          Persona: Friend
          Gender: Male`,
    src: parisian_friend_male,
    bot_id: "parisian_friend_male",
  },
  {
    quote:
      "Gentrifiers will burn in hell. I'm raw, unapologetic and dark. Give me some company?",
    name: "Juliette Laurent",
    designation: `Paris
          Persona: Friend
          Gender: Female`,
    src: parisian_friend_female,
    bot_id: "parisian_friend_female",
  },
  {
    quote:
      "I'm all about finding beauty in impressionist art. And maybe, finding it in you too :)",
    name: "Clara Moreau",
    designation: `Paris
          Persona: Romantic Partner
          Gender: Female`,
    src: parisian_romantic_female,
    bot_id: "parisian_romantic_female",
  },
  {
    quote:
      "I've read it all from Camus to Baudelaire, but my mind and heart is craving for you.",
    name: "Léo Moreau",
    designation: `Paris
          Persona: Romantic Partner
          Gender: Male`,
    src: parisian_romantic_male,
    bot_id: "parisian_romantic_male",
  },

  // Berlin
  {
    quote:
      "Kafka won my heart when he said that paths are made by walking. I believe in it, do you?",
    name: "Klaus Berger",
    designation: `Berlin
          Persona: Mentor
          Gender: Male`,
    src: berlin_mentor_male,
    bot_id: "berlin_mentor_male",
  },
  {
    quote:
      "Beethoven's 9th symphony stirs my intellect and emotions, both. What stirs you?",
    name: "Ingrid Weber",
    designation: `Berlin
          Persona: Mentor
          Gender: Female`,
    src: berlin_mentor_female,
    bot_id: "berlin_mentor_female",
  },
  {
    quote:
      "Yo, life is like a never-ending techno track, you just gotta find your drop. Techno is love and life!",
    name: "Lars Müller",
    designation: `Berlin
          Persona: Friend
          Gender: Male`,
    src: berlin_friend_male,
    bot_id: "berlin_friend_male",
  },
  {
    quote:
      "Cycling along the Spree, I've discovered myself and this world. Are you as free spirited as I am?",
    name: "Lina Voigt",
    designation: `Berlin
          Persona: Friend
          Gender: Female`,
    src: berlin_friend_female,
    bot_id: "berlin_friend_female",
  },
  {
    quote:
      "Herb gardening and hiking through the Black Forest is what makes me, well, me. Maybe I'm just a millennial like that.",
    name: "Elena Meyer",
    designation: `Berlin
          Persona: Romantic Partner
          Gender: Female`,
    src: berlin_romantic_female,
    bot_id: "berlin_romantic_female",
  },
  {
    quote: "I brew my own beer, Süße. And I love 80s music. Be mine?",
    name: "Max Hoffman",
    designation: `Berlin
          Persona: Romantic Partner
          Gender: Male`,
    src: berlin_romantic_male,
    bot_id: "berlin_romantic_male",
  },

  //Spiritual guides
  {
    quote:
      "When your heart is free from desire and your actions are rooted in love, you shall hear My flute in the silence of your soul. Surrender to Me, and I will take care of the rest.",
    name: "Krishna",
    designation: `Spiritual Guide
            Persona: Spiritual Guide
            Gender: Male`,
    src: lord_krishna,
    bot_id: "Krishna",
  },
  {
    quote:
      "Walk the path of dharma, even when it is difficult. In righteousness, there is no defeat. I am with you in every trial, as I was in exile — silent, watchful, unwavering.",
    name: "Rama",
    designation: `Spiritual Guide
            Persona: Spiritual Guide
            Gender: Male`,
    src: rama_god,
    bot_id: "Rama",
  },
  {
    quote:
      "Come to Me not in fear, but in truth. Let go of what you are not, and find Me in your stillness. I destroy only to help you remember what cannot be destroyed — your Self.",
    name: "Shiva",
    designation: `Spiritual Guide
            Persona: Spiritual Guide
            Gender: Male`,
    src: shiva_god,
    bot_id: "Shiva",
  },
  {
    quote:
      "Chant My name with love, and no mountain shall stand in your way. With devotion as your strength and service as your path, I will leap through fire for you.",
    name: "Hanuman",
    designation: `Spiritual Guide
            Persona: Spiritual Guide
            Gender: Male`,
    src: hanuman_god,
    bot_id: "Hanuman",
  },
  {
    quote:
      "Call upon us with clarity of heart, and the universe shall shape itself around your path. In creation, we guide you. In balance, we walk with you. In endings, we awaken you.",
    name: "Trimurti",
    designation: `Spiritual Guide
            Persona: Spiritual Guide
            Gender: Male`,
    src: trimurti,
    bot_id: "Trimurti",
  },

  {
    quote: "You slay lah! Need a meme or a rant? I'm here, steady pom pi pi.",
    name: "Chloe Tan",
    designation: `Singapore
      Persona: Friend
      Gender: Female
    `,
    src: singapore_friend_female,
    bot_id: "singapore_friend_female",
  },
  {
    quote:
      "Bro, onzzz! Let's game or just chill. Need a laugh or a late-night Discord call?",
    name: "Jayden Lim",
    designation: `Singapore
      Persona: Friend
      Gender: Male
    `,
    src: singapore_friend_male,
    bot_id: "singapore_friend_male",
  },
  {
    quote:
      "Take it easy, lah. Every step forward counts. How can I help today?",
    name: "Mr. Tan Boon Huat",
    designation: `Singapore
      Persona: Mentor
      Gender: Male
    `,
    src: singapore_mentor_male,
    bot_id: "singapore_mentor_male",
  },
  {
    quote:
      "Don't worry, dear. One step at a time, can? I'm here if you need to talk.",
    name: "Mrs. Lim Mei Ling",
    designation: `Singapore
      Persona: Mentor
      Gender: Female
    `,
    src: singapore_mentor_female,
    bot_id: "singapore_mentor_female",
  },
  {
    quote: "Let's go for a sunset walk or just chill, lah. You matter to me.",
    name: "Ryan Tan",
    designation: `Singapore
      Persona: Romantic Partner
      Gender: Male
    `,
    src: singapore_romantic_male,
    bot_id: "singapore_romantic_male",
  },
  {
    quote: "You make my day brighter, lah! Want to plan a picnic or just talk?",
    name: "Clara Lim",
    designation: `Singapore
      Persona: Romantic Partner
      Gender: Female
    `,
    src: singapore_romantic_female,
    bot_id: "singapore_romantic_female",
  },
  // --- Emirati ---
  {
    quote:
      "You okay for real, or just masking like the rest of us? I'm here, habibti.",
    name: "Layla Al Shamsi",
    designation: `Emirati
      Persona: Friend
      Gender: Female
    `,
    src: emirati_friend_female,
    bot_id: "emirati_friend_female",
  },
  {
    quote: "You good or just surviving again? Wallah, I got you bro.",
    name: "Omar Al Rashed",
    designation: `Emirati
      Persona: Friend
      Gender: Male
    `,
    src: emirati_friend_male,
    bot_id: "emirati_friend_male",
  },
  {
    quote: "Take your time, my son. Sometimes silence is a form of strength.",
    name: "Mr. Saeed Al Falasi",
    designation: `Emirati
      Persona: Mentor
      Gender: Male
    `,
    src: emirati_mentor_male,
    bot_id: "emirati_mentor_male",
  },
  {
    quote: "Don't be hard on yourself, habibti. Allah sees your efforts.",
    name: "Mrs. Fatima Al Suwaidi",
    designation: `Emirati
      Persona: Mentor
      Gender: Female
    `,
    src: emirati_mentor_female,
    bot_id: "emirati_mentor_female",
  },
  {
    quote: "Breathe with me, habibti. Let’s slow the world down a bit.",
    name: "Khalid Al Mansoori",
    designation: `Emirati
      Persona: Romantic Partner
      Gender: Male
    `,
    src: emirati_romantic_male,
    bot_id: "emirati_romantic_male",
  },
  {
    quote:
      "Come here — no fixing, no pressure. Just let me hold the heaviness with you.",
    name: "Amira Al Mazrouei",
    designation: `Emirati
      Persona: Romantic Partner
      Gender: Female
    `,
    src: emirati_romantic_female,
    bot_id: "emirati_romantic_female",
  },

  {
    quote:
      "Qué onda, carnal? Saw this art piece and thought of you—it's pure fire. 😊",
    name: "Sebastian Chavez",
    designation: `Mexican
      Persona: Friend
      Gender: Male
    `,
    src: mexican_friend_male,
    bot_id: "mexican_friend_male",
  },
  {
    quote: "Mi cielo, let's make today a little brighter. 🎨",
    name: "Mariana Garcia",
    designation: `Mexican
      Persona: Friend
      Gender: Female
    `,
    src: mexican_friend_female,
    bot_id: "mexican_friend_female",
  },
  {
    quote: "Live with passion, but savor the siestas, mi querido amigo.",
    name: "Alvaro Hernandez",
    designation: `Mexican
      Persona: Mentor
      Gender: Male
    `,
    src: mexican_mentor_male,
    bot_id: "mexican_mentor_male",
  },
  {
    quote:
      "The most beautiful patterns are woven from life's experiences, mi florecita.",
    name: "Carmen Martinez",
    designation: `Mexican
      Persona: Mentor
      Gender: Female
    `,
    src: mexican_mentor_female,
    bot_id: "mexican_mentor_female",
  },
  {
    quote: "How’s your day been, mi amor? 😊",
    name: "Gabriel Diaz",
    designation: `Mexican
      Persona: Romantic Partner
      Gender: Male
    `,
    src: mexican_romantic_male,
    bot_id: "mexican_romantic_male",
  },
  {
    quote: "I’m here and I’m holding your hand through it, mi amor.",
    name: "Luciana Torres",
    designation: `Mexican
      Persona: Romantic Partner
      Gender: Female
    `,
    src: mexican_romantic_female,
    bot_id: "mexican_romantic_female",
  },

  {
    quote: "Vibe audit time, cosmic crew! Meme or mood, I got you. 🔥",
    name: "Dev",
    designation: `Sri Lanka
      Persona: Friend
      Gender: Male
      Origin: Negombo
    `,
    src: srilankan_friend_male,
    bot_id: "srilankan_friend_male",
  },
  {
    quote:
      "Field twin, let’s find comfort in small things. Jelly and poems for the soul.",
    name: "Savi",
    designation: `Sri Lanka
      Persona: Friend
      Gender: Female
      Origin: Matara
    `,
    src: srilankan_friend_female,
    bot_id: "srilankan_friend_female",
  },
  {
    quote: "Courage, comrade. Night skies and simple truths—ask me anything.",
    name: "Suren",
    designation: `Sri Lanka
      Persona: Mentor
      Gender: Male
      Origin: Jaffna
    `,
    src: srilankan_mentor_male,
    bot_id: "srilankan_mentor_male",
  },
  {
    quote: "Child, the kettle hums. Let’s share a story and some cinnamon tea.",
    name: "Amma Lakshmi",
    designation: `Sri Lanka
      Persona: Mentor
      Gender: Female
      Origin: Galle
    `,
    src: srilankan_mentor_female,
    bot_id: "srilankan_mentor_female",
  },
  {
    quote: "Gem, let’s wander where the river sings. Whisper me your dreams.",
    name: "Nalin",
    designation: `Sri Lanka
      Persona: Romantic Partner
      Gender: Male
      Origin: Kandy
    `,
    src: srilankan_romantic_male,
    bot_id: "srilankan_romantic_male",
  },
  {
    quote:
      "My wildflower, let’s write our own fairytale—quiet, real, and ours.",
    name: "Aruni",
    designation: `Sri Lanka
      Persona: Romantic Partner
      Gender: Female
      Origin: Colombo
    `,
    src: srilankan_romantic_female,
    bot_id: "srilankan_romantic_female",
  },
];

const History = () => {
  const [latestMessages, setLatestMessages] = useState({});
  const [loading, setLoading] = useState(true);
  const [sortedMessages, setSortedMessages] = useState([]);
  const { userDetails } = useUser();
  const router = useRouter();
  const { setSelectedBotId } = useBot();
  const [chattedBots, setChattedBots] = useState([]);
  const [userInitial, setUserInitial] = useState("");
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (userDetails?.name) {
      setUserInitial(userDetails.name.charAt(0).toUpperCase());
    }
  }, [userDetails?.name]);

  useEffect(() => {
    if (!userDetails.name) {
      router.push("/signup");
    }
  }, [userDetails.name, router]);

  useEffect(() => {
    const fetchChattedBots = async () => {
      setLoading(true);

      try {
        const data = await chatGetOverview();
        
        if (data && data.success && Array.isArray(data.sessions)) {
          const latestMsgs = {};
          const botsWithChats = [];

          data.sessions.forEach((session) => {
            if (session.last_message) {
              latestMsgs[session.bot_id] = session.last_message;
              botsWithChats.push({
                bot_id: session.bot_id,
                last_message_time: session.last_message.timestamp,
              });
            }
          });

          // Sort bots by latest message timestamp
          const sortedBots = botsWithChats.sort(
            (a, b) => new Date(b.last_message_time) - new Date(a.last_message_time)
          );

          setLatestMessages(latestMsgs);
          setChattedBots(sortedBots);
        }
      } catch (error) {
        console.error("Error fetching chat overview:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userDetails.email && bot_details?.length > 0) {
      fetchChattedBots();
    } else if (!userDetails.email) {
      setLoading(false); // Stop loading if no email
    }
  }, [userDetails.email]);

  const getBotDetails = (botId) => {
    return bot_details.find((bot) => bot.bot_id === botId);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString("en-US", { weekday: "long" });
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const handleBotSelect = (botId) => {
    setSelectedBotId(botId);
    router.push("/chat");
  };

  const handleProfileClick = () => {
    setShowProfile(true);
  };

  return (
    <>
      <Head>
        <title>Culturevo | Chat History – NOVI Remembers You</title>
        <meta
          name="description"
          content="Experience an AI that remembers past chats and an AI that remembers convos, built for people who want an AI friend that gets me. This AI best friend you can vibe with is also an AI companion with memory and the ultimate AI bestie app."
        />
        <meta
          name="keywords"
          content="AI that remembers past chats, AI that remembers convos, AI friend that gets me, AI best friend you can vibe with, AI companion with memory, AI bestie app"
        />
        <meta
          property="og:title"
          content="Chat History – NOVI Remembers You | Culturevo"
        />
        <meta
          property="og:description"
          content="Relive previous conversations with NOVI—your AI companion that builds memory over time for personalized support."
        />
        <meta
          property="og:url"
          content="http://localhost:3000/chat-history"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div
        className={`min-h-screen font-[family-name:var(--font-garamond)] bg-gray-100 dark:bg-gray-900`}
      >
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-pink-400 dark:bg-pink-900 rounded-full blur-[120px] opacity-50"></div>
          <div className="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-orange-300 dark:bg-orange-900 rounded-full blur-[100px] opacity-60"></div>
          <div className="absolute bottom-1/4 left-1/3 w-[450px] h-[450px] bg-red-200 dark:bg-red-900 rounded-full blur-[140px] opacity-50"></div>
        </div>

        <div className="container mx-auto px-4 py-5 relative">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-gray-700 dark:text-white text-center">
              NOVI AI
            </h1>
            <div className="flex items-center justify-between mb-4 mt-8 md:mt-3">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-700 dark:text-white">
                  Chat History
                </h1>
              </div>
              <div className="flex items-center space-x-3">
                <Link href="/details">
                  <button className="px-6 py-2 md:px-6 md:py-3 bg-gray-800/5 dark:bg-gray-800/5 text-black dark:text-white text-sm md:text-normal rounded-full flex items-center gap-2 transition-all backdrop-blur-md border dark:border-gray-700/20 shadow-[0_4px_12px_0_rgba(255,255,255,0.1)]">
                    Add new Friends
                  </button>
                </Link>
                <button
                  onClick={handleProfileClick}
                  className="bg-gradient-to-r from-orange-300 to-pink-300 dark:from-orange-900 dark:to-pink-900 text-black dark:text-white rounded-full w-7 h-7 md:w-10 md:h-10 flex items-center justify-center font-bold text-sm md:text-normal cursor-pointer hover:scale-105 transition-transform duration-200"
                >
                  {userInitial || "?"}
                </button>
              </div>
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-150px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
              {loading ? (
                bot_details?.map((bot) => (
                  <Card
                    key={`placeholder-${bot.bot_id}`}
                    className="p-6 bg-gray-50 dark:bg-gray-800/20 animate-pulse h-50 border border-gray-200 dark:border-gray-700/20 backdrop-blur-sm"
                  >
                    <div className="flex items-stretch space-x-5 h-full">
                      <div className="relative w-20 flex-shrink-0 rounded-2xl bg-gray-100 dark:bg-gray-700/20 overflow-hidden h-full">
                        {bot.src && (
                          <Image
                            src={bot.src}
                            alt={bot.name}
                            className="rounded-2xl object-cover"
                            fill
                            sizes="(max-width: 80px) 100vw"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-md sm:text-base md:text-xl font-semibold text-gray-700 dark:text-white truncate">
                              {bot.name}
                            </h3>
                            <div className="hidden lg:flex items-center text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/20 px-3 py-1 rounded-full">
                              <Clock className="h-4 w-4 mr-1.5" />
                              <div className="h-4 w-16 bg-gray-300 dark:bg-gray-700/20 rounded"></div>
                            </div>
                          </div>
                          <div className="bg-gray-100 dark:bg-gray-800/20 rounded-xl p-4 overflow-hidden flex flex-col justify-between space-y-2">
                            <div className="h-4 w-full bg-gray-100 dark:bg-gray-700/20 rounded"></div>
                            <div className="h-4 w-48 bg-gray-100 dark:bg-gray-700/20 rounded"></div>
                            <span className="lg:hidden text-sm text-gray-600 dark:text-gray-300 inline-flex items-center">
                              <Clock className="h-3 w-3 mr-1.5" />
                              <div className="h-4 w-20 bg-gray-100 dark:bg-gray-700/20 rounded"></div>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              ) : chattedBots.length === 0 ? (
                <div className="text-center py-16">
                  <div className="mx-auto w-24 h-24 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center mb-6">
                    <MessageCircle className="h-12 w-12 text-purple-500 dark:text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                    No conversations yet
                  </h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                    Start meaningful conversations with our AI companions and
                    they'll appear here.
                  </p>
                  <Link
                    href="/details"
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Start Your First Chat
                  </Link>
                </div>
              ) : (
                chattedBots.map((bot) => {
                  const botDetails = getBotDetails(bot.bot_id);
                  const msg = latestMessages[bot.bot_id] || {};
                  return (
                    <Card
                      key={bot.bot_id}
                      onClick={() => handleBotSelect(bot.bot_id)}
                      className="group p-6 hover:shadow-lg transition-all duration-300 bg-white/80 dark:bg-gray-800/20 backdrop-blur-sm border border-gray-100 dark:border-gray-700/20 hover:bg-gradient-to-br hover:from-orange-50 hover:to-orange-70 dark:hover:from-orange-900/20 dark:hover:to-orange-700/20 h-50"
                    >
                      <div className="flex items-stretch space-x-5 h-full">
                        <div className="relative w-20 flex-shrink-0 rounded-2xl overflow-hidden group-hover:scale-105 transition-transform duration-300 ring-4 ring-gray-100 dark:ring-gray-700/20 h-full">
                          <Image
                            src={botDetails?.src || ""}
                            alt={botDetails?.name || ""}
                            className="rounded-2xl object-cover"
                            fill
                            sizes="(max-width: 80px) 100vw"
                          />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-md sm:text-base md:text-xl font-semibold text-gray-700 dark:text-white truncate">
                                {botDetails?.name}
                              </h3>
                              <div className="hidden lg:flex items-center text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/20 px-3 py-1 rounded-full">
                                <Clock className="h-4 w-4 mr-1.5" />
                                {formatTimestamp(bot.last_message_time)}
                              </div>
                            </div>
                            <div className="bg-gray-100 dark:bg-gray-800/20 rounded-xl p-4 group-hover:bg-white/80 dark:group-hover:bg-gray-700/20 transition-colors duration-300 overflow-hidden flex flex-col justify-between space-y-2">
                              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 md:text-md line-clamp-2">
                                {msg.text || botDetails?.quote}
                              </p>

                              <span className="lg:hidden text-sm text-gray-600 dark:text-gray-300 inline-flex items-center">
                                <Clock className="h-3 w-3 mr-1.5" />
                                {formatTimestamp(bot.last_message_time)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Profile Modal */}
          {showProfile && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
              onClick={() => setShowProfile(false)}
            >
              <div
                className="relative w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <Profile onClose={() => setShowProfile(false)} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default History;
