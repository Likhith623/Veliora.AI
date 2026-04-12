// PlayAudio.jsx
// This component provides a play button to generate and play a bot's voice for a given message.
// TTS is now sourced from the new backend: POST /api/voice/note
import { voiceGenerateNote } from "@/lib/veliora-client";

import React, { useRef, useEffect, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { motion, AnimatePresence } from "framer-motion";
import { IconLoader, IconPlayerPlayFilled, IconPlayerPauseFilled } from '@tabler/icons-react';


// Import avatar images from src/photos
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
import japanese_romantic_female from "@/photos/japanese_romantic_female.jpeg";
import japanese_romantic_male from "@/photos/japanese_romantic_male.jpeg";

import parisian_mentor_male from "@/photos/parisian_mentor_male.jpg";
import parisian_mentor_female from "@/photos/parisian_mentor_female.png";
import parisian_friend_male from "@/photos/parisian_friend_male.jpg";
import parisian_friend_female from "@/photos/parisian_friend_female.jpg";
import parisian_romantic_female from "@/photos/parisian_romantic_female.png";
import parisian_romantic_male from "@/photos/parisian_romantic_male.jpg";

import berlin_mentor_male from "@/photos/berlin_mentor_male.jpeg";
import berlin_mentor_female from "@/photos/berlin_mentor_female.jpeg";
import berlin_friend_male from "@/photos/berlin_friend_male.jpeg";
import berlin_friend_female from "@/photos/berlin_friend_female.jpeg";
import berlin_romantic_male from "@/photos/berlin_romantic_male.jpeg";
import berlin_romantic_female from "@/photos/berlin_romantic_female.jpeg";



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
import rama_god from "@/photos/rama_god.jpeg";
import shiva_god from "@/photos/shiva_god.jpeg";
import trimurti from "@/photos/trimurti.jpg";
import hanuman_god from "@/photos/hanuman_god.jpeg";

import defaultAvatar from "@/photos/defaultforvoice.png";

// Map bot_id to avatar image
const avatarMap = {
  delhi_mentor_male,
  delhi_mentor_female,
  delhi_friend_male,
  delhi_friend_female,
  delhi_romantic_male,
  delhi_romantic_female,

  japanese_mentor_male,
  japanese_mentor_female,
  japanese_friend_male,
  japanese_friend_female,
  japanese_romantic_female,
  japanese_romantic_male,

  parisian_mentor_male,
  parisian_mentor_female,
  parisian_friend_male,
  parisian_friend_female,
  parisian_romantic_female,

  berlin_mentor_male,
  berlin_mentor_female,
  berlin_friend_male,
  berlin_friend_female,
  berlin_romantic_male,
  berlin_romantic_female,

    // Add Singapore personas
  singapore_mentor_male,
  singapore_mentor_female,
  singapore_friend_male,
  singapore_friend_female,
  singapore_romantic_male,
  singapore_romantic_female,

  // Add Emirati personas
  emirati_mentor_male,
  emirati_mentor_female,
  emirati_friend_male,
  emirati_friend_female,
  emirati_romantic_male,
  emirati_romantic_female,


    // Mexican personas
  mexican_friend_male,
  mexican_friend_female,
  mexican_mentor_male,
  mexican_mentor_female,
  mexican_romantic_male,
  mexican_romantic_female,


    // Sri Lankan personas
  srilankan_friend_male,
  srilankan_friend_female,
  srilankan_mentor_male,
  srilankan_mentor_female,
  srilankan_romantic_male,
  srilankan_romantic_female,



  Krishna: lord_krishna,
  Rama: rama_god,
  Shiva: shiva_god,
  Trimurti: trimurti,
  Hanuman: hanuman_god,
};

// Helper to convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Loading Animation Component
const LoadingWaveform = () => {
  return (
    <div className="flex items-center justify-center w-full h-7 space-x-1">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-purple-400/90"
          style={{ height: Math.random() * 20 + 8 }}
          animate={{
            height: [
              Math.random() * 20 + 8,
              Math.random() * 28 + 12,
              Math.random() * 20 + 8,
            ],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};


// Pulsing Loading Dots Component
const LoadingDots = () => {
  return (
    <div className="flex items-center justify-center space-x-1">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 bg-purple-400/90 rounded-full"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// PlayAudio component: Plays the bot's voice for a given message
const PlayAudio = ({ text, bot_id,isWhiteIcon, minimal = false }) => {

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [duration, setDuration] = useState("0:00");
  const [progress, setProgress] = useState(0);
  const audioElement = useRef(null);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);

  // Get the correct avatar image for the bot_id, or fallback to default
  const avatarSrc = avatarMap[bot_id] || defaultAvatar;

  // Handles the play button click: fetches and plays the bot's voice
  const handlePlayPause = async () => {
    try {
      // Pause and reset if already playing
      if (minimal) {
        if (audioElement.current) {
          if (isPlaying) {
            audioElement.current.pause();
            setIsPlaying(false);
            return;
          }
        }
      } else {
        if (wavesurfer.current) {
          if (isPlaying) {
            wavesurfer.current.pause();
            setIsPlaying(false);
            return;
          }
        }
      }

      if (!audioUrl) {
        setIsLoading(true);
        setShouldAutoPlay(true); // Set flag to auto-play after load

        // ── New backend: POST /api/voice/note ──────────────────────────────
        // Returns { audio_url, audio_base64, text_response, duration_seconds }
        const voiceData = await voiceGenerateNote(bot_id, text);

        let audioSrc;
        if (voiceData.audio_url) {
          // Prefer URL — no base64 decoding overhead
          audioSrc = voiceData.audio_url;
        } else if (voiceData.audio_base64) {
          // Fallback: base64 → blob URL
          const audioBuffer = base64ToArrayBuffer(voiceData.audio_base64);
          const audioBlob = new Blob([audioBuffer], { type: "audio/wav" });
          audioSrc = URL.createObjectURL(audioBlob);
        } else {
          throw new Error("No audio returned from voice/note endpoint");
        }

        setAudioUrl(audioSrc);
        console.log("Set audioUrl:", audioSrc);
        setIsLoading(false);

        // For minimal mode, play as soon as audio is loaded
        if (minimal) {
          setTimeout(() => {
            if (audioElement.current) {
              console.log('Trying to play audio...', audioElement.current.src);
              audioElement.current.play().then(() => {
                console.log('Playback started!');
              }).catch(e => {
                console.error('Playback error:', e);
              });
              setIsPlaying(true);
            } else {
              console.log('audioElement.current is null');
            }
          }, 100);
        }
      } else {
        if (minimal) {
          if (audioElement.current) {
            console.log('Trying to play audio...', audioElement.current.src);
            audioElement.current.play().then(() => {
              console.log('Playback started!');
            }).catch(e => {
              console.error('Playback error:', e);
            });
            setIsPlaying(true);
          } else {
            console.log('audioElement.current is null');
          }
        } else if (wavesurfer.current) {
          wavesurfer.current.play();
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error('Error handling audio:', error);
      setIsLoading(false);
    }
  };

  // Initialize WaveSurfer when audioUrl is set
  useEffect(() => {
    if (audioUrl && waveformRef.current && !minimal) {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "rgba(255, 255, 255, 0.3)",
        progressColor: "#c084fc",
        height: 40,
        barWidth: 2,
        barGap: 2,
        barRadius: 3,
        barHeight: 1,
        minPxPerBar: 1,
        fillParent: true,
        responsive: true,
        cursorWidth: 0,
        normalize: true,
        partialRender: true,
        interact: true,
        hideScrollbar: true,
        autoCenter: true,
        dragToSeek: true,
      });
      wavesurfer.current.load(audioUrl);

      wavesurfer.current.on('ready', () => {
        const wsDuration = wavesurfer.current.getDuration();
        if (wsDuration && wsDuration > 0) {
          setDuration(formatTime(wsDuration));
        } else if (audioElement.current) {
          setDuration(formatTime(audioElement.current.duration));
        }
        if (shouldAutoPlay) {
          wavesurfer.current.play();
          setIsPlaying(true);
          setShouldAutoPlay(false);
        }
      });

      wavesurfer.current.on('finish', () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      });

      wavesurfer.current.on('audioprocess', () => {
        const cur = wavesurfer.current.getCurrentTime();
        const dur = wavesurfer.current.getDuration();
        setCurrentTime(cur);
        setProgress(dur ? cur / dur : 0);
      });

      wavesurfer.current.on('seek', (progress) => {
        const dur = wavesurfer.current.getDuration();
        const cur = dur * progress;
        setCurrentTime(cur);
        setProgress(progress);
      });

      return () => wavesurfer.current && wavesurfer.current.destroy();
    }
  }, [audioUrl, minimal]);

  // Handle <audio> loadedmetadata to get duration as fallback
  const handleAudioLoadedMetadata = () => {
    if (audioElement.current && (!duration || duration === '0:00')) {
      setDuration(formatTime(audioElement.current.duration));
    }
  };

  // Log decode errors from the <audio> element
  const handleAudioError = (e) => {
    console.error('Audio element decode error:', e);
  };

  // Handle audio end event: reset playing state
  const handleEnded = () => {
    setIsPlaying(false);
  };

  // Cleanup function when component unmounts: reset audio state
  React.useEffect(() => {
    return () => {
      if (audioUrl) {
        setIsPlaying(false);
        setAudioUrl(null);
      }
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Handle waveform click to seek audio
  const handleWaveformClick = (e) => {
    if (!wavesurfer.current || !waveformRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    wavesurfer.current.seekTo(percent);
  };

  // Minimal UI (minimal play button)
  if (minimal) {
    return (
      <button 
        onClick={handlePlayPause}
        disabled={isLoading}
        className="flex items-center justify-center rounded-full hover:bg-gray-100 p-2 transition-colors"
        style={{ width: '32px', height: '32px', minWidth: '32px' }}
      >
         {isLoading ? (
            <IconLoader 
              size={36} 
              className="text-'white', mt-[-2px] animate-spin"
            />
          ) : isPlaying ? (
            <IconPlayerPauseFilled 
              size={30} 
              className={`${isWhiteIcon ? 'text-white' : 'text-white'} mt-[-2px] cursor-pointer hover:scale-125 transition-transform`}
            />
          ) : (
            <IconPlayerPlayFilled 
              size={30} 
              className={`${isWhiteIcon ? 'text-white' : 'text-white'} mt-[-2px] cursor-pointer hover:scale-125 transition-transform`}
            />
          )}
        <audio
          ref={audioElement}
          src={audioUrl}
          onLoadedMetadata={handleAudioLoadedMetadata}
          onError={handleAudioError}
          onEnded={handleEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          style={{ display: 'none' }}
        />
      </button>
    );
  }

  // Full voice note UI (existing design)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={{ 
        scale: 1.02,
        boxShadow: '0 10px 40px -5px rgba(0,0,0,0.15)',
        transition: { duration: 0.2 }
      }}
      className="inline-flex items-center shadow-lg min-h-[32px] relative px-2 sm:px-4 py-2 rounded-2xl border border-white/30 backdrop-blur-sm transition-all"
      style={{
        boxShadow: '0 8px 32px -4px rgba(0,0,0,0.1)',
        background: 'white',
        width: '100%',
        maxWidth: '620px',
        minWidth: '280px',
        borderRadius: 24,
        padding: '0.3rem 0.7rem',
      }}
    >
      {/* Avatar with mic overlay */}
      <div className="mr-2 sm:mr-4 relative flex-shrink-0 group">
        <motion.img
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          src={avatarSrc?.src || avatarSrc}
          alt="Bot Avatar"
          className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full transition-transform duration-200 group-hover:scale-105"
          style={{
            border: '3px solid rgba(192,132,252,0.9)',
            boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
          }}
        />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 500 }}
          className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center bg-white/90 backdrop-blur-sm"
          style={{ boxShadow: '0 3px 8px rgba(192,132,252,0.9)' }}
        >
          {isLoading ? (
            <motion.div 
              className="w-2 h-2 sm:w-3 sm:h-3 border border-purple-400 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="sm:w-3 sm:h-3 md:w-4 md:h-4">
              <path
                d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                stroke="#C084FC"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
                stroke="#C084FC"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </motion.div>
      </div>
  
      {/* Play/Pause Button */}
      <motion.button
        onClick={handlePlayPause}
        disabled={isLoading}
        whileTap={{ scale: 0.95 }}
        className="mr-2 sm:mr-4 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200 hover:shadow-lg"
        style={{ boxShadow: '0 2px 8px rgba(192,132,252,0.9)' }}
      >
        {isLoading ? (
          <motion.div 
            className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 border-3 border-purple-400 border-t-pink-400 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        ) : isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 22 22" className="sm:w-5 sm:h-5 md:w-6 md:h-6">
            <rect x="5" y="4" width="3" height="12" rx="1.2" fill="#C084FC" />
            <rect x="12" y="4" width="3" height="12" rx="1.2" fill="#C084FC" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 22 22" className="sm:w-5 sm:h-5 md:w-6 md:h-6">
            <polygon points="6,4 16,11 6,18" fill="#C084FC" />
          </svg>
        )}
      </motion.button>
  
      {/* Waveform and progress dot */}
      <div className="flex-1 relative flex flex-col justify-center min-h-[44px] mx-1 sm:mx-2">
        <div className="flex items-center w-full" style={{ minHeight: 28 }}>
          <div
            ref={waveformRef}
            className="w-full h-6 sm:h-7 min-h-[24px] sm:min-h-[28px] cursor-pointer hover:opacity-90 transition-opacity duration-200 relative"
            style={{ position: 'relative', minHeight: 24 }}
            onClick={handleWaveformClick}
          >
            <AnimatePresence>
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-lg"
                >
                  <LoadingWaveform />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
  
          <AnimatePresence>
            {!isLoading && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  left: `${progress * 100}%`,
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 500,
                  damping: 30,
                  mass: 0.5
                }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 3,
                  pointerEvents: 'none',
                }}
              >
                <motion.span 
                  className="block w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white shadow-lg" 
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(192,132,252,1), rgba(255,255,255,0.9))',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)' 
                  }}
                  animate={{ 
                    scale: isPlaying ? [1, 1.15, 1] : 1,
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: isPlaying ? Infinity : 0, 
                    ease: "easeInOut" 
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
  
      {/* Duration */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="ml-2 sm:ml-5 text-xs sm:text-sm font-medium flex-shrink-0 min-w-[60px] sm:min-w-[90px] text-right px-2 sm:px-3 py-1 rounded-full bg-white/30 flex items-center justify-center"
        style={{ 
          color: 'rgba(192,132,252,0.9)',
          textShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="flex items-center justify-center h-5"
            >
              <LoadingDots />
            </motion.div>
          ) : (
            <motion.span 
              key="duration-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="font-mono"
            >
              {currentTime ? `${formatTime(currentTime)} / ` : ""}
              {duration}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
  
      {/* Hidden audio element */}
      <audio
        ref={audioElement}
        src={audioUrl}
        onLoadedMetadata={handleAudioLoadedMetadata}
        onError={handleAudioError}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        style={{ display: 'none' }}
      />
    </motion.div>
  );
  }
  export default PlayAudio;
  