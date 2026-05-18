import React, { createContext, useContext, useState, useEffect } from "react";

interface StudioContextType {
  text: string;
  setText: (text: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  voice: string;
  setVoice: (voice: string) => void;
  emotion: string;
  setEmotion: (emotion: string) => void;
  speed: number;
  setSpeed: (speed: number) => void;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [text, setText] = useState(() => localStorage.getItem("auditextText") || "");
  const [language, setLanguage] = useState(() => localStorage.getItem("auditextLanguage") || "English");
  const [voice, setVoice] = useState(() => localStorage.getItem("auditextVoice") || "nova");
  const [emotion, setEmotion] = useState(() => localStorage.getItem("auditextEmotion") || "neutral");
  const [speed, setSpeed] = useState(() => parseFloat(localStorage.getItem("auditextSpeed") || "1.0"));

  useEffect(() => {
    localStorage.setItem("auditextText", text);
    localStorage.setItem("auditextLanguage", language);
    localStorage.setItem("auditextVoice", voice);
    localStorage.setItem("auditextEmotion", emotion);
    localStorage.setItem("auditextSpeed", speed.toString());
  }, [text, language, voice, emotion, speed]);

  return (
    <StudioContext.Provider value={{ text, setText, language, setLanguage, voice, setVoice, emotion, setEmotion, speed, setSpeed }}>
      {children}
    </StudioContext.Provider>
  );
}

export const useStudio = () => {
  const context = useContext(StudioContext);
  if (!context) throw new Error("useStudio must be used within a StudioProvider");
  return context;
};
