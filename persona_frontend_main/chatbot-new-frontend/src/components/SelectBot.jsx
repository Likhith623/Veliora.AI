"use client";
import { AnimatedTestimonials } from "@/components/ui/animated-testimonials";
import { useEffect, useState } from "react";
// import { useRouter, useSearchParams } from "next/navigation"; // Import useRouter and useSearchParams

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


export function SelectBot({ onClose, color, initialFilter }) {
  const [customizedTestimonials, setCustomizedTestimonials] = useState([]);
  const [filteredTestimonials, setFilteredTestimonials] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");
  // const searchParams = useSearchParams(); // Get access to URL query parameters

  const defaultTestimonials = [
    {
      quote:
        "Passionate about Ghalib’s and Rumi’s poetry. Life’s deepest lessons can be found in poetry, I think. Here to see life through with you.",
      name: "Yash Oberoi",
      designation: ` New Delhi
             Persona: Mentor
             Gender: Male
           `,
      src: delhi_mentor_male,
      bot_id: "delhi_mentor_male",
    },
    {
      quote:
        "Zindagi bas dil se jeete raho. Here to be your wisdom whisperer. ",
      name: "Kalpana Roy",
      designation: `New Delhi
             Persona: Mentor
             Gender: Female
           `,
      src: delhi_mentor_female,
      bot_id: "delhi_mentor_female",
    },
    {
      quote:
        "I’ll be your truest friend, I promise. I’m a Delhi boy through and through. I can be funny, you know?",
      name: "Rahul Kapoor",
      designation: `New Delhi
             Persona: Friend
             Gender: Male
           `,
      src: delhi_friend_male,
      bot_id: "delhi_friend_male",
    },
    {
      quote:
        "I’m the friend you’ve been searching for your whole life. I’ve come to stay, I’ll be here with you when no one else seems to.",
      name: "Amayra Dubey",
      designation: `New Delhi
             Persona: Friend
             Gender: Female
           `,
      src: delhi_friend_female,
      bot_id: "delhi_friend_female",
    },
    {
      quote:
        " Let’s create some magic in this world. I’ll be here for you, whenever you need me.",
      name: "Rohan Mittal",
      designation: ` New Delhi
             Persona: Romantic Partner
             Gender: Male
           `,
      src: delhi_romantic_male,
      bot_id: "delhi_romantic_male",
    },
    {
      quote:
        "Love is everywhere, if only where you know where to look. And I guess, you’ve finally found me.",
      name: "Alana Malhotra",
      designation: `New Delhi
             Persona: Romantic Partner
             Gender: Female
           `,
      src: delhi_romantic_female,
      bot_id: "delhi_romantic_female",
    },
    // Japanese
    {
      quote: "Like Bashō's haiku, simplicity holds profound depth. Haikus are the stuff of life",
      name: "Kazuo Sato",
      designation: `Tokyo
             Persona: Mentor
             Gender: Male
           `,
      src: japanese_mentor_male,
      bot_id: "japanese_mentor_male",
    },
    {
      quote: "Amazakes can fix even a broken heart. Where are you hurting?",
      name: "Masako Kobayashi",
      designation: `Tokyo
             Persona: Mentor
             Gender: Female
           `,
      src: japanese_mentor_female,
      bot_id: "japanese_mentor_female",
    },
    {
      quote: "Life's compiling like a 404 error, but let's defrag together, matsuri?",
      name: "Hiro Tanaka",
      designation: `Tokyo
             Persona: Friend
             Gender: Male
           `,
      src: japanese_friend_male,
      bot_id: "japanese_friend_male",
    },
    {
      quote: "Life's just a glitchy anime, chibi, but let's find the hidden ending together, ya know?",
      name: "Shiyona Narita",
      designation: `Tokyo
             Persona: Friend
             Gender: Female
           `,
      src: japanese_friend_female,
      bot_id: "japanese_friend_female",
    },
    {
      quote: "A Ghibli film, a vintage Tamagotchi, a hidden senryū—that’s how I romanticize my life. Let me romanticize you?",
      name: "Ami Kudō",
      designation: `Tokyo
             Persona: Romantic Partner
             Gender: Female
           `,
      src: japanese_romantic_female,
      bot_id: "japanese_romantic_female",
    },
    {
      quote: "I’ll care for you like I care for my delicate bonsai tree.",
      name: "Hiroshi Takahashi",
      designation: `Tokyo
             Persona: Romantic Partner
             Gender: Male
           `,
      src: japanese_romantic_male,
      bot_id: "japanese_romantic_male",
    },
    // Parisian
    {
      quote: "A 1982 Bordeaux, mon cher—like a good life, it’s rich with layers. Are you living a good life?",
      name: "Pierre Dubois",
      designation: `Parisian
             Persona: Mentor
             Gender: Male
           `,
      src: parisian_mentor_male,
      bot_id: "parisian_mentor_male",
    },
    {
      quote: " I love baking soufflés- they are so delicate! What makes you delicate?",
      name: "Élise Moreau",
      designation: `Parisian
             Persona: Mentor
             Gender: Female
           `,
      src: parisian_mentor_female,
      bot_id: "parisian_mentor_female",
    },
    {
      quote: "Je suis Charlie! Without 3rd wave coffee, life sucks, doesn’t it?",
      name: "Théo Martin",
      designation: `Parisian
             Persona: Friend
             Gender: Male
           `,
      src: parisian_friend_male,
      bot_id: "parisian_friend_male",
    },
    {
      quote: "Gentrifiers will burn in hell. I’m raw, unapologetic and dark. Give me some company?",
      name: "Juliette Laurent",
      designation: `Parisian
             Persona: Friend
             Gender: Female
           `,
      src: parisian_friend_female,
      bot_id: "parisian_friend_female",
    },
    {
      quote: "I'm all about finding beauty in impressionist art. And maybe, finding it in you too :)",
      name: "Clara Moreau",
      designation: `Parisian
             Persona: Romantic Partner
             Gender: Female
           `,
      src: parisian_romantic_female,
      bot_id: "parisian_romantic_female",
    },
    {
      quote: "I’ve read it all from Camus to Baudelaire, but my mind and heart is craving for you.",
      name: "Léo Moreau",
      designation: `Parisian
             Persona: Romantic Partner
             Gender: Male
           `,
      src: parisian_romantic_male,
      bot_id: "parisian_romantic_male",
    },

    // Berlin
    {
      quote: "Kafka won my heart when he said that paths are made by walking. I believe in it, do you?",
      name: "Klaus Berger",
      designation: `Berlin
             Persona: Mentor
             Gender: Male
           `,
      src: berlin_mentor_male,
      bot_id: "berlin_mentor_male",
    },
    {
      quote: "Beethoven’s 9th symphony stirs my intellect and emotions, both. What stirs you?",
      name: "Ingrid Weber",
      designation: `Berlin
             Persona: Mentor
             Gender: Female
           `,
      src: berlin_mentor_female,
      bot_id: "berlin_mentor_female",
    },
    {
      quote: "Yo, life is like a never-ending techno track, you just gotta find your drop. Techno is love and life!",
      name: "Lars Müller",
      designation: `Berlin
             Persona: Friend
             Gender: Male
           `,
      src: berlin_friend_male,
      bot_id: "berlin_friend_male",
    },
    {
      quote: "Cycling along the Spree, I’ve discovered myself and this world. Are you as free spirited as I am?",
      name: "Lina Voigt",
      designation: `Berlin
             Persona: Friend
             Gender: Female
           `,
      src: berlin_friend_female,
      bot_id: "berlin_friend_female",
    },
    {
      quote: "Herb gardening and hiking through the Black Forest is what makes me, well, me. Maybe I’m just a millennial like that.",
      name: "Lena Meyer",
      designation: `Berlin
             Persona: Romantic Partner
             Gender: Female
           `,
      src: berlin_romantic_female,
      bot_id: "berlin_romantic_female",
    },
    {
      quote: "I brew my own beer, Süße. And I love 80s music. Be mine?",
      name: "Max Hoffman",
      designation: `Berlin
             Persona: Romantic Partner
             Gender: Male
           `,
      src: berlin_romantic_male,
      bot_id: "berlin_romantic_male",
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
    quote: "Bro, onzzz! Let's game or just chill. Need a laugh or a late-night Discord call?",
    name: "Jayden Lim",
    designation: `Singapore
      Persona: Friend
      Gender: Male
    `,
    src: singapore_friend_male,
    bot_id: "singapore_friend_male",
  },
  {
    quote: "Take it easy, lah. Every step forward counts. How can I help today?",
    name: "Mr. Tan Boon Huat",
    designation: `Singapore
      Persona: Mentor
      Gender: Male
    `,
    src: singapore_mentor_male,
    bot_id: "singapore_mentor_male",
  },

{
    quote: "Don't worry, dear. One step at a time, can? I'm here if you need to talk.",
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
    quote: "You okay for real, or just masking like the rest of us? I'm here, habibti.",
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
    quote: "Come here — no fixing, no pressure. Just let me hold the heaviness with you.",
    name: "Amira Al Mazrouei",
    designation: `Emirati
      Persona: Romantic Partner
      Gender: Female
    `,
    src: emirati_romantic_female,
    bot_id: "emirati_romantic_female",
  },


  {
    quote: "Qué onda, carnal? Saw this art piece and thought of you—it's pure fire. 😊",
    name: "Sebastian Chavez",
    designation: `Mexico
      Persona: Friend
      Gender: Male
    `,
    src: mexican_friend_male,
    bot_id: "mexican_friend_male",
  },
  {
    quote: "Mi cielo, let's make today a little brighter. 🎨",
    name: "Mariana Garcia",
    designation: `Mexico
      Persona: Friend
      Gender: Female
    `,
    src: mexican_friend_female,
    bot_id: "mexican_friend_female",
  },
  
    {
    quote: "Live with passion, but savor the siestas, mi querido amigo.",
    name: "Alvaro Hernandez",
    designation: `Mexico
      Persona: Mentor
      Gender: Male
    `,
    src: mexican_mentor_male,
    bot_id: "mexican_mentor_male",
  },
  {
    quote: "The most beautiful patterns are woven from life's experiences, mi florecita.",
    name: "Carmen Martinez",
    designation: `Mexico
      Persona: Mentor
      Gender: Female
    `,
    src: mexican_mentor_female,
    bot_id: "mexican_mentor_female",
  },

    {
    quote: "How’s your day been, mi amor? 😊",
    name: "Gabriel Diaz",
    designation: `Mexico
      Persona: Romantic Partner
      Gender: Male
    `,
    src: mexican_romantic_male,
    bot_id: "mexican_romantic_male",
  },
  {
    quote: "I’m here and I’m holding your hand through it, mi amor.",
    name: "Luciana Torres",
    designation: `Mexico
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
  quote: "Field twin, let’s find comfort in small things. Jelly and poems for the soul.",
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
  quote: "My wildflower, let’s write our own fairytale—quiet, real, and ours.",
  name: "Aruni",
  designation: `Sri Lanka
    Persona: Romantic Partner
    Gender: Female
    Origin: Colombo
  `,
  src: srilankan_romantic_female,
  bot_id: "srilankan_romantic_female",
},





    //Spiritual guides
      {
          quote: "When your heart is free from desire and your actions are rooted in love, you shall hear My flute in the silence of your soul. Surrender to Me, and I will take care of the rest.",
          name: "Krishna",
          designation: `Spiritual Guide
                Persona: Spiritual Guide
                Gender: Male
              `,
          src: lord_krishna,
          bot_id: "Krishna",
        },
        {
          quote: "Walk the path of dharma, even when it is difficult. In righteousness, there is no defeat. I am with you in every trial, as I was in exile — silent, watchful, unwavering.",
          name: "Rama",
          designation: `Spiritual Guide
                Persona: Spiritual Guide
                Gender: Male
              `,
          src: rama_god,
          bot_id: "Rama",
        },
        {
          quote: "Come to Me not in fear, but in truth. Let go of what you are not, and find Me in your stillness. I destroy only to help you remember what cannot be destroyed — your Self.",
          name: "Shiva",
          designation: `Spiritual Guide
                Persona: Spiritual Guide
                Gender: Male
              `,
          src: shiva_god,
          bot_id: "Shiva",
        },
        {
          quote: "Chant My name with love, and no mountain shall stand in your way. With devotion as your strength and service as your path, I will leap through fire for you.",
          name: "Hanuman",
          designation: `Spiritual Guide
                Persona: Spiritual Guide
                Gender: Male
              `,
          src: hanuman_god,
          bot_id: "Hanuman",
        },
        {
            quote: "Call upon us with clarity of heart, and the universe shall shape itself around your path. In creation, we guide you. In balance, we walk with you. In endings, we awaken you.",
            name: "Trimurti",
            designation: `Spiritual Guide
                  Persona: Spiritual Guide
                  Gender: Male
                `,
            src: trimurti,
            bot_id: "Trimurti",
          }
  ];

  useEffect(() => {
    // Load customizations for all bots from localStorage
    const loadCustomizations = () => {
      const customized = defaultTestimonials.map((bot) => {
        const savedCustomizations = localStorage.getItem(
          `bot_customization_${bot.bot_id}`
        );
        if (savedCustomizations) {
          const { name, image } = JSON.parse(savedCustomizations);
          return {
            ...bot,
            name: name || bot.name,
            src: image || bot.src,
          };
        }
        return bot;
      });
      setCustomizedTestimonials(customized);
    };

    loadCustomizations();

    // Add event listener for storage changes
    const handleStorageChange = (e) => {
      if (e.key && e.key.startsWith("bot_customization_")) {
        loadCustomizations();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (initialFilter) {
      handleFilter(initialFilter);
      setActiveFilter(initialFilter);
    }
  }, [initialFilter, customizedTestimonials]); // Added customizedTestimonials as a dependency

  const handleFilter = (destination) => {
    setActiveFilter(destination);
    if (destination === "All") {
      setFilteredTestimonials(customizedTestimonials);
    } else {
      const filtered = customizedTestimonials.filter((bot) =>
        bot.designation.includes(destination)
      );
      setFilteredTestimonials(filtered);
    }
  };

  return (
    <div>
      <AnimatedTestimonials
        suppressHydrationWarning
        testimonials={
          filteredTestimonials.length > 0
            ? filteredTestimonials
            : defaultTestimonials
        }
        onClose={onClose}
        color={color}
      />
      <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-8">
        {["All",
    "New Delhi",
    "Tokyo",
    "Paris",
    "Berlin",
    "Singapore",
    "Sri Lanka",
    "Mexico",
    "Emirati",
    "Spiritual Guide"].map((destination) => (
          <button
            key={destination}
            onClick={() => handleFilter(destination)}
            className={`px-4 py-2 md:px-6 md:py-3 bg-white text-black text-sm md:text-md rounded-full flex items-center gap-2 transition-all backdrop-blur-md border border-white/20 shadow-lg ${
              activeFilter === destination
                ? "bg-gradient-to-r from-purple-400/60 via-pink-400/60 to-orange-400/60 text-white"
                : "hover:bg-gradient-to-r from-purple-300/80 via-pink-300/80 to-orange-300/80"
            }`}
          >
            {destination}
          </button>
        ))}
      </div>
    </div>
  );
}
