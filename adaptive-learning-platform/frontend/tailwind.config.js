/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        chalk: {
          bg: "#FBF7EC",      // paper cream
          board: "#2E5339",   // blackboard green
          boardDark: "#1E3A26",
          slate: "#3D3229",   // ink/slate brown-black
          accent: "#C9A24B",  // brass/marigold — nods to school-bell brass, not templated terracotta
          accentSoft: "#E9DBB3",
          rust: "#B4552F",
          line: "#D8CFB8",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      backgroundImage: {
        chalkboard: "linear-gradient(160deg, #2E5339 0%, #1E3A26 100%)",
      },
    },
  },
  plugins: [],
};
