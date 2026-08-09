import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { nanoid } from "nanoid";
import {
  probabilityCorrect,
  updateAbility,
  selectNextQuestion,
  masteryLevel,
  detectStrugglePattern,
} from "./lib/adaptiveEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" })); // 5mb to accept batched offline-sync payloads

// ---------- "Database" setup ----------
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFile = path.join(dataDir, "db.json");
if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, JSON.stringify({ students: {}, attempts: [] }, null, 2));
}

const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { students: {}, attempts: [] });

// Safe JSON loader for question bank
const questionsPath = path.join(__dirname, "data", "questions.json");
let questionBank = [];
if (fs.existsSync(questionsPath)) {
  questionBank = JSON.parse(fs.readFileSync(questionsPath, "utf-8"));
}

function getOrCreateStudent(studentId, name) {
  if (!db.data.students[studentId]) {
    db.data.students[studentId] = {
      id: studentId,
      name: name || studentId,
      theta: 0, // ability estimate
      streak: 0,
      badges: [],
      lastActive: new Date().toISOString(),
    };
  }
  return db.data.students[studentId];
}

// ---------- Routes ----------

// Get (or start) a student profile
app.post("/api/student/login", async (req, res) => {
  const { studentId, name } = req.body;
  if (!studentId) return res.status(400).json({ error: "studentId required" });
  const student = getOrCreateStudent(studentId, name);
  await db.write();
  res.json(student);
});

// Full question bank
app.get("/api/quiz/bank", (req, res) => {
  res.json(questionBank);
});

// Get the next adaptively-selected question for a student
app.get("/api/quiz/next/:studentId", async (req, res) => {
  const { studentId } = req.params;
  const { askedIds } = req.query; // comma-separated ids already asked this session
  const student = getOrCreateStudent(studentId);
  const asked = new Set((askedIds || "").split(",").filter(Boolean));

  const question = selectNextQuestion(student.theta, questionBank, asked);
  if (!question) {
    return res.json({ done: true, message: "Question bank exhausted for this session." });
  }

  const { answerIndex, ...safeQuestion } = question; // never leak the answer to client
  res.json({
    done: false,
    question: safeQuestion,
    currentAbilityEstimate: Number(student.theta.toFixed(2)),
    predictedSuccessProbability: Number(
      probabilityCorrect(student.theta, question.difficulty).toFixed(2)
    ),
  });
});

// Submit an answer -> updates ability, streak, badges, and logs the attempt
app.post("/api/quiz/answer", async (req, res) => {
  const { studentId, questionId, selectedIndex, timeTakenSec } = req.body;
  const student = getOrCreateStudent(studentId);
  const question = questionBank.find((q) => q.id === questionId);
  if (!question) return res.status(404).json({ error: "question not found" });

  const wasCorrect = selectedIndex === question.answerIndex;
  const oldTheta = student.theta;
  student.theta = updateAbility(student.theta, question.difficulty, wasCorrect);
  student.streak = wasCorrect ? student.streak + 1 : 0;
  student.lastActive = new Date().toISOString();

  // Simple gamification: badges unlocked at streak milestones
  const streakBadges = { 3: "🔥 3-Streak", 5: "⭐ 5-Streak", 10: "🏆 10-Streak" };
  if (streakBadges[student.streak] && !student.badges.includes(streakBadges[student.streak])) {
    student.badges.push(streakBadges[student.streak]);
  }

  const attempt = {
    id: nanoid(),
    studentId,
    questionId,
    topic: question.topic,
    difficulty: question.difficulty,
    wasCorrect,
    thetaBefore: oldTheta,
    thetaAfter: student.theta,
    timeTakenSec: timeTakenSec || null,
    timestamp: new Date().toISOString(),
  };
  db.data.attempts.push(attempt);
  await db.write();

  res.json({
    wasCorrect,
    correctIndex: question.answerIndex,
    newAbilityEstimate: Number(student.theta.toFixed(2)),
    streak: student.streak,
    newBadges: streakBadges[student.streak] ? [streakBadges[student.streak]] : [],
    masteryLevel: masteryLevel(student.theta),
  });
});

// Offline sync
app.post("/api/sync/attempts", async (req, res) => {
  const { attempts } = req.body;
  if (!Array.isArray(attempts)) return res.status(400).json({ error: "attempts[] required" });

  const existingIds = new Set(db.data.attempts.map((a) => a.id));
  let synced = 0;

  for (const local of attempts) {
    if (existingIds.has(local.id)) continue;
    const student = getOrCreateStudent(local.studentId);
    const question = questionBank.find((q) => q.id === local.questionId);
    if (!question) continue;

    const wasCorrect = local.selectedIndex === question.answerIndex;
    student.theta = updateAbility(student.theta, question.difficulty, wasCorrect);
    student.lastActive = local.timestamp || new Date().toISOString();

    db.data.attempts.push({
      id: local.id,
      studentId: local.studentId,
      questionId: local.questionId,
      topic: question.topic,
      difficulty: question.difficulty,
      wasCorrect,
      thetaAfter: student.theta,
      timeTakenSec: local.timeTakenSec || null,
      timestamp: local.timestamp || new Date().toISOString(),
      syncedLate: true,
    });
    synced++;
  }
  await db.write();
  res.json({ synced, total: attempts.length });
});

// Teacher Dashboard
app.get("/api/teacher/dashboard", async (req, res) => {
  const students = Object.values(db.data.students);
  const attempts = db.data.attempts;

  const roster = students.map((s) => {
    const studentAttempts = attempts.filter((a) => a.studentId === s.id);
    return {
      id: s.id,
      name: s.name,
      theta: Number(s.theta.toFixed(2)),
      mastery: masteryLevel(s.theta),
      streak: s.streak,
      badges: s.badges,
      totalAttempts: studentAttempts.length,
      accuracy: studentAttempts.length
        ? Number(
            (
              (studentAttempts.filter((a) => a.wasCorrect).length / studentAttempts.length) *
              100
            ).toFixed(1)
          )
        : null,
      isStruggling: detectStrugglePattern(studentAttempts),
      lastActive: s.lastActive,
    };
  });

  const topicStats = {};
  for (const a of attempts) {
    if (!topicStats[a.topic]) topicStats[a.topic] = { total: 0, correct: 0 };
    topicStats[a.topic].total++;
    if (a.wasCorrect) topicStats[a.topic].correct++;
  }
  const topicBreakdown = Object.entries(topicStats).map(([topic, s]) => ({
    topic,
    accuracy: Number(((s.correct / s.total) * 100).toFixed(1)),
    totalAttempts: s.total,
  }));

  res.json({
    roster,
    strugglingCount: roster.filter((r) => r.isStruggling).length,
    classAverageMastery: roster.length
      ? Number((roster.reduce((sum, r) => sum + r.theta, 0) / roster.length).toFixed(2))
      : 0,
    topicBreakdown,
  });
});

// Initialize LowDB safely before starting server listener
const PORT = process.env.PORT || 4000;
async function startServer() {
  await db.read();
  app.listen(PORT, () => console.log(`✅ Adaptive Learning API running on port ${PORT}`));
}

startServer();