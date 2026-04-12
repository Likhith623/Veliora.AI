import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, X, Zap, Activity } from "lucide-react";
import { useBot } from '@/support/BotContext';
import { useUser } from '@/support/UserContext';

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

import lord_krishna from "@/photos/lord_krishna.jpg";
import rama_god from "@/photos/rama_god.jpeg";
import shiva_god from "@/photos/shiva_god.jpeg";
import trimurti from "@/photos/trimurti.jpg";
import hanuman_god from "@/photos/hanuman_god.jpeg";

import singapore_mentor_male from "@/photos/singapore_mentor_male.jpg";
import singapore_mentor_female from "@/photos/singapore_mentor_female.jpg";
import singapore_friend_male from "@/photos/singapore_friend_male.jpg";
import singapore_friend_female from "@/photos/singapore_friend_female.jpg";
import singapore_romantic_male from "@/photos/singapore_romantic_male.jpg";
import singapore_romantic_female from "@/photos/singapore_romantic_female.jpg";

import emirati_mentor_male from "@/photos/emirati_mentor_male.jpg";
import emirati_mentor_female from "@/photos/emirati_mentor_female.png";
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

import defaultAvatar from "@/photos/defaultforvoice.png";

// ===========================================
// CONSTANTS AND CONFIGURATIONS
// ===========================================

const AUDIO_CONTEXT_CONFIG = {
  latencyHint: 'interactive',
  sampleRate: 8000,
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: 1
};

const VOICE_THRESHOLD = 0.0003;
const INTERRUPTION_THRESHOLD = 0.025;
const SILENCE_DURATION = 200;
const CHECK_INTERVAL = 4;
const VOICE_START = 5;
const VOICE_END = 22;

const REUSABLE_FREQUENCY_BUFFER = new Uint8Array(128);

const BOT_DETAILS = [
  { bot_id: "delhi_mentor_male", name: "Yash Oberoi" },
  { bot_id: "delhi_mentor_female", name: "Kalpana Roy" },
  { bot_id: "delhi_friend_male", name: "Rahul Kapoor" },
  { bot_id: "delhi_friend_female", name: "Amayra Dubey" },
  { bot_id: "delhi_romantic_male", name: "Rohan Mittal" },
  { bot_id: "delhi_romantic_female", name: "Alana Malhotra" },
  { bot_id: "japanese_mentor_male", name: "Kazuo Sato" },
  { bot_id: "japanese_mentor_female", name: "Masaka Kobayashi" },
  { bot_id: "japanese_friend_male", name: "Hiro Tanaka" },
  { bot_id: "japanese_friend_female", name: "Shiyona Narita" },
  { bot_id: "japanese_romantic_male", name: "Hiroshi Takahashi" },
  { bot_id: "japanese_romantic_female", name: "Ami Kudo" },
  { bot_id: "parisian_mentor_male", name: "Pierre Dubois" },
  { bot_id: "parisian_mentor_female", name: "Elise Moreau" },
  { bot_id: "parisian_friend_male", name: "Theo Martin" },
  { bot_id: "parisian_friend_female", name: "Juliette Laurent" },
  { bot_id: "parisian_romantic_male", name: "Leo Moreau" },
  { bot_id: "parisian_romantic_female", name: "Clara Moreau" },
  { bot_id: "berlin_mentor_male", name: "Klaus Berger" },
  { bot_id: "berlin_mentor_female", name: "Ingrid Weber" },
  { bot_id: "berlin_friend_male", name: "Lars Muller" },
  { bot_id: "berlin_friend_female", name: "Lina Voigt" },
  { bot_id: "berlin_romantic_male", name: "Max Hoffman" },
  { bot_id: "berlin_romantic_female", name: "Lena Meyer" },
  { bot_id: "singapore_mentor_male", name: "Wei Ming Tan" },
  { bot_id: "singapore_mentor_female", name: "Li Ling Chen" },
  { bot_id: "singapore_friend_male", name: "Jun Kai Lim" },
  { bot_id: "singapore_friend_female", name: "Mei Yee Ong" },
  { bot_id: "singapore_romantic_male", name: "Darren Lee" },
  { bot_id: "singapore_romantic_female", name: "Rachel Tan" },
  { bot_id: "emirati_mentor_male", name: "Omar Al-Farsi" },
  { bot_id: "emirati_mentor_female", name: "Fatima Al-Mansoori" },
  { bot_id: "emirati_friend_male", name: "Saeed Al-Nuaimi" },
  { bot_id: "emirati_friend_female", name: "Aisha Al-Suwaidi" },
  { bot_id: "emirati_romantic_male", name: "Khalid Al-Mazrouei" },
  { bot_id: "emirati_romantic_female", name: "Layla Al-Qasimi" },
  { bot_id: "mexican_friend_male", name: "Sebastian Chavez" },
  { bot_id: "mexican_friend_female", name: "Mariana Garcia" },
  { bot_id: "mexican_mentor_male", name: "Alvaro Hernandez" },
  { bot_id: "mexican_mentor_female", name: "Carmen Martinez" },
  { bot_id: "mexican_romantic_male", name: "Gabriel Diaz" },
  { bot_id: "mexican_romantic_female", name: "Luciana Torres" },
  { bot_id: "srilankan_friend_male", name: "Dev" },
  { bot_id: "srilankan_friend_female", name: "Savi" },
  { bot_id: "srilankan_mentor_male", name: "Suren" },
  { bot_id: "srilankan_mentor_female", name: "Amma Lakshmi" },
  { bot_id: "srilankan_romantic_male", name: "Nalin" },
  { bot_id: "srilankan_romantic_female", name: "Aruni" },
  { bot_id: "Krishna", name: "Krishna" },
  { bot_id: "Rama", name: "Rama" },
  { bot_id: "Shiva", name: "Shiva" },
  { bot_id: "Trimurti", name: "Trimurti" },
  { bot_id: "Hanuman", name: "Hanuman" }
];

// =====================================
// ENHANCED BOT AVATAR COMPONENT - ULTRA SENSITIVE
// =====================================

const EnhancedBotAvatar = ({ audioLevel = 0, isListening, isSpeaking, isProcessing, botId }) => {
  const barCount = 36;

  const getBotAvatar = () => {
    const avatarMap = {
      'delhi_mentor_male': delhi_mentor_male?.default || delhi_mentor_male?.src || delhi_mentor_male,
      'delhi_mentor_female': delhi_mentor_female?.default || delhi_mentor_female?.src || delhi_mentor_female,
      'delhi_friend_male': delhi_friend_male?.default || delhi_friend_male?.src || delhi_friend_male,
      'delhi_friend_female': delhi_friend_female?.default || delhi_friend_female?.src || delhi_friend_female,
      'delhi_romantic_male': delhi_romantic_male?.default || delhi_romantic_male?.src || delhi_romantic_male,
      'delhi_romantic_female': delhi_romantic_female?.default || delhi_romantic_female?.src || delhi_romantic_female,
      'japanese_mentor_male': japanese_mentor_male?.default || japanese_mentor_male?.src || japanese_mentor_male,
      'japanese_mentor_female': japanese_mentor_female?.default || japanese_mentor_female?.src || japanese_mentor_female,
      'japanese_friend_male': japanese_friend_male?.default || japanese_friend_male?.src || japanese_friend_male,
      'japanese_friend_female': japanese_friend_female?.default || japanese_friend_female?.src || japanese_friend_female,
      'japanese_romantic_male': japanese_romantic_male?.default || japanese_romantic_male?.src || japanese_romantic_male,
      'japanese_romantic_female': japanese_romantic_female?.default || japanese_romantic_female?.src || japanese_romantic_female,
      'parisian_mentor_male': parisian_mentor_male?.default || parisian_mentor_male?.src || parisian_mentor_male,
      'parisian_mentor_female': parisian_mentor_female?.default || parisian_mentor_female?.src || parisian_mentor_female,
      'parisian_friend_male': parisian_friend_male?.default || parisian_friend_male?.src || parisian_friend_male,
      'parisian_friend_female': parisian_friend_female?.default || parisian_friend_female?.src || parisian_friend_female,
      'parisian_romantic_male': parisian_romantic_male?.default || parisian_romantic_male?.src || parisian_romantic_male,
      'parisian_romantic_female': parisian_romantic_female?.default || parisian_romantic_female?.src || parisian_romantic_female,
      'berlin_mentor_male': berlin_mentor_male?.default || berlin_mentor_male?.src || berlin_mentor_male,
      'berlin_mentor_female': berlin_mentor_female?.default || berlin_mentor_female?.src || berlin_mentor_female,
      'berlin_friend_male': berlin_friend_male?.default || berlin_friend_male?.src || berlin_friend_male,
      'berlin_friend_female': berlin_friend_female?.default || berlin_friend_female?.src || berlin_friend_female,
      'berlin_romantic_male': berlin_romantic_male?.default || berlin_romantic_male?.src || berlin_romantic_male,
      'berlin_romantic_female': berlin_romantic_female?.default || berlin_romantic_female?.src || berlin_romantic_female,
      'Krishna': lord_krishna?.default || lord_krishna?.src || lord_krishna,
      'Rama': rama_god?.default || rama_god?.src || rama_god,
      'Shiva': shiva_god?.default || shiva_god?.src || shiva_god,
      'Trimurti': trimurti?.default || trimurti?.src || trimurti,
      'Hanuman': hanuman_god?.default || hanuman_god?.src || hanuman_god,
      'singapore_mentor_male': singapore_mentor_male?.default || singapore_mentor_male?.src || singapore_mentor_male,
      'singapore_mentor_female': singapore_mentor_female?.default || singapore_mentor_female?.src || singapore_mentor_female,
      'singapore_friend_male': singapore_friend_male?.default || singapore_friend_male?.src || singapore_friend_male,
      'singapore_friend_female': singapore_friend_female?.default || singapore_friend_female?.src || singapore_friend_female,
      'singapore_romantic_male': singapore_romantic_male?.default || singapore_romantic_male?.src || singapore_romantic_male,
      'singapore_romantic_female': singapore_romantic_female?.default || singapore_romantic_female?.src || singapore_romantic_female,
      'emirati_mentor_male': emirati_mentor_male?.default || emirati_mentor_male?.src || emirati_mentor_male,
      'emirati_mentor_female': emirati_mentor_female?.default || emirati_mentor_female?.src || emirati_mentor_female,
      'emirati_friend_male': emirati_friend_male?.default || emirati_friend_male?.src || emirati_friend_male,
      'emirati_friend_female': emirati_friend_female?.default || emirati_friend_female?.src || emirati_friend_female,
      'emirati_romantic_male': emirati_romantic_male?.default || emirati_romantic_male?.src || emirati_romantic_male,
      'emirati_romantic_female': emirati_romantic_female?.default || emirati_romantic_female?.src || emirati_romantic_female,
      'mexican_friend_male': mexican_friend_male?.default || mexican_friend_male?.src || mexican_friend_male,
      'mexican_friend_female': mexican_friend_female?.default || mexican_friend_female?.src || mexican_friend_female,
      'mexican_mentor_male': mexican_mentor_male?.default || mexican_mentor_male?.src || mexican_mentor_male,
      'mexican_mentor_female': mexican_mentor_female?.default || mexican_mentor_female?.src || mexican_mentor_female,
      'mexican_romantic_male': mexican_romantic_male?.default || mexican_romantic_male?.src || mexican_romantic_male,
      'mexican_romantic_female': mexican_romantic_female?.default || mexican_romantic_female?.src || mexican_romantic_female,
      'srilankan_friend_male': srilankan_friend_male?.default || srilankan_friend_male?.src || srilankan_friend_male,
      'srilankan_friend_female': srilankan_friend_female?.default || srilankan_friend_female?.src || srilankan_friend_female,
      'srilankan_mentor_male': srilankan_mentor_male?.default || srilankan_mentor_male?.src || srilankan_mentor_male,
      'srilankan_mentor_female': srilankan_mentor_female?.default || srilankan_mentor_female?.src || srilankan_mentor_female,
      'srilankan_romantic_male': srilankan_romantic_male?.default || srilankan_romantic_male?.src || srilankan_romantic_male,
      'srilankan_romantic_female': srilankan_romantic_female?.default || srilankan_romantic_female?.src || srilankan_romantic_female,
    };
    
    return avatarMap[botId] || defaultAvatar;
  };

  const avatarSrc = getBotAvatar();
  const enhancedAudioLevel = Math.min(audioLevel * 50, 1);

  React.useEffect(() => {
    const debugInfo = {
      timestamp: Date.now(),
      rawAudioLevel: audioLevel.toFixed(4),
      enhancedLevel: enhancedAudioLevel.toFixed(4),
      isSpeaking,
      isProcessing,
      isListening,
      shouldShowGreen: isSpeaking,
      shouldShowBlue: enhancedAudioLevel > 0.001 && !isProcessing && !isSpeaking,
      greenCondition: `isSpeaking=${isSpeaking}`,
      blueCondition: `enhancedAudioLevel=${enhancedAudioLevel.toFixed(4)} > 0.001 && !isProcessing=${!isProcessing} && !isSpeaking=${!isSpeaking}`,
      visualState: isSpeaking ? 'GREEN_BARS' : 
                   (enhancedAudioLevel > 0.001 && !isProcessing && !isSpeaking) ? 'BLUE_BARS' : 'IDLE_BARS'
    };
    if (isSpeaking || enhancedAudioLevel > 0.001 || Math.random() < 0.1) {
      console.log('🎨 VISUAL STATE:', debugInfo);
    }
  }, [audioLevel, enhancedAudioLevel, isSpeaking, isProcessing, isListening]);

  return (
    <div className="relative flex items-center justify-center w-[500px] h-[500px]">
      <div className="relative flex items-center justify-center">
        <motion.div
          className="relative w-48 h-48 rounded-full overflow-hidden border-4 flex items-center justify-center z-20"
          style={{
            borderColor: isSpeaking 
              ? '#22c55e' 
              : isProcessing 
                ? '#f59e0b' 
                : enhancedAudioLevel > 0.001 && !isProcessing
                  ? '#3b82f6'
                  : '#e5e7eb',
            boxShadow: isSpeaking 
              ? '0 0 40px rgba(34, 197, 94, 0.7)'
              : isProcessing 
                ? '0 0 40px rgba(245, 158, 11, 0.7)'
                : enhancedAudioLevel > 0.001 && !isProcessing
                  ? '0 0 30px rgba(59, 130, 246, 0.6)'
                  : '0 0 20px rgba(0, 0, 0, 0.15)'
          }}
          animate={{
            scale: isSpeaking
              ? [1, 1.08, 1]
              : enhancedAudioLevel > 0.001 && !isProcessing
                ? [1, 1 + enhancedAudioLevel * 0.4, 1]
                : [1, 1.01, 1]
          }}
          transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <img src={avatarSrc} alt="Bot Avatar" className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="text-white/95 drop-shadow-2xl"
              animate={{ scale: [0.9, 1.3, 0.9], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            >
              {isListening && !isSpeaking && !isProcessing && enhancedAudioLevel > 0.001 && (
                <Activity className="w-12 h-12" />
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const VoiceCallUltra = ({ isOpen, onClose, onMessageReceived, audioContextRef: externalAudioContextRef, connectionQuality: externalConnectionQuality }) => {
  const { selectedBotId } = useBot();
  const { userDetails } = useUser();
  
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [responseStarted, setResponseStarted] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState(externalConnectionQuality || 'excellent');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [showAudioPrompt, setShowAudioPrompt] = useState(true);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(externalAudioContextRef?.current || null);
  const analyserRef = useRef(null);
  const audioChunksRef = useRef([]);
  const currentAudioRef = useRef(null);
  const silenceDetectionIntervalRef = useRef(null);
  const processAudioRef = useRef(null);
  const requestInProgress = useRef(false);
  const callEndedRef = useRef(false);
  
  const voiceActivityRef = useRef({
    isDetected: false,
    silenceTimer: null,
    isRecording: false
  });

  const botName = useMemo(() => {
    const bot = BOT_DETAILS.find(b => b.bot_id === selectedBotId);
    return bot ? bot.name : 'AI Assistant';
  }, [selectedBotId]);

  const enableAudioForBrowser = useCallback(async () => {
    try {
      if (externalAudioContextRef?.current) {
        audioContextRef.current = externalAudioContextRef.current;
      } else if (!audioContextRef.current) {
        const AudioContext = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
        if (AudioContext) {
          audioContextRef.current = new AudioContext(AUDIO_CONTEXT_CONFIG);
        }
      }
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current?.resume();
      }
      setAudioEnabled(true);
      setUserInteracted(true);
      setShowAudioPrompt(false);
      return true;
    } catch (error) {
      console.error('❌ ULTRA: Audio enable failed:', error);
      return false;
    }
  }, [externalAudioContextRef]);

  const playAudioResponse = useCallback(async (audioBase64) => {
    if (!audioBase64 || callEndedRef.current) return;
    const playbackStart = performance.now();
    try {
      if (!audioEnabled && !callEndedRef.current) {
        setAudioEnabled(true);
        setUserInteracted(true);
        setShowAudioPrompt(false);
      }
      if (callEndedRef.current) return;
      setIsSpeaking(true);
      
      const base64Data = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
      const audio = new Audio();
      audio.volume = 1.0;
      currentAudioRef.current = audio;
      
      return new Promise((resolve) => {
        let resolved = false;
        const resolveOnce = () => {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        };
        audio.addEventListener('canplaythrough', () => {
          if (!callEndedRef.current) audio.play().catch(console.error);
        }, { once: true });
        audio.addEventListener('ended', resolveOnce, { once: true });
        audio.addEventListener('error', resolveOnce, { once: true });
        setTimeout(resolveOnce, 5000);
        audio.src = `data:audio/wav;base64,${base64Data}`;
      });
    } catch (error) {
      if (!callEndedRef.current) console.error('❌ ULTRA-FAST: Playback failed:', error);
    } finally {
      setIsSpeaking(false);
      setAudioLevel(0);
      currentAudioRef.current = null;
    }
  }, [audioEnabled]);

  const processWithBackend = useCallback(async (audioBlob) => {
    if (requestInProgress.current || callEndedRef.current) return;
    requestInProgress.current = true;
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, `ultra_stream_${Date.now()}.webm`);
      formData.append('bot_id', selectedBotId || 'delhi_mentor_male');
      formData.append('email', userDetails?.email || 'test@example.com');
      formData.append('platform', 'web_voice_ultra_streaming');
      
      const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${BASE_URL}/voice-call-ultra-fast`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(25000),
      });
      
      if (!response.ok) throw new Error(`Backend error: ${response.status}`);
      const data = await response.json();
      
      if (data.xp_data && typeof window.updateXPFromResponse === 'function') {
        window.updateXPFromResponse(data.xp_data);
      }
      if (data.transcript) {
        onMessageReceived?.({
          text: data.transcript,
          sender: 'user',
          timestamp: new Date(),
          isVoiceMessage: true,
        });
      }
      if (data.text_response) {
        onMessageReceived?.({
          text: data.text_response,
          sender: 'bot',
          timestamp: new Date(),
          bot_id: selectedBotId,
          isVoiceMessage: true,
        });
        if (!callEndedRef.current && data.audio_base64) {
          playAudioResponse(data.audio_base64).catch(console.error);
        }
      }
    } catch (error) {
      setError(`Processing failed: ${error.message}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      requestInProgress.current = false;
      setIsProcessing(false);
      setResponseStarted(false);
    }
  }, [selectedBotId, userDetails, onMessageReceived, playAudioResponse]);

  const setupMicrophone = useCallback(async () => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1, sampleRate: 48000 }
      });
      streamRef.current = stream;

      const options = { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 32000 };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) options.mimeType = 'audio/webm';
      
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
      }
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

      try {
        const source = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 512;
        analyserRef.current.smoothingTimeConstant = 0.3;
        source.connect(analyserRef.current);
      } catch (analysisError) {
        console.error('❌ Audio analysis setup failed:', analysisError);
      }

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioChunksRef.current = [];
          if (processAudioRef.current && audioBlob.size > 1000) {
            await processAudioRef.current(audioBlob);
          }
        }
      };

      return true;
    } catch (error) {
      setError('Microphone access denied - please allow microphone permissions');
      setTimeout(() => setError(null), 5000);
      return false;
    }
  }, []);

  const startVoiceActivityDetection = useCallback(() => {
    const checkVoiceActivity = () => {
      if (!isCallActive || isMuted) return;
      if (analyserRef.current) {
        try {
          analyserRef.current.getByteFrequencyData(REUSABLE_FREQUENCY_BUFFER);
          let sum = 0, max = 0, activeFrequencies = 0;
          for (let i = 0; i < REUSABLE_FREQUENCY_BUFFER.length; i++) {
            const value = REUSABLE_FREQUENCY_BUFFER[i];
            sum += value;
            max = Math.max(max, value);
            if (value > 2) activeFrequencies++;
          }
          const average = sum / REUSABLE_FREQUENCY_BUFFER.length;
          const rawLevel = Math.max(average / 3, max / 8, activeFrequencies / 10);
          const amplifiedLevel = Math.min(Math.pow(rawLevel, 0.2) * 5, 1);
          setAudioLevel(amplifiedLevel);
          
          const voiceDetected = average > 5 || max > 15 || activeFrequencies > 8;
          if (voiceDetected && !isSpeaking && !isProcessing) {
            if (!voiceActivityRef.current.isDetected) {
              voiceActivityRef.current.isDetected = true;
              if (!voiceActivityRef.current.isRecording && mediaRecorderRef.current?.state === 'inactive') {
                try {
                  mediaRecorderRef.current.start();
                  voiceActivityRef.current.isRecording = true;
                } catch (startError) {}
              }
            }
            if (voiceActivityRef.current.silenceTimer) {
              clearTimeout(voiceActivityRef.current.silenceTimer);
              voiceActivityRef.current.silenceTimer = null;
            }
          } else if (voiceActivityRef.current.isDetected && !voiceDetected && !isSpeaking) {
            if (!voiceActivityRef.current.silenceTimer) {
              voiceActivityRef.current.silenceTimer = setTimeout(() => {
                voiceActivityRef.current.isDetected = false;
                if (voiceActivityRef.current.isRecording && mediaRecorderRef.current?.state === 'recording') {
                  try {
                    mediaRecorderRef.current.stop();
                    voiceActivityRef.current.isRecording = false;
                  } catch (stopError) {}
                }
              }, SILENCE_DURATION);
            }
          }
        } catch (error) { setAudioLevel(0.1); }
      } else { setAudioLevel(0.05); }
    };
    
    silenceDetectionIntervalRef.current = setInterval(checkVoiceActivity, CHECK_INTERVAL);
  }, [isCallActive, isSpeaking, isMuted, isProcessing, isListening]);

  const startCall = useCallback(async () => {
    try {
      callEndedRef.current = false;
      await enableAudioForBrowser();
      const micSetup = await setupMicrophone();
      if (!micSetup) return;
      processAudioRef.current = processWithBackend;
      setIsCallActive(true);
      setIsListening(true);
      startVoiceActivityDetection();
    } catch (error) {
      setError('Failed to start call');
      setTimeout(() => setError(null), 3000);
    }
  }, [enableAudioForBrowser, setupMicrophone, processWithBackend, startVoiceActivityDetection]);

  const endCall = useCallback(async () => {
    // 1. Log the end of the call to the backend first
    try {
      if (isCallActive) {
        const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        await fetch(`${BASE_URL}/api/chat/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bot_id: selectedBotId,
            user_id: userDetails?.user_id, // Or email if backend uses it
            content: "[VOICE_CALL_END]",
            role: "bot",
            activity_type: "VOICE_CALL_END"
          })
        });
      }
    } catch (e) {
      console.warn("Could not log end of call:", e);
    }

    callEndedRef.current = true;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    setIsCallActive(false);
    setIsListening(false);
    setIsSpeaking(false);
    setIsProcessing(false);
    setAudioLevel(0);
    setResponseStarted(false);
    
    if (silenceDetectionIntervalRef.current) {
      clearInterval(silenceDetectionIntervalRef.current);
      silenceDetectionIntervalRef.current = null;
    }
    if (voiceActivityRef.current.silenceTimer) {
      clearTimeout(voiceActivityRef.current.silenceTimer);
      voiceActivityRef.current.silenceTimer = null;
    }
    voiceActivityRef.current = { isDetected: false, silenceTimer: null, isRecording: false };
    
    if (mediaRecorderRef.current?.state === 'recording') {
      try { mediaRecorderRef.current.stop(); } catch (error) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    requestInProgress.current = false;
    onClose?.();
  }, [onClose, isCallActive, selectedBotId, userDetails]);

  useEffect(() => {
    if (isOpen && !isCallActive) startCall();
    return () => { if (isCallActive) endCall(); };
  }, [isOpen]);

  if (!isOpen) return null;

  const enhancedAudioLevel = Math.min(Math.pow(audioLevel * 3, 0.7), 1);

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: '#f8fafc' }}>
        <motion.div className="absolute top-6 w-full z-10 flex justify-center" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="text-center">
            <h1 className="text-gray-700 text-2xl font-bold tracking-wide">{botName}</h1>
            <div className="flex items-center justify-center mt-1 space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-xs text-gray-500">{connectionQuality} connection</span>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {(isProcessing || responseStarted) && (
            <motion.div className="absolute top-24 w-full z-10 flex justify-center" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex items-center space-x-3 px-5 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-xl">
                <div className="flex space-x-1">
                  {[...Array(3)].map((_, i) => (
                    <motion.div key={i} className="w-2 h-2 bg-white rounded-full" animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }} />
                  ))}
                </div>
                <span className="text-sm font-medium">{isProcessing ? 'Processing...' : 'Responding...'}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.8, type: "spring" }}>
            <EnhancedBotAvatar audioLevel={audioLevel} isListening={isListening && !isSpeaking} isSpeaking={isSpeaking} isProcessing={isProcessing} botId={selectedBotId} />
          </motion.div>
        </div>

        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2">
          <motion.div className="flex items-center space-x-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={async () => {
                if (mediaRecorderRef.current?.state === 'inactive') {
                  try {
                    mediaRecorderRef.current.start();
                    setTimeout(() => { if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop(); }, 3000);
                  } catch (error) {}
                }
              }}
              className="w-16 h-16 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition-all duration-200 shadow-lg"
              title="Test 3s Recording"
            >
              <Mic className="w-8 h-8" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all duration-200 shadow-lg"
            >
              <X className="w-7 h-7" />
            </motion.button>
          </motion.div>
        </div>

        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <motion.div className="flex items-center space-x-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
            <div className="w-40 h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full transition-colors duration-200 ${isSpeaking ? 'bg-green-500' : isProcessing ? 'bg-yellow-500' : enhancedAudioLevel > 0.02 ? 'bg-blue-500' : 'bg-gray-400'}`}
                style={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </motion.div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-red-500 text-white rounded-xl shadow-xl max-w-sm" initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.9 }}>
              <p className="text-sm text-center font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {showAudioPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-auto text-center shadow-xl">
              <h2 className="text-lg font-semibold mb-4">Enable Audio Playback</h2>
              <p className="text-sm text-gray-500 mb-6">To hear responses, please enable audio playback in your browser.</p>
              <button onClick={enableAudioForBrowser} className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200">
                Enable Audio
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default VoiceCallUltra;