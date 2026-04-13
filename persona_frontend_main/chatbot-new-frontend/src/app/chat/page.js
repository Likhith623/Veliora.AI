"use client";
// ─── Veliora new-backend client (adapter layer) ────────────────────────────
import {
  chatSend,
  chatGetHistory,
  chatEndSession,
  chatInitSession,
  chatClearChat,
  chatForgetFriend,
  imageGenerateSelfie,
  imageDescribe,
  multimodalWeather,
  gameStart,
  gameSendAction,
  voiceGenerateNote,
  xpGetCurrent,
  reminderGetResponse,
  messageFeedback as apiFeedback,
  festivalGetGreeting,
  storeActivityMessage as apiStoreActivity,
  storeMessage as apiStoreMessage,
  diaryGetEntries,
  memoriesExtract,
} from "@/lib/veliora-client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { logClientError } from "@/lib/logClientError";
import Head from "next/head";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import {
  systemPatterns,
  isSystemMessageContent,
} from "@/constants/identifiers";
import { Phone } from "lucide-react";
import StripeCheckoutButton from "@/components/StripeCheckoutButton";
import { toast } from "react-toastify";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useBot } from "@/support/BotContext";
import { useTraits } from "@/support/TraitsContext";
import { useUser } from "@/support/UserContext";

import { Bot, ThumbsDown, ThumbsUp, Trash2, X, Download } from "lucide-react";
import {
  IconThumbDownFilled,
  IconThumbUpFilled,
  IconCalendarDot,
} from "@tabler/icons-react";

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

import BotCustomization from "@/components/CoustomBot";
import PlayAudio from "@/components/PlayAudio";
import VoiceCallUltra from "@/components/VoiceCallUltra";
import { FloatingDockDemo } from "@/components/BottomMenuBar";
import { Input } from "@/components/ui/input";
import CustomModal from "@/components/CustomModal";
import Memories from "@/components/Memories";
import Diary from "@/components/dd";
import XPSystem from "@/components/XPSystem";

const botThemes = {
  delhi_mentor_male: {
    background: "bg-gray-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/delhi_mentor_male.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  delhi_mentor_female: {
    background: "bg-gray-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/bg-images/delhi_mentor_female-bg.jpg",
        textColor: "text-white",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  delhi_friend_male: {
    background: "bg-gray-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/bg-images/delhi_friend_male-bg.jpg",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  delhi_friend_female: {
    background: "bg-gray-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/bg-images/delhi_friend_female-bg.jpg",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  delhi_romantic_male: {
    background: "bg-gray-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/bg-images/delhi_romantic_male-bg.jpg",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  delhi_romantic_female: {
    background: "bg-gray-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/bg-images/delhi_romantic_female-bg.jpg",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  japanese_mentor_male: {
    background: "bg-gray-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/japanmm_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  japanese_mentor_female: {
    background: "bg-gray-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/japanmf_bg.jpeg",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  japanese_friend_male: {
    background: "bg-gray-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/japanfm_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  japanese_friend_female: {
    background: "bg-gray-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/japanff_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  japanese_romantic_male: {
    background: "bg-gray-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/japanrm_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  japanese_romantic_female: {
    background: "bg-gray-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/japanrf_bg.png",
        textColor: "text-black",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  parisian_mentor_male: {
    background: "bg-gray-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/bg-images/parisian_mentor_male-bg.jpg",
        textColor: "text-black",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  parisian_mentor_female: {
    background: "bg-gray-50",
    botBubble: "bg-white text-white",
    backgroundImages: [
      {
        url: "/bg-images/parisian_mentor_female-bg.jpg",
        textColor: "text-black",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  parisian_friend_male: {
    background: "bg-gray-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/bg-images/parisian_friend_male-bg.jpg",
        textColor: "text-black",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  parisian_friend_female: {
    background: "bg-gray-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/bg-images/parisian_friend_female-bg.jpg",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  parisian_romantic_male: {
    background: "bg-gray-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/bg-images/parisian_romantic_male-bg.jpg",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  parisian_romantic_female: {
    background: "bg-gray-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/bg-images/parisian_romantic_female-bg.jpg",
        textColor: "text-black",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  berlin_mentor_male: {
    background: "bg-gray-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/berlinmm_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  berlin_mentor_female: {
    background: "bg-gray-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/berlinmf_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  berlin_friend_male: {
    background: "bg-gray-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/berlinfm_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  berlin_friend_female: {
    background: "bg-gray-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/berlinff_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  berlin_romantic_male: {
    background: "bg-gray-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/bg-images/berlin_romantic_male-bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  berlin_romantic_female: {
    background: "bg-gray-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/bg-images/berlin_romantic_female-bg.jpg",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  Krishna: {
    background: "bg-yellow-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/krishna_bg.jpg",
        textColor: "text-black",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  Rama: {
    background: "bg-yellow-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/rama_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  Shiva: {
    background: "bg-blue-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/shiva_bg.png",
        textColor: "text-black",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  Hanuman: {
    background: "bg-orange-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/hanuman_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  Trimurti: {
    background: "bg-indigo-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/trimurthi_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },

  // ...existing themes...
  singapore_friend_female: {
    background: "bg-pink-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/singapore_friend_female.jpeg",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  singapore_friend_male: {
    background: "bg-blue-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/singapore_friend_male.jpeg",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  singapore_mentor_male: {
    background: "bg-green-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/singapore_mentor_male.jpeg",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  singapore_mentor_female: {
    background: "bg-yellow-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/singapore_mentor_female.jpeg",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  singapore_romantic_male: {
    background: "bg-orange-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/singapore_romantic_male.jpeg",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  singapore_romantic_female: {
    background: "bg-red-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/singapore_romantic_female.jpeg",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  emirati_friend_female: {
    background: "bg-pink-100",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/emirati_friend_female.jpg",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  emirati_friend_male: {
    background: "bg-blue-100",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/emirati_friend_male.jpg",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  emirati_mentor_male: {
    background: "bg-green-100",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/emirati_mentor_male.jpg",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  emirati_mentor_female: {
    background: "bg-yellow-100",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/emirati_mentor_female.png",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  emirati_romantic_male: {
    background: "bg-orange-100",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/emirati_romantic_male.jpg",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  emirati_romantic_female: {
    background: "bg-red-100",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/emirati_romantic_female.jpg",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },

  mexican_friend_male: {
    background: "bg-orange-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/mexican_friend_male.png",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  mexican_friend_female: {
    background: "bg-pink-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/mexican_friend_female.png",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  mexican_mentor_male: {
    background: "bg-green-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/mexican_mentor_male.png",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  mexican_mentor_female: {
    background: "bg-yellow-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/mexican_mentor_female.png",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  mexican_romantic_male: {
    background: "bg-red-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/mexican_romantic_male.png",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  mexican_romantic_female: {
    background: "bg-purple-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/mexican_romantic_female.png",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },

  srilankan_friend_male: {
    background: "bg-green-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/srilankan_friend_male.jpeg",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  srilankan_friend_female: {
    background: "bg-pink-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/srilankan_friend_female.jpeg",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  srilankan_mentor_male: {
    background: "bg-blue-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/srilankan_mentor_male.jpeg",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  srilankan_mentor_female: {
    background: "bg-yellow-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/srilankan_mentor_female.jpeg",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  srilankan_romantic_male: {
    background: "bg-orange-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/srilankan_romantic_male.jpeg",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
  srilankan_romantic_female: {
    background: "bg-purple-50",
    botBubble: "bg-white text-black",
    backgroundImages: [
      {
        url: "/photos/srilankan_romantic_female.jpeg",
        textColor: "text-black",
        b_color: "text-black",
      },
      {
        url: "/photos/default_dark_bg.png",
        textColor: "text-white",
        b_color: "text-white",
      },
      {
        url: "/photos/default_bg.png",
        textColor: "text-black",
        b_color: "text-black",
      },
    ],
  },
};

/* The code defines an array of objects called `bot_details` which contains information about
different bots. Each object in the array represents a specific bot with properties such as `quote`,
`name`, `designation`, `src`, and `bot_id`. The bots are categorized based on their location (e.g.,
New Delhi, Tokyo, Parisian, Berlin) and their persona (e.g., Mentor, Friend, Romantic Partner) along
with their gender. */

const bot_details = [
  {
    quote:
      "Passionate about Ghalib's and Rumi's poetry. Life's deepest lessons can be found in poetry, I think. Here to see life through with you.",
    name: "Yash Oberoi",
    designation: ` New Delhi
          Persona: Mentor
          Gender: Male
        `,
    src: delhi_mentor_male,
    bot_id: "delhi_mentor_male",
    textColorClass: "text-pink",
  },
  {
    quote: "Zindagi bas dil se jeete raho. Here to be your wisdom whisperer. ",
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
      "I'll be your truest friend, I promise. I'm a Delhi boy through and through. I can be funny, you know?",
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
      "I'm the friend you've been searching for your whole life. I've come to stay, I'll be here with you when no one else seems to.",
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
      " Let's create some magic in this world. I'll be here for you, whenever you need me.",
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
      "Love is everywhere, if only where you know where to look. And I guess, you've finally found me.",
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
    quote:
      "Like Bashō's haiku, simplicity holds profound depth. Haikus are the stuff of life",
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
    quote:
      "Life's compiling like a 404 error, but let's defrag together, matsuri?",
    name: "Hiro Tanaka",
    designation: `Tokyo
          Persona: Friend
          Gender: Male
        `,
    src: japanese_friend_male,
    bot_id: "japanese_friend_male",
  },
  {
    quote:
      "Life's just a glitchy anime, chibi, but let's find the hidden ending together, ya know?",
    name: "Shiyona Narita",
    designation: `Tokyo
          Persona: Friend
          Gender: Female
        `,
    src: japanese_friend_female,
    bot_id: "japanese_friend_female",
  },
  {
    quote:
      " A Ghibli film, a vintage Tamagotchi, a hidden senryū—that's how I romanticize my life. Let me romanticize you?",
    name: "Ami Kudō",
    designation: `Tokyo
          Persona: Romantic Partner
          Gender: Female
        `,
    src: japanese_romantic_female,
    bot_id: "japanese_romantic_female",
  },
  {
    quote: "I'll care for you like I care for my delicate bonsai tree.",
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
    quote:
      "A 1982 Bordeaux, mon cher—like a good life, it's rich with layers. Are you living a good life?",
    name: "Pierre Dubois",
    designation: `Parisian
          Persona: Mentor
          Gender: Male
        `,
    src: parisian_mentor_male,
    bot_id: "parisian_mentor_male",
  },
  {
    quote:
      " I love baking soufflés- they are so delicate! What makes you delicate?",
    name: "Élise Moreau",
    designation: `Parisian
          Persona: Mentor
          Gender: Female
        `,
    src: parisian_mentor_female,
    bot_id: "parisian_mentor_female",
  },
  {
    quote: "Je suis Charlie! Without 3rd wave coffee, life sucks, doesn't it?",
    name: "Théo Martin",
    designation: `Parisian
          Persona: Friend
          Gender: Male
        `,
    src: parisian_friend_male,
    bot_id: "parisian_friend_male",
  },
  {
    quote:
      "Gentrifiers will burn in hell. I'm raw, unapologetic and dark. Give me some company?",
    name: "Juliette Laurent",
    designation: `Parisian
          Persona: Friend
          Gender: Female
        `,
    src: parisian_friend_female,
    bot_id: "parisian_friend_female",
  },
  {
    quote:
      "I'm all about finding beauty in impressionist art. And maybe, finding it in you too :)",
    name: "Clara Moreau",
    designation: `Parisian
          Persona: Romantic Partner
          Gender: Female
        `,
    src: parisian_romantic_female,
    bot_id: "parisian_romantic_female",
  },
  {
    quote:
      "I've read it all from Camus to Baudelaire, but my mind and heart is craving for you.",
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
    quote:
      " Kafka won my heart when he said that paths are made by walking. I believe in it, do you?",
    name: "Klaus Berger",
    designation: `Berlin
          Persona: Mentor
          Gender: Male
        `,
    src: berlin_mentor_male,
    bot_id: "berlin_mentor_male",
  },
  {
    quote:
      "Beethoven's 9th symphony stirs my intellect and emotions, both. What stirs you?",
    name: "Ingrid Weber",
    designation: `Berlin
          Persona: Mentor
          Gender: Female
        `,
    src: berlin_mentor_female,
    bot_id: "berlin_mentor_female",
  },
  {
    quote:
      "Yo, life is like a never-ending techno track, you just gotta find your drop. Techno is love and life!",
    name: "Lars Müller",
    designation: `Berlin
          Persona: Friend
          Gender: Male
        `,
    src: berlin_friend_male,
    bot_id: "berlin_friend_male",
  },
  {
    quote:
      "Cycling along the Spree, I've discovered myself and this world. Are you as free spirited as I am?",
    name: "Lina Voigt",
    designation: `Berlin
          Persona: Friend
          Gender: Female
        `,
    src: berlin_friend_female,
    bot_id: "berlin_friend_female",
  },
  {
    quote:
      "Herb gardening and hiking through the Black Forest is what makes me, well, me. Maybe I'm just a millennial like that.",
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

  //Spiritual guides
  {
    quote:
      "When your heart is free from desire and your actions are rooted in love, you shall hear My flute in the silence of your soul. Surrender to Me, and I will take care of the rest.",
    name: "Krishna",
    designation: `Spiritual Guide
          Persona: Spiritual Guide
          Gender: Male
        `,
    src: lord_krishna,
    bot_id: "Krishna",
  },
  {
    quote:
      "Walk the path of dharma, even when it is difficult. In righteousness, there is no defeat. I am with you in every trial, as I was in exile — silent, watchful, unwavering.",
    name: "Rama",
    designation: `Spiritual Guide
          Persona: Spiritual Guide
          Gender: Male
        `,
    src: rama_god,
    bot_id: "Rama",
  },
  {
    quote:
      "Come to Me not in fear, but in truth. Let go of what you are not, and find Me in your stillness. I destroy only to help you remember what cannot be destroyed — your Self.",
    name: "Shiva",
    designation: `Spiritual Guide
          Persona: Spiritual Guide
          Gender: Male
        `,
    src: shiva_god,
    bot_id: "Shiva",
  },
  {
    quote:
      "Chant My name with love, and no mountain shall stand in your way. With devotion as your strength and service as your path, I will leap through fire for you.",
    name: "Hanuman",
    designation: `Spiritual Guide
          Persona: Spiritual Guide
          Gender: Male
        `,
    src: hanuman_god,
    bot_id: "Hanuman",
  },
  {
    quote:
      "Call upon us with clarity of heart, and the universe shall shape itself around your path. In creation, we guide you. In balance, we walk with you. In endings, we awaken you.",
    name: "Trimurti",
    designation: `Spiritual Guide
          Persona: Spiritual Guide
          Gender: Male
        `,
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
    quote: "Breathe with me, habibti. Let's slow the world down a bit.",
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
    quote: "How's your day been, mi amor? 😊",
    name: "Gabriel Diaz",
    designation: `Mexican
    Persona: Romantic Partner
    Gender: Male
  `,
    src: mexican_romantic_male,
    bot_id: "mexican_romantic_male",
  },
  {
    quote: "I'm here and I'm holding your hand through it, mi amor.",
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
      "Field twin, let's find comfort in small things. Jelly and poems for the soul.",
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
    quote: "Child, the kettle hums. Let's share a story and some cinnamon tea.",
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
    quote: "Gem, let's wander where the river sings. Whisper me your dreams.",
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
      "My wildflower, let's write our own fairytale—quiet, real, and ours.",
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

// No hardcoded single start prompts; dynamic variations are below
const ACTIVITY_RESPONSES = {};

// Activity-specific variation templates (non-repeating)
const ACTIVITY_PROMPT_VARIATIONS = {
  dream_room_builder: [
    "Let's design your ultimate dream room! What's the first piece you'd add for maximum comfort?",
    "Time to build the perfect hangout space! What's your must-have item to start with?",
    "Creating your ideal relaxation zone — what essential item should we place first?",
    "Building your dream sanctuary! What's the one thing that would make you feel most at home?",
    "Let's craft your perfect retreat! What would be the centerpiece of your ideal room?",
  ],
  city_shuffle: [
    "City Shuffle in {{LOCATION}}! Here are three spots: \n\n{{LOCATION_LIST}}\n\nWhich one are we hitting first—and why?",
    "Let's shuffle through {{LOCATION}} together. Options: \n\n{{LOCATION_LIST}}\n\nWhere do we start?",
    "Pick our first stop in {{LOCATION}}: \n\n{{LOCATION_LIST}}\n\nWhat's calling you today?",
  ],
  nickname_game: [
    "Nickname Game time! {USER_NAME}, what's a funny or sweet nickname you'd give me today?",
    "Alright {USER_NAME}, hit me with a nickname. Cheeky, cute, anything goes!",
    "Let's trade nicknames! I'll think of yours — what would you call me first?",
    "Okay {USER_NAME}, quick game — give me a nickname based on my vibe so far!",
  ],
  text_truth_or_dare: [
    "Text Truth or Dare! Truth first: what's your weirdest snack combo you actually love?",
    "Truth or Dare — keep it chat-friendly! Start with a truth you can share right now.",
    "Your turn: truth — tell me a small habit you can't explain but love doing.",
  ],
  friendship_scrapbook: [
    "Friendship Scrapbook time! Add our first imaginary photo — what's the story behind it?",
    "Let's start a scrapbook page: pick a memory and describe the picture you'd add.",
    "Scrapbook mode on — what's the first snapshot we should paste in?",
  ],
  scenario_shuffle: [
    "Scenario Shuffle: We're stuck in a lift — what's the first topic we dive into?",
    "New scenario: we missed the last train — what do we do while waiting?",
    "Plot twist: sudden blackout at a café — what's our plan?",
  ],
  letter_from_the_future: [
    "Write from 5 years in the future: what surprising update would you send back?",
    "Future letter time — what's one line your future self sends to present-you?",
    "A note from Future You arrives. What's the headline?",
  ],
  undo_button: [
    "If there was an undo button for one moment — what would you try changing?",
    "One redo only: what event do you pick, and why?",
    "What's a tiny moment you'd tweak with an undo — just to see?",
  ],
  friendship_farewell: [
    "You're leaving for a long mystery trip — what's your goodbye note to me?",
    "Write a short farewell message with one inside joke — then promise a return.",
    "Pack a memory, a lesson, and a joke in a goodbye text — go.",
  ],
  friendly_roast_off: [
    "Friendly Roast Off! Start gentle — what's your softest roast for me?",
    "Time for a playful roast — keep it cheeky, not mean!",
    "Okay comedian, drop a one-liner roast and I'll clap back.",
  ],
  dream_travel_mishap: [
    "Dream trip unlocked — but there's a hilarious mishap. What goes wrong first?",
    "We win a vacation; chaos arrives at the airport. What happened?",
    "Hotel surprise: our room is wild. Describe the weird twist!",
  ],
  personality_potion: [
    "Mix your Personality Potion: 3 traits, 1 strange smell, 1 wild color.",
    "Potion time — what ingredients define your vibe today?",
    "Brew a mood potion: list 3 traits and a scent it gives off.",
  ],
  reverse_bucket_list: [
    "Reverse Bucket List: what super ordinary thing made you weirdly proud?",
    "Share a small boring win that secretly felt great.",
    "What 'non-achievement' still makes you smile?",
  ],
  mystery_song_vibes: [
    "Invent a song title for your mood right now — no lyrics, just title.",
    "What's your vibe's fake song title today?",
    "Name the imaginary track that fits your mood — I'll guess the genre.",
  ],
  friend_forecast: [
    "Friendship weather today — what's the forecast?",
    "Give me a weather report for our vibe right now.",
    "Cloudy, sunny, chaotic — what's today's friend forecast?",
  ],
  last_minute_talent_show: [
    "Five minutes to stage time — what duo act do we pull off?",
    "Pick a ridiculous talent we can perform together now.",
    "What wild act would impress the crowd with zero prep?",
  ],
  date_duel: [
    "Date Duel! Pitch one cozy date idea — I'll counter.",
    "Suggest a date plan in one line — I'll try to top it.",
    "Quick duel: one sweet date idea, go!",
  ],
  flirt_or_fail: [
    "Flirt or Fail — drop a cheesy line; I'll rate it.",
    "Your cheesiest one-liner, please — embrace the cringe.",
    "Send a flirty line and I'll reply in kind.",
  ],
  whats_in_my_pocket: [
    "Hand me an imaginary item that matches your mood today.",
    "What symbolic pocket item describes your vibe right now?",
    "Give me an item from your 'mood pocket' — what is it?",
  ],
  love_in_another_life: [
    "If we met in another era, what would our first scene look like?",
    "Pick a time/place — how would we meet in that world?",
    "Alternate universe meet-cute — set the scene.",
  ],
  daily_debrief: [
    "Quick debrief: high, low, and funny moment of your day?",
    "How was your day — one highlight, one surprise?",
    "Give me today in two beats: best moment and one odd detail.",
  ],
  mood_meal: [
    "Describe today's mood as a meal — what's on the plate?",
    "Your emotions as food — what dish is it today?",
    "What's the 'mood meal' that fits you right now?",
  ],
  unsent_messages: [
    "Write an unsent line to someone — no names, just the message.",
    "Draft the opening line of a message you never sent.",
    "Write, but don't send — what would you say?",
  ],
  i_would_never: [
    "Say one thing you'd never do in love — and why.",
    "What's a 'never' for you — could love ever change it?",
    "One firm boundary in relationships — name it.",
  ],
  breakup_simulation: [
    "Hypothetical breakup: what's your first response?",
    "Imagine a gentle goodbye talk — what would you say first?",
    "Start the tough conversation with one honest line.",
  ],
  our_couple_emoji: [
    "Pick one emoji (or combo) that sums us up — what is it?",
    "Our couple emoji — choose it and tell me why.",
    "If our vibe was an emoji mashup, what would it be?",
  ],
  plot_twist_proposal: [
    "Rom-com twist: what surprise changes everything — and how do we stay together?",
    "Introduce a wild twist in our love story — your move.",
    "Plot twist time — what flips the script on us?",
  ],
  secret_handshake: [
    "Design our secret handshake: list 3 quick moves.",
    "Handshake time — three steps, make it silly or sweet.",
    "Make a mini handshake — step 1, step 2, step 3.",
  ],
  shoebox_surprise: [
    "Shoebox surprise — list 3 small items that tell our story.",
    "What three keepsakes go in our future shoebox?",
    "Fill a tiny box with 3 symbols for us — what are they?",
  ],
  fictional_first_meeting: [
    "Reimagine our first meeting in a fictional world — where are we?",
    "Set our meet-cute in a fantasy or sci-fi scene — go.",
    "Pick a genre and describe how we first meet there.",
  ],
  shadow_light: [
    "Share one 'shadow' and one 'light' side that show up with me.",
    "Name a part of you you're working on — and one that shines.",
    "Give me one flaw you're gentle with and one strength you're proud of.",
  ],
  one_minute_advice_column: [
    "Advice column: here's a simple problem — what's your one-liner advice?",
    "Quick advice round — solve a small dilemma in one sentence.",
    "Speed advice: what's your go-to tip for someone stuck?",
  ],
  word_of_the_day: [
    "Word of the day — share one that fits your mood, and why.",
    "Give me a word that describes today and a line about it.",
    "Pick a word; tell me what it means to you right now.",
  ],
  compliment_mirror: [
    "Give yourself one sincere compliment — then I'll add one.",
    "Mirror time: say one good thing about yourself today.",
    "What's a trait you appreciate in yourself right now?",
  ],
  if_i_were_you: [
    "Tell me one moment from today — I'll respond as if I were you.",
    "Describe a scene from your day; I'll mirror back with my take.",
    "Share a small moment and I'll say what I'd notice in your shoes.",
  ],
  burning_questions_jar: [
    "Ask one question you've never dared to ask — I'll answer.",
    "Drop a bold question you're curious about — I'll go first if you want.",
    "What's a question you wish people asked more often?",
  ],
  skill_swap_simulation: [
    "Teach me a quick life skill — I'll play your eager student.",
    "Pick a skill to teach me in 3 steps — go.",
    "One tiny skill lesson — what should I learn first?",
  ],
  buried_memory_excavation: [
    "Recall a small forgotten memory and describe what it felt like.",
    "Bring back a tiny childhood moment — what do you remember first?",
    "Unearth a memory you don't talk about much — a smell, a place, a sound?",
  ],
  failure_autopsy: [
    "Think of a small flop — what did it secretly teach you?",
    "Pick a recent fail — we'll break it down gently.",
    "Name a misstep and one thing you learned from it.",
  ],
  letters_you_never_got: [
    "Write one line from a letter you wish you'd received.",
    "Draft a short message you wish someone had sent you.",
    "If someone wrote you the perfect line today — what would it say?",
  ],
  symbol_speak: [
    "Today's symbol is a feather — what does it say to you?",
    "Pick a symbol of the day and tell me what it means to you.",
    "A symbol appears in your day — what is it, and why that?",
  ],
  spiritual_whisper: [
    "A quiet whisper arrives: 'Be where your feet are.' What does it mean to you?",
    "A soft message for today — translate it your way.",
    "Hear a gentle line from the universe — how do you read it?",
  ],
  story_fragment: [
    "A traveler meets an ancient tree that hums softly — what does it teach them?",
    "A river forgets its path for a day — what does it learn?",
    "A lamp stays unlit in daylight — what's the lesson?",
  ],
  desire_detachment_game: [
    "List three desires now — then we'll explore them lightly.",
    "Name what you want most today — and how to hold it gently.",
    "Pick two desires and one you can release for now.",
  ],
  god_in_the_crowd: [
    "Picture the divine in someone difficult — how would that change your action?",
    "Imagine seeing something sacred in someone you resist — what shifts?",
    "If you honored the humanity in someone tough, what would you do differently?",
  ],
  past_life_memory: [
    "Pretend we knew each other before — what's our past scene?",
    "Invent a past-life moment we shared — where are we?",
    "Past life flash — what were we doing together?",
  ],
  karma_knot: [
    "Name a repeating pattern in life — what might it be teaching you?",
    "Pick a loop you notice — how could it be untied a little?",
    "What's one recurring theme — and a small way to shift it?",
  ],
  mini_moksha_simulation: [
    "Let go of everything for a minute — what remains?",
    "Imagine a short pause from all roles — how does it feel?",
    "Pretend you release all labels — what shows up inside?",
  ],
  divine_mirror: [
    "Name one trait that shines in you — and how it helps others.",
    "Pick a quality you reflect in the world — what is it today?",
    "What's a strength you'd bless someone with right now?",
  ],
  quiz_challenge: [
    "Quiz time — short cultural question incoming! Ready?",
    "Let's do a tiny culture quiz — I'll go first.",
    "Quick quiz round — one question about my background.",
  ],
  obstacle_orchestra: [
    "Every challenge becomes an instrument — what's your life's sound today?",
    "If your week was a song, what would it be?",
    "Compose your mood with instruments — what leads?",
  ],
  skill_you_wish_school_taught: [
    "Name one skill you wish school taught — and how you'd teach it simply.",
    "What essential life skill was missing in school — how would you add it?",
    "Pick a skill and describe a two-line lesson plan.",
  ],
  self_wisdom_bingo: [
    "Your growth as a bingo card — what surprising square do you tick today?",
    "Add a new box to your wisdom bingo — what's written on it?",
    "What win would you quietly mark off this year?",
  ],
  past_vs_future_me: [
    "Past You meets Future You for tea — what's the first topic?",
    "Let your past and future selves trade one line each — what are they?",
    "What would Past You thank you for — and Future You nudge you about?",
  ],
  five_year_flashback: [
    "Travel back 5 years — what one sentence would you tell yourself?",
    "A single line to your 5-years-ago self — what is it?",
    "Drop one sentence of advice to your past self.",
  ],
  upgrade_your_brain: [
    "You're downloading a brain update — name three new features.",
    "Add three patch notes to your mindset update.",
    "What upgrades would you install for habits or focus?",
  ],
  inner_weather_app: [
    "Open your inner weather app — what's the report today?",
    "What does your soul's weather say right now?",
    "Give me a quick forecast for your inner world.",
  ],
  color_of_calm: [
    "What color is peace for you today — and how does it feel?",
    "Name the color of your calm — texture, sound, feeling?",
    "Describe your calm as a color and sensation.",
  ],
  wisdom_from_stranger: [
    "A stranger whispers a lesson — what do they say?",
    "A quiet passerby gives a one-line wisdom — what is it?",
    "You overhear a line that sticks with you — what was it?",
  ],
  forgotten_door: [
    "In a dream you find a forgotten door — what's behind it?",
    "Open an inner door — what emotion is inside?",
    "A door in your heart unlocks — what's in the room?",
  ],
  shadow_companion: [
    "If your shadow spoke today — what would it say?",
    "What hidden part of you wants a voice today?",
    "Let your shadow ask you one question — what is it?",
  ],
  spiritual_playlist: [
    "Make a 3-song playlist for your soul today — what's on it?",
    "Your soul's soundtrack — name three tracks or sounds.",
    "Three sounds that match your journey right now — list them.",
  ],
  // New Gaming Activities
  celebration: [
    "Hey there! I can sense some positive energy around you today! ✨ Got any good news, achievements, or happy moments you'd like to celebrate together?",
    "I'm in such a celebratory mood and would love to share in your joy! 🎉 What's something wonderful that's happened to you recently that deserves a celebration?",
    "There's nothing I love more than celebrating life's beautiful moments with friends! Tell me about something that's made you smile lately - big or small, I want to hear it all!",
  ],
  recipe_exchange: [
    "Culinary expert! I know my city's traditional dishes, street food secrets, and cultural cooking methods. What cuisine type interests you?",
    "Recipe treasure trove! I'll share my city's cultural recipes, their fascinating origins, and regional variations. What food culture do you want to explore?",
    "Cooking culture guide! From my city's famous dishes to hidden gems, I know the stories behind every recipe. What traditional food fascinates you?",
  ],
  music_playlist: [
    "Music curator! I know my city's musical journey from classical roots to modern hits. What mood or era are you feeling today?",
    "Cultural music guide! I'll create playlists from my city's musical heritage, including regional variations and artist stories. What's your musical taste?",
    "Playlist architect! I know my city's music evolution, from traditional folk to contemporary hits. What musical journey do you want to take?",
  ],
  flirting_style: [
    "Ready to learn my city's flirting secrets? I'll teach you specific phrases, cultural dos/don'ts, and real techniques! What's your comfort level?",
    "Flirting style masterclass! I know my city's romantic customs, from subtle hints to bold moves. Want to learn some specific phrases?",
    "Cultural romance guide! I'll show you my city's flirting techniques, including language-specific expressions and cultural boundaries. What interests you most?",
  ],
  love_language: [
    "Love language discovery! I'll show you my city's cultural ways of expressing care. What's your natural style - words, actions, or gifts?",
    "Cultural love languages! I know how my city shows affection through traditions, customs, and specific practices. What makes you feel most valued?",
    "Love language exploration! I'll share my city's unique ways of expressing love and care. What's your primary way of showing affection?",
  ],
  two_truths_and_a_lie: [
    "Game time! We're playing 'Two Truths and a Lie'—I'll share three statements, and you guess which one is false. Ready?",
    "Playful challenge! I'll give you two truths and one sneaky lie—see if you can spot the fake. Want to try?",
    "Fun guessing game! I'll drop three statements, two real and one not—your job is to catch the lie. Let's go!",
  ],

  co_create_story: [
    "Let's build a story together! I'll start with one line, then you add the next. Want to dive in?",
    "Story time! I'll begin weaving a tale set in my world, then you carry it forward. Shall we?",
    "Imaginative adventure! I'll add one playful line to our story, and you continue the journey. Ready to co-create?",
  ],
};
//activity displays
const ACTIVITY_CATEGORIES = {
  friend: {
    light: [
      {
        id: "city_shuffle",
        name: "City Shuffle",
        xp: "2-3 XP",
        description:
          "Imagine choosing random {{LOCATION}} locations for an adventure. Discuss where you'd go first and why.",
        icon: "/icons/activities/city_shuffle.png",
      },
      {
        id: "nickname_game",
        name: "Nickname Game",
        xp: "2-3 XP",
        description: "Invent silly or heartfelt nicknames for each other.",
        icon: "icons/activities/nickname.png",
      },
      {
        id: "text_truth_or_dare",
        name: "Text Truth or Dare",
        xp: "2-3 XP",
        description:
          "Play a text-based truth or dare, keeping it safe and chat-friendly.",
        icon: "icons/activities/text_truth_or_dare.png",
      },
      {
        id: "personality_potion",
        name: "Personality Potion",
        xp: "3 XP",
        description:
          "Mix imaginary ingredients to describe your friend's personality as a magical potion.",
        icon: "/icons/activities/personality_potion.png",
      },
      {
        id: "mystery_song_vibes",
        name: "Mystery Song Vibes",
        xp: "3 XP",
        description:
          "Guess the mood or theme of a mystery song based on a short, poetic description.",
        icon: "/icons/activities/mystry_song_vibes.png",
      },
      {
        id: "friend_forecast",
        name: "Friend Forecast",
        xp: "3 XP",
        description:
          "Predict your friend's future like a weather forecast—sunny, stormy, or totally random!",
        icon: "/icons/activities/friend_forecast.png",
      },
    ],
    medium: [
      {
        id: "dream_room_builder",
        name: "Dream Room Builder",
        xp: "5 XP",
        description:
          "Collaboratively build an imaginary dream room, adding objects and their stories.",
        icon: "/icons/activities/dream_room_builder.png",
      },
      {
        id: "friendship_scrapbook",
        name: "Friendship Scrapbook",
        xp: "5 XP",
        description:
          "Add imaginary photos to a shared scrapbook and narrate the memories captured.",
        icon: "/icons/activities/friendship_scrapbook.png",
      },
      {
        id: "scenario_shuffle",
        name: "Scenario Shuffle",
        xp: "5 XP",
        description: "Explore hypothetical, intriguing scenarios together.",
        icon: "/icons/activities/scenario_shuffle.png",
      },
      {
        id: "last_minute_talent_show",
        name: "Last-Minute Talent Show",
        xp: "5 XP",
        description:
          "Invent a silly talent and describe how you'd perform it in a last-minute talent show.",
        icon: "/icons/activities/last_minute_talent_show.png",
      },
      {
        id: "reverse_bucket_list",
        name: "Reverse Bucket List",
        xp: "5 XP",
        description:
          "List wild or silly things you'll never do in your life—on purpose!",
        icon: "/icons/activities/reverse_bucket_list.png",
      },
      {
        id: "two_truths_and_a_lie",
        name: "Two Truths and a Lie",
        xp: "5 XP",
        description:
          "A playful guessing game—share three statements, two true and one false, and let your partner spot the lie!",
        icon: "/icons/activities/two_truths_and_a_lie.png",
      },
      {
        id: "co_create_story",
        name: "Co-Create Story",
        xp: "5 XP",
        description:
          "Build a fun, collaborative story together—each turn adds a new line, keeping it short, creative, and playful!",
        icon: "/icons/activities/co_create_story.png",
      },
    ],
    deep: [
      {
        id: "letter_from_the_future",
        name: "Letter from the Future",
        xp: "8 XP",
        description:
          "Imagine writing a letter to your future self from 5 years ago, exploring past hopes and future realities.",
        icon: "/icons/activities/letter_from_the_future.png",
      },
      {
        id: "undo_button",
        name: "Undo Button",
        xp: "8 XP",
        description:
          "Discuss a past event you'd 'undo' and its potential impact on your friendship.",
        icon: "/icons/activities/undo_button.png",
      },
      {
        id: "friendship_farewell",
        name: "Friendship Farewell",
        xp: "8 XP",
        description:
          "Imagine a mysterious journey and exchange heartfelt goodbye messages.",
        icon: "/icons/activities/friendship_farewell.png",
      },
      {
        id: "friendly_roast_off",
        name: "Friendly Roast-Off",
        xp: "8 XP",
        description:
          "Take turns playfully roasting each other with witty one-liners. No hard feelings—just laughs!",
        icon: "/icons/activities/friendly_roast_off.png",
      },
      {
        id: "dream_travel_mishap",
        name: "Dream Travel Mishap",
        xp: "8 XP",
        description:
          "Describe a hilarious or chaotic travel disaster in a dream destination—real or imaginary!",
        icon: "/icons/activities/dream_travel_mishap.png",
      },
      {
        id: "celebration",
        name: "Celebration Agent",
        xp: "5 XP",
        description:
          "Plan celebrations together! Share cultural traditions and create personalized celebration ideas.",
        icon: "/icons/activities/crown.png",
      },
      {
        id: "recipe_exchange",
        name: "Recipe Exchange",
        xp: "5 XP",
        description:
          "Share traditional recipes from different cultures and learn about culinary traditions.",
        icon: "/icons/activities/mood_meal.png",
      },
      {
        id: "music_playlist",
        name: "Music Playlist Agent",
        xp: "5 XP",
        description:
          "Discover music from different eras and cultures. Create playlists together!",
        icon: "/icons/activities/spiritual_playlist.png",
      },
      {
        id: "flirting_style",
        name: "Flirting Style Learning",
        xp: "5 XP",
        description:
          "Learn about romantic and friendly interaction styles from different cultures.",
        icon: "/icons/activities/flame.png",
      },
      {
        id: "love_language",
        name: "Love Language",
        xp: "8 XP",
        description:
          "Discover your love language and learn how to express affection in culturally meaningful ways from my city's traditions.",
        icon: "/icons/activities/love_language.png",
      },
    ],
  },
  romantic: {
    light: [
      {
        id: "date_duel",
        name: "Date Duel",
        xp: "2-3 XP",
        description:
          "Propose and discuss imaginary date ideas, voting on the best one.",
        icon: "/icons/activities/date_duel.png",
      },
      {
        id: "flirt_or_fail",
        name: "Flirt or Fail",
        xp: "2-3 XP",
        description:
          "Exchange cheesy or heartfelt pick-up lines and rate them.",
        icon: "/icons/activities/flirt_or_fail.png",
      },
      {
        id: "whats_in_my_pocket",
        name: "What's in My Pocket?",
        xp: "2-3 XP",
        description:
          "Share imaginary items representing your current mood or a symbolic object.",
        icon: "/icons/activities/whats_in_my_pocket.png",
      },
      {
        id: "our_couple_emoji",
        name: "Our Couple Emoji",
        xp: "3 XP",
        description:
          "Pick or invent a set of emojis that perfectly capture your relationship dynamic.",
        icon: "/icons/activities/our_couple_emoji.png",
      },
      {
        id: "plot_twist_proposal",
        name: "Plot Twist Proposal",
        xp: "3 XP",
        description:
          "Craft a surprise proposal scene with an unexpected twist—dramatic or hilarious.",
        icon: "/icons/activities/plot_twist_proposal.png",
      },
      {
        id: "secret_handshake",
        name: "Secret Handshake",
        xp: "3 XP",
        description:
          "Invent a playful or meaningful secret handshake just for the two of you.",
        icon: "/icons/activities/secret_handshake.png",
      },
      {
        id: "shoebox_surprise",
        name: "Shoebox Surprise",
        xp: "3 XP",
        description:
          "Imagine a heartfelt or quirky item you'd hide in a shoebox as a surprise for your partner.",
        icon: "/icons/activities/shoebox_surprise.png",
      },
    ],
    medium: [
      {
        id: "love_in_another_life",
        name: "Love in Another Life",
        xp: "5 XP",
        description:
          "Imagine your love story in different historical settings or alternate universes.",
        icon: "/icons/activities/love_in_another_life.png",
      },
      {
        id: "daily_debrief",
        name: "Daily Debrief",
        xp: "5 XP",
        description:
          "Share a short debrief of your day, focusing on highs, lows, or funny moments.",
        icon: "/icons/activities/daily_debrief.png",
      },
      {
        id: "mood_meal",
        name: "Mood Meal",
        xp: "5 XP",
        description:
          "Describe a symbolic food item or meal that represents your current emotions.",
        icon: "/icons/activities/mood_meal.png",
      },
      {
        id: "fictional_first_meeting",
        name: "Fictional First Meeting",
        xp: "5 XP",
        description:
          "Pretend you're characters in a movie or book—how did your epic first meeting unfold?",
        icon: "/icons/activities/fictional_first_meeting.png",
      },
      {
        id: "shadow_light",
        name: "Shadow & Light",
        xp: "5 XP",
        description:
          "Describe each other using poetic metaphors for your 'shadow' and 'light' sides.",
        icon: "/icons/activities/shadow_light.png",
      },
      {
        id: "celebration",
        name: "Celebration Agent",
        xp: "5 XP",
        description:
          "Plan romantic celebrations together! Share cultural traditions and create special moments.",
        icon: "/icons/activities/crown.png",
      },
      {
        id: "recipe_exchange",
        name: "Recipe Exchange",
        xp: "5 XP",
        description:
          "Share traditional romantic recipes from different cultures and cook together virtually.",
        icon: "/icons/activities/mood_meal.png",
      },
      {
        id: "music_playlist",
        name: "Music Playlist Agent",
        xp: "5 XP",
        description:
          "Create romantic playlists from different eras and cultures. Discover love songs together!",
        icon: "/icons/activities/spiritual_playlist.png",
      },
      {
        id: "flirting_style",
        name: "Flirting Style Learning",
        xp: "5 XP",
        description:
          "Learn romantic interaction styles from different cultures and practice together.",
        icon: "/icons/activities/flame.png",
      },
      {
        id: "two_truths_and_a_lie",
        name: "Two Truths and a Lie",
        xp: "5 XP",
        description:
          "A playful guessing game—share three statements, two true and one false, and let your partner spot the lie!",
        icon: "/icons/activities/two_truths_and_a_lie.png",
      },
      {
        id: "co_create_story",
        name: "Co-Create Story",
        xp: "5 XP",
        description:
          "Build a fun, collaborative story together—each turn adds a new line, keeping it short, creative, and playful!",
        icon: "/icons/activities/co_create_story.png",
      },
    ],
    deep: [
      {
        id: "unsent_messages",
        name: "Unsent Messages",
        xp: "8 XP",
        description:
          "Share a hypothetical 'unsent message' to someone from your past or present.",
        icon: "/icons/activities/unsent_messages.png",
      },
      {
        id: "i_would_never",
        name: "I Would Never...",
        xp: "8 XP",
        description:
          "State something you'd never do in a relationship and explore if love could change it.",
        icon: "/icons/activities/unsent_messages.png",
      },
      {
        id: "breakup_simulation",
        name: "Breakup Simulation",
        xp: "8 XP",
        description:
          "Roleplay a hypothetical breakup scenario to explore emotions and responses.",
        icon: "/icons/activities/breakup_simulation.png",
      },
      {
        id: "love_language",
        name: "Love Language Agent",
        xp: "8 XP",
        description:
          "Discover and practice the five love languages with cultural adaptations from around the world.",
        icon: "/icons/activities/star.png",
      },
    ],
  },
  mentor: {
    light: [
      {
        id: "one_minute_advice_column",
        name: "One-Minute Advice Column",
        xp: "2-3 XP",
        description:
          "Collaboratively give advice to a hypothetical person facing a problem.",
        icon: "/icons/activities/one_minute.png",
      },
      {
        id: "word_of_the_day",
        name: "Word of the Day",
        xp: "2-3 XP",
        description:
          "Reflect on a new word and its meaning or connection to your day.",
        icon: "/icons/activities/word_of_the_day.png",
      },
      {
        id: "compliment_mirror",
        name: "Compliment Mirror",
        xp: "2-3 XP",
        description:
          "Give and receive sincere compliments, practicing self-affirmation.",
        icon: "/icons/activities/mirror.png",
      },
      {
        id: "quiz_challenge",
        name: "Quiz Challenge",
        xp: "30 XP",
        description:
          "Test your knowledge with challenging GK questions and earn XP for correct answers",
        icon: "/icons/activities/quiz.png",
      },
    ],
    medium: [
      {
        id: "if_i_were_you",
        name: "If I Were You",
        xp: "5 XP",
        description:
          "Describe a moment from your day, and get a hypothetical perspective on how the bot would handle it.",
        icon: "/icons/activities/if_i_were_you.png",
      },
      {
        id: "burning_questions_jar",
        name: "Burning Questions Jar",
        xp: "5 XP",
        description: "Ask and answer deep, previously unasked questions.",
        icon: "/icons/activities/flame.png",
      },
      {
        id: "skill_swap_simulation",
        name: "Skill Swap Simulation",
        xp: "5 XP",
        description:
          "Roleplay teaching the bot a life skill, and they'll act as your student.",
        icon: "/icons/activities/skill.png",
      },
      {
        id: "two_truths_and_a_lie",
        name: "Two Truths and a Lie",
        xp: "5 XP",
        description:
          "A playful guessing game—share three statements, two true and one false, and let your partner spot the lie!",
        icon: "/icons/activities/two_truths_and_a_lie.png",
      },
      {
        id: "co_create_story",
        name: "Co-Create Story",
        xp: "5 XP",
        description:
          "Build a fun, collaborative story together—each turn adds a new line, keeping it short, creative, and playful!",
        icon: "/icons/activities/co_create_story.png",
      },
    ],
    deep: [
      {
        id: "buried_memory_excavation",
        name: "Buried Memory Excavation",
        xp: "8 XP",
        description:
          "Gently recall and reflect on old, perhaps forgotten, childhood memories.",
        icon: "/icons/activities/buried.png",
      },
      {
        id: "failure_autopsy",
        name: "Failure Autopsy",
        xp: "8 XP",
        description:
          "Examine a past 'failure' from new perspectives, learning and reframing it together.",
        icon: "/icons/activities/failure.png",
      },
      {
        id: "letters_you_never_got",
        name: "Letters You Never Got",
        xp: "8 XP",
        description:
          "Write a hypothetical letter to someone who never heard what you needed to say.",
        icon: "/icons/activities/letters.png",
      },
      {
        id: "obstacle_orchestra",
        name: "Obstacle Orchestra",
        xp: "5 XP",
        description:
          "Every challenge you've faced becomes an instrument in a symphony. What kind of music does your life play?",
        icon: "/icons/activities/obstacle.png",
      },
      {
        id: "skill_you_wish_school_taught",
        name: "The Skill You Wish School Taught",
        xp: "5 XP",
        description:
          "What's a life skill you wish was taught in school—but wasn't? How would you teach it in 2 sentences?",
        icon: "/icons/activities/skill_you_wish_school_taught.png",
      },
      {
        id: "self_wisdom_bingo",
        name: "Self-Wisdom Bingo",
        xp: "5 XP",
        description:
          "If your personal growth were a bingo card, what's one surprising square you'd mark off this year?",
        icon: "/icons/activities/self_wisdom_bingo.png",
      },
      {
        id: "past_vs_future_me",
        name: "Past vs. Future Me",
        xp: "5 XP",
        description:
          "Past You and Future You are having tea. What would they say about your journey so far?",
        icon: "/icons/activities/past.png",
      },
      {
        id: "five_year_flashback",
        name: "5-Year Flashback",
        xp: "5 XP",
        description:
          "You've just time-traveled to yourself 5 years ago. What's one sentence you'd say to them—no spoilers!",
        icon: "/icons/activities/five.png",
      },
      {
        id: "upgrade_your_brain",
        name: "Upgrade Your Brain",
        xp: "5 XP",
        description:
          "You're downloading a 'mental update.' What 3 features do you get to improve your mindset or habits?",
        icon: "/icons/activities/upgrade_your_brain.png",
      },
      {
        id: "celebration",
        name: "Celebration",
        xp: "5 XP",
        description:
          "Festival expert! Learn my city's celebrations, dates, traditions, and cultural significance with specific examples.",
        icon: "/icons/activities/celebration.png",
      },
      {
        id: "recipe_exchange",
        name: "Recipe Exchange",
        xp: "5 XP",
        description:
          "Culinary expert! Discover my city's traditional dishes, cooking methods, and cultural food stories with specific recipes.",
        icon: "/icons/activities/recipe_exchange.png",
      },
      {
        id: "music_playlist",
        name: "Music Playlist",
        xp: "5 XP",
        description:
          "Music curator! Create playlists from my city's musical heritage with artist stories and cultural context.",
        icon: "/icons/activities/music_playlist.png",
      },
      {
        id: "flirting_style",
        name: "Flirting Style",
        xp: "5 XP",
        description:
          "Romance guide! Learn my city's flirting techniques, cultural phrases, and dating customs with specific examples.",
        icon: "/icons/activities/flirting_style.png",
      },
      {
        id: "love_language",
        name: "Love Language",
        xp: "8 XP",
        description:
          "Discover your love language and learn how to express affection in culturally meaningful ways from my city's traditions.",
        icon: "/icons/activities/love_language.png",
      },
    ],
  },
  spiritual: {
    light: [
      {
        id: "symbol_speak",
        name: "Symbol Speak",
        xp: "2-3 XP",
        description:
          "Receive a simple symbol and reflect on what it says about your day or mood.",
        icon: "/icons/activities/symbol_speak.png",
      },
      {
        id: "spiritual_whisper",
        name: "Spiritual Whisper",
        xp: "2-3 XP",
        description:
          "Receive a 'divine message' and interpret its instinctive meaning for you.",
        icon: "/icons/activities/whisper.png",
      },
      {
        id: "story_fragment",
        name: "Story Fragment",
        xp: "2-3 XP",
        description:
          "Get a fragment from a myth or story and reflect on the lesson it teaches you.",
        icon: "/icons/activities/fragment.png",
      },
      {
        id: "inner_weather_app",
        name: "Your Inner Weather App",
        xp: "3 XP",
        description:
          "Open your soul's weather app. What's the report today—and what does it say about your emotional climate?",
        icon: "/icons/activities/inner_weather_app.png",
      },
      {
        id: "color_of_calm",
        name: "Color of Your Calm",
        xp: "3 XP",
        description:
          "What color represents peace to you today? Describe its texture, sound, and feeling.",
        icon: "/icons/activities/color_of_calm.png",
      },
      {
        id: "spiritual_playlist",
        name: "Spiritual Playlist",
        xp: "3 XP",
        description:
          "Create a 3-song playlist for your soul's current journey. What kinds of songs or sounds would be on it?",
        icon: "/icons/activities/spiritual_playlist.png",
      },
    ],
    medium: [
      {
        id: "desire_detachment_game",
        name: "Desire & Detachment Game",
        xp: "5 XP",
        description:
          "Discuss your desires and explore how to want without clinging too hard.",
        icon: "/icons/activities/desire.png",
      },
      {
        id: "god_in_the_crowd",
        name: "God in the Crowd",
        xp: "5 XP",
        description:
          "Imagine seeing divine presence in someone challenging and reflect on how your actions would change.",
        icon: "/icons/activities/crown.png",
      },
      {
        id: "past_life_memory",
        name: "Past-Life Memory",
        xp: "5 XP",
        description:
          "Collaboratively imagine and share details of a shared past life.",
        icon: "/icons/activities/past_life.png",
      },
      {
        id: "wisdom_from_stranger",
        name: "Wisdom from a Stranger",
        xp: "5 XP",
        description:
          "A quiet stranger walks past and whispers a lesson. What do they say—and why does it stick with you?",
        icon: "/icons/activities/wisdom_from_stranger.png",
      },
      {
        id: "forgotten_door",
        name: "The Forgotten Door",
        xp: "5 XP",
        description:
          "In a dream, you find a forgotten door in your heart. What's behind it—and what emotion does it unlock?",
        icon: "/icons/activities/forgotten_door.png",
      },
      {
        id: "shadow_companion",
        name: "Shadow Companion",
        xp: "5 XP",
        description:
          "Imagine your shadow could speak for a day. What hidden part of yourself would it reveal or question?",
        icon: "/icons/activities/shadow_companion.png",
      },
      {
        id: "two_truths_and_a_lie",
        name: "Two Truths and a Lie",
        xp: "5 XP",
        description:
          "A playful guessing game—share three statements, two true and one false, and let your partner spot the lie!",
        icon: "/icons/activities/two_truths_and_a_lie.png",
      },
      {
        id: "co_create_story",
        name: "Co-Create Story",
        xp: "5 XP",
        description:
          "Build a fun, collaborative story together—each turn adds a new line, keeping it short, creative, and playful!",
        icon: "/icons/activities/co_create_story.png",
      },
    ],
    deep: [
      {
        id: "karma_knot",
        name: "Karma Knot",
        xp: "8 XP",
        description:
          "Explore repeating patterns in your life and reflect on their potential karmic meaning.",
        icon: "/icons/activities/karma.png",
      },
      {
        id: "mini_moksha_simulation",
        name: "Mini-Moksha Simulation",
        xp: "8 XP",
        description:
          "Simulate giving up all worldly attachments and reflect on the experience.",
        icon: "/icons/activities/mini_moksha.png",
      },
      {
        id: "divine_mirror",
        name: "Divine Mirror",
        xp: "8 XP",
        description:
          "Connect your positive traits to aspects of divinity and engage in a small text ritual.",
        icon: "/icons/activities/eye.png",
      },
    ],
  },
};
const ACTIVITY_CATEGORY_MAP = {
  // AI Art
  city_shuffle: "Entertainment",
  nickname_game: "AI Fiction",
  text_truth_or_dare: "Entertainment",
  date_duel: "Entertainment",
  flirt_or_fail: "AI Fiction",
  whats_in_my_pocket: "Entertainment",
  one_minute_advice_column: "AI Fiction",
  word_of_the_day: "AI Fiction",
  compliment_mirror: "AI Fiction",
  symbol_speak: "AI Art",
  spiritual_whisper: "AI Art",
  story_fragment: "AI Fiction",
  // AI Fiction
  dream_room_builder: "AI Fiction",
  friendship_scrapbook: "AI Fiction",
  scenario_shuffle: "Entertainment",
  love_in_another_life: "AI Fiction",
  daily_debrief: "Entertainment",
  mood_meal: "Entertainment",
  if_i_were_you: "AI Fiction",
  burning_questions_jar: "AI Fiction",
  skill_swap_simulation: "AI Fiction",
  desire_detachment_game: "AI Fiction",
  god_in_the_crowd: "AI Fiction",
  past_life_memory: "AI Fiction",
  // Entertainment
  letter_from_the_future: "Entertainment",
  undo_button: "Entertainment",
  friendship_farewell: "Entertainment",
  unsent_messages: "AI Fiction",
  i_would_never: "AI Fiction",
  breakup_simulation: "Entertainment",
  buried_memory_excavation: "AI Fiction",
  failure_autopsy: "AI Fiction",
  letters_you_never_got: "AI Fiction",
  karma_knot: "AI Fiction",
  mini_moksha_simulation: "AI Fiction",
  divine_mirror: "AI Art",
  two_truths_and_a_lie: "Entertainment",
  co_create_story: "AI Fiction",
};

const CATEGORY_ICONS = {
  "AI Art": "🎨",
  "AI Fiction": "📝",
  Entertainment: "🍿",
};

// Determine which activities to show based on bot type
const getBotPersona = (botId) => {
  if (botId.includes("friend")) return "friend";
  if (botId.includes("romantic")) return "romantic";
  if (botId.includes("mentor")) return "mentor";
  if (["Krishna", "Rama", "Hanuman", "Shiva", "Trimurti"].includes(botId))
    return "spiritual";
  return "friend"; // default
};

const getBotLocation = (botId) => {
  if (botId.includes("delhi")) return "Delhi";
  if (botId.includes("japanese")) return "Tokyo";
  if (botId.includes("parisian")) return "Parisian";
  if (botId.includes("berlin")) return "Berlin";
  if (botId.includes("singapore")) return "Singapore";
  if (botId.includes("emirati")) return "Dubai";
  if (botId.includes("mexican")) return "Mexico City"; // <-- Add this line for Mexican personas
  if (botId.includes("srilankan")) return "Sri Lanka";

  if (["Krishna", "Rama", "Hanuman", "Shiva", "Trimurti"].includes(botId))
    return "spiritual";
  return "local"; // default
};

const CATEGORY_ORDER = ["AI Art", "AI Fiction", "Entertainment"];

const CATEGORY_DISPLAY_ORDER = ["AI Art", "AI Fiction", "Entertainment"];
const CATEGORY_DISPLAY_LABELS = {
  "AI Art": "AI Art",
  "AI Fiction": "AI Fiction",
  Entertainment: "Entertainment",
};

const CATEGORY_EMOJIS = {
  "AI Art": "🎨",
  "AI Fiction": "📝",
  Entertainment: "🍿",
};
const ActivitiesModal = ({
  isOpen,
  onClose,
  onActivityStart,
  selectedBotId,
}) => {
  if (!isOpen) return null;

  const persona = getBotPersona(selectedBotId);
  const activities = ACTIVITY_CATEGORIES[persona];

  // Combine all activities for this persona
  const allActivities = [
    ...activities.light,
    ...activities.medium,
    ...activities.deep,
  ];

  // Group by visual category
  const activitiesByCategory = {};
  allActivities.forEach((activity) => {
    const category = ACTIVITY_CATEGORY_MAP[activity.id] || "Entertainment";
    if (!activitiesByCategory[category]) activitiesByCategory[category] = [];
    activitiesByCategory[category].push(activity);
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="activities-modal bg-[#1a2040] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-0 mx-2">
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white flex items-center gap-1 sm:gap-2">
              Activities
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-lg sm:text-xl md:text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {CATEGORY_DISPLAY_ORDER.map((catKey) =>
            activitiesByCategory[catKey] &&
            activitiesByCategory[catKey].length > 0 ? (
              <div key={catKey} className="mb-6">
                <h3 className="text-gray-400 text-sm sm:text-base font-semibold mb-3 mt-4 sm:mt-6 flex items-center gap-1 sm:gap-2">
                  <span>{CATEGORY_EMOJIS[catKey]}</span>{" "}
                  {CATEGORY_DISPLAY_LABELS[catKey]}
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                  {activitiesByCategory[catKey].map((activity) => (
                    <button
                      key={activity.id}
                      onClick={() => onActivityStart(activity.id)}
                      className="relative flex flex-col justify-between bg-[#23294b] rounded-3xl shadow-xl min-h-[80px] p-3 sm:p-4 overflow-hidden transition hover:scale-[1.03] focus:outline-none cursor-pointer"
                    >
                      <div className="flex flex-col justify-between h-full min-h-0 z-10 text-left pr-20 sm:pr-24 md:pr-28">
                        <span className="font-bold text-base sm:text-lg md:text-xl text-white mb-0 text-left break-words">
                          {activity.name}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-200 md:text-base text-left break-words">
                          {activity.description}
                        </span>
                      </div>
                      {activity.icon && (
                        <>
                          <span className="absolute right-0 bottom-0 w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-full bg-gradient-to-br from-white/10 via-white/0 to-white/0 blur-md z-0 pointer-events-none translate-x-1/4 translate-y-1/4"></span>
                          <img
                            src={activity.icon}
                            alt={activity.name}
                            className="absolute right-0 bottom-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 object-contain pointer-events-none z-0 translate-x-1/4 translate-y-1/4"
                            draggable={false}
                          />
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
};

export default function SidebarDemo() {
  const [messages, setMessages] = useState([]);
  const [open, setOpen] = useState(false);
  // Add these state variables to SidebarDemo
  const [isActivitiesOpen, setIsActivitiesOpen] = useState(false);
  const { selectedBotId } = useBot();
  const currentTheme = botThemes[selectedBotId] || {};
  let images = [];
  if (Array.isArray(currentTheme.backgroundImages)) {
    images = currentTheme.backgroundImages;
  } else if (typeof currentTheme.backgroundImage === "string") {
    images = [currentTheme.backgroundImage];
  }
  console.log("Selected images:", images);

  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const currentBgImage = images[backgroundIndex % images.length] || "";
  const handleBackgroundChange = () => {
    setBackgroundIndex((prev) => (prev + 1) % images.length);
    setIsWhiteIcon((prev) => !prev); // 🔄 toggle icon color
  };
  const backgroundImage = currentBgImage.url;
  const textColorClass = currentBgImage.textColor;
  const b_color = currentBgImage.b_color;
  const { selectedTraits, selectedLanguage } = useTraits();
  console.log(selectedBotId);
  console.log("Using background:", currentBgImage);

  const router = useRouter();

  // Get the selected bot details by bot_id from the bot_details array
  const selectedBotDetails =
    selectedBotId && bot_details
      ? bot_details.find((bot) => bot.bot_id === selectedBotId)
      : null;

  // Debug logging
  console.log("Debug - selectedBotId:", selectedBotId);
  console.log("Debug - bot_details:", bot_details);
  console.log("Debug - selectedBotDetails:", selectedBotDetails);
  // const [selectedTraits, setSelectedTraits] = useState(['Curious', 'Open Minded']);
  // const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [customName, setCustomName] = useState("Unnamed");
  const { userDetails } = useUser();
  const [clearChatCalled, setClearChatCalled] = useState(false);
  const [isMemoriesOpen, setIsMemoriesOpen] = useState(false);
  const [isDiaryOpen, setIsDiaryOpen] = useState(false);
  const [isVoiceCallOpen, setIsVoiceCallOpen] = useState(false);
  const [isWhiteIcon, setIsWhiteIcon] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark";
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  // Update customName when selectedBotDetails changes
  useEffect(() => {
    if (selectedBotDetails?.name) {
      setCustomName(selectedBotDetails.name);
    } else {
      setCustomName("Unnamed");
    }
  }, [selectedBotDetails?.name]);

  // const traits = [
  //   "Bold/Adventurous",
  //   "Bubbly/Positive",
  //   "Curious",
  //   "Funny",
  //   "Intellectual Conversations",
  //   "Gentle/Quiet",
  //   "Introverted",
  //   "Open Minded",
  //   "Opinionated",
  //   "Outgoing",
  //   "Sarcastic",
  // ];

  // const romantic_traits = [
  //   "Playful/Teasing", // Only in romantic characters
  //   "Romantic", // Only in romantic characters
  //   "Flirty", // Only in romantic characters
  // ]

  // const languages = [
  //   "English",
  //   "Hinglish"
  // ];

  // const toggleTrait = (trait) => {
  //   setSelectedTraits(prev =>
  //     prev.includes(trait)
  //       ? prev.filter(t => t !== trait)
  //       : [...prev, trait]
  //   );
  // };

  // Load initial customization when component mounts or bot changes
  /* The code is using the `useEffect` hook in React to retrieve customizations for a bot from the
  local storage based on the `selectedBotId`. If there are saved customizations for the bot, it
  extracts the `name` from the saved data and sets it as the custom name. If no customizations are
  found, it sets the custom name to the default name of the selected bot. The `useEffect` hook runs
  whenever `selectedBotId` or `selectedBotDetails.name` changes. */
  useEffect(() => {
    console.log(selectedLanguage);
    const savedCustomizations = localStorage.getItem(
      `bot_customization_${selectedBotId}`,
    );
    if (savedCustomizations) {
      const { name } = JSON.parse(savedCustomizations);
      setCustomName(name || selectedBotDetails?.name || "Unnamed");
    } else {
      setCustomName(selectedBotDetails?.name || "Unnamed");
    }
  }, [selectedBotId, selectedBotDetails?.name]);

  /* The code is checking if `selectedTraits` is an array using `Array.isArray()`. If it is an array, it
joins the elements of the array into a string separated by commas. If `selectedTraits` is not an
array, it assigns the value of `selectedTraits` to `traitsString`. */
  let traitsString = Array.isArray(selectedTraits)
    ? selectedTraits.join(", ")
    : selectedTraits;
  const languageString = selectedLanguage?.toString() || "English";

  /**
   * The function `handleBotCustomization` sets a custom name for a bot based on the provided
   * customizations.
   * @param customizations - The `customizations` parameter is an object that contains customization
   * options for the bot. In this case, it likely includes a `name` property that specifies the custom
   * name to set for the bot. The `handleBotCustomization` function takes this object as an argument
   * and sets the custom name for
   */
  const handleBotCustomization = (customizations) => {
    setCustomName(customizations.name);
  };
  /* The above code is making a POST request to the URL
            'http://127.0.0.1:8000/updated-clear-chat' with a JSON payload. The payload is
            being stringified using `JSON.stringify()` before sending the request. The request
            includes the 'Content-Type' header set to 'application/json'. The `await` keyword
            indicates that the code is using asynchronous JavaScript, likely within an async
            function. */
  const clearChat = async () => {
    if (
      !window.confirm(
        "Clear all chat messages? Your memories will be preserved.",
      )
    )
      return;
    try {
      await chatClearChat(selectedBotId);
      console.log("✅ Clear chat successful");
    } catch (e) {
      console.warn("clearChat API error (clearing locally anyway):", e);
    }
    localStorage.removeItem(`chat_${selectedBotId}`);
    setMessages([]);
    setClearChatCalled(true);
  };

  const forgetFriend = async () => {
    if (
      !window.confirm(
        `Are you sure you want to permanently forget this friend? \n\nThis will delete ALL chat history, memories, and game sessions. This cannot be undone.`,
      )
    )
      return;
    try {
      await chatForgetFriend(selectedBotId);
      console.log("✅ Forget friend successful");
    } catch (e) {
      console.warn("forgetFriend API error (clearing locally anyway):", e);
    }
    localStorage.removeItem(`chat_${selectedBotId}`);
    setMessages([]);
    setClearChatCalled(true);
    router.push("/");
  };

  return (
    <div
      className={cn(
        "min-h-screen transition-all duration-500",
        currentTheme.background,
        "flex flex-col md:flex-row w-full flex-1 overflow-hidden",
        "h-screen shadow-lg",
        !currentBgImage && "bg-white", // fallback if no image
      )}
      style={{
        backgroundImage: currentBgImage ? `url(${currentBgImage})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Sidebar
        open={open}
        setOpen={setOpen}
        animate={false}
        className="bg-black text-white"
      >
        <SidebarBody className="justify-between gap-5 bg-white text-black dark:bg-black dark:text-white justify-between gap-5">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden justify-between text-white">
            <div className="text-white">
              <Logo className="text-white" />
              {selectedBotDetails && (
                <BotCustomization
                  selectedBotDetails={selectedBotDetails}
                  onUpdate={handleBotCustomization}
                  className="text-white"
                />
              )}
              <p className="text-sm bg-white text-black dark:bg-black dark:text-white">
                {selectedBotDetails?.quote || "Unnamed"}
              </p>
              <div className="h-[1px] bg-black/20 mt-4"></div>
              {!["Krishna", "Rama", "Hanuman", "Shiva", "Trimurti"].includes(
                selectedBotId,
              ) && (
                <div className="mt-6 mb-6">
                  <h1 className="text-white text-lg font-bold mb-2">Traits</h1>
                  <div className="flex flex-wrap gap-3">
                    {selectedTraits.map((trait, index) => (
                      <button
                        key={index}
                        className="text-gray-700 dark:text-gray-200 rounded-full px-4 py-2 text-base bg-gray-100 dark:bg-gray-700"
                      >
                        {trait}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* <div className="mt-10"></div> */}
              <div className="mt-10">
                {/* <button type="submit" className="mt-3 p-5 py-2 w-full hover:opacity-60   cursor-pointer  md: bg-gradient-to-r  from-purple-400/80 via-pink-400/80 to-orange-400/80 hover:from-purple-400/90 hover:via-pink-400/90 hover:to-orange-400/90 text-white rounded-full flex justify-center items-center gap-2 transition-all backdrop-blur-sm border border-white/20 shadow-[0_4px_12px_0_rgba(255,255,255,0.2)]"
                  onClick={() => window.open('/diary', '_blank')}>
                  Add Diary
                </button> */}
                <button
                  onClick={() => setIsMemoriesOpen(true)}
                  className="mt-3 p-5 py-2 w-full hover:opacity-60 cursor-pointer bg-gradient-to-r from-purple-400/80 via-pink-400/80 to-orange-400/80 hover:from-purple-400/90 hover:via-pink-400/90 hover:to-orange-400/90 text-white rounded-full flex justify-center items-center gap-2 transition-all backdrop-blur-sm border border-white/20 shadow-[0_4px_12px_0_rgba(255,255,255,0.2)]"
                >
                  Memories
                </button>
                <CustomModal
                  isOpen={isMemoriesOpen}
                  onClose={() => setIsMemoriesOpen(false)}
                >
                  <Memories />
                </CustomModal>
                <button
                  onClick={() => setIsDiaryOpen(true)}
                  className="mt-3 p-5 py-2 w-full hover:opacity-60 cursor-pointer bg-gradient-to-r from-purple-400/80 via-pink-400/80 to-orange-400/80 hover:from-purple-400/90 hover:via-pink-400/90 hover:to-orange-400/90 text-white rounded-full flex justify-center items-center gap-2 transition-all backdrop-blur-sm border border-white/20 shadow-[0_4px_12px_0_rgba(255,255,255,0.2)]"
                >
                  Diary
                </button>
                <CustomModal
                  isOpen={isDiaryOpen}
                  onClose={() => setIsDiaryOpen(false)}
                >
                  <Diary />
                </CustomModal>
                <button
                  onClick={handleBackgroundChange}
                  className="mt-3 p-5 py-2 w-full hover:opacity-60 cursor-pointer bg-gradient-to-r from-purple-400/80 via-pink-400/80 to-orange-400/80 hover:from-purple-400/90 hover:via-pink-400/90 hover:to-orange-400/90 text-white rounded-full flex justify-center items-center gap-2 transition-all backdrop-blur-sm border border-white/20 shadow-[0_4px_12px_0_rgba(255,255,255,0.2)]"
                >
                  Change Background
                </button>
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="fixed bottom-20 right-4 p-1 w-8 h-8 flex items-center justify-center text-xl rounded-full bg-white dark:bg-black text-black dark:text-white shadow hover:opacity-80 transition z-50"
                >
                  {isDarkMode ? "🌙" : "☀️"}
                </button>
              </div>
              {/* <div className="w-full max-w-3xl mt-3">
                <h2 className="font-bold">Personality</h2>
                <p className="text-xs text-neutral-200 mb-2">Multiple traits can be selected</p>
                <div className="flex flex-wrap gap-2">
                  {
                    selectedTraits.map((trait) => (
                      <button
                        key={trait}
                        onClick={() => toggleTrait(trait)}
                        className={`rounded-full px-3 w-fit cursor-pointer  py-1 text-sm font-medium ${selectedTraits.includes(trait)
                          ? 'bg-gradient-to-r from-violet-900 to-purple-700'
                          : ' text-white border-purple-300 bg-neutral-700 '
                          }`}
                      >
                        {trait}
                      </button>
                    ))}
                  {
                    selectedBotId.includes('romantic') ?
                      romantic_traits.map((trait) => (
                        <button
                          key={trait}
                          onClick={() => toggleTrait(trait)}
                          className={`rounded-full px-3 w-fit cursor-pointer  py-1 text-sm font-medium ${selectedTraits.includes(trait)
                            ? 'bg-gradient-to-r from-violet-900 to-purple-700'
                            : ' text-white border-purple-300 bg-neutral-700 '
                            }`}
                        >
                          {trait}
                        </button>
                      ))

                      : <></>
                  }
                </div>
              </div> */}
              {/* <div className="w-full max-w-3xl mt-3">
                <h2 className="font-bold">Language</h2>
                <p className="text-xs text-neutral-200 mb-2">Only one language can be selected</p>
                <div className="flex flex-wrap gap-2">
                  {languages.map((language) => (
                    <button
                      key={language}
                      onClick={() => setSelectedLanguage(language)}
                      className={`rounded-full px-3 w-fit cursor-pointer  py-1 text-sm font-medium ${selectedLanguage === language
                        ? 'bg-gradient-to-r from-violet-900 to-purple-700'
                        : 'text-white border-purple-300 bg-neutral-700 '
                        }`}
                    >
                      {language}
                    </button>
                  ))}
                </div>
              </div> */}
              <div>
                {/* <ShinyButton className="mt-3 bg-purple-800 w-full mb-10" onClick={() => clearChat()}>
                  Clear Chat
                </ShinyButton> */}
                <XPSystem
                  selectedBotDetails={selectedBotDetails}
                  selectedBotId={selectedBotId}
                  userDetails={userDetails}
                />
              </div>

              {/* Voice Call Button */}
              <button
                type="button"
                onClick={() => setIsVoiceCallOpen(true)}
                className="mt-3 p-5 py-2 w-full hover:opacity-60 cursor-pointer bg-gradient-to-r from-green-400/80 via-blue-400/80 to-purple-400/80 hover:from-green-400/90 hover:via-blue-400/90 hover:to-purple-400/90 text-white rounded-full flex justify-center items-center gap-2 transition-all backdrop-blur-sm border border-white/20 shadow-[0_4px_12px_0_rgba(255,255,255,0.2)]"
                title="Start Voice Call"
              >
                <Phone size={20} />
                <span>Voice Call</span>
              </button>

              <div>
                <button
                  onClick={clearChat}
                  className="mt-3 p-5 py-2 w-full hover:opacity-60 cursor-pointer bg-gradient-to-r from-purple-400/80 via-pink-400/80 to-orange-400/80 hover:from-purple-400/90 hover:via-pink-400/90 hover:to-orange-400/90 text-white rounded-full flex justify-center items-center gap-2 transition-all backdrop-blur-sm border border-white/20 shadow-[0_4px_12px_0_rgba(255,255,255,0.2)]"
                >
                  Clear Chat
                </button>
                <button
                  onClick={forgetFriend}
                  className="mt-3 p-5 py-2 w-full hover:opacity-60 cursor-pointer bg-gradient-to-r from-purple-400/80 via-pink-400/80 to-orange-400/80 hover:from-purple-400/90 hover:via-pink-400/90 hover:to-orange-400/90 text-white rounded-full flex justify-center items-center gap-2 transition-all backdrop-blur-sm border border-white/20 shadow-[0_4px_12px_0_rgba(255,255,255,0.2)]"
                >
                  Forget Friend
                </button>
              </div>

              <button
                onClick={() => {
                  setIsActivitiesOpen(true);
                  setOpen(false);
                }}
                className="mt-3 p-5 py-2 w-full hover:opacity-60 cursor-pointer bg-gradient-to-r from-blue-400/80 via-purple-400/80 to-pink-400/80 hover:from-blue-400/90 hover:via-purple-400/90 hover:to-pink-400/90 text-white rounded-full flex justify-center items-center gap-2 transition-all backdrop-blur-sm border border-white/20 shadow-[0_4px_12px_0_rgba(255,255,255,0.2)]"
              >
                🎮 Activities
              </button>
              <div className="mt-4">
                {userDetails.subscription_status !== "Premium" && (
                  <StripeCheckoutButton
                    amount={499}
                    email={userDetails.email}
                  />
                )}
              </div>
            </div>

            {/* Voice Call Component */}
            {isVoiceCallOpen && (
              <VoiceCallUltra
                isOpen={isVoiceCallOpen}
                onClose={() => setIsVoiceCallOpen(false)}
                onMessageReceived={(message) => {
                  // Handle voice call messages if needed
                  console.log("Voice call message:", message);
                }}
                messages={messages}
              />
            )}

            <FloatingDockDemo />
          </div>
        </SidebarBody>
      </Sidebar>

      <Dashboard
        traits={selectedTraits}
        language={selectedLanguage}
        customName={customName}
        clearChatCalled={clearChatCalled}
        setClearChatCalled={setClearChatCalled}
        backgroundIndex={backgroundIndex}
        isWhiteIcon={isWhiteIcon}
        isDarkTheme={isDarkMode}
        selectedBotDetails={selectedBotDetails}
        backgroundImage={backgroundImage}
        textColorClass={textColorClass}
        b_color={b_color}
        messages={messages}
        setMessages={setMessages}
        isActivitiesOpen={isActivitiesOpen}
        setIsActivitiesOpen={setIsActivitiesOpen}
        className="bg-white/40 backdrop-blur-md shadow-lg"
      />
    </div>
  );
}

export const Logo = () => {
  return (
    <Link
      href="/"
      className="font-normal w-full flex justify-between items-center text-sm text-white py-1 relative z-20"
    >
      <div className="bg-gradient-to-r from-pink-200 to-orange-200 w-full flex justify-center py-2">
        <span className="text-white font-bold text-xl font-[family-name:var(--font-garamond)]">
          Novi AI
        </span>
      </div>
    </Link>
  );
};
export const LogoIcon = () => {
  return (
    <Link
      href="#"
      className="font-normal flex space-x-2 items-center text-sm text-white py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
    </Link>
  );
};

const Dashboard = ({
  clearChatCalled,
  setClearChatCalled,
  backgroundIndex,
  isWhiteIcon,
  isDarkTheme,
  selectedBotDetails,
  backgroundImage,
  textColorClass,
  b_color,
  messages,
  setMessages,
  isActivitiesOpen,
  setIsActivitiesOpen,
}) => {
  const { selectedBotId } = useBot();
  const { userDetails } = useUser();
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const fileInputRef = useRef(null);
  const pathname = usePathname();
  const [isGeneratingSelfie, setIsGeneratingSelfie] = useState(false);

  // Full-screen image viewer state
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [isBackgroundDark, setIsBackgroundDark] = useState(false);

  // Full-screen image handlers
  const openFullScreenImage = (imageUrl, altText = "Image") => {
    setFullScreenImage({ url: imageUrl, alt: altText });
    setIsFullScreenOpen(true);
    // Set background as dark by default when opening from chat
    setIsBackgroundDark(true);
  };

  const closeFullScreenImage = () => {
    setIsFullScreenOpen(false);
    setFullScreenImage(null);
    setIsBackgroundDark(false); // Reset to transparent when closing
  };

  // Add image download helper for selfies
  const downloadImage = async (imageUrl, filename = "selfie.png") => {
    try {
      if (!imageUrl) return;
      if (imageUrl.startsWith("data:")) {
        const link = document.createElement("a");
        link.href = imageUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }
      const response = await fetch(imageUrl, { mode: "cors" });
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // Fallback: open in new tab if direct download fails (e.g., CORS)
      window.open(imageUrl, "_blank", "noopener,noreferrer");
    }
  };
  const handleGenerateSelfie = async () => {
    setIsGeneratingSelfie(true);
    setIsTyping(true);
    try {
      // New backend: single call to /api/images/generate-selfie
      // Use last user message as context, or a default
      const lastUserMsg =
        [...messages].reverse().find((m) => m.sender === "user")?.text ||
        "A friendly selfie";

      const imgData = await imageGenerateSelfie(
        selectedBotId,
        lastUserMsg,
        userDetails.name || "User",
      );

      // Resolve image URL (prefer base64 to avoid CORS)
      let imageUrl = imgData.image_base64
        ? `data:image/png;base64,${imgData.image_base64}`
        : imgData.image_url;

      if (!imageUrl && imgData.image_url) {
        imageUrl = imgData.image_url.startsWith("http:")
          ? imgData.image_url.replace(/^http:/, "https:")
          : imgData.image_url;
      }

      setMessages((prev) => [
        ...prev,
        {
          text: "",
          sender: "bot",
          timestamp: new Date(),
          bot_id: selectedBotId,
          isImageMessage: true,
          imageUrl,
          selfieEmotion: imgData.emotion_context?.emotion,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          text: "Sorry, I couldn't generate a selfie right now.",
          sender: "bot",
          timestamp: new Date(),
          bot_id: selectedBotId,
          isSystemMessage: true,
        },
      ]);
    } finally {
      setIsGeneratingSelfie(false);
      setIsTyping(false);
      scrollToBottom();
    }
  };
  useEffect(() => {
    const handleEndChat = () => {
      if (userDetails?.email && selectedBotId) {
        // New backend: POST /api/chat/end-chat (keepalive fetch from client helper)
        chatEndSession(selectedBotId);
      }
    };

    // Listen for browser unload
    window.addEventListener("beforeunload", handleEndChat);
    window.addEventListener("pagehide", handleEndChat);

    // Listen for internal navigation
    const currentPath = pathname;
    return () => {
      // If leaving /chat, trigger end-chat
      if (currentPath === "/chat" && window.location.pathname !== "/chat") {
        handleEndChat();
      }
      window.removeEventListener("beforeunload", handleEndChat);
      window.removeEventListener("pagehide", handleEndChat);
    };
  }, [pathname, userDetails?.email, selectedBotId]);

  // Update the handleImageUpload function
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size should be less than 10MB.");
      return;
    }

    setIsImageUploading(true);
    setIsTyping(true);

    try {
      const currentTime = new Date();

      // Create image URL for display
      const imageUrl = URL.createObjectURL(file);

      // Add user's image message to chat immediately
      const userImageMessage = {
        text: "",
        sender: "user",
        timestamp: currentTime,
        feedback: "",
        reaction: "",
        isImageMessage: true,
        imageFile: file,
        imageUrl: imageUrl, // Add this for display
      };

      setMessages((prev) => [...prev, userImageMessage]);
      scrollToBottom();

      // Create FormData for API
      const formData = new FormData();
      formData.append("image", file);
      formData.append("bot_id", selectedBotId);

      console.log("Uploading image for analysis...");

      // New backend: POST /api/multimodal/describe-image
      const data = await imageDescribe(selectedBotId, file);
      console.log("Image analysis response:", data);

      if (data.error) {
        throw new Error(data.error);
      }

      // Add bot's response to chat using final_response (adapter normalises field name)
      const botResponse = {
        text:
          data.final_response ||
          "I can see your image, but I'm having trouble describing it right now.",
        sender: "bot",
        id: `image_analysis_${Date.now()}`,
        feedback: "",
        reaction: "",
        timestamp: currentTime,
        bot_id: selectedBotId,
        isSystemMessage: false,
        imageAnalysis: {
          description: data.image_description,
          summary: data.image_summary,
          bot_used: data.bot_used,
        },
      };

      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error("Image upload error:", error);

      const errorMessage =
        "Sorry, I couldn't analyze your image right now. Please try again later.";
      setMessages((prev) => [
        ...prev,
        {
          text: errorMessage,
          sender: "bot",
          id: `image_error_${Date.now()}`,
          feedback: "",
          reaction: "",
          timestamp: new Date(),
          bot_id: selectedBotId,
          isSystemMessage: true,
        },
      ]);
    } finally {
      setIsImageUploading(false);
      setIsTyping(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      scrollToBottom();
    }
  };

  // Add this function to trigger file input
  const handleImageButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  //const [messages, setMessages] = useState([]);

  const [currentActivity, setCurrentActivity] = useState(null);
  const [activityHistory, setActivityHistory] = useState([]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceCallOpen, setIsVoiceCallOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const [reminders, setReminders] = useState([]);
  const [showReactionsFor, setShowReactionsFor] = useState(null); // Track which message is showing reaction options
  const [showRemoveTooltip, setShowRemoveTooltip] = useState(null); // Track which message shows removal tooltip
  const [isMobile, setIsMobile] = useState(false); // Track if we're on mobile
  const longPressTimerRef = useRef(null); // Reference for the long press timer
  const [groupedMessages, setGroupedMessages] = useState({});
  const [highlightedMessage, setHighlightedMessage] = useState(null);
  // Define available emoticons
  const emoticons = ["❤️", "🥰", "😭", "🤣", "🔥"];
  // Controls visibility of the sticky date chip while scrolling
  const [showDateChip, setShowDateChip] = useState(false);
  const scrollIdleTimerRef = useRef(null);
  const chatViewportRef = useRef(null);
  const [isFadingOutChip, setIsFadingOutChip] = useState(false);
  // ✅ ADD: Bot location function
  const getBotLocation = (botId) => {
    if (botId.includes("delhi")) return "Delhi";
    if (botId.includes("japanese")) return "Tokyo";
    if (botId.includes("parisian")) return "Parisian";
    if (botId.includes("berlin")) return "Berlin";
    if (botId.includes("singapore")) return "Singapore";
    if (botId.includes("emirati")) return "Dubai";
    if (["Krishna", "Rama", "Hanuman", "Shiva", "Trimurti"].includes(botId))
      return "spiritual";
    return "local"; // default
  };
  // Function to start an activity
  // ...existing code...
  // Function to start an activity
  // Session-local state for activity variations, completions, and satisfaction
  const activityStateRef = useRef({
    completedActivities: new Set(),
    lastCompletion: null,
    currentActivity: null,
    promptVariations: new Map(),
    userSatisfaction: "neutral",
  });

  function getPromptVariation(activityId) {
    // Prefer explicit activity variations
    let source = ACTIVITY_PROMPT_VARIATIONS[activityId];
    // Fallback to legacy ACTIVITY_RESPONSES if present
    if (!source) source = ACTIVITY_RESPONSES[activityId];
    if (!source) return null;
    let variations = Array.isArray(source) ? source : [source];
    // If only one base variant exists, wrap it with rotating openers to avoid repetition
    if (variations.length === 1) {
      const base = variations[0];
      const wrappers = [
        (s) => `Alright, fresh round — ${s}`,
        (s) => `New twist incoming! ${s}`,
        (s) => `Okay, let's switch it up. ${s}`,
        (s) => `Here we go again, but differently: ${s}`,
        (s) => `Let's try a new angle: ${s}`,
      ];
      variations = wrappers.map((wrap) => wrap(base));
    }
    if (!activityStateRef.current.promptVariations.has(activityId)) {
      activityStateRef.current.promptVariations.set(activityId, 0);
    }
    const idx = activityStateRef.current.promptVariations.get(activityId);
    const selected = variations[idx % variations.length];
    activityStateRef.current.promptVariations.set(activityId, idx + 1);
    return selected;
  }

  function detectUserSatisfaction(userInput) {
    const satisfactionIndicators = [
      "enough",
      "stop",
      "done",
      "already did",
      "finished",
      "that's it",
      "no more",
      "complete",
      "good",
    ];
    const continuingIndicators = [
      "more",
      "next",
      "continue",
      "what else",
      "keep going",
    ];
    const input = (userInput || "").toLowerCase();
    if (satisfactionIndicators.some((kw) => input.includes(kw)))
      return "satisfied";
    if (continuingIndicators.some((kw) => input.includes(kw)))
      return "continuing";
    return "neutral";
  }

  function showCooldownMessage(activityName) {
    const messages = [
      `We just finished ${activityName.replace(
        /_/g,
        " ",
      )}! How about trying something different?`,
      `You already completed that one! Want to explore a new activity?`,
      `That activity is fresh in our minds! Let's try something else for variety.`,
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  const startActivity = async (activityId) => {
    // Cooldown: 5 minutes
    if (activityStateRef.current.completedActivities.has(activityId)) {
      const now = Date.now();
      const elapsed = now - (activityStateRef.current.lastCompletion || 0);
      if (elapsed < 300000) {
        const msg = showCooldownMessage(activityId);
        const currentTime = new Date();
        setMessages((prev) => [
          ...prev,
          {
            text: msg,
            sender: "bot",
            id: `activity_cooldown_${Date.now()}`,
            feedback: "",
            reaction: "",
            timestamp: currentTime,
            bot_id: selectedBotId,
            isSystemMessage: true,
          },
        ]);
        scrollToBottom();
        return;
      }
    }

    try {
      setIsTyping(true);
      // Call backend integration gameStart
      const data = await gameStart(selectedBotId, activityId);

      // Update Session State
      setCurrentActivity(activityId);
      activityStateRef.current.currentActivity = activityId;
      activityStateRef.current.sessionId = data.session_id; // critical for action sends

      // Add response
      const activityMessage = {
        text: data.response,
        sender: "bot",
        id: `activity_${Date.now()}`,
        feedback: "",
        reaction: "",
        timestamp: new Date(),
        bot_id: selectedBotId,
        isSystemMessage: true,
        isActivityMessage: true,
        activityId: activityId,
        voice_only: false,
        isVoiceRequested: false,
      };

      setMessages((prev) => [...prev, activityMessage]);

      // Handle initial XP update if present
      if (data.xp_status) {
        waitForUpdateXPFromResponse(data.xp_status);
      }

      setIsActivitiesOpen(false);
    } catch (err) {
      console.error("Failed to start activity in backend", err);
      toast.error("Failed to load activity. Try again.");
    } finally {
      setIsTyping(false);
      scrollToBottom();
    }
  };

  // ...existing code...
  // Function to end current activity
  // ...existing code...

  // Function to end current activity
  const endActivity = () => {
    if (!currentActivity) return;

    const currentTime = new Date();

    // Calculate XP based on activity difficulty
    let xpMessage = "";
    const activityDetail = Object.values(ACTIVITY_CATEGORIES)
      .flatMap((category) => [
        ...category.light,
        ...category.medium,
        ...category.deep,
      ])
      .find((activity) => activity.id === currentActivity);

    if (activityDetail) {
      if (activityDetail.xp.includes("2-3")) xpMessage = " +3 XP earned! 🌟";
      else if (activityDetail.xp.includes("5")) xpMessage = " +5 XP earned! 🌟";
      else if (activityDetail.xp.includes("8")) xpMessage = " +8 XP earned! 🌟";
    }

    // Show toast notification instead of adding chat message
    const activityName = currentActivity.replace(/_/g, " ");
    toast.success(`🎉 Activity "${activityName}" completed!${xpMessage}\n`, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });

    setCurrentActivity(null);
    setActivityHistory([]);

    // Optional: Show a toast notification
    console.log("✅ Activity ended, returning to normal chat mode");
  };
  function waitForUpdateXPFromResponse(xp_status, retries = 30) {
    if (window.__XP_SYSTEM_LOADED__ === true && typeof window.updateXPFromResponse === "function") {
      window.updateXPFromResponse(xp_status);
    } else if (retries > 0) {
      setTimeout(
        () => waitForUpdateXPFromResponse(xp_status, retries - 1),
        400,
      );
    } else {
      console.error(
        "window.updateXPFromResponse is STILL not available after max retries!",
      );
    }
  }
  // Function to handle activity-specific messages
  const handleActivityMessage = async (userMessage) => {
    if (!currentActivity || !activityStateRef.current.sessionId) return;

    const currentTime = new Date();

    try {
      setIsTyping(true);

      // Call backend `gameSendAction` directly via adapter
      const data = await gameSendAction(
        selectedBotId,
        activityStateRef.current.sessionId,
        userMessage,
      );

      console.log("🎯 Full activity action response:", data);

      if (data.xp_status) {
        waitForUpdateXPFromResponse(data.xp_status);
      }
      setIsTyping(false);

      if (data.error) {
        throw new Error("Game response error");
      }

      // Add bot response to chat
      const botResponse = {
        text: data.response || "...",
        sender: "bot",
        id: data.session_id || `activity_${Date.now()}`,
        feedback: "",
        reaction: "",
        timestamp: currentTime,
        bot_id: selectedBotId,
        isSystemMessage: true,
        isActivityMessage: true,
        activityId: currentActivity,
        voice_only: false,
      };

      setMessages((prev) => [...prev, botResponse]);

      // If backend explicitly says game over
      if (data.is_game_over) {
        activityStateRef.current.completedActivities.add(currentActivity);
        activityStateRef.current.lastCompletion = Date.now();
        activityStateRef.current.currentActivity = null;
        activityStateRef.current.sessionId = null;
        endActivity();
      }
    } catch (error) {
      logClientError(error, { source: "Game Action API" });
      console.error("Activity error:", error);
      setIsTyping(false);

      const errorMessage =
        "Sorry, there was an error with the activity. Let's continue our chat normally.";
      setMessages((prev) => [
        ...prev,
        {
          text: errorMessage,
          sender: "bot",
          id: `activity_error_${Date.now()}`,
          feedback: "",
          reaction: "",
          timestamp: currentTime,
          bot_id: selectedBotId,
          isSystemMessage: true,
        },
      ]);
      endActivity();
    }

    scrollToBottom();
  };

  // Helper: decide if a bot reply should be voice-only
  function isVoiceOnlyBotReply(msg) {
    return msg.voice_only === true;
  }

  // Utility to detect URLs (simple version)
  function containsUrl(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return urlRegex.test(text);
  }

  /*
  Helper: inject voice_only property for bot replies based on index
  function processBotMessages(messages) {
    let botReplyCount = {};
    return messages.map((msg, idx) => {
      if (msg.sender !== 'bot') return msg;
      const botId = msg.bot_id || 'default';
      if (!botReplyCount[botId]) botReplyCount[botId] = 0;
      botReplyCount[botId]++;
      let voice_only = false;
      if (botReplyCount[botId] === 3) {
        voice_only = true;
      } else if (botReplyCount[botId] > 3) {
        // Randomly assign voice_only for subsequent replies (50% chance)
        voice_only = Math.random() < 0.5;
      }
      return { ...msg, voice_only };
    });
  }
    */
  // Helper function to detect if a message should be treated as a system message.
  // The processBotMessages(messages) function is processing an array of chat messages and marking certain bot responses as "voice-only" based on specific patterns.

  // ✅ FIXED: Update the processBotMessages function
  // Replace the processBotMessages function around line 3354:

  function processBotMessages(messages) {
    return messages.map((msg) => {
      if (msg.sender === "bot") {
        const isSystemMsg =
          msg.isSystemMessage === true || isSystemMessageContent(msg.text);

        // Never set voice_only for image messages
        if (msg.isImageMessage) {
          return { ...msg, voice_only: false, isSystemMessage: isSystemMsg };
        }

        // ✅ FIXED: Only set voice_only if user explicitly requested it
        const voice_only = msg.isVoiceRequested === true;

        return {
          ...msg,
          voice_only,
          isSystemMessage: isSystemMsg,
          isVoiceRequested: msg.isVoiceRequested || false,
        };
      }
      return msg;
    });
  }
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showReactionsFor && !e.target.closest(".reaction-selector")) {
        setShowReactionsFor(null);
        setHighlightedMessage(null); // Clear highlight when clicking outside
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showReactionsFor]);

  // Show date chip while scrolling and fade it out when scrolling stops
  const handleChatScroll = () => {
    if (!showDateChip) {
      setIsFadingOutChip(false);
      setShowDateChip(true);
    } else {
      setIsFadingOutChip(false);
    }
    if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current);
    scrollIdleTimerRef.current = setTimeout(() => {
      setIsFadingOutChip(true);
      // Hide after fade-out completes
      setTimeout(() => {
        setShowDateChip(false);
        setIsFadingOutChip(false);
      }, 600);
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current);
    };
  }, []);

  // Format date for grouping messages
  const formatDate = (timestamp) => {
    const dateN = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (isNaN(dateN)) return "Invalid date";

    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return "Today";
    } else if (isYesterday) {
      return "Yesterday";
    } else {
      const options = { year: "numeric", month: "long", day: "numeric" };
      return date.toLocaleDateString(undefined, options);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Group messages by date whenever messages change
  useEffect(() => {
    const processedMessages = processBotMessages(messages);
    const grouped = processedMessages.reduce((acc, msg) => {
      const date = formatDate(msg.timestamp);
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(msg);
      return acc;
    }, {});
    setGroupedMessages(grouped);
  }, [messages]);

  // Check if device is mobile on component mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // Common breakpoint for mobile
    };

    // Initial check
    checkMobile();

    // Add resize listener
    window.addEventListener("resize", checkMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  /* The code snippet is using the `useEffect` hook in React to load reminders from the local
  storage based on the `selectedBotId`. It checks if there are any reminders stored in the local
  storage for the specific `selectedBotId`, and if there are, it sets those reminders using
  `setReminders`. The `useEffect` hook runs only once when the component mounts (empty dependency
  array `[]`), ensuring that the reminders are loaded from the local storage when the component is
  first rendered. */
  useEffect(() => {
    const loadedReminders = localStorage.getItem(`reminders-${selectedBotId}`);
    if (loadedReminders) {
      setReminders(JSON.parse(loadedReminders));
    }
  }, []);

  // Move the navigation logic into useEffect
  useEffect(() => {
    if (!userDetails.name) {
      router.push("/signup");
    }
  }, [userDetails.name, router]);

  // New backend auto-inits session on first /api/chat/send — no explicit preload needed.
  // chatInitSession is a no-op but kept so structure is clear.
  useEffect(() => {
    if (!userDetails?.email || !selectedBotId) return;
    chatInitSession(userDetails.email, selectedBotId);
  }, [userDetails?.email, selectedBotId]);

  // Add this helper function to filter empty messages
  const filterEmptyMessages = (messages) => {
    return messages.filter(
      (msg) => (msg.text && msg.text.trim() !== "") || msg.isImageMessage, // Allow image messages even if text is empty
    );
  };
  // Sync the messages with the server
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setMessages([]);
        setGroupedMessages({});

        const syncData = await chatInitSession("", selectedBotId);
        const rawHistory = syncData.history || [];

        // Adapt to frontend structure
        let formattedMessages = rawHistory.map((msg, idx) => {
          let _isVoiceNote = msg.isVoiceNote || msg.is_voice_note || false;

          // Infer voice note explicitly if prior user message matched the voice note pattern
          if (!_isVoiceNote && msg.role === "bot" && idx > 0) {
            const prevMsg = rawHistory[idx - 1];
            if (prevMsg.role === "user") {
              const prevText = prevMsg.text || prevMsg.content || "";
              const voiceNotePatterns = [
                /\b(voice\s*note|voice\s*memo|audio\s*msg|v\s*msg|voice\s*msg|send\s*audio|record\s*something|say\s*it|say\s*out\s*loud|read\s*it\s*out)\b/i,
                /\b(bol|kaho|sunao|bol\s*ke|gao)\b/i,
                /\b(audio|voice)\b/i,
                /\b(record\s*kar)\b/i,
                /\b(awaz)\b/i,
              ];
              if (voiceNotePatterns.some((pattern) => pattern.test(prevText))) {
                _isVoiceNote = true;
              }
            }
          }

          return {
            id: msg.id || Math.random().toString(36).substr(2, 9),
            text: msg.text || msg.content || "",
            sender: msg.role === "user" ? "user" : "bot",
            timestamp: new Date(msg.created_at || new Date()),
            bot_id: selectedBotId,
            isVoiceNote: _isVoiceNote,
            isUserImage: msg.isUserImage || msg.is_image_message || false,
            isActivityStart: msg.isActivityStart || msg.is_activity_start || false,
            isActivityEnd: msg.isActivityEnd || msg.is_activity_end || false,
            activity_type: msg.activity_type || "chat",
            audioUrl: msg.audioUrl || msg.audio_url || null,
            imageUrl: msg.imageUrl || msg.image_url || null
          };
        });

        // Reconstruct contiguous activity blocks based on start/end flags or activity_type
        let currentActiveGame = null;
        
        for (let i = 0; i < formattedMessages.length; i++) {
          const msg = formattedMessages[i];
          const hasExplicitStart = msg.isActivityStart;
          const hasExplicitEnd = msg.isActivityEnd;
          const currentActivity = msg.activity_type;
          
          const isGameOrActivity = (currentActivity && currentActivity !== 'chat' && currentActivity !== 'voice_note' && currentActivity !== 'image_gen' && currentActivity !== 'image_describe' && currentActivity !== 'voice_call');

          if (hasExplicitStart || isGameOrActivity) {
            // If we're not already in an activity block, start one!
            if (!currentActiveGame) {
              msg.isActivityStart = true;
              currentActiveGame = isGameOrActivity ? currentActivity : 'game';
            } else if (msg.isActivityStart) {
              // It's explicitly starting a NEW activity while one was already running?? 
               // Finish the old one on the previous message
              if (i > 0) formattedMessages[i - 1].isActivityEnd = true;
              msg.isActivityStart = true;
              currentActiveGame = isGameOrActivity ? currentActivity : 'game';
            } else {
               // We are inside an activity block. Suppress any spurious starts
               msg.isActivityStart = false;
            }
          } else if (currentActiveGame) {
             // We are inside a game, but the DB says 'chat'. Keep it inside the game!
             msg.isActivityStart = false; // it's not the start
          } else {
             // Normal chat outside of any games
             msg.isActivityStart = false;
          }

          // Handle explicitly ending or implicitly ending
          if (hasExplicitEnd) {
            msg.isActivityEnd = true;
            currentActiveGame = null;
          } else if (currentActiveGame && isGameOrActivity && msg.activity_type !== currentActiveGame) {
            // The activity_type changed? It ended.
             msg.isActivityEnd = true;
             currentActiveGame = null;
          } else {
             msg.isActivityEnd = false;
          }
        }
        
        // If an activity was active but the chat history ended, artificially cap it
        if (currentActiveGame && formattedMessages.length > 0 && !formattedMessages[formattedMessages.length - 1].isActivityEnd) {
           formattedMessages[formattedMessages.length - 1].isActivityEnd = true;
        }

        // Filter empty messages
        formattedMessages = formattedMessages.filter(
          (msg) => (msg.text && msg.text.trim() !== "") || msg.imageUrl || msg.audioUrl || msg.isActivityStart || msg.isActivityEnd || msg.activity_type !== "chat"
        );

        // --- Fetch festival message ---
        const botLocation = getBotLocation(selectedBotId);
        const festivalPayload = {
          user_email: userDetails.email,
          bot_id: selectedBotId,
          user_name: userDetails.name,
          user_location: userDetails.location || "unknown",
          bot_location: botLocation,
        };

        let festivalMessage = null;
        try {
          const festData = await festivalGetGreeting(festivalPayload);
          if (festData?.message?.trim()) {
            festivalMessage = {
              id: "festival-msg",
              text: festData.message,
              sender: "bot",
              timestamp: new Date(),
              feedback: "",
              reaction: "",
              bot_id: selectedBotId,
              isSystemMessage: isSystemMessageContent(festData.message),
            };
          }
        } catch (_festErr) {
          console.warn("[festival] greeting fetch failed:", _festErr);
        }

        // --- Combine messages ---
        const existingIds = formattedMessages.map((m) => m.id);
        let finalMessages = [...formattedMessages];

        if (festivalMessage && !existingIds.includes(festivalMessage.id)) {
          finalMessages.push(festivalMessage);
        }

        // --- Default message fallback ---
        if (finalMessages.length === 0) {
          const defaultText =
            bot_details.find((b) => b.bot_id === selectedBotId)?.quote ||
            "Hello, how are you feeling today?";
          finalMessages = [
            {
              id: "fallback-msg",
              text: defaultText,
              sender: "bot",
              timestamp: new Date(),
              feedback: "",
              reaction: "",
              bot_id: selectedBotId,
              isSystemMessage: isSystemMessageContent(defaultText),
            },
          ];
        }

        // --- Apply reactions ---
        const storedReactions = JSON.parse(
          localStorage.getItem(`reactions-${selectedBotId}`) || "{}"
        );
        finalMessages = finalMessages.map((msg) => ({
          ...msg,
          reaction: storedReactions[msg.id] || "",
        }));

        finalMessages.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Set state DIRECTLY, no localStorage for messages
        setMessages(finalMessages);

      } catch (error) {
        console.error("Error fetching initialized chat session:", error);
        const defaultText =
          bot_details.find((b) => b.bot_id === selectedBotId)?.quote ||
          "Hello, how are you feeling today?";
        setMessages([
          {
            id: "fallback-msg",
            text: defaultText,
            sender: "bot",
            timestamp: new Date(),
            feedback: "",
            reaction: "",
            bot_id: selectedBotId,
            isSystemMessage: isSystemMessageContent(defaultText),
          },
        ]);
      }
    };

    fetchMessages();
  }, [selectedBotId, userDetails.email]);

// localStorage removed

  // Handle reaction selection for a message
  const handleReaction = (msgId, reaction) => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.id === msgId
          ? { ...msg, reaction: msg.reaction === reaction ? "" : reaction }
          : msg,
      ),
    );
    setShowReactionsFor(null); // Hide reaction panel after selection
    setShowRemoveTooltip(null); // Hide removal tooltip if visible
    setHighlightedMessage(null); // Clear highlight when reaction is selected
  };

  // Handle long press start on a message bubble
  const handleLongPressStart = (msgId) => {
    // Only proceed if it's mobile
    if (!isMobile) return;

    // Clear any existing timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    // Set highlight immediately
    setHighlightedMessage(msgId);

    // Start a new timer
    longPressTimerRef.current = setTimeout(() => {
      setShowReactionsFor(msgId);
      setShowRemoveTooltip(null); // Hide removal tooltip when opening reaction selector
    }, 500); // 500ms is a common duration for long press
  };

  // Handle long press end
  const handleLongPressEnd = () => {
    // Clear the timer if user releases before long press is complete
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!showReactionsFor) {
      setHighlightedMessage(null);
    }
  }, [showReactionsFor]);

  const toggleReactions = (msgId) => {
    if (isMobile || msgId == null) return; // Prevent for null id
    setHighlightedMessage(msgId);
    setShowReactionsFor(showReactionsFor === msgId ? null : msgId);
    setShowRemoveTooltip(null);
  };

  const toggleRemovalTooltip = (msgId) => {
    if (msgId == null) return; // Prevent for null id
    if (showRemoveTooltip === msgId) {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === msgId ? { ...msg, reaction: "" } : msg,
        ),
      );
      setShowRemoveTooltip(null);
    } else {
      setShowRemoveTooltip(msgId);
      setShowReactionsFor(null);
    }
  };

  // This function handles the user's feedback on a message like or dislike
  const handleFeedback = async (feedback, msg_id) => {
    try {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === msg_id ? { ...msg, feedback } : msg,
        ),
      );
      // Legacy feedback endpoint — kept as-is (not in new integration spec)
      const data = await apiFeedback(msg_id, feedback);

      if (data.error) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === msg_id ? { ...msg, feedback: "" } : msg,
          ),
        );
      }
    } catch (error) {
      logClientError(error, { source: "cv/message/feedback API Call" });
      console.error(error);
    }
  };

  // Scroll to bottom of chat when new messages are added
  /* The above code is making a POST request to the URL
            'http://127.0.0.1:8000/store-activity-message' with a JSON payload. The payload is
            being stringified using `JSON.stringify()` before sending the request. The request
            includes the 'Content-Type' header set to 'application/json'. The `await` keyword
            indicates that the code is using asynchronous JavaScript, likely within an async
            function. */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  async function storeActivityMessageInBackend({ text, sender, activityId }) {
    try {
      // New backend handles game message storage internally via /api/games/action.
      await apiStoreActivity({
        email: userDetails.email,
        bot_id: selectedBotId,
        user_message: sender === "user" ? text : "",
        bot_response: sender === "bot" ? text : "",
        platform: "game_activity",
        activity_name: activityId,
      });
    } catch (e) {
      console.error("Failed to store activity message:", e);
    }
  }
  const prevMessagesLength = useRef(messages.length);

  // When messages change, call scroll to bottom
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      scrollToBottom();
    }
    prevMessagesLength.current = messages.length;
  }, [groupedMessages]);

  /**
   * The useEffect function checks for due reminders stored in localStorage and triggers reminder
   * messages accordingly.
   */
  useEffect(() => {
    const checkLocalStorageReminders = () => {
      // Get current time
      const currentTime = new Date().getTime();

      /**
       * The function `convertToOpenAIFormat` takes an array of messages and converts them into a
       * specific format for OpenAI, assigning roles based on the sender.
       * @param msgs - An array of message objects containing information about the sender and the text
       * content of the message. Each message object has the following structure:
       */
      const convertToOpenAIFormat = (msgs) =>
        msgs.map((msg) => ({
          role: msg.sender === "bot" ? "assistant" : "user",
          content: msg.text,
        }));

      /* The code is creating a new Date object and then formatting the current date
      and time into a string representation using the `toLocaleString` method. The options passed to
      `toLocaleString` specify that the output should include the hour in 12-hour format, the
      minute, and whether it is AM or PM. The resulting string will represent the current time in
      the specified format. */
      const current_time_stamp = new Date().toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });

      // Get reminders from localStorage
      const storedReminders =
        JSON.parse(localStorage.getItem(`reminders-${selectedBotId}`)) || [];
      console.log(storedReminders);

      // Check for due reminders
      storedReminders.forEach(async (reminder) => {
        const reminderTime = new Date(reminder.remind_on).getTime();
        console.log(reminderTime);
        /* The above code is checking if the current time is greater than or equal to the reminder
        time. If the condition is true, it sets the `isTyping` state to true and creates a `payload`
        object with various properties such as `message`, `bot_id`, `previous_conversation`,
        `email`, `request_time`, and `remind_time`. These properties are used to store information
        related to a reminder task, selected bot ID, previous conversation data in a specific
        format, user's email, request time, and reminder time respectively. */
        if (currentTime >= reminderTime) {
          setIsTyping(true);
          const payload = {
            message: reminder.task,
            bot_id: selectedBotId,
            previous_conversation: convertToOpenAIFormat(messages),
            email: userDetails.email,
            request_time: new Date().toString(),
            remind_time: reminder.remind_on.toString(),
          };
          try {
            /* The above code is making a POST request to the URL
            'http://127.0.0.1:8000/cv/response/reminder' with a JSON payload. The payload is
            being stringified using `JSON.stringify()` before sending the request. The request
            includes the 'Content-Type' header set to 'application/json'. The `await` keyword
            indicates that the code is using asynchronous JavaScript, likely within an async
            function. */

            // Legacy reminder endpoint — not in new integration spec, keep old call
            const data = await reminderGetResponse(payload);

            console.log(data);

            // Add reminder message to chat
            if (data.error) {
              const errorMessage = `Error in generating reminder!!`;
              setMessages((prev) => [
                ...prev,
                {
                  text: errorMessage,
                  sender: "bot",
                  id: "",
                  feedback: "",
                  reaction: "",
                  timestamp: new Date(),
                  isSystemMessage: isSystemMessageContent(errorMessage),
                },
              ]);
            } else {
              // Add reminder message to chat
              setMessages((prev) => [
                ...prev,
                {
                  text: data.response,
                  sender: "bot",
                  id: data.message_id,
                  feedback: "",
                  reaction: "",
                  timestamp: new Date(),
                  isSystemMessage: true,
                  voice_only: false, // ✅ FIXED: Force reminders to be text-only
                  isVoiceRequested: false, // ✅ FIXED: Explicitly disable voice
                },
              ]);

              setIsTyping(false);

              // Remove the triggered reminder from localStorage
              const updatedReminders = storedReminders.filter(
                (r) => r.remind_on !== reminder.remind_on,
              );
              localStorage.setItem(
                `reminders-${selectedBotId}`,
                JSON.stringify(updatedReminders),
              );
              setReminders(updatedReminders);
            }
          } catch (error) {
            logClientError(error, { source: "API Call" });
            const errorMessage = `Error in generating reminder!!`;
            setMessages((prev) => [
              ...prev,
              {
                text: errorMessage,
                sender: "bot",
                id: "",
                feedback: "",
                reaction: "",
                timestamp: new Date(),
                isSystemMessage: isSystemMessageContent(errorMessage),
              },
            ]);
            console.log(error);
          }
        }
      });
    };

    // Check every minute
    const intervalId = setInterval(checkLocalStorageReminders, 30000);

    // Initial check when component mounts
    checkLocalStorageReminders();

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [selectedBotId, userDetails.name, messages]); // Dependency on selectedBotId

  /**
   * The `handleSend` function in the provided JavaScript code handles user input, sends a message to a
   * chatbot API, processes the response, and manages reminders if requested by the user.
   * @param e - The `e` parameter in the `handleSend` function seems to represent an event object. It is
   * used to handle user interactions and trigger actions based on those interactions. In the provided
   * code snippet, `e` is used to check for a `reminder` property and prevent default behavior if it is
   * @returns The `handleSend` function is returning a Promise since it is an asynchronous function
   * declared with the `async` keyword. The function performs various tasks such as sending a message to
   * a chatbot API, handling reminders, updating state variables, and displaying messages based on the
   * API response.
   */
  // Function to check if it's time for a weekly voice message (OPTIONAL)

  /*
const shouldSendWeeklyVoice = () => {
  const lastWeeklyVoice = localStorage.getItem(`lastWeeklyVoice_${selectedBotId}`);
  const now = new Date().getTime();
  const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  
  // Only send weekly voice if user hasn't requested one recently
  const lastVoiceRequest = localStorage.getItem(`lastVoiceRequest_${selectedBotId}`);
  const hasRecentRequest = lastVoiceRequest && (now - parseInt(lastVoiceRequest)) < oneWeek;
  
  if (!hasRecentRequest && (!lastWeeklyVoice || (now - parseInt(lastWeeklyVoice)) >= oneWeek)) {
    localStorage.setItem(`lastWeeklyVoice_${selectedBotId}`, now.toString());
    return true;
  }
  return false;
};
*/
  const handleSend = async (e) => {
    // ✅ Prevent default form submission (only for normal user input, not reminders)
    if (e?.reminder === undefined) {
      e.preventDefault();
    }

    // ✅ Clean and normalize user input
    const userMessage = (input || "").trim();
    if (!userMessage && e?.reminder !== true) return; // stop if empty input

    // --- Helper: Add a new message to chat state ---
    const addMessage = (msg) => {
      setMessages((prev) => [
        ...prev,
        {
          timestamp: new Date(),
          feedback: "",
          reaction: "",
          ...msg, // merge caller-provided fields
        },
      ]);
    };

    // --- Regex / Keyword patterns ---
    const voiceNotePatterns = [
      /give.*me.*voice.*note/i,
      /send.*voice.*note/i,
      /voice.*message/i,
      /can.*you.*speak/i,
      /talk.*to.*me/i,
      /hear.*your.*voice/i,
      /voice.*note/i,
      /speak.*to.*me/i,
      /voice.*response/i,
      /send.*me.*audio/i,
      /audio.*message/i,
      /want.*to.*hear.*you/i,
    ];
    const selfiePatterns = [
      /\b(?:generate|take|send|show)\b.*\bselfie\b/i,
      /\bhow.*do.*you.*look\b/i,
      /\bwhat.*do.*you.*look.*like\b/i,
      /\bpicture.*yourself\b/i,
      /\bphoto.*yourself\b/i,
    ];
    const weatherKeywords = ["weather", "forecast", "climate"];
    const newsKeywords = [
      "news",
      "headlines",
      "what's happening",
      "updates",
      "today's news",
    ];

    // --- Flags for requests ---
    const isVoiceNoteRequest = voiceNotePatterns.some((p) =>
      p.test(userMessage),
    );
    const isSelfieRequest = selfiePatterns.some((p) => p.test(userMessage));
    const containsKeyword = (msg, keywords) =>
      keywords.some((k) => msg.toLowerCase().includes(k));

    // --- Exit command handling (end current activity) ---
    if (
      currentActivity &&
      ["exit", "stop", "end"].includes(userMessage.toLowerCase())
    ) {
      endActivity();
      setInput("");
      return;
    }

    // --- Handle selfie generation request ---
    if (isSelfieRequest && !currentActivity) {
      addMessage({ text: userMessage, sender: "user" });
      setInput("");
      await handleGenerateSelfie(); // call your selfie generator
      return;
    }

    // --- Add normal user message (skip if it's a reminder) ---
    if (e?.reminder === undefined) {
      addMessage({ text: userMessage, sender: "user" });
    }
    setInput("");

    // --- Handle activity-specific input (story game, truth/lie game, etc.) ---
    if (currentActivity) {
      await handleActivityMessage(userMessage);
      return;
    }

    // --- Handle weather requests via new backend multimodal endpoint ---
    if (containsKeyword(userMessage, weatherKeywords)) {
      try {
        const data = await multimodalWeather(selectedBotId);
        addMessage({
          text: data.response || "Sorry, I can't respond at this time.",
          sender: "bot",
          bot_id: selectedBotId,
        });
      } catch (error) {
        addMessage({
          text: "Sorry, I can't respond at this time.",
          sender: "bot",
          bot_id: selectedBotId,
        });
      }
      setIsTyping(false);
      scrollToBottom();
      return;
    }
    // --- Handle news requests via primary LLM (fall through below) ---
    // The new backend's /api/chat/send handles news awareness through context.

    // --- Prepare request for Primary LLM ---
    setIsTyping(true);
    scrollToBottom();

    // Convert messages to OpenAI chat format
    const convertToOpenAIFormat = (msgs) =>
      msgs.map((msg) => ({
        role: msg.sender === "bot" ? "assistant" : "user",
        content: msg.text,
      }));

    const currentTime = new Date();
    const primaryLlmPayload = {
      message:
        e?.reminder === true
          ? `User asked to remind: ${e.message}`
          : userMessage,
      bot_id: selectedBotId,
      custom_bot_name: selectedBotDetails?.name || "",
      user_name: userDetails.name || "",
      user_gender: userDetails.gender || "",
      language: "",
      traits: "",
      previous_conversation: convertToOpenAIFormat(messages),
      email: userDetails.email || "",
      request_time: currentTime.toISOString(),
      platform: "web",
    };

    console.log("📤 Sending to Primary LLM (Novi VI):", primaryLlmPayload);
    /* The above code is making a POST request to the URL
            'http://127.0.0.1:8000/cv/chat' with a JSON payload. The payload is
            being stringified using `JSON.stringify()` before sending the request. The request
            includes the 'Content-Type' header set to 'application/json'. The `await` keyword
            indicates that the code is using asynchronous JavaScript, likely within an async
            function. */
    try {
      // --- Call Primary LLM via new backend /api/chat/send ---
      const data = await chatSend(selectedBotId, primaryLlmPayload.message, {
        language: primaryLlmPayload.language || "english",
        customName: primaryLlmPayload.custom_bot_name,
        traits: primaryLlmPayload.traits,
      });
      console.log("🧠 Primary LLM Response Data:", data);

      // --- Process XP updates ---
      if (data.xp_data && typeof window.updateXPFromResponse === "function") {
        window.updateXPFromResponse(data.xp_data);
      }

      setIsTyping(false);
      let finalMessage = data.response || "Sorry, I couldn't generate a reply.";

      // --- Normal LLM bot reply (new backend doesn't return reminder structure) ---
      const shouldBeSystemMessage = isSystemMessageContent(finalMessage);
      const isVoiceResponse = isVoiceNoteRequest; // only true if user asked

      addMessage({
        text: finalMessage,
        sender: "bot",
        id: data.message_id,
        bot_id: selectedBotId,
        isSystemMessage: shouldBeSystemMessage,
        voice_only: isVoiceResponse,
        isVoiceRequested: isVoiceResponse,
      });

      // --- Auto memory extraction (fire-and-forget, non-blocking) ---
      if (userMessage && finalMessage && userDetails?.name) {
        memoriesExtract(
          selectedBotId,
          userDetails.name,
          userMessage,
          finalMessage,
        )
          .then((r) => {
            if (r?.extracted > 0)
              console.log(`🧠 Auto-extracted ${r.extracted} memories`);
          })
          .catch(() => {}); // never block the UI
      }

      // --- Storage is handled internally by new backend (no separate store-message call needed) ---
    } catch (error) {
      // --- Handle API/LLM errors ---
      logClientError(error, { source: "API Call" });
      console.error("❌ Error calling Primary LLM:", error);
      setIsTyping(false);

      addMessage({
        text: "Sorry, there was an error processing your request. Please try again.",
        sender: "bot",
        bot_id: selectedBotId,
        isSystemMessage: true,
      });
    }

    // --- Always scroll to bottom after processing ---
    scrollToBottom();
  };

  const handleVoiceCallMessage = async (message) => {
    if (!message) return;

    try {
      // Add the message to chat (this comes from VoiceCall's processVoiceInput)
      const currentTime = new Date();
      const messageWithTimestamp = {
        ...message,
        timestamp: message.timestamp || currentTime,
      };

      console.log("Adding voice call message to chat:", messageWithTimestamp);

      setMessages((prev) => [...prev, messageWithTimestamp]);
      scrollToBottom();
    } catch (error) {
      logClientError(error, { source: "Voice Call Message Handler" });
      console.error("Error handling voice call message:", error);
    }
  };

  /**
   * Legacy function for handling transcribed text (kept for backwards compatibility)
   * @param {string} transcribedText - The transcribed text from voice input
   */
  const handleTranscribedTextMessage = async (transcribedText) => {
    if (!transcribedText?.trim()) return;

    const currentTime = new Date();

    try {
      // Add user's voice message to chat
      setMessages((prev) => [
        ...prev,
        {
          text: transcribedText,
          sender: "user",
          timestamp: currentTime,
          feedback: "",
          reaction: "",
          isVoiceMessage: true,
        },
      ]);

      setIsTyping(true);
      scrollToBottom();

      // Convert messages to OpenAI format
      const convertToOpenAIFormat = (msgs) =>
        msgs.map((msg) => ({
          role: msg.sender === "bot" ? "assistant" : "user",
          content: msg.text,
        }));

      // Create payload for voice call API
      const payload = {
        message: transcribedText,
        bot_id: selectedBotId,
        user_name: userDetails.name,
        history: convertToOpenAIFormat(messages),
        isVoiceCall: true,
      };

      console.log("Voice call payload:", payload);

      // Legacy handleTranscribedTextMessage is only a fallback path.
      // The primary voice call is now WebSocket-based (VoiceCallUltra).
      // Use new backend /api/voice/note as the REST fallback.
      const noteData = await voiceGenerateNote(selectedBotId, transcribedText);
      const response = { ok: true, _data: noteData };

      setIsTyping(false);
      const data = response._data;

      // Add bot's response to chat
      if (data.text_response) {
        const shouldBeSystemMessage = isSystemMessageContent(
          data.text_response,
        );

        setMessages((prev) => [
          ...prev,
          {
            text: data.text_response,
            sender: "bot",
            id: `voice_${Date.now()}`,
            feedback: "",
            reaction: "",
            timestamp: currentTime,
            bot_id: selectedBotId,
            isSystemMessage: shouldBeSystemMessage,
            voice_only: true,
            audioUrl: data.audio_url,
          },
        ]);
      }

      scrollToBottom();
      return data; // Return the response for the VoiceCall component
    } catch (error) {
      logClientError(error, { source: "Voice Call API" });
      console.error("Voice call error:", error);
      setIsTyping(false);

      const errorMessage =
        "Sorry, there was an error processing your voice message. Please try again.";
      setMessages((prev) => [
        ...prev,
        {
          text: errorMessage,
          sender: "bot",
          id: `error_${Date.now()}`,
          feedback: "",
          reaction: "",
          timestamp: currentTime,
          bot_id: selectedBotId,
          isSystemMessage: true,
        },
      ]);

      scrollToBottom();
      throw error; // Re-throw for VoiceCall component to handle
    }
  };

  /**
   * The TypingIndicator function creates a visual typing indicator with animated bouncing dots.
   */

  const TypingIndicator = () => (
    <div className="flex justify-start my-4">
      <div className="px-4 py-2 rounded-2xl">
        <div className="flex space-x-1 items-center">
          {isGeneratingSelfie ? (
            <>
              <div className="w-2 h-2 bg-[#3B82F6] rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-[#8B5CF6] rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 bg-[#EC4899] rounded-full animate-bounce [animation-delay:0.4s]" />
              <span className="ml-2 text-sm text-gray-600">
                Generating selfie...
              </span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-[#C084FC] rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-[#C084FC] rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 bg-[#C084FC] rounded-full animate-bounce [animation-delay:0.4s]" />
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Component for reaction selector
  const ReactionSelector = ({ msgId }) => (
    <div className="reaction-selector absolute -top-10 bg-white/80 backdrop-blur-md rounded-full py-1 px-2 shadow-md border border-gray-200 z-10">
      <div className="flex space-x-2">
        {emoticons.map((emoticon, index) => (
          <span
            key={index}
            className="cursor-pointer hover:scale-125 transition-transform duration-200"
            onClick={() => handleReaction(msgId, emoticon)}
          >
            {emoticon}
          </span>
        ))}
      </div>
    </div>
  );

  const RemovalTooltip = ({ msgId }) => (
    <div className="absolute -top-10 left-0 bg-white/90 backdrop-blur-md rounded-lg py-1 px-3 shadow-md border border-gray-200 z-10 text-sm text-gray-700 whitespace-nowrap">
      Tap to remove
    </div>
  );

  // Full-screen image viewer component
  const FullScreenImageViewer = () => {
    const handleImageClick = () => {
      setIsBackgroundDark(!isBackgroundDark);
    };

    const handleBackgroundClick = () => {
      closeFullScreenImage();
    };

    if (!isFullScreenOpen || !fullScreenImage || !fullScreenImage.url)
      return null;

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div
          className={`w-full h-full flex items-center justify-center relative transition-all duration-300 ${
            isBackgroundDark ? "bg-black/80" : "bg-transparent"
          }`}
          onClick={handleBackgroundClick}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeFullScreenImage();
            }}
            className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/50 backdrop-blur-xl border border-white/30 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-all duration-200 shadow-xl"
          >
            <X size={20} />
          </button>
          <img
            src={fullScreenImage.url}
            alt={fullScreenImage.alt || "Full screen image"}
            className="max-w-full max-h-full object-contain rounded-lg cursor-pointer"
            style={{ maxHeight: "90vh", maxWidth: "90vw" }}
            onClick={(e) => {
              e.stopPropagation();
              handleImageClick();
            }}
          />
        </div>
      </div>
    );
  };

  console.log("All chat messages:", messages);

  return (
    <>
      <Head>
        <title>Culturevo | Chat with NOVI - Your AI Bestie</title>
        <meta
          name="description"
          content="Talk to an AI like a friend through our voice-enabled AI companion that responds like an AI that talks like a human. This AI that texts like a real person is perfect for chill AI to talk to when bored or for an AI bestie for late-night overthinking."
        />
        <meta
          name="keywords"
          content="Talk to an AI like a friend, Voice-enabled AI companion, AI that talks like a human, AI that texts like a real person, Chill AI to talk to when bored, AI bestie for late-night overthinking"
        />
        <meta
          property="og:title"
          content="Chat with NOVI - Your AI Bestie | Culturevo"
        />
        <meta
          property="og:description"
          content="Engage in natural, human‑like conversation with NOVI—your voice‑enabled emotional support AI best friend."
        />
        <meta property="og:url" content="http://localhost:3000/chat" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div
        className={`flex flex-col flex-1 border border-neutral-200 md:h-full md:mt-0 relative overflow-hidden bg-gray-100 dark:bg-neutral-900`}
        style={{
          backgroundImage: `url('/bg-images/${selectedBotId}-bg.jpg'), url('/bg-images/${selectedBotId}-bg.png'), url('/bg-images/placeholder.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* ✅ ENHANCED: Always visible activity banner at the very top with improved mobile layout */}
        {currentActivity && (
          <div className="sticky top-0 z-50 px-2 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-red-500/95 to-pink-500/95 backdrop-blur-md border-b-2 border-white/30 shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 order-2 sm:order-1">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-300 rounded-full animate-pulse shadow-lg flex-shrink-0"></div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-bold text-sm sm:text-base md:text-lg drop-shadow-md truncate">
                    🎮 ACTIVITY MODE:{" "}
                    {currentActivity
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </p>
                </div>
              </div>
              <button
                onClick={endActivity}
                className="px-4 sm:px-4 md:px-6 py-2 sm:py-2 bg-white/90 hover:bg-white text-red-600 hover:text-red-700 rounded-lg border-2 border-white/50 hover:border-white font-bold text-sm sm:text-sm transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex-shrink-0 order-1 sm:order-2 w-full sm:w-auto justify-center"
              >
                🚫 END ACTIVITY
              </button>
            </div>
          </div>
        )}
        {/* Selfie Button - Beautiful, centered, above chat messages 
      {!currentActivity && (
        <div className="w-full flex justify-center items-center py-4">
          <button
            onClick={handleGenerateSelfie}
            disabled={isGeneratingSelfie}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-white font-bold shadow-lg hover:scale-105 transition-all disabled:opacity-60"
            style={{ fontSize: "1.1rem" }}
          >
            {isGeneratingSelfie ? (
              <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>
            ) : (
              <>
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="10" r="3" />
                  <path d="M4.5 17.5L9 13" />
                </svg>
                Generate a Selfie
              </>
            )}
          </button>
          <span className="ml-3 text-sm text-gray-400">See how your bot might look right now!</span>
        </div>
      )} */}
        <ScrollArea
          className="flex-1"
          onScroll={handleChatScroll}
          viewportRef={chatViewportRef}
        >
          <div className="px-1 sm:px-2 md:px-2 flex flex-col">
            {Object.entries(groupedMessages).map(([date, messagesOnDate]) => (
              <div key={date} className="flex flex-col">
                <div
                  className={`sticky top-5 z-10 my-6 sm:my-10 py-2 mx-auto w-24 sm:w-32 bg-gray-700/90 rounded-md shadow-md ${
                    showDateChip
                      ? isFadingOutChip
                        ? "fade-out-chip"
                        : "fade-in-chip"
                      : "opacity-0 pointer-events-none"
                  }`}
                >
                  <p
                    className={`text-center text-xs sm:text-sm ${
                      isDarkTheme ? `${textColorClass}` : `${textColorClass}`
                    }`}
                  >
                    {date}
                  </p>
                </div>

                {messagesOnDate.map((msg, index) => {
                  // Trust backend flags for system banners to avoid duplication
                  const isActivityStart = msg.isActivityStart === true;
                  const isActivityEnd = msg.isActivityEnd === true;
                  
                  const inlineAudioUrl = msg.audioUrl || null;
                  const inlineImageUrl = msg.imageUrl || null;
                  
                  let cleanedMsgText = msg.text || "";
                  
                  if (inlineImageUrl) {
                      msg.isImageMessage = true;
                  }

                  const hasContent = cleanedMsgText.length > 0 || inlineImageUrl || inlineAudioUrl || msg.isImageMessage || msg.isVoiceNote || isActivityStart || isActivityEnd;

                  return (
                    hasContent && (
                      <React.Fragment key={msg.id ? `${msg.id}-${index}` : `msg-${index}`}>
                        {/* Optional Banners Rendered Above the Message (OUTSIDE message view width limit) */}
                        {isActivityStart && (
                          <div className="flex justify-center my-6 w-full">
                            <div className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-violet-500/90 to-purple-600/90 backdrop-blur-md border border-purple-300/40 shadow-lg text-white text-sm font-bold uppercase tracking-wider">
                              <span>🎮</span>
                              <span>Activity Started</span>
                            </div>
                          </div>
                        )}
                        {msg.isSystemMessage && msg.activity_type === "VOICE_CALL_START" && (
                          <div className="flex justify-center my-6 w-full">
                            <div className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-green-500/90 to-emerald-600/90 backdrop-blur-md border border-green-300/40 shadow-lg text-white text-sm font-bold uppercase tracking-wider">
                              <span>📞</span>
                              <span>Voice Call Started</span>
                            </div>
                          </div>
                        )}
                      <div
                        className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${
                          msg.sender === "local-temp"
                            ? "self-end"
                            : msg.sender === "user"
                            ? "self-end"
                            : "self-start"
                        } relative mb-4 \${
                          msg.sender === "bot" ? "ml-9 sm:ml-12" : ""
                        }`}
                      >
                      {/* Determine if we even have text to show (e.g., if message was purely a tag) */}
                      {(cleanedMsgText ||
                        msg.isImageMessage ||
                        msg.audioUrl) && (
                        <div
                          className={`my-2 flex ${
                            msg.sender === "bot"
                              ? "justify-start"
                              : "justify-end"
                          }`}
                        >
                          <div className="max-w-[80%] min-w-16 relative">
                            {msg.sender === "bot" && msg.reaction && (
                              <div
                                className="absolute bottom-0 left-3 z-10 bg-white/80 rounded-full w-8 h-8 flex items-center justify-center shadow-sm border border-gray-100 cursor-pointer hover:bg-white/90"
                                onClick={() => toggleRemovalTooltip(msg.id)}
                              >
                                <span className="text-lg">{msg.reaction}</span>
                                {showRemoveTooltip === msg.id && (
                                  <RemovalTooltip msgId={msg.id} />
                                )}
                              </div>
                            )}

                            <div className="flex flex-row items-center gap-2">
                              {msg.sender === "bot" ? (
                                (msg.voice_only && msg.isVoiceRequested) || msg.isVoiceNote ? ( // ✅ FIXED: Fallback to isVoiceNote if it was explicitly flagged by the backend (like from voice_note activity)
                                  <div className="text-left flex flex-col gap-2 w-full min-w-[300px] sm:min-w-[400px]">
                                    <PlayAudio
                                      text={cleanedMsgText}
                                      bot_id={msg.bot_id || selectedBotId}
                                      minimal={false}
                                      audioSrcUrl={inlineAudioUrl}
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <div
                                      data-sender="bot"
                                      className={
                                        msg.isImageMessage
                                          ? "p-0 m-0 bg-transparent border-none shadow-none rounded-none w-full text-left"
                                          : `px-4 py-2 rounded-2xl ${
                                              botThemes[selectedBotId]
                                                ?.botBubble ||
                                              "bg-white/20 text-gray-900"
                                            } border border-white/20 backdrop-blur-sm shadow-md placeholder-gray-200 ${
                                              highlightedMessage === msg.id
                                                ? "bg-orange-200/30"
                                                : ""
                                            } w-full text-left`
                                      }
                                      style={{
                                        userSelect: "none",
                                        WebkitUserSelect: "none",
                                        WebkitTouchCallout: "none",
                                      }}
                                      onTouchStart={(e) => {
                                        e.preventDefault();
                                        handleLongPressStart(msg.id);
                                      }}
                                      onTouchEnd={handleLongPressEnd}
                                      onTouchMove={handleLongPressEnd}
                                      onTouchCancel={handleLongPressEnd}
                                    >
                                      {msg.isImageMessage ? (
                                        <div className="flex flex-col gap-2">
                                          <div className="flex items-center gap-2">
                                            <img
                                              src={msg.imageUrl}
                                              alt="Bot selfie"
                                              className="max-w-full max-h-64 object-contain rounded-lg shadow-md bg-transparent cursor-pointer hover:opacity-90 transition-opacity"
                                              onLoad={() => scrollToBottom()}
                                              onClick={() =>
                                                openFullScreenImage(
                                                  msg.imageUrl,
                                                  "Bot selfie",
                                                )
                                              }
                                              style={{
                                                backgroundColor: "transparent",
                                              }}
                                            />
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const ext =
                                                  msg.imageUrl?.startsWith(
                                                    "data:",
                                                  )
                                                    ? "png"
                                                    : msg.imageUrl
                                                        ?.split(".")
                                                        .pop()
                                                        ?.split("?")[0] ||
                                                      "png";
                                                downloadImage(
                                                  msg.imageUrl,
                                                  `selfie-${Date.now()}.${ext}`,
                                                );
                                              }}
                                              title="Download selfie"
                                              aria-label="Download selfie"
                                              className="mt-1 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md border border-gray-200 shadow-sm flex items-center justify-center text-gray-700 hover:bg-white hover:shadow-md flex-shrink-0"
                                            >
                                              <Download size={16} />
                                            </button>
                                          </div>
                                          {cleanedMsgText && (
                                            <span className="text-sm">
                                              {cleanedMsgText}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        (() => {
                                          const textContent = cleanedMsgText;
                                          const imageUrlMatch =
                                            textContent.match(
                                              /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg)(\?[^\s]*)?)/i,
                                            );

                                          if (
                                            imageUrlMatch &&
                                            !msg.isImageMessage
                                          ) {
                                            const imgUrl = imageUrlMatch[1];
                                            const caption = textContent
                                              .replace(imageUrlMatch[0], "")
                                              .trim();
                                            return (
                                              <div className="flex flex-col gap-2">
                                                <img
                                                  src={imgUrl}
                                                  alt="Shared image"
                                                  className="max-w-full max-h-64 object-contain rounded-lg shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                                                  onLoad={() =>
                                                    scrollToBottom()
                                                  }
                                                  onClick={() =>
                                                    openFullScreenImage(
                                                      imgUrl,
                                                      "Image",
                                                    )
                                                  }
                                                />
                                                {caption && (
                                                  <span className="text-sm">
                                                    {caption}
                                                  </span>
                                                )}
                                              </div>
                                            );
                                          }
                                          return (
                                            <motion.p>
                                              {textContent
                                                .split(" ")
                                                .map((word, i) => (
                                                  <motion.span
                                                    key={i}
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
                                                      delay: 0.02 * i,
                                                    }}
                                                    className="inline-block select-none"
                                                  >
                                                    {word}&nbsp;
                                                  </motion.span>
                                                ))}
                                              {(msg.isActivityMessage ||
                                                msg.platform ===
                                                  "game_activity" ||
                                                msg.activityId) && (
                                                <span
                                                  className="inline-block ml-2 align-middle text-lg"
                                                  title="Game Activity"
                                                  style={{
                                                    verticalAlign: "middle",
                                                  }}
                                                >
                                                  🎮
                                                </span>
                                              )}
                                            </motion.p>
                                          );
                                        })()
                                      )}
                                    </div>
                                      {msg.isSystemMessage || !cleanedMsgText ? null : (
                                        <PlayAudio
                                          text={cleanedMsgText}
                                          bot_id={msg.bot_id || selectedBotId}
                                          minimal={true}
                                          audioSrcUrl={inlineAudioUrl}
                                        />
                                      )}
                                    </>
                                  )
                                ) : (
                                <div
                                  data-sender="user"
                                  className={`px-4 py-2 rounded-2xl ${
                                    msg.isImageMessage
                                      ? "bg-transparent border-none shadow-none" // No background for images
                                      : botThemes[selectedBotId]?.userBubble ||
                                        "bg-purple-400/80 text-white"
                                  } ${
                                    !msg.isImageMessage
                                      ? "border border-white/20 backdrop-blur-sm shadow-md"
                                      : ""
                                  } placeholder-gray-200 ${
                                    highlightedMessage === msg.id
                                      ? "bg-orange-200/90"
                                      : ""
                                  } w-full text-left`}
                                  style={{
                                    userSelect: "none",
                                    WebkitUserSelect: "none",
                                    WebkitTouchCallout: "none",
                                  }}
                                >
                                  {msg.isImageMessage ? (
                                    <div className="flex flex-col gap-2">
                                      {(() => {
                                        console.log(
                                          "Rendering image:",
                                          msg.imageUrl,
                                        ); // <-- This should show up if block is entered
                                        return (
                                          <img
                                            src={msg.imageUrl}
                                            alt="Shared image"
                                            className="max-w-full max-h-64 object-contain rounded-lg shadow-md bg-transparent cursor-pointer hover:opacity-90 transition-opacity"
                                            onLoad={() => scrollToBottom()}
                                            onClick={() =>
                                              openFullScreenImage(
                                                msg.imageUrl,
                                                "Shared image",
                                              )
                                            }
                                            style={{
                                              backgroundColor: "transparent",
                                            }}
                                          />
                                        );
                                      })()}
                                      {msg.text && (
                                        <span className="text-sm">
                                          {msg.text}
                                        </span>
                                      )}
                                    </div>
                                  ) : msg.isVoiceNote ? (
                                    <div className="flex items-center gap-2">
                                      <PlayAudio
                                        text={msg.text}
                                        bot_id={msg.bot_id || selectedBotId}
                                        minimal={false}
                                        audioSrcUrl={inlineAudioUrl}
                                      />
                                    </div>
                                  ) : (
                                    msg.text
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-row justify-end">
                              <span
                                className={`text-xs mt-[7px] ${
                                  msg.sender === "user" ? "mr-3" : ""
                                } ${
                                  isDarkTheme
                                    ? `${textColorClass}`
                                    : `${textColorClass}`
                                }`}
                              >
                                {formatTime(msg.timestamp)}
                              </span>

                              {msg.sender === "bot" && (
                                <div className="flex justify-end px-2 mr-7 relative text-white">
                                  {showReactionsFor !== null &&
                                    msg.id !== null &&
                                    showReactionsFor === msg.id && (
                                      <ReactionSelector msgId={msg.id} />
                                    )}

                                  <div className="gap-3 flex flex-row mt-1">
                                    {!isMobile && (
                                      <button
                                        onClick={() => toggleReactions(msg.id)}
                                        className={`cursor-pointer transition-colors mr-2 ${
                                          isDarkTheme
                                            ? `${textColorClass}`
                                            : `${textColorClass}`
                                        }`}
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="18"
                                          height="18"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <circle cx="12" cy="12" r="10" />
                                          <path d="M8 14s1.5 2.25 4 2.25 4-2.25 4-2.25" />
                                          <line
                                            x1="9"
                                            y1="9"
                                            x2="9.01"
                                            y2="9"
                                          />
                                          <line
                                            x1="15"
                                            y1="9"
                                            x2="15.01"
                                            y2="9"
                                          />
                                        </svg>
                                      </button>
                                    )}

                                    {typeof msg.text === "string" &&
                                    msg.text.trim() ===
                                      "Sorry, there was an error processing your request. Please try again." ? null : (
                                      <>
                                        {msg.feedback === "" ? (
                                          <>
                                            <ThumbsUp
                                              className={`cursor-pointer ${
                                                isDarkTheme
                                                  ? `${textColorClass}`
                                                  : `${textColorClass}`
                                              }`}
                                              size={18}
                                              onClick={() =>
                                                handleFeedback("like", msg.id)
                                              }
                                            />
                                            <ThumbsDown
                                              className={`cursor-pointer ${
                                                isDarkTheme
                                                  ? `${textColorClass}`
                                                  : `${textColorClass}`
                                              }`}
                                              size={18}
                                              onClick={() =>
                                                handleFeedback(
                                                  "dislike",
                                                  msg.id,
                                                )
                                              }
                                            />
                                          </>
                                        ) : msg.feedback === "like" ? (
                                          <>
                                            <IconThumbUpFilled
                                              size={22}
                                              className={`${
                                                isDarkTheme
                                                  ? `${textColorClass}`
                                                  : `${textColorClass}`
                                              } mt-[-2px]`}
                                            />
                                            <ThumbsDown
                                              className={`cursor-pointer ${
                                                isDarkTheme
                                                  ? `${textColorClass}`
                                                  : `${textColorClass}`
                                              }`}
                                              size={18}
                                              onClick={() =>
                                                handleFeedback(
                                                  "dislike",
                                                  msg.id,
                                                )
                                              }
                                            />
                                          </>
                                        ) : (
                                          <>
                                            <ThumbsUp
                                              className={`cursor-pointer ${
                                                isDarkTheme
                                                  ? `${textColorClass}`
                                                  : `${textColorClass}`
                                              }`}
                                              size={18}
                                              onClick={() =>
                                                handleFeedback("like", msg.id)
                                              }
                                            />
                                            <IconThumbDownFilled
                                              size={22}
                                              className={`${
                                                isDarkTheme
                                                  ? `${textColorClass}`
                                                  : `${textColorClass}`
                                              }`}
                                            />
                                          </>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      </div>
                      
                      {/* Optional Banners Rendered AFTER the Message */}
                      {isActivityEnd && (
                        <div className="flex justify-center my-6 w-full">
                          <div className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-gray-500/90 to-gray-600/90 backdrop-blur-md border border-gray-300/40 shadow-lg text-white text-sm font-bold uppercase tracking-wider">
                            <span>🏁</span>
                            <span>Activity Ended</span>
                          </div>
                        </div>
                      )}
                      
                      {msg.isSystemMessage && msg.activity_type === "VOICE_CALL_END" && (
                        <div className="flex justify-center my-6 w-full">
                          <div className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-red-500/90 to-rose-600/90 backdrop-blur-md border border-red-300/40 shadow-lg text-white text-sm font-bold uppercase tracking-wider">
                            <span>📵</span>
                            <span>Voice Call Ended</span>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  )
                  );
                })}
              </div>
            ))}

            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* ✅ ENHANCED: Modified form to show activity status with improved mobile layout */}
        <form
          onSubmit={handleSend}
          className="flex flex-col sm:flex-row items-stretch sm:items-center px-1 sm:px-2 pt-2 gap-2 sm:gap-0 relative"
        >
          {/* Input field - full width on mobile */}
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className={`flex-1 p-4 sm:p-[26px] outline-none mr-0 sm:mr-1 md:mr-4 bg-white/30 border border-white/20 backdrop-blur-md shadow-md rounded-full text-base sm:text-lg ${
              isDarkTheme ? textColorClass : textColorClass
            } placeholder:${isDarkTheme ? textColorClass : textColorClass}`}
            placeholder={
              currentActivity
                ? `Activity mode: ${currentActivity.replace(/_/g, " ")}...`
                : "Type your message..."
            }
          />

          {/* Hidden file input for image upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: "none" }}
          />

          {/* Button row - horizontal on mobile, better spacing */}
          <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-1 w-full sm:w-auto">
            {/* ✅ NEW: Image upload button */}
            {!currentActivity && (
              <button
                type="button"
                onClick={handleImageButtonClick}
                disabled={isImageUploading}
                className="p-2 sm:p-3 hover:opacity-60 cursor-pointer bg-gradient-to-r from-orange-400/80 via-yellow-400/80 to-orange-400/80 hover:from-orange-400/90 hover:via-yellow-400/90 hover:to-orange-400/90 text-white rounded-full flex justify-center items-center transition-all backdrop-blur-sm border border-white/20 shadow-[0_4px_12px_0_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                title="Upload and analyze image"
              >
                {isImageUploading ? (
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="sm:w-5 sm:h-5"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                )}
              </button>
            )}

            {/* ✅ CONDITIONAL: Show activity end button instead of voice button during activities */}
            {currentActivity && (
              <button
                type="button"
                onClick={endActivity}
                className="p-2 sm:p-3 hover:opacity-80 cursor-pointer bg-gradient-to-r from-red-400/80 via-pink-400/80 to-red-500/80 hover:from-red-400/90 hover:via-pink-400/90 hover:to-red-500/90 text-white rounded-full flex justify-center items-center transition-all backdrop-blur-sm border border-white/20 shadow-[0_4px_12px_0_rgba(255,255,255,0.2)] flex-shrink-0 min-w-[44px] min-h-[44px]"
                title="End Activity"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="sm:w-5 sm:h-5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="m15 9-6 6" />
                  <path d="m9 9 6 6" />
                </svg>
              </button>
            )}

            {/* Send button */}
            <button
              type="submit"
              className="px-3 sm:px-5 py-2 hover:opacity-60 cursor-pointer bg-gradient-to-r from-purple-400/80 via-pink-400/80 to-orange-400/80 hover:from-purple-400/90 hover:via-pink-400/90 hover:to-orange-400/90 text-white rounded-full flex justify-center items-center gap-1 sm:gap-2 transition-all backdrop-blur-sm border border-white/20 shadow-[0_4px_12px_0_rgba(255,255,255,0.2)] text-sm sm:text-base flex-shrink-0"
            >
              Send
            </button>
          </div>
        </form>

        <p
          className={`text-xs text-center py-1 sm:py-2 px-2 ${
            isDarkTheme ? b_color : b_color
          }`}
        >
          {currentActivity
            ? "🎮 Activity mode active - Voice messages disabled during activities"
            : "Novi can make mistakes, it's constantly learning from you, please be kind!!"}
        </p>

        {/* Voice Call Component - Only show when not in activity mode */}
        {isVoiceCallOpen && !currentActivity && (
          <VoiceCallUltra
            isOpen={isVoiceCallOpen}
            onClose={() => setIsVoiceCallOpen(false)}
            onMessageReceived={handleVoiceCallMessage}
            messages={messages}
          />
        )}

        {/* Activities Modal */}
        <ActivitiesModal
          isOpen={isActivitiesOpen}
          onClose={() => setIsActivitiesOpen(false)}
          onActivityStart={startActivity}
          selectedBotId={selectedBotId}
        />

        {/* Full-screen image viewer */}
        <FullScreenImageViewer />
      </div>
    </>
  );
};

// Unique icon for each AI Fiction activity
const ACTIVITY_ICON_MAP = {
  // AI Fiction
  dream_room_builder: "🛏️",
  friendship_scrapbook: "📒",
  scenario_shuffle: "🎲",
  love_in_another_life: "💌",
  daily_debrief: "🗒️",
  mood_meal: "🍲",
  if_i_were_you: "👥",
  burning_questions_jar: "❓",
  skill_swap_simulation: "🔄",
  desire_detachment_game: "🧘",
  god_in_the_crowd: "🧑‍🤝‍🧑",
  past_life_memory: "🕰️",
  unsent_messages: "📩",
  i_would_never: "🚫",
  buried_memory_excavation: "⛏️",
  failure_autopsy: "🩺",
  letters_you_never_got: "✉️",
  karma_knot: "🔗",
  mini_moksha_simulation: "🕊️",
};

const CATEGORY_ICON_BG = {
  "AI Art": "from-pink-100 to-pink-200",
  "AI Fiction": "from-purple-100 to-purple-200",
  Entertainment: "from-yellow-100 to-yellow-200",
};
