/**
 * Adaptive Difficulty Engine
 * ---------------------------------
 * A lightweight Elo/IRT-inspired algorithm that adjusts question difficulty
 * to each student's estimated ability in real time — no heavy ML infra needed,
 * which matters for low-resource government-school deployments.
 *
 * Concept (simplified Item Response Theory):
 *   - Each student has an "ability" score (theta), starts at 0.
 *   - Each question has a "difficulty" score (b), from -3 (easiest) to +3 (hardest).
 *   - P(correct) = 1 / (1 + e^-(theta - b))   [logistic model]
 *   - After each answer, we nudge theta up/down (like Elo rating updates).
 *   - Next question is chosen to have P(correct) close to ~0.65-0.75
 *     (the "desirable difficulty" zone — hard enough to challenge, not so hard
 *     that the student disengages).
 */

const K_FACTOR = 0.4; // learning rate for ability updates
const TARGET_SUCCESS_PROB = 0.7;

export function probabilityCorrect(theta, difficulty) {
  return 1 / (1 + Math.exp(-(theta - difficulty)));
}

/**
 * Update a student's ability estimate after answering a question.
 * @param {number} theta - current ability estimate
 * @param {number} difficulty - difficulty of the question just answered
 * @param {boolean} wasCorrect
 * @returns {number} new theta
 */
export function updateAbility(theta, difficulty, wasCorrect) {
  const expected = probabilityCorrect(theta, difficulty);
  const actual = wasCorrect ? 1 : 0;
  const newTheta = theta + K_FACTOR * (actual - expected);
  // clamp to a reasonable range
  return Math.max(-4, Math.min(4, newTheta));
}

/**
 * Pick the next best question from a bank for a given ability level.
 * Chooses the question whose difficulty makes P(correct) closest to target.
 * @param {number} theta
 * @param {Array} questionBank - [{id, difficulty, topic, ...}]
 * @param {Set<string>} askedIds - ids already asked this session
 */
export function selectNextQuestion(theta, questionBank, askedIds = new Set()) {
  const candidates = questionBank.filter((q) => !askedIds.has(q.id));
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

/**
 * Classify a student's mastery level from ability score — used by the
 * teacher dashboard to flag struggling students early.
 */
export function masteryLevel(theta) {
  if (theta < -1.5) return "at-risk";
  if (theta < 0) return "needs-support";
  if (theta < 1.5) return "on-track";
  return "advanced";
}

/**
 * Detect a "struggling" pattern: repeated wrong answers or negative theta
 * trend over the last N attempts — used for the early-warning dashboard.
 */
export function detectStrugglePattern(attemptsHistory) {
  if (attemptsHistory.length < 3) return false;
  const last5 = attemptsHistory.slice(-5);
  const wrongCount = last5.filter((a) => !a.wasCorrect).length;
  return wrongCount / last5.length >= 0.6; // 60%+ wrong recently
}
