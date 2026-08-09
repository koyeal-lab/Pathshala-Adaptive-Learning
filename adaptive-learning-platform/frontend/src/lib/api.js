import {
  cacheQuestionBank,
  getCachedQuestionBank,
  queueAttempt,
  getPendingAttempts,
  clearSyncedAttempts,
  cacheStudent,
  getCachedStudent,
} from "./db";
import { selectNextQuestion, updateAbility, probabilityCorrect } from "./adaptiveEngine";

export const API_BASE = "https://pathshala-adaptive-learning.onrender.com/api";

async function tryFetch(url, options) {
  try {
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return null; // treated as "offline" by callers
  }
}

/** Login or create a student profile; caches locally for offline use. */
export async function studentLogin(studentId, name) {
  const online = await tryFetch(`${API_BASE}/student/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, name }),
  });
  if (online) {
    await cacheStudent(online);
    return { student: online, offline: false };
  }
  let cached = await getCachedStudent(studentId);
  if (!cached) {
    cached = { id: studentId, name: name || studentId, theta: 0, streak: 0, badges: [] };
    await cacheStudent(cached);
  }
  return { student: cached, offline: true };
}

/** Fetch (and cache) the full question bank once, so it's usable offline. */
export async function ensureQuestionBankCached() {
  const cached = await getCachedQuestionBank();
  if (cached.length > 0) return cached;
  const fresh = await tryFetch(`${API_BASE}/quiz/bank`);
  if (fresh) {
    await cacheQuestionBank(fresh);
    return fresh;
  }
  return [];
}

/** Get next question — tries server (keeps state authoritative), falls back to local engine. */
export async function getNextQuestion(studentId, askedIds, localTheta, localBank) {
  const online = await tryFetch(
    `${API_BASE}/quiz/next/${studentId}?askedIds=${[...askedIds].join(",")}`
  );
  if (online) return { ...online, offline: false };

  const q = selectNextQuestion(localTheta, localBank, askedIds);
  if (!q) return { done: true, offline: true };
  const { answerIndex, ...safeQuestion } = q;
  return {
    done: false,
    offline: true,
    question: safeQuestion,
    currentAbilityEstimate: Number(localTheta.toFixed(2)),
    predictedSuccessProbability: Number(probabilityCorrect(localTheta, q.difficulty).toFixed(2)),
  };
}

/** Submit an answer — online writes straight to server; offline queues + updates local ability. */
export async function submitAnswer({ studentId, questionId, selectedIndex, timeTakenSec, localBank, localTheta }) {
  const online = await tryFetch(`${API_BASE}/quiz/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, questionId, selectedIndex, timeTakenSec }),
  });
  if (online) return { ...online, offline: false };

  // Offline path: compute locally with the cached question bank + adaptive engine
  const question = localBank.find((q) => q.id === questionId);
  const wasCorrect = question ? selectedIndex === question.answerIndex : false;
  const newTheta = question ? updateAbility(localTheta, question.difficulty, wasCorrect) : localTheta;

  await queueAttempt({
    id: crypto.randomUUID(),
    studentId,
    questionId,
    selectedIndex,
    timeTakenSec,
    timestamp: new Date().toISOString(),
  });

  return {
    offline: true,
    wasCorrect,
    correctIndex: question?.answerIndex,
    newAbilityEstimate: Number(newTheta.toFixed(2)),
  };
}

/** Call on reconnect (or periodically) to flush queued offline attempts to the server. */
export async function syncPendingAttempts() {
  const pending = await getPendingAttempts();
  if (pending.length === 0) return { synced: 0, total: 0 };
  const result = await tryFetch(`${API_BASE}/sync/attempts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attempts: pending }),
  });
  if (result) {
    await clearSyncedAttempts(pending.map((a) => a.id));
    return result;
  }
  return { synced: 0, total: pending.length };
}
