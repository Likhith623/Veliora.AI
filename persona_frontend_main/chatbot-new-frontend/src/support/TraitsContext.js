"use client";
import { createContext, useContext, useState, useEffect } from 'react';

const TraitsContext = createContext({
    selectedTraits: [],
    setSelectedTraits: () => {},
    selectedLanguage: "English",
  setSelectedLanguage: () => {},
  });

export function TraitsProvider({ children }) {

  const [selectedTraits, setSelectedTraits] = useState(() => {
    if (typeof window !== "undefined") {
      const storedTraits = localStorage.getItem("botTraits");
      return storedTraits ? JSON.parse(storedTraits) : ["Curious", "Open Minded"];
    }
    return ["Curious", "Open Minded"];
  });

  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("botLanguage") || "English";
    }
    return "English";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("botTraits", JSON.stringify(selectedTraits));
    }
  }, [selectedTraits]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("botLanguage", selectedLanguage);
    }
  }, [selectedLanguage]);

  return (
    <TraitsContext.Provider value={{ selectedTraits, setSelectedTraits, selectedLanguage, setSelectedLanguage }}>
      {children}
    </TraitsContext.Provider>
  );
}

export function useTraits() {
  return useContext(TraitsContext);
}