// Mirrors backend/lib/adaptiveEngine.js so the quiz can keep adapting
// difficulty locally when the device is offline. Kept deliberately tiny —
// this is the whole point of the "runs on low-end devices" requirement.

const K_FACTOR = 0.4;
const TARGET_SUCCESS_PROB = 0.7;

export function probabilityCorrect(theta, difficulty) {
  return 1 / (1 + Math.exp(-(theta - difficulty)));
}

export function updateAbility(theta, difficulty, wasCorrect) {
  const expected = probabilityCorrect(theta, difficulty);
  const actual = wasCorrect ? 1 : 0;
  const newTheta = theta + K_FACTOR * (actual - expected);
  return Math.max(-4, Math.min(4, newTheta));
}

export function selectNextQuestion(theta, questionBank, askedIds = new Set()) {
  // Ensure askedIds is handled safely even if passed as an array or null
  const askedSet = askedIds instanceof Set ? askedIds : new Set(askedIds || []);

  // Filter candidates matching both string and number representations of q.id
  const candidates = questionBank.filter(
    (q) => !askedSet.has(q.id) && !askedSet.has(String(q.id)) && !askedSet.has(Number(q.id))
  );

  if (candidates.length === 0) return null;

  let best = null;
  let bestScore = Infinity;

  for (const q of candidates) {
    const p = probabilityCorrect(theta, q.difficulty);
    const score = Math.abs(p - TARGET_SUCCESS_PROB);
    if (score < bestScore) {
      bestScore = score;
      best = q;
    }
  }

  return best;
}

export function masteryLevel(theta) {
  if (theta < -1.5) return "at-risk";
  if (theta < 0) return "needs-support";
  if (theta < 1.5) return "on-track";
  return "advanced";
}