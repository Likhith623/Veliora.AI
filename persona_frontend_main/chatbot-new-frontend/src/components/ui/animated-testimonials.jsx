"use client";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import ShinyButton from "./shiny-button";
import { RainbowButton } from "./rainbow-button";
import Link from "next/link";
import { useBot } from "@/support/BotContext";

export const AnimatedTestimonials = ({
  testimonials,
  autoplay = false,
  onClose,
  color,
}) => {
  const { setSelectedBotId } = useBot();
  const [active, setActive] = useState(0);

  const handleBotSelect = () => {
    setSelectedBotId(testimonials[active].bot_id);
  };

  const handleNext = () => {
    setActive((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrev = () => {
    setActive((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const isActive = (index) => {
    return index === active;
  };

  useEffect(() => {
    if (autoplay) {
      const interval = setInterval(handleNext, 5000);
      return () => clearInterval(interval);
    }
  }, [autoplay]);

  // Use deterministic rotation values based on index
  const getRotation = (index) => {
    const rotations = [-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10];
    return rotations[index % rotations.length];
  };

  // Determine the destination URL based on the selected bot_id
  const getDestinationUrl = () => {
    return ["Krishna", "Rama", "Hanuman", "Shiva", "Trimurti"].includes(
      testimonials[active].bot_id
    )
      ? "/chat"
      : "/traits";
  };

  return (
    <div
      suppressHydrationWarning
      className="font-[family-name:var(--font-garamond)] max-w-sm md:max-w-4xl mx-auto antialiased px-4 md:px-8 lg:px-12 md:py-20"
    >
      <div className="relative grid grid-cols-1 md:grid-cols-2 md:gap-20">
        <div>
          <div className="relative h-40 md:h-80 w-80">
            <AnimatePresence>
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.bot_id}
                  initial={{
                    opacity: 0,
                    scale: 0.9,
                    z: -100,
                    rotate: getRotation(index),
                  }}
                  animate={{
                    opacity: isActive(index) ? 1 : 0.7,
                    scale: isActive(index) ? 1 : 0.95,
                    z: isActive(index) ? 0 : -100,
                    rotate: isActive(index) ? 0 : getRotation(index),
                    zIndex: isActive(index)
                      ? 999
                      : testimonials.length + 2 - index,
                    y: isActive(index) ? [0, -80, 0] : 0,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.9,
                    z: 100,
                    rotate: getRotation(index),
                  }}
                  transition={{
                    duration: 0.4,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 origin-bottom"
                >
                  <Image
                    src={testimonial.src}
                    alt={testimonial.name}
                    width={500}
                    height={500}
                    draggable={false}
                    className="md:h-full md:w-full h-40 w-40 rounded-3xl object-cover object-center m-auto"
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex justify-between flex-col py-4">
          <motion.div
            key={active}
            initial={{
              y: 20,
              opacity: 0,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            exit={{
              y: -20,
              opacity: 0,
            }}
            transition={{
              duration: 0.2,
              ease: "easeInOut",
            }}
          >
            <h3
              className="text-2xl font-bold dark:text-[#404040] text-[#404040] text-center md:text-left"
              style={{ color: color }}
            >
              {testimonials[active].name}
            </h3>
            <p
              className="text-lg text-[#404040] dark:text-[#404040]  text-center md:text-left whitespace-pre-line"
              style={{ color: color }}
            >
              {testimonials[active].designation}
            </p>
            <motion.p
              className=" text-[#404040] mt-8 dark:[#404040] text-xs md:text-lg hidden md:block"
              style={{ color: color }}
            >
              {testimonials[active].quote.split(" ").map((word, index) => (
                <motion.span
                  key={index}
                  initial={{
                    filter: "blur(10px)",
                    opacity: 0,
                    y: 5,
                  }}
                  animate={{
                    filter: "blur(0px)",
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.2,
                    ease: "easeInOut",
                    delay: 0.02 * index,
                  }}
                  className="inline-block"
                >
                  {word}&nbsp;
                </motion.span>
              ))}
            </motion.p>
          </motion.div>
          <Link
            href={getDestinationUrl()}
            onClick={() => {
              handleBotSelect();
              onClose?.();
            }}
            className="mt-5 mx-auto md:mx-0"
          >
            <button
              type="button"
              className="px-4 py-2 text-lg hover:opacity-60 cursor-pointer md: bg-gradient-to-r  
              from-purple-400/80 via-pink-400/80 to-orange-400/80 hover:from-purple-400/90 
              hover:via-pink-400/90 hover:to-orange-400/90 text-white dark:text-white rounded-full flex 
              justify-center items-center gap-2 transition-all backdrop-blur-sm border 
              border-white/20 shadow-[0_4px_12px_0_rgba(255,255,255,0.2)]"
            >
              {["Krishna", "Rama", "Hanuman", "Trimurti", "Shiva"].includes(
                testimonials[active].bot_id
              )
                ? "Start chatting"
                : "Choose traits"}
            </button>
          </Link>
          <div className="flex gap-4 pt-3 md:pt-0 mx-auto md:mx-0 mt-5">
            <button
              onClick={handlePrev}
              className="h-7 w-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group/button"
            >
              <IconArrowLeft className="h-5 w-5 text-[#171717] dark:text-white group-hover/button:rotate-12 transition-transform duration-300" />
            </button>
            <button
              onClick={handleNext}
              className="h-7 w-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group/button"
            >
              <IconArrowRight className="h-5 w-5 text-[#171717] dark:text-white group-hover/button:rotate-12 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
