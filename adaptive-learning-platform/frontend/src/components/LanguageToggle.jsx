import { LANGUAGES, useLanguage } from "../lib/LanguageContext";

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <div className="inline-flex rounded-full border border-chalk-line bg-white/60 p-1 text-sm font-medium">
      {Object.entries(LANGUAGES).map(([code, meta]) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={`px-3 py-1 rounded-full transition-colors ${
            lang === code ? "bg-chalk-board text-chalk-bg" : "text-chalk-slate/70 hover:text-chalk-slate"
          }`}
        >
          {meta.label}
        </button>
      ))}
    </div>
  );
}
