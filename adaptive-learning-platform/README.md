# Pathshala — Personalized Adaptive Learning Platform
Hackathon track: **EdTech · IEMH4-ED-01**

A working starter build for the brief *"Bridge the Rural-Urban Education Gap"* —
an adaptive quiz engine that adjusts difficulty per student in real time, a
teacher dashboard that flags struggling students before exams, offline-first
support for low-connectivity classrooms, vernacular language + text-to-speech,
and lightweight gamification.

---

## 1. What the project actually has to do

Per the brief, the platform must:
1. **Adapt content difficulty to each student's level in real time**, not a one-size-fits-all curriculum.
2. **Work well on low-end devices and poor connectivity** — offline-first, not just "mobile-friendly."
3. **Support vernacular / regional languages** for younger and low-literacy learners.
4. **Give teachers a live dashboard** that flags struggling students *before* exams, not after.
5. **Gamify** the experience (streaks, badges) to improve engagement and reduce dropout.
6. Keep **cost per student near zero** — no expensive infra, works on cheap devices.

## 2. What this build actually does, end to end

- **Student side (`/quiz`)**: logs in with a roll number, gets one question at a
  time. Behind the scenes, an **IRT/Elo-style adaptive engine** (see
  `backend/lib/adaptiveEngine.js`) picks each next question so the student has
  roughly a 70% chance of success — hard enough to stretch them, not so hard
  they disengage. A "difficulty trail" visual shows the adaptive path in real
  time. Streaks and badges unlock as they answer correctly.
- **Offline mode**: the question bank is cached into **IndexedDB** on first
  load (via a service worker / PWA). If the device goes offline mid-quiz, the
  *same* adaptive algorithm runs locally in the browser
  (`frontend/src/lib/adaptiveEngine.js`), answers are queued, and everything
  auto-syncs to the server the moment connectivity returns (`/api/sync/attempts`).
- **Teacher side (`/teacher`)**: a live dashboard (auto-refreshes every 8s)
  showing each student's mastery level, accuracy, streak, and an **early-warning
  flag** for anyone who's gotten ≥60% of their last 5 questions wrong — plus a
  class-wide "weakest topics" chart, so a teacher can see a problem forming
  days before an exam instead of reading it off a report card.
- **Vernacular support**: every question ships with English / Hindi / Bengali
  text (easy to extend to more languages — see `backend/data/questions.json`),
  a language toggle, and a "🔊 Listen" button using the free, built-in browser
  **Web Speech API** for text-to-speech — no paid TTS service, keeping
  cost-per-student near zero.
- **Gamification**: streak counter + milestone badges (3/5/10 in a row),
  visible to both student and teacher.

### What's a stub vs. production-ready
This is a hackathon **starter**, built to be demo-able and extended, not a
finished product:
- The question bank (`backend/data/questions.json`) has 8 sample questions
  across 3 topics/difficulty bands — designed to be trivially extended;
  add more objects to the JSON array and everything else "just works."
- The database is a flat JSON file via `lowdb` (zero setup, runs anywhere) —
  swap for Postgres/Mongo before scaling past a classroom pilot.
- Auth is just a roll-number "login" with no password — fine for a demo,
  add real auth before any real deployment.
- Video/audio lesson delivery (compressed video for low bandwidth) is
  **not implemented** in this starter — TTS is implemented; if your team
  needs recorded video lessons, plug in an `<video>` element with adaptive
  bitrate (e.g. HLS.js) reading from cheap object storage — architecture
  is ready for it (add a `lessons` collection alongside `questions`).

---

## 3. Requirements & full tech stack

| Layer | Tech | Why |
|---|---|---|
| Frontend | **React 18** + **Vite** | Fast dev server, tiny bundle for low-end devices |
| Styling | **Tailwind CSS** | No heavy CSS framework; ships less CSS |
| Frontend routing | **React Router v6** | Student / Teacher / Home views |
| Offline | **vite-plugin-pwa** (service worker) + **IndexedDB** (`idb` library) | True offline-first, not just caching a static page |
| Charts | **Recharts** | Teacher dashboard's topic/weak-spot chart |
| Backend | **Node.js** + **Express** | Simple REST API, minimal ops burden |
| Backend "DB" | **lowdb** (JSON file) | Zero-cost persistence; swap for Postgres/Mongo later |
| IDs | **nanoid** | Attempt/id generation |
| Language | **JavaScript (ES Modules)** everywhere — frontend and backend | One language across the stack, easiest for a hackathon team to move fast in |

**You need installed on your machine:**
- **Node.js v18 or later** (v20 LTS recommended) — includes `npm`
- **VS Code** (or any editor) — recommended extensions: `ES7+ React/Redux/React-Native snippets`, `Tailwind CSS IntelliSense`, `Prettier`
- A modern browser (Chrome/Edge recommended for full PWA + offline testing)

Nothing else — no Docker, no external database server, no API keys required.

---

## 4. How to run it (start to finish)

### Step 1 — Install Node.js
Download the LTS installer from https://nodejs.org and install it (this also
installs `npm`). Verify in a terminal:
```bash
node -v   # should print v18.x or higher
npm -v
```

### Step 2 — Open the project in VS Code
```bash
code adaptive-learning-platform
```
(Or `File → Open Folder…` and pick the unzipped `adaptive-learning-platform` folder.)

### Step 3 — Install & run the backend
Open a terminal in VS Code (`` Ctrl+` ``):
```bash
cd backend
npm install
npm run dev
```
You should see: `✅ Adaptive Learning API running on http://localhost:4000`

### Step 4 — Install & run the frontend
Open a **second** terminal (`` Ctrl+Shift+` ``, or split the terminal):
```bash
cd frontend
npm install
npm run dev
```
Vite will print a local URL, typically **http://localhost:5173**.

### Step 5 — Use it
- Open **http://localhost:5173** → enter a name + roll number → start the quiz.
- Open **http://localhost:5173/teacher** in another tab to watch the live
  dashboard update as you (or classmates) answer questions.
- To test offline mode: open Chrome DevTools → **Network tab → set to
  "Offline"** mid-quiz. Keep answering — it keeps working, then flips back to
  "Online" and watch it auto-sync (or check the Network tab for the
  `/api/sync/attempts` call).

### Building for production (optional)
```bash
cd frontend
npm run build      # outputs static files to frontend/dist
npm run preview    # serve the production build locally to test the PWA
```
Deploy `frontend/dist` to any static host (Netlify, Vercel, GitHub Pages) and
the `backend` to any small Node host (Render, Railway, a school's own server) —
keeping true to the "near-zero cost per student" requirement.

---

## 5. Project structure
```
adaptive-learning-platform/
├── backend/
│   ├── server.js              # Express API (all routes)
│   ├── lib/adaptiveEngine.js  # IRT/Elo-style difficulty engine (core algorithm)
│   ├── data/questions.json    # Sample question bank (EN/HI/BN)
│   └── data/db.json           # Auto-created on first run (students + attempts)
├── frontend/
│   ├── src/
│   │   ├── pages/Home.jsx
│   │   ├── pages/StudentQuiz.jsx       # Adaptive quiz UI
│   │   ├── pages/TeacherDashboard.jsx  # Live analytics + early-warning
│   │   ├── components/ChalkTrail.jsx   # Difficulty-path visualization
│   │   ├── components/BadgeRow.jsx     # Gamification UI
│   │   ├── components/LanguageToggle.jsx
│   │   └── lib/
│   │       ├── adaptiveEngine.js  # Same algorithm, runs offline in-browser
│   │       ├── api.js             # Online/offline-aware API layer
│   │       ├── db.js              # IndexedDB wrapper (idb)
│   │       └── LanguageContext.jsx # Vernacular + Web Speech TTS
│   └── vite.config.js          # PWA / service worker config
└── README.md                   # you are here
```

## 6. Ideas for extending it for judging
- Add more questions/languages to `backend/data/questions.json` — no code changes needed.
- Swap `lowdb` for Postgres/Firebase once you need multiple concurrent classrooms.
- Add real auth (student/teacher accounts) if the demo needs it.
- Plug in compressed video lessons (see note in section 2).
- Add a parent-facing view of the same dashboard data, filtered to one student.
