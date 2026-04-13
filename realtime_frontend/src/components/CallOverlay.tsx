'use client';

import { motion } from 'framer-motion';
import { Phone, Video, Clock, X, Minimize2, Maximize2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface CallOverlayProps {
  partnerName: string;
  callType: 'audio' | 'video';
  elapsedTime: number;
  onEnd: () => void;
}

export default function CallOverlay({ partnerName, callType, elapsedTime, onEnd }: CallOverlayProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  const fmtTimer = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-28 right-4 z-50"
      >
        <motion.button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-green-500 text-white shadow-lg shadow-green-500/30"
          whileTap={{ scale: 0.95 }}
          animate={{ boxShadow: ['0 0 15px rgba(34,197,94,0.3)', '0 0 25px rgba(34,197,94,0.5)', '0 0 15px rgba(34,197,94,0.3)'] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          {callType === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
          <span className="text-xs font-medium">{fmtTimer(elapsedTime)}</span>
          <Maximize2 className="w-3 h-3" />
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="bg-green-500/95 backdrop-blur-sm text-white px-4 py-2.5 flex items-center gap-3 shadow-lg shadow-green-500/20">
        <motion.div
          className="w-2 h-2 rounded-full bg-white"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
        <div className="flex-1">
          <p className="text-xs font-medium flex items-center gap-1">
            {callType === 'video' ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
            {partnerName}
          </p>
          <p className="text-[10px] opacity-80 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> {fmtTimer(elapsedTime)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition"
          >
            <Minimize2 className="w-3 h-3" />
          </button>
          <button
            onClick={onEnd}
            className="p-1.5 rounded-full bg-red-500 hover:bg-red-600 transition shadow-sm"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
