"use client";
import { createContext, useContext, useState, useEffect } from 'react';

const TraitsContext = createContext({
    selectedTraits: [],
    setSelectedTraits: () => {},
    selectedLanguage: "English",
  setSelectedLanguage: () => {},
  });

export function TraitsProvider({ children }) {

  const [selectedTraits, setSelectedTraits] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedTraits = localStorage.getItem("botTraits");
        if (storedTraits) {
          const parsed = JSON.parse(storedTraits);
          if (Array.isArray(parsed)) {
            setSelectedTraits(parsed);
          }
        }
      } catch (error) {
        console.error("Error parsing botTraits from localStorage:", error);
      }
      
      const storedLang = localStorage.getItem("botLanguage");
      if (storedLang) {
        setSelectedLanguage(storedLang);
      }
      
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem("botTraits", JSON.stringify(selectedTraits));
    }
  }, [selectedTraits, isLoaded]);

  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem("botLanguage", selectedLanguage);
    }
  }, [selectedLanguage, isLoaded]);

  return (
    <TraitsContext.Provider value={{ selectedTraits, setSelectedTraits, selectedLanguage, setSelectedLanguage }}>
      {children}
    </TraitsContext.Provider>
  );
}

export function useTraits() {
  return useContext(TraitsContext);
}