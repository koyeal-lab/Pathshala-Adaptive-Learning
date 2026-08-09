import { createContext, useContext, useState } from "react";

const LanguageContext = createContext(null);

export const LANGUAGES = {
  en: { label: "English", speechCode: "en-IN" },
  hi: { label: "हिन्दी", speechCode: "hi-IN" },
  bn: { label: "বাংলা", speechCode: "bn-IN" },
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("en");
  return (
    <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/** Speaks text aloud in the currently selected language via the free browser Web Speech API
 *  — this is the "text-to-speech for regional-language interaction" requirement, with
 *  zero external API cost, which matters for near-zero-cost-per-student deployments. */
export function speak(text, langCode) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langCode;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
