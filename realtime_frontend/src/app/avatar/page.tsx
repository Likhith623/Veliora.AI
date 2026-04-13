"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import {
  ArrowLeft, Save, Shuffle, Palette, Shirt, Eye, Smile,
  Sparkles, ChevronLeft, ChevronRight, Check, Wand2, Loader2
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import toast from "react-hot-toast";

/* ═══════════════════════════════════════════════════
   CUSTOMIZATION DATA
   ═══════════════════════════════════════════════════ */
const SKIN_TONES = [
  { id: "fair", hex: "#FDDBB4", label: "Fair" },
  { id: "light", hex: "#F5C7A1", label: "Light" },
  { id: "medium", hex: "#E0A370", label: "Medium" },
  { id: "tan", hex: "#C68642", label: "Tan" },
  { id: "brown", hex: "#8D5524", label: "Brown" },
  { id: "dark", hex: "#5C3A1E", label: "Dark" },
];

const HAIR_COLORS = [
  { hex: "#1A0E0A", label: "Black" },
  { hex: "#3B1F12", label: "Dark Brown" },
  { hex: "#8B4513", label: "Brown" },
  { hex: "#C8956C", label: "Light Brown" },
  { hex: "#E8D5B7", label: "Blonde" },
  { hex: "#B5432A", label: "Auburn" },
  { hex: "#D94040", label: "Red" },
  { hex: "#4169E1", label: "Blue" },
  { hex: "#9370DB", label: "Purple" },
  { hex: "#FF69B4", label: "Pink" },
  { hex: "#2ECFCF", label: "Teal" },
  { hex: "#C0C0C0", label: "Silver" },
];

const HAIR_STYLES = [
  { id: "short", label: "Short", emoji: "💇" },
  { id: "medium", label: "Medium", emoji: "💇‍♀️" },
  { id: "long", label: "Long", emoji: "👱‍♀️" },
  { id: "curly", label: "Curly", emoji: "🦱" },
  { id: "braids", label: "Braids", emoji: "🫘" },
  { id: "bun", label: "Bun", emoji: "👩‍🦰" },
  { id: "afro", label: "Afro", emoji: "🧑‍🦱" },
  { id: "mohawk", label: "Mohawk", emoji: "🦅" },
  { id: "bald", label: "Bald", emoji: "🧑‍🦲" },
  { id: "ponytail", label: "Ponytail", emoji: "🎀" },
  { id: "wavy", label: "Wavy", emoji: "🌊" },
  { id: "pixie", label: "Pixie", emoji: "✨" },
];

const EYE_COLORS = [
  { hex: "#634E34", label: "Brown" },
  { hex: "#2E536F", label: "Blue" },
  { hex: "#3D671D", label: "Green" },
  { hex: "#1C7847", label: "Emerald" },
  { hex: "#8B6914", label: "Hazel" },
  { hex: "#191970", label: "Navy" },
  { hex: "#7B3F00", label: "Amber" },
  { hex: "#808080", label: "Gray" },
];

const OUTFITS = [
  { id: "casual", label: "Casual Tee", emoji: "👕", color: "#60A5FA", pattern: "solid" },
  { id: "indian", label: "Indian Kurta", emoji: "🪷", color: "#F59E0B", pattern: "ornate" },
  { id: "brazilian", label: "Brazilian Carioca", emoji: "🌺", color: "#34D399", pattern: "tropical" },
  { id: "japanese", label: "Japanese Kimono", emoji: "🎌", color: "#F472B6", pattern: "floral" },
  { id: "african", label: "African Dashiki", emoji: "🌍", color: "#A78BFA", pattern: "geometric" },
  { id: "formal", label: "Formal Suit", emoji: "👔", color: "#374151", pattern: "solid" },
  { id: "sporty", label: "Sporty Jersey", emoji: "⚽", color: "#EF4444", pattern: "stripe" },
  { id: "artistic", label: "Artistic Boho", emoji: "🎨", color: "#EC4899", pattern: "abstract" },
  { id: "hoodie", label: "Cozy Hoodie", emoji: "🧥", color: "#6366F1", pattern: "solid" },
  { id: "traditional", label: "Folk Wear", emoji: "🏔️", color: "#B45309", pattern: "embroidered" },
];

const ACCESSORIES = [
  { id: "none", label: "None", emoji: "✨" },
  { id: "glasses", label: "Glasses", emoji: "👓" },
  { id: "sunglasses", label: "Sunglasses", emoji: "🕶️" },
  { id: "hat", label: "Cap", emoji: "🧢" },
  { id: "headband", label: "Headband", emoji: "🎀" },
  { id: "earrings", label: "Earrings", emoji: "💎" },
  { id: "necklace", label: "Necklace", emoji: "📿" },
  { id: "flower", label: "Flower Crown", emoji: "🌸" },
  { id: "scarf", label: "Scarf", emoji: "🧣" },
  { id: "crown", label: "Crown", emoji: "👑" },
  { id: "bandana", label: "Bandana", emoji: "🏴‍☠️" },
  { id: "beanie", label: "Beanie", emoji: "🧶" },
];

const EXPRESSIONS = [
  { id: "happy", label: "Happy", emoji: "😊" },
  { id: "warm", label: "Warm", emoji: "🥰" },
  { id: "cool", label: "Cool", emoji: "😎" },
  { id: "thoughtful", label: "Thoughtful", emoji: "🤔" },
  { id: "laughing", label: "Laughing", emoji: "😄" },
  { id: "peaceful", label: "Peaceful", emoji: "😌" },
  { id: "confident", label: "Confident", emoji: "💪" },
  { id: "mysterious", label: "Mysterious", emoji: "🌙" },
];

const BACKGROUNDS = [
  { id: "sunset", label: "Sunset", colors: ["#FF6B35", "#F43F5E"] },
  { id: "ocean", label: "Ocean", colors: ["#06B6D4", "#3B82F6"] },
  { id: "forest", label: "Forest", colors: ["#22C55E", "#10B981"] },
  { id: "royal", label: "Royal", colors: ["#8B5CF6", "#6366F1"] },
  { id: "golden", label: "Golden", colors: ["#F59E0B", "#EF4444"] },
  { id: "familia", label: "Familia", colors: ["#FF6B35", "#06B6D4"] },
  { id: "aurora", label: "Aurora", colors: ["#06B6D4", "#8B5CF6", "#F43F5E"] },
  { id: "midnight", label: "Midnight", colors: ["#1E1B4B", "#312E81"] },
  { id: "cherry", label: "Cherry", colors: ["#F43F5E", "#EC4899"] },
  { id: "cosmic", label: "Cosmic", colors: ["#6366F1", "#EC4899", "#F59E0B"] },
  { id: "mint", label: "Mint", colors: ["#6EE7B7", "#34D399"] },
  { id: "peach", label: "Peach", colors: ["#FBBF24", "#FB923C", "#F472B6"] },
];

type Tab = "skin" | "hair" | "eyes" | "outfit" | "accessories" | "expression" | "background";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "skin", label: "Skin", icon: <Palette className="w-4 h-4" /> },
  { id: "hair", label: "Hair", icon: <span className="text-sm">💇</span> },
  { id: "eyes", label: "Eyes", icon: <Eye className="w-4 h-4" /> },
  { id: "outfit", label: "Outfit", icon: <Shirt className="w-4 h-4" /> },
  { id: "accessories", label: "Extras", icon: <span className="text-sm">✨</span> },
  { id: "expression", label: "Mood", icon: <Smile className="w-4 h-4" /> },
  { id: "background", label: "BG", icon: <span className="text-sm">🎨</span> },
];

/* ═══════════════════════════════════════════════════
   AVATAR SVG — Polished & Detailed
   ═══════════════════════════════════════════════════ */
function AvatarSVG({ config }: { config: any }) {
  const skin = config.skinTone;
  const skinD = adj(skin, -25);
  const skinL = adj(skin, 25);
  const skinDD = adj(skin, -45);
  const outfitColor = OUTFITS.find(o => o.id === config.outfit)?.color || "#60A5FA";
  const outfitD = adj(outfitColor, -30);
  const outfitL = adj(outfitColor, 30);

  return (
    <svg viewBox="0 0 200 260" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="skinG" cx="50%" cy="38%" r="55%">
          <stop offset="0%" stopColor={skinL} />
          <stop offset="70%" stopColor={skin} />
          <stop offset="100%" stopColor={skinD} />
        </radialGradient>
        <radialGradient id="blushL" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF8A8A" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FF8A8A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="blushR" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF8A8A" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FF8A8A" stopOpacity="0" />
        </radialGradient>
        <filter id="softShadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000" floodOpacity="0.12" />
        </filter>
        <linearGradient id="outfitG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={outfitL} />
          <stop offset="50%" stopColor={outfitColor} />
          <stop offset="100%" stopColor={outfitD} />
        </linearGradient>
      </defs>

      {/* ── Body & Shoulders ── */}
      <path d="M 38 220 Q 38 195 65 190 L 100 185 L 135 190 Q 162 195 162 220 L 162 260 L 38 260 Z" fill="url(#outfitG)" />
      <path d="M 78 190 Q 100 200 122 190" stroke={outfitD} strokeWidth="2" fill="none" strokeLinecap="round" />
      <OutfitPattern outfit={config.outfit} color={outfitColor} />
      <path d="M 44 210 Q 50 200 70 195" stroke={outfitL} strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round" />
      <path d="M 156 210 Q 150 200 130 195" stroke={outfitL} strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round" />

      {/* ── Neck ── */}
      <path d="M 84 155 L 84 185 Q 84 190 90 190 L 110 190 Q 116 190 116 185 L 116 155" fill={skin} />
      <path d="M 84 175 Q 100 182 116 175 L 116 185 Q 116 190 110 190 L 90 190 Q 84 190 84 185 Z" fill={skinDD} opacity="0.2" />

      {/* ── Hair Back ── */}
      {config.hairStyle !== "bald" && <HairBack style={config.hairStyle} color={config.hairColor} />}

      {/* ── Head ── */}
      <path
        d="M 42 95 C 42 50 68 28 100 28 C 132 28 158 50 158 95 C 158 120 150 148 136 158 Q 118 170 100 170 Q 82 170 64 158 C 50 148 42 120 42 95 Z"
        fill="url(#skinG)" filter="url(#softShadow)"
      />
      <path d="M 64 155 Q 82 167 100 168 Q 118 167 136 155" stroke={skinDD} strokeWidth="0.8" fill="none" opacity="0.15" strokeLinecap="round" />

      {/* ── Ears ── */}
      <ellipse cx="44" cy="100" rx="9" ry="15" fill={skin} />
      <ellipse cx="44" cy="100" rx="5" ry="10" fill={skinD} opacity="0.12" />
      <ellipse cx="156" cy="100" rx="9" ry="15" fill={skin} />
      <ellipse cx="156" cy="100" rx="5" ry="10" fill={skinD} opacity="0.12" />

      {/* ── Hair Front ── */}
      {config.hairStyle !== "bald" && <HairFront style={config.hairStyle} color={config.hairColor} />}

      {/* ── Eyebrows ── */}
      <Eyebrows expression={config.expression} color={config.hairColor} />

      {/* ── Eyes ── */}
      <EyesSVG eyeColor={config.eyeColor} expression={config.expression} />

      {/* ── Nose ── */}
      <path d="M 97 108 Q 93 120 90 124 Q 95 128 100 128 Q 105 128 110 124 Q 107 120 103 108" fill="none" stroke={skinDD} strokeWidth="1" opacity="0.25" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="94" cy="125" r="2" fill={skinDD} opacity="0.1" />
      <circle cx="106" cy="125" r="2" fill={skinDD} opacity="0.1" />
      <line x1="100" y1="106" x2="100" y2="118" stroke={skinL} strokeWidth="1.5" opacity="0.15" strokeLinecap="round" />

      {/* ── Mouth ── */}
      <MouthSVG expression={config.expression} skinDarker={skinDD} skinTone={skin} />

      {/* ── Cheek Blush ── */}
      {(config.expression === "happy" || config.expression === "warm" || config.expression === "laughing") && (
        <>
          <ellipse cx="68" cy="130" rx="12" ry="8" fill="url(#blushL)" />
          <ellipse cx="132" cy="130" rx="12" ry="8" fill="url(#blushR)" />
        </>
      )}

      {/* ── Accessories ── */}
      <AccessorySVG type={config.accessory} hairColor={config.hairColor} />
    </svg>
  );
}

/* ── Outfit Patterns ── */
function OutfitPattern({ outfit, color }: { outfit: string; color: string }) {
  const l = adj(color, 40);
  const d = adj(color, -20);
  switch (outfit) {
    case "indian":
      return (<g opacity="0.25"><path d="M 70 210 Q 100 218 130 210" stroke={l} strokeWidth="1" fill="none" /><path d="M 65 220 Q 100 228 135 220" stroke={l} strokeWidth="1" fill="none" /><path d="M 60 230 Q 100 238 140 230" stroke={l} strokeWidth="0.8" fill="none" /><circle cx="100" cy="200" r="3" fill={l} /></g>);
    case "japanese":
      return (<g opacity="0.2"><path d="M 100 190 L 100 260" stroke={d} strokeWidth="1.5" /><path d="M 80 205 Q 100 198 120 205" stroke={l} strokeWidth="1" fill="none" /></g>);
    case "african":
      return (<g opacity="0.2">{[205,220,235].map((y,i)=>(<line key={i} x1="55" y1={y} x2="145" y2={y} stroke={l} strokeWidth="1" strokeDasharray="5,5" />))}<path d="M 80 195 L 100 210 L 120 195" stroke={l} strokeWidth="1" fill="none" /></g>);
    case "sporty":
      return (<g opacity="0.15"><line x1="75" y1="190" x2="75" y2="260" stroke="white" strokeWidth="2" /><line x1="125" y1="190" x2="125" y2="260" stroke="white" strokeWidth="2" /></g>);
    case "formal":
      return (<g opacity="0.25"><path d="M 100 190 L 95 220 L 100 215 L 105 220 Z" fill={l} /><line x1="100" y1="215" x2="100" y2="260" stroke={l} strokeWidth="1" /></g>);
    case "hoodie":
      return (<g opacity="0.15"><path d="M 85 190 Q 100 198 115 190" stroke="white" strokeWidth="2" fill="none" /><ellipse cx="100" cy="225" rx="8" ry="5" fill="white" opacity="0.3" /></g>);
    default: return null;
  }
}

/* ── Eyebrows ── */
function Eyebrows({ expression, color }: { expression: string; color: string }) {
  const d = adj(color, -10);
  const sw = 2.5;
  const raised = expression === "happy" || expression === "laughing";
  const furrowed = expression === "thoughtful" || expression === "mysterious";
  const yL = raised ? 80 : furrowed ? 84 : 82;
  const yH = raised ? 74 : furrowed ? 79 : 76;
  return (
    <g>
      <path d={`M 68 ${yL} Q 80 ${yH} 92 ${yL}`} stroke={d} strokeWidth={sw} fill="none" strokeLinecap="round" />
      <path d={`M 108 ${yL} Q 120 ${yH} 132 ${yL}`} stroke={d} strokeWidth={sw} fill="none" strokeLinecap="round" />
    </g>
  );
}

/* ── Hair Back ── */
function HairBack({ style, color }: { style: string; color: string }) {
  const d = adj(color, -20);
  const l = adj(color, 15);
  switch (style) {
    case "long":
      return (<g><path d="M 40 60 Q 40 25 100 25 Q 160 25 160 60 L 160 160 Q 155 165 148 160 L 148 70 Q 148 45 100 45 Q 52 45 52 70 L 52 160 Q 45 165 40 160 Z" fill={color} /><path d="M 43 80 L 43 150" stroke={d} strokeWidth="3" opacity="0.15" strokeLinecap="round" /><path d="M 157 80 L 157 150" stroke={d} strokeWidth="3" opacity="0.15" strokeLinecap="round" /><path d="M 47 90 Q 48 120 46 150" stroke={l} strokeWidth="1" fill="none" opacity="0.12" /><path d="M 153 90 Q 152 120 154 150" stroke={l} strokeWidth="1" fill="none" opacity="0.12" /></g>);
    case "afro":
      return (<g><ellipse cx="100" cy="80" rx="74" ry="68" fill={color} />{[45,60,75,90,105,120,135,150].map((x,i)=>(<circle key={i} cx={x} cy={30+(i%3)*8} r="6" fill={d} opacity="0.08" />))}</g>);
    case "curly":
      return (<g><ellipse cx="100" cy="58" rx="62" ry="40" fill={color} />{[50,65,80,95,110,125,140,155].map((x,i)=>(<circle key={i} cx={x-2+(i%2)*4} cy={32+(i%3)*6} r="11" fill={color} />))}{[52,68,85,100,115,132,148].map((x,i)=>(<circle key={`i${i}`} cx={x} cy={35+(i%2)*8} r="5" fill={d} opacity="0.08" />))}</g>);
    case "wavy":
      return (<g><path d="M 40 55 Q 40 25 100 25 Q 160 25 160 55 L 158 140 Q 150 145 148 135 L 148 60 Q 148 42 100 42 Q 52 42 52 60 L 52 135 Q 50 145 42 140 Z" fill={color} /><path d="M 48 70 Q 52 90 46 110 Q 50 130 48 145" stroke={l} strokeWidth="2" fill="none" opacity="0.15" /><path d="M 152 70 Q 148 90 154 110 Q 150 130 152 145" stroke={l} strokeWidth="2" fill="none" opacity="0.15" /></g>);
    case "pixie":
      return (<g><path d="M 45 60 Q 45 30 100 28 Q 155 30 155 60 Q 152 75 140 70 Q 130 42 100 40 Q 70 42 60 70 Q 48 75 45 60 Z" fill={color} /></g>);
    default:
      return (<g><path d="M 42 60 Q 42 25 100 25 Q 158 25 158 60 Q 155 75 145 68 Q 140 42 100 40 Q 60 42 55 68 Q 45 75 42 60 Z" fill={color} /></g>);
  }
}

/* ── Hair Front ── */
function HairFront({ style, color }: { style: string; color: string }) {
  const d = adj(color, -15);
  const l = adj(color, 20);
  switch (style) {
    case "mohawk":
      return (<g><path d="M 78 30 Q 85 5 100 -2 Q 115 5 122 30 Q 115 35 100 33 Q 85 35 78 30 Z" fill={color} /><path d="M 85 12 Q 100 3 115 12" stroke={l} strokeWidth="1.5" fill="none" opacity="0.2" /><path d="M 88 28 L 92 10 L 96 26" fill={d} opacity="0.1" /><path d="M 104 26 L 108 10 L 112 28" fill={d} opacity="0.1" /></g>);
    case "ponytail":
      return (<g><path d="M 42 60 Q 42 25 100 25 Q 158 25 158 60 Q 155 75 145 68 Q 140 42 100 40 Q 60 42 55 68 Q 45 75 42 60 Z" fill={color} /><ellipse cx="148" cy="50" rx="18" ry="14" fill={color} /><path d="M 150 55 Q 165 65 162 95 Q 160 115 155 130" stroke={color} strokeWidth="12" fill="none" strokeLinecap="round" /><ellipse cx="150" cy="55" rx="4" ry="6" fill={d} opacity="0.3" /></g>);
    case "braids":
      return (<g><path d="M 42 60 Q 42 25 100 25 Q 158 25 158 60 Q 155 75 145 68 Q 140 42 100 40 Q 60 42 55 68 Q 45 75 42 60 Z" fill={color} /><rect x="48" y="68" width="11" height="90" rx="5.5" fill={color} /><rect x="141" y="68" width="11" height="90" rx="5.5" fill={color} />{[0,12,24,36,48,60].map((y,i)=>(<g key={i} opacity="0.12"><path d={`M 49 ${74+y} Q 53.5 ${70+y} 58 ${74+y}`} stroke={d} strokeWidth="1.5" fill="none" /><path d={`M 142 ${74+y} Q 146.5 ${70+y} 151 ${74+y}`} stroke={d} strokeWidth="1.5" fill="none" /></g>))}<circle cx="53.5" cy="155" r="3.5" fill="#FFD700" opacity="0.7" /><circle cx="146.5" cy="155" r="3.5" fill="#FFD700" opacity="0.7" /></g>);
    case "bun":
      return (<g><path d="M 42 60 Q 42 25 100 25 Q 158 25 158 60 Q 155 75 145 68 Q 140 42 100 40 Q 60 42 55 68 Q 45 75 42 60 Z" fill={color} /><circle cx="100" cy="22" r="20" fill={color} /><circle cx="100" cy="22" r="14" fill={d} opacity="0.08" /><ellipse cx="100" cy="32" rx="12" ry="3" fill={d} opacity="0.15" /></g>);
    case "short":
      return (<g><path d="M 45 62 Q 45 28 100 26 Q 155 28 155 62 Q 152 70 142 66 Q 138 40 100 38 Q 62 40 58 66 Q 48 70 45 62 Z" fill={color} /></g>);
    case "medium":
      return (<g><path d="M 42 60 Q 42 25 100 25 Q 158 25 158 60 Q 155 78 142 72 Q 140 42 100 40 Q 60 42 58 72 Q 45 78 42 60 Z" fill={color} /><path d="M 55 65 Q 52 80 48 90" stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" /><path d="M 145 65 Q 148 80 152 90" stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" /></g>);
    case "long": return null;
    case "wavy": return null;
    case "pixie": return null;
    default:
      return (<g><path d="M 42 60 Q 42 25 100 25 Q 158 25 158 60 Q 155 75 145 68 Q 140 42 100 40 Q 60 42 55 68 Q 45 75 42 60 Z" fill={color} /></g>);
  }
}

/* ── Eyes ── */
function EyesSVG({ eyeColor, expression }: { eyeColor: string; expression: string }) {
  const isSquint = expression === "laughing" || expression === "cool";
  const isClosed = expression === "peaceful";
  const isWide = expression === "happy" || expression === "warm";

  if (isClosed) {
    return (<g>
      <path d="M 70 96 Q 80 92 90 96" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M 110 96 Q 120 92 130 96" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
      <line x1="70" y1="96" x2="68" y2="93" stroke="#333" strokeWidth="1" opacity="0.5" />
      <line x1="130" y1="96" x2="132" y2="93" stroke="#333" strokeWidth="1" opacity="0.5" />
    </g>);
  }
  if (isSquint) {
    return (<g>
      <path d="M 70 96 Q 80 90 90 96" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 110 96 Q 120 90 130 96" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {expression === "cool" && (<g><line x1="70" y1="94" x2="90" y2="94" stroke="#333" strokeWidth="1.5" opacity="0.3" strokeLinecap="round" /><line x1="110" y1="94" x2="130" y2="94" stroke="#333" strokeWidth="1.5" opacity="0.3" strokeLinecap="round" /></g>)}
    </g>);
  }

  const ry = isWide ? 9 : 7.5;
  const rx = 10;
  const pr = isWide ? 5.5 : 4.5;
  const ir = isWide ? 7 : 6;
  const lidY = 96 - ry;

  return (<g>
    {/* Left Eye */}
    <ellipse cx="80" cy="96" rx={rx} ry={ry} fill="white" />
    <ellipse cx="80" cy="96" rx={rx} ry={ry} fill="none" stroke="#8B7B6E" strokeWidth="0.5" opacity="0.3" />
    <circle cx="80" cy="96" r={ir} fill={eyeColor} />
    <circle cx="80" cy="96" r={pr} fill="#111" />
    <circle cx="83" cy="92" r="2.2" fill="white" opacity="0.95" />
    <circle cx="77" cy="98" r="1" fill="white" opacity="0.5" />
    <path d={`M 70 ${lidY} Q 80 ${lidY-2} 90 ${lidY}`} stroke="#6B5B4E" strokeWidth="1.5" fill="none" opacity="0.15" />
    <path d={`M 70 ${lidY+1} Q 68 ${lidY-4} 67 ${lidY-6}`} stroke="#333" strokeWidth="1" fill="none" opacity="0.4" />

    {/* Right Eye */}
    <ellipse cx="120" cy="96" rx={rx} ry={ry} fill="white" />
    <ellipse cx="120" cy="96" rx={rx} ry={ry} fill="none" stroke="#8B7B6E" strokeWidth="0.5" opacity="0.3" />
    <circle cx="120" cy="96" r={ir} fill={eyeColor} />
    <circle cx="120" cy="96" r={pr} fill="#111" />
    <circle cx="123" cy="92" r="2.2" fill="white" opacity="0.95" />
    <circle cx="117" cy="98" r="1" fill="white" opacity="0.5" />
    <path d={`M 110 ${lidY} Q 120 ${lidY-2} 130 ${lidY}`} stroke="#6B5B4E" strokeWidth="1.5" fill="none" opacity="0.15" />
    <path d={`M 130 ${lidY+1} Q 132 ${lidY-4} 133 ${lidY-6}`} stroke="#333" strokeWidth="1" fill="none" opacity="0.4" />
  </g>);
}

/* ── Mouth ── */
function MouthSVG({ expression, skinDarker, skinTone }: { expression: string; skinDarker: string; skinTone: string }) {
  const lip = adj(skinDarker, 10);
  switch (expression) {
    case "happy": case "warm":
      return (<g><path d="M 82 138 Q 91 148 100 149 Q 109 148 118 138" stroke={lip} strokeWidth="2.5" fill="none" opacity="0.55" strokeLinecap="round" /><path d="M 88 138 Q 94 143 100 143" stroke={skinTone} strokeWidth="0.8" fill="none" opacity="0.2" /></g>);
    case "laughing":
      return (<g><path d="M 80 136 Q 90 152 100 154 Q 110 152 120 136" stroke={lip} strokeWidth="2.5" fill="none" opacity="0.55" strokeLinecap="round" /><path d="M 86 138 Q 100 142 114 138" fill="white" opacity="0.6" /><path d="M 85 140 Q 100 155 115 140" fill={skinDarker} opacity="0.08" /></g>);
    case "cool": case "confident":
      return (<g><path d="M 88 140 Q 100 145 112 140" stroke={lip} strokeWidth="2" fill="none" opacity="0.45" strokeLinecap="round" /><path d="M 112 140 Q 114 138 116 139" stroke={lip} strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round" /></g>);
    case "thoughtful":
      return (<g><path d="M 92 142 Q 97 139 104 142" stroke={lip} strokeWidth="2" fill="none" opacity="0.4" strokeLinecap="round" /></g>);
    case "mysterious":
      return (<g><path d="M 90 140 Q 95 137 102 140 Q 106 141 110 139" stroke={lip} strokeWidth="1.8" fill="none" opacity="0.4" strokeLinecap="round" /></g>);
    case "peaceful":
      return (<g><path d="M 86 140 Q 93 146 100 147 Q 107 146 114 140" stroke={lip} strokeWidth="2" fill="none" opacity="0.35" strokeLinecap="round" /></g>);
    default:
      return (<g><path d="M 85 138 Q 92 148 100 149 Q 108 148 115 138" stroke={lip} strokeWidth="2" fill="none" opacity="0.45" strokeLinecap="round" /></g>);
  }
}

/* ── Accessories ── */
function AccessorySVG({ type, hairColor }: { type: string; hairColor: string }) {
  switch (type) {
    case "glasses":
      return (<g><circle cx="80" cy="96" r="15" fill="none" stroke="#4A3728" strokeWidth="2" /><circle cx="120" cy="96" r="15" fill="none" stroke="#4A3728" strokeWidth="2" /><path d="M 95 95 Q 100 92 105 95" stroke="#4A3728" strokeWidth="2" fill="none" /><line x1="65" y1="95" x2="46" y2="92" stroke="#4A3728" strokeWidth="1.5" /><line x1="135" y1="95" x2="154" y2="92" stroke="#4A3728" strokeWidth="1.5" /><ellipse cx="74" cy="91" rx="4" ry="2" fill="white" opacity="0.08" /><ellipse cx="114" cy="91" rx="4" ry="2" fill="white" opacity="0.08" /></g>);
    case "sunglasses":
      return (<g><rect x="63" y="86" width="34" height="22" rx="6" fill="#1a1a2e" stroke="#555" strokeWidth="1.2" /><rect x="103" y="86" width="34" height="22" rx="6" fill="#1a1a2e" stroke="#555" strokeWidth="1.2" /><path d="M 97 96 Q 100 93 103 96" stroke="#555" strokeWidth="1.5" fill="none" /><line x1="63" y1="95" x2="46" y2="92" stroke="#555" strokeWidth="1.5" /><line x1="137" y1="95" x2="154" y2="92" stroke="#555" strokeWidth="1.5" /><rect x="68" y="89" width="12" height="4" rx="2" fill="white" opacity="0.12" transform="rotate(-8 74 91)" /><rect x="108" y="89" width="12" height="4" rx="2" fill="white" opacity="0.12" transform="rotate(-8 114 91)" /></g>);
    case "hat":
      return (<g><path d="M 48 42 L 152 42 Q 155 42 155 39 L 155 36 Q 155 33 152 33 L 48 33 Q 45 33 45 36 L 45 39 Q 45 42 48 42 Z" fill="#2D3748" /><rect x="62" y="12" width="76" height="26" rx="12" fill="#2D3748" /><path d="M 50 42 L 150 42" stroke="black" strokeWidth="1" opacity="0.15" /></g>);
    case "headband":
      return (<g><path d="M 46 76 Q 100 60 154 76" stroke="#F43F5E" strokeWidth="6" fill="none" strokeLinecap="round" /><path d="M 46 76 Q 100 62 154 76" stroke="#FB7185" strokeWidth="2" fill="none" opacity="0.3" strokeLinecap="round" /></g>);
    case "earrings":
      return (<g><circle cx="44" cy="118" r="5.5" fill="#FFD700" /><circle cx="44" cy="118" r="3" fill="#FFF8DC" opacity="0.3" /><circle cx="156" cy="118" r="5.5" fill="#FFD700" /><circle cx="156" cy="118" r="3" fill="#FFF8DC" opacity="0.3" /></g>);
    case "necklace":
      return (<g><path d="M 72 182 Q 86 198 100 200 Q 114 198 128 182" stroke="#FFD700" strokeWidth="2" fill="none" /><circle cx="100" cy="202" r="6" fill="#FFD700" /><circle cx="100" cy="202" r="3.5" fill="#F43F5E" /><circle cx="99" cy="200" r="1" fill="white" opacity="0.4" /></g>);
    case "flower":
      return (<g transform="translate(130, 58)">{[0,60,120,180,240,300].map((a,i)=>(<ellipse key={i} cx={Math.cos(a*Math.PI/180)*9} cy={Math.sin(a*Math.PI/180)*9} rx="5" ry="7" fill={i%2===0?"#F472B6":"#FB7185"} opacity="0.85" transform={`rotate(${a} ${Math.cos(a*Math.PI/180)*9} ${Math.sin(a*Math.PI/180)*9})`} />))}<circle cx="0" cy="0" r="4.5" fill="#FBBF24" /></g>);
    case "scarf":
      return (<g><path d="M 55 178 Q 100 195 145 178 L 145 198 Q 100 210 55 198 Z" fill="#DC2626" opacity="0.85" /><path d="M 60 185 Q 100 198 140 185" stroke="#FCA5A5" strokeWidth="1" fill="none" opacity="0.2" /></g>);
    case "crown":
      return (<g><path d="M 62 38 L 70 15 L 82 30 L 100 8 L 118 30 L 130 15 L 138 38 Z" fill="#FFD700" /><path d="M 62 38 L 138 38 L 136 46 L 64 46 Z" fill="#FFD700" /><circle cx="100" cy="26" r="3.5" fill="#F43F5E" /><circle cx="78" cy="32" r="2.5" fill="#06B6D4" /><circle cx="122" cy="32" r="2.5" fill="#06B6D4" /></g>);
    case "bandana":
      return (<g><path d="M 44 68 Q 100 52 156 68 L 156 76 Q 100 60 44 76 Z" fill="#DC2626" /><circle cx="46" cy="80" r="5" fill="#DC2626" /><path d="M 42 82 Q 38 92 35 100" stroke="#DC2626" strokeWidth="4" fill="none" strokeLinecap="round" /><path d="M 46 85 Q 44 95 46 105" stroke="#DC2626" strokeWidth="3" fill="none" strokeLinecap="round" /></g>);
    case "beanie":
      return (<g><path d="M 46 68 Q 46 20 100 18 Q 154 20 154 68 Q 100 60 46 68 Z" fill="#6366F1" /><path d="M 44 64 Q 100 54 156 64 L 156 76 Q 100 66 44 76 Z" fill={adj("#6366F1",-15)} /><circle cx="100" cy="14" r="8" fill="#6366F1" /></g>);
    default: return null;
  }
}

/* ── Utility ── */
function adj(hex: string, amount: number): string {
  const c = hex.replace("#", "");
  if (c.length !== 6) return hex;
  const n = parseInt(c, 16);
  if (isNaN(n)) return hex;
  const r = Math.min(255, Math.max(0, ((n >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (n & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function AvatarPage() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState<Tab>("skin");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({
    skinTone: SKIN_TONES[2].hex,
    hairColor: HAIR_COLORS[0].hex,
    hairStyle: HAIR_STYLES[1].id,
    eyeColor: EYE_COLORS[0].hex,
    outfit: OUTFITS[0].id,
    accessory: ACCESSORIES[0].id,
    expression: EXPRESSIONS[0].id,
    background: BACKGROUNDS[5].id,
  });

  useEffect(() => {
    const loadAvatar = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const profileData = await api.getProfile(user.id);
        if (profileData.profile?.avatar_config) {
          setConfig(prev => ({ ...prev, ...profileData.profile.avatar_config }));
        }
      } catch (err) { console.error("Failed to load avatar:", err); }
      finally { setLoading(false); }
    };
    loadAvatar();
  }, [user]);

  const updateConfig = useCallback((key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const randomize = useCallback(() => {
    setConfig({
      skinTone: SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)].hex,
      hairColor: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)].hex,
      hairStyle: HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)].id,
      eyeColor: EYE_COLORS[Math.floor(Math.random() * EYE_COLORS.length)].hex,
      outfit: OUTFITS[Math.floor(Math.random() * OUTFITS.length)].id,
      accessory: ACCESSORIES[Math.floor(Math.random() * ACCESSORIES.length)].id,
      expression: EXPRESSIONS[Math.floor(Math.random() * EXPRESSIONS.length)].id,
      background: BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)].id,
    });
  }, []);

  const handleSave = async () => {
    if (!user) { toast.error("Please log in to save your avatar"); return; }
    setSaving(true);
    try {
      await api.updateAvatar(user.id, config);
      localStorage.setItem("familia_avatar", JSON.stringify(config));
      setSaved(true);
      toast.success("Avatar saved! ✨");
      await refreshUser();
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      console.error("Failed to save avatar:", err);
      toast.error(err.message || "Failed to save avatar");
    } finally { setSaving(false); }
  };

  const bgConfig = BACKGROUNDS.find(b => b.id === config.background) || BACKGROUNDS[5];
  const bgGradient = bgConfig.colors.length === 3
    ? `linear-gradient(135deg, ${bgConfig.colors[0]}, ${bgConfig.colors[1]}, ${bgConfig.colors[2]})`
    : `linear-gradient(135deg, ${bgConfig.colors[0]}, ${bgConfig.colors[1]})`;

  const outfitConfig = OUTFITS.find(o => o.id === config.outfit);
  const expressionConfig = EXPRESSIONS.find(e => e.id === config.expression);
  const accessoryConfig = ACCESSORIES.find(a => a.id === config.accessory);

  const tabIndex = TABS.findIndex(t => t.id === tab);
  const prevTab = () => setTab(TABS[(tabIndex - 1 + TABS.length) % TABS.length].id);
  const nextTab = () => setTab(TABS[(tabIndex + 1) % TABS.length].id);

  return (
    <div className="min-h-screen pb-24">
      {/* ── Header ── */}
      <div className="sticky top-0 glass border-b border-themed z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/profile">
              <motion.button className="p-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition" whileTap={{ scale: 0.95 }}>
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
            </Link>
            <h1 className="font-bold text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-familia-400" /> Avatar Studio
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <motion.button onClick={randomize} className="p-2.5 rounded-xl hover:bg-[var(--bg-card-hover)] transition text-muted hover:text-[var(--text-primary)]" whileTap={{ scale: 0.9, rotate: 180 }} title="Randomize" disabled={saving}>
              <Shuffle className="w-5 h-5" />
            </motion.button>
            <motion.button onClick={handleSave} disabled={saving || !user} className="px-4 py-2 rounded-xl bg-gradient-to-r from-familia-500 to-heart-500 text-white text-sm font-semibold flex items-center gap-1.5 shadow-lg shadow-familia-500/20 disabled:opacity-50" whileTap={{ scale: 0.95 }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : saved ? "Saved!" : "Save"}
            </motion.button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* ── Preview ── */}
          <div className="lg:col-span-2 flex flex-col items-center">
            <motion.div className="relative w-72 h-80 sm:w-80 sm:h-[22rem] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10" style={{ background: bgGradient }} layout transition={{ type: "spring", stiffness: 300, damping: 30 }}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-white/5 pointer-events-none" />
              <motion.div className="w-full h-full p-2" key={JSON.stringify(config)} initial={{ scale: 0.92, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35, ease: "easeOut" }}>
                <AvatarSVG config={config} />
              </motion.div>
              <div className="absolute bottom-3 left-3 right-3">
                <motion.div className="bg-black/40 backdrop-blur-md rounded-xl px-3 py-2 flex items-center justify-center gap-2 text-xs text-white/90" layout>
                  <span>{outfitConfig?.emoji} {outfitConfig?.label}</span>
                  <span className="text-white/30">•</span>
                  <span>{expressionConfig?.emoji} {expressionConfig?.label}</span>
                  {config.accessory !== "none" && (<><span className="text-white/30">•</span><span>{accessoryConfig?.emoji}</span></>)}
                </motion.div>
              </div>
              {[...Array(6)].map((_, i) => (
                <motion.div key={i} className="absolute w-1 h-1 rounded-full bg-white/60" style={{ left: `${15 + i * 14}%`, top: `${8 + (i % 3) * 18}%` }} animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], y: [0, -12, -24] }} transition={{ duration: 2.5, delay: i * 0.5, repeat: Infinity, repeatDelay: 2.5 }} />
              ))}
            </motion.div>
            <motion.p className="text-xs text-muted text-center mt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>This is how others see you in Familia</motion.p>
            <motion.button onClick={randomize} className="mt-3 flex items-center gap-2 text-xs text-muted hover:text-familia-400 transition px-4 py-2 rounded-full border border-themed hover:border-familia-500/20" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Wand2 className="w-3 h-3" /> Feeling lucky? Randomize!
            </motion.button>
          </div>

          {/* ── Customization Panel ── */}
          <div className="lg:col-span-3">
            <div className="flex items-center gap-1.5 mb-6">
              <button onClick={prevTab} className="p-1.5 rounded-lg hover:bg-[var(--bg-card-hover)] transition text-muted"><ChevronLeft className="w-4 h-4" /></button>
              <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                {TABS.map(t => (
                  <motion.button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs whitespace-nowrap transition-all ${tab === t.id ? "bg-gradient-to-r from-familia-500/20 to-heart-500/20 text-[var(--text-primary)] border border-familia-500/20 shadow-glow-sm" : "bg-[var(--bg-card)] text-muted border border-themed hover:bg-[var(--bg-card-hover)]"}`} whileTap={{ scale: 0.95 }} layout>
                    {t.icon}<span className="hidden sm:inline">{t.label}</span>
                  </motion.button>
                ))}
              </div>
              <button onClick={nextTab} className="p-1.5 rounded-lg hover:bg-[var(--bg-card-hover)] transition text-muted"><ChevronRight className="w-4 h-4" /></button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={tab} className="glass-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                {tab === "skin" && (
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2"><Palette className="w-4 h-4 text-familia-400" /> Skin Tone</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      {SKIN_TONES.map(tone => (
                        <motion.button key={tone.id} onClick={() => updateConfig("skinTone", tone.hex)} className={`relative group flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${config.skinTone === tone.hex ? "border-familia-500 bg-familia-500/5 scale-105" : "border-themed hover:border-[var(--border-hover)] bg-[var(--bg-card)]"}`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <div className="w-12 h-12 rounded-xl shadow-md ring-1 ring-black/5" style={{ backgroundColor: tone.hex }} />
                          <span className="text-[10px] text-muted">{tone.label}</span>
                          {config.skinTone === tone.hex && (<motion.div className="absolute -top-1 -right-1 w-5 h-5 bg-familia-500 rounded-full flex items-center justify-center" initial={{ scale: 0 }} animate={{ scale: 1 }}><Check className="w-3 h-3 text-white" /></motion.div>)}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {tab === "hair" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-4 flex items-center gap-2">🎨 Hair Color</h3>
                      <div className="flex flex-wrap gap-2.5">
                        {HAIR_COLORS.map(color => (
                          <motion.button key={color.hex} onClick={() => updateConfig("hairColor", color.hex)} className={`relative w-10 h-10 rounded-xl border-2 transition-all shadow-sm ${config.hairColor === color.hex ? "border-familia-500 scale-110 ring-2 ring-familia-500/20" : "border-white/10 hover:border-white/20"}`} style={{ backgroundColor: color.hex }} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.95 }} title={color.label}>
                            {config.hairColor === color.hex && (<motion.div className="absolute inset-0 flex items-center justify-center" initial={{ scale: 0 }} animate={{ scale: 1 }}><Check className="w-4 h-4 text-white drop-shadow-md" /></motion.div>)}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-4 flex items-center gap-2">✂️ Hair Style</h3>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {HAIR_STYLES.map(style => (
                          <motion.button key={style.id} onClick={() => updateConfig("hairStyle", style.id)} className={`p-2.5 rounded-xl text-center transition-all border ${config.hairStyle === style.id ? "border-familia-500/50 bg-familia-500/10 ring-1 ring-familia-500/20" : "border-themed bg-[var(--bg-card)] text-muted hover:bg-[var(--bg-card-hover)]"}`} whileTap={{ scale: 0.95 }}>
                            <div className="text-lg mb-0.5">{style.emoji}</div>
                            <div className="text-[10px]">{style.label}</div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {tab === "eyes" && (
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2"><Eye className="w-4 h-4 text-bond-400" /> Eye Color</h3>
                    <div className="grid grid-cols-4 gap-3">
                      {EYE_COLORS.map(color => (
                        <motion.button key={color.hex} onClick={() => updateConfig("eyeColor", color.hex)} className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${config.eyeColor === color.hex ? "border-bond-500 bg-bond-500/5 scale-105" : "border-themed bg-[var(--bg-card)] hover:border-[var(--border-hover)]"}`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full border-2 border-white/10 shadow-md" style={{ backgroundColor: color.hex }} />
                            <div className="absolute inset-0 flex items-center justify-center"><div className="w-4 h-4 rounded-full bg-black/60" /><div className="absolute w-1.5 h-1.5 rounded-full bg-white/60 -translate-x-1 -translate-y-1" /></div>
                          </div>
                          <span className="text-[10px] text-muted">{color.label}</span>
                          {config.eyeColor === color.hex && (<motion.div className="absolute -top-1 -right-1 w-5 h-5 bg-bond-500 rounded-full flex items-center justify-center" initial={{ scale: 0 }} animate={{ scale: 1 }}><Check className="w-3 h-3 text-white" /></motion.div>)}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {tab === "outfit" && (
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2"><Shirt className="w-4 h-4 text-familia-400" /> Outfit Style</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {OUTFITS.map(outfit => (
                        <motion.button key={outfit.id} onClick={() => updateConfig("outfit", outfit.id)} className={`p-4 rounded-xl text-left transition-all border flex items-center gap-3 ${config.outfit === outfit.id ? "border-familia-500/50 bg-familia-500/10 ring-1 ring-familia-500/20" : "border-themed bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]"}`} whileTap={{ scale: 0.98 }}>
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-sm" style={{ backgroundColor: outfit.color + "25", borderLeft: `3px solid ${outfit.color}` }}>{outfit.emoji}</div>
                          <div><div className="text-sm font-medium">{outfit.label}</div><div className="text-[10px] text-muted capitalize">{outfit.pattern}</div></div>
                          {config.outfit === outfit.id && <Check className="w-4 h-4 text-familia-400 ml-auto" />}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {tab === "accessories" && (
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">✨ Accessories</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                      {ACCESSORIES.map(acc => (
                        <motion.button key={acc.id} onClick={() => updateConfig("accessory", acc.id)} className={`p-3 rounded-xl text-center transition-all border ${config.accessory === acc.id ? "border-familia-500/50 bg-familia-500/10 ring-1 ring-familia-500/20" : "border-themed bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]"}`} whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.03 }}>
                          <div className="text-2xl mb-1">{acc.emoji}</div>
                          <div className="text-[10px] text-muted">{acc.label}</div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {tab === "expression" && (
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2"><Smile className="w-4 h-4 text-heart-400" /> Expression</h3>
                    <div className="grid grid-cols-4 gap-3">
                      {EXPRESSIONS.map(exp => (
                        <motion.button key={exp.id} onClick={() => updateConfig("expression", exp.id)} className={`p-3 rounded-xl text-center transition-all border ${config.expression === exp.id ? "border-heart-500/50 bg-heart-500/10 ring-1 ring-heart-500/20" : "border-themed bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]"}`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <div className="text-3xl mb-1">{exp.emoji}</div>
                          <div className="text-[10px] text-muted">{exp.label}</div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {tab === "background" && (
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">🎨 Background</h3>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                      {BACKGROUNDS.map(bg => {
                        const bgS = bg.colors.length === 3 ? `linear-gradient(135deg, ${bg.colors[0]}, ${bg.colors[1]}, ${bg.colors[2]})` : `linear-gradient(135deg, ${bg.colors[0]}, ${bg.colors[1]})`;
                        return (
                          <motion.button key={bg.id} onClick={() => updateConfig("background", bg.id)} className={`relative h-16 rounded-xl transition-all border-2 flex items-center justify-center ${config.background === bg.id ? "border-white scale-105 ring-2 ring-white/20" : "border-white/10 hover:border-white/30"}`} style={{ background: bgS }} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                            <span className="text-[10px] text-white/90 font-medium drop-shadow-md">{bg.label}</span>
                            {config.background === bg.id && (<motion.div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow" initial={{ scale: 0 }} animate={{ scale: 1 }}><Check className="w-2.5 h-2.5 text-gray-800" /></motion.div>)}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
