// 🔧 COMPLETE OPTIMIZED ChatInterface with Browser Audio Compatibility
import React, { useState, useEffect, useCallback, useRef } from 'react';
import VoiceCallUltra from '@/components/VoiceCallUltra';

const ChatInterface = () => {
  const [isVoiceCallOpen, setIsVoiceCallOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const audioContextRef = useRef(null);

  // 🚀 CRITICAL FIX 1: User Interaction Handler for Audio
  const enableAudioForBrowser = useCallback(async () => {
    try {
      // Create and resume audio context (required for Chrome/Safari)
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('🎵 Audio context resumed for voice calls');
      }
      
      setAudioEnabled(true);
      setUserInteracted(true);
      
      return true;
    } catch (error) {
      console.error('Audio enable failed:', error);
      return false;
    }
  }, []);

  // 🚀 CRITICAL FIX 2: Auto-enable audio on any user interaction
  useEffect(() => {
    const handleUserInteraction = async (event) => {
      if (!userInteracted) {
        await enableAudioForBrowser();
        
        // Remove listeners after first interaction
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
      }
    };

    // Add interaction listeners
    document.addEventListener('click', handleUserInteraction, { passive: true });
    document.addEventListener('touchstart', handleUserInteraction, { passive: true });
    document.addEventListener('keydown', handleUserInteraction, { passive: true });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [userInteracted, enableAudioForBrowser]);

  // 🚀 OPTIMIZATION 1: Enhanced message handler with performance tracking
  const handleMessageReceived = useCallback((message) => {
    setMessages(prev => {
      // Limit messages to last 50 for performance
      const updated = [...prev, message];
      return updated.length > 50 ? updated.slice(-50) : updated;
    });
  }, []);

  // 🚀 OPTIMIZATION 2: Smart voice call starter with audio check
  const startVoiceCall = useCallback(async () => {
    try {
      // Ensure audio is enabled before starting voice call
      if (!audioEnabled) {
        const audioSuccess = await enableAudioForBrowser();
        if (!audioSuccess) {
          alert('Please allow audio access for voice calls to work properly.');
          return;
        }
      }

      // Check microphone permission
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Stop test stream
        setIsVoiceCallOpen(true);
      } catch (micError) {
        console.error('Microphone access denied:', micError);
        alert('Microphone access is required for voice calls. Please allow microphone access and try again.');
      }
    } catch (error) {
      console.error('Voice call start failed:', error);
      alert('Failed to start voice call. Please check your browser permissions.');
    }
  }, [audioEnabled, enableAudioForBrowser]);

  // 🚀 OPTIMIZATION 3: Enhanced close handler with cleanup
  const closeVoiceCall = useCallback(() => {
    setIsVoiceCallOpen(false);
    
    // Optional: Close audio context to free resources
    // Note: Don't close if you want to keep audio enabled for subsequent calls
    // if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
    //   audioContextRef.current.close();
    //   audioContextRef.current = null;
    //   setAudioEnabled(false);
    // }
  }, []);

  // 🚀 OPTIMIZATION 4: Connection quality indicator
  const [connectionQuality, setConnectionQuality] = useState('checking');

  useEffect(() => {
    // Test connection to your backend
    const testConnection = async () => {
      try {
        const start = performance.now();
        const response = await fetch(`${BASE_URL}/api/voice/call-ultra-fast`, {
          method: 'OPTIONS'
        });
        const latency = performance.now() - start;
        
        if (latency < 100) {
          setConnectionQuality('excellent');
        } else if (latency < 300) {
          setConnectionQuality('good');
        } else {
          setConnectionQuality('poor');
        }
      } catch {
        setConnectionQuality('poor');
      }
    };

    testConnection();
  }, []);

  return (
    <div className="relative">
      {/* Your existing chat UI */}
      
      {/* 🚀 ENHANCED: Audio Status Indicator */}
      {!audioEnabled && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded-lg">
          <p className="text-sm text-yellow-800">
            📢 For the best voice call experience, click anywhere to enable audio.
          </p>
        </div>
      )}

      {/* 🚀 ENHANCED: Connection Quality Indicator */}
      <div className="mb-2 flex items-center space-x-2 text-sm">
        <span>Connection:</span>
        <div className={`w-2 h-2 rounded-full ${
          connectionQuality === 'excellent' ? 'bg-green-500' :
          connectionQuality === 'good' ? 'bg-yellow-500' : 'bg-red-500'
        }`} />
        <span className="capitalize text-gray-600">{connectionQuality}</span>
      </div>

      {/* 🚀 ENHANCED: Smart Voice Call Button */}
      <button 
        onClick={startVoiceCall}
        disabled={!userInteracted}
        className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
          userInteracted && audioEnabled
            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg transform hover:scale-105'
            : 'bg-gray-400 text-gray-600 cursor-not-allowed'
        }`}
      >
        🎤 Start Ultra Voice Call
        {!userInteracted && (
          <span className="block text-xs mt-1">Click anywhere first</span>
        )}
        {connectionQuality === 'poor' && (
          <span className="block text-xs mt-1">⚠️ Slow connection detected</span>
        )}
      </button>

      {/* 🚀 ENHANCED: Performance Stats (Development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-gray-500">
          Messages: {messages.length} | Audio: {audioEnabled ? '✅' : '❌'} | 
          Connection: {connectionQuality}
        </div>
      )}

      {/* 🚀 OPTIMIZED: Ultra Voice Call Component */}
      <VoiceCallUltra
        isOpen={isVoiceCallOpen}
        onClose={closeVoiceCall}
        onMessageReceived={handleMessageReceived}
        messages={messages}
        // 🚀 NEW: Pass audio context for better performance
        audioContextRef={audioContextRef}
        // 🚀 NEW: Pass connection quality for smart optimizations
        connectionQuality={connectionQuality}
      />
    </div>
  );
};

export default ChatInterface;
