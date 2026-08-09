// Target probability for adaptive question selection (70% target success rate)
const TARGET_SUCCESS_PROB = 0.7;
const K_FACTOR = 0.4;

/**
 * Calculate probability of correct answer based on student ability (theta) and difficulty
 */
export function probabilityCorrect(theta, difficulty) {
  return 1 / (1 + Math.exp(-(theta - difficulty)));
}

/**
 * Update student ability (theta) after an answer attempt
 */
export function updateTheta(theta, difficulty, wasCorrect) {
  const expected = probabilityCorrect(theta, difficulty);
  const actual = wasCorrect ? 1 : 0;
  const newTheta = theta + K_FACTOR * (actual - expected);
  return Math.max(-4, Math.min(4, newTheta));
}

// Export updateAbility alias so server.js can import it under either name
export const updateAbility = (theta, wasCorrect, difficulty) => {
  // Handles both parameter order conventions cleanly
  if (typeof wasCorrect === 'boolean') {
    return updateTheta(theta, difficulty, wasCorrect);
  }
  return updateTheta(theta, wasCorrect, difficulty);
};

/**
 * Pick the next best question from a bank for a given ability level.
 * Chooses the question whose difficulty makes P(correct) closest to target.
 */
export function selectNextQuestion(theta, questionBank = [], askedIds = new Set()) {
  const askedSet = askedIds instanceof Set ? askedIds : new Set(askedIds || []);

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

  // Fallback: If score calculation yields no best match, return the first available candidate
  if (!best && candidates.length > 0) {
    best = candidates[0];
  }

  return best;
}

/**
 * Categorize student mastery level based on theta
 */
export function masteryLevel(theta) {
  if (theta < -1.5) return "at-risk";
  if (theta < 0) return "needs-support";
  if (theta < 1.5) return "on-track";
  return "advanced";
}

/**
 * Detect if a student is struggling based on recent attempt patterns
 */
export function detectStrugglePattern(attempts = []) {
  if (attempts.length < 3) return false;
  const recent = attempts.slice(-3);
  return recent.every((a) => a.isCorrect === false);
}