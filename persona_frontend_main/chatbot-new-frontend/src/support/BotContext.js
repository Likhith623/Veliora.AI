"use client";
import { createContext, useContext, useState, useEffect } from 'react';

const BotContext = createContext();

export function BotProvider({ children }) {
  const [selectedBotId, setSelectedBotId] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedBotId") || null;
    }
    return null;
  });

  useEffect(() => {
    if (typeof window !== "undefined" && selectedBotId) {
      localStorage.setItem("selectedBotId", selectedBotId);
    }
  }, [selectedBotId]);

  return (
    <BotContext.Provider value={{ selectedBotId, setSelectedBotId }}>
      {children}
    </BotContext.Provider>
  );
}

export function useBot() {
  return useContext(BotContext);
}
