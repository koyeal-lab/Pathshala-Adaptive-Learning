import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  studentLogin,
  ensureQuestionBankCached,
  getNextQuestion,
  submitAnswer,
  syncPendingAttempts,
} from "../lib/api";
import { useLanguage, speak, LANGUAGES } from "../lib/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import BadgeRow from "../components/BadgeRow";
import ChalkTrail from "../components/ChalkTrail";

export default function StudentQuiz() {
  const [params] = useSearchParams();
  const studentId = params.get("id") || "guest";
  const name = params.get("name") || studentId;
  const { lang } = useLanguage();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [student, setStudent] = useState(null);
  const [localBank, setLocalBank] = useState([]);
  const [question, setQuestion] = useState(null);
  const [meta, setMeta] = useState({}); // { currentAbilityEstimate, predictedSuccessProbability }
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null); // { wasCorrect, correctIndex, ... }
  const [askedIds, setAskedIds] = useState(new Set());
  const [history, setHistory] = useState([]); // difficulty trail
  const [loading, setLoading] = useState(true);
  const questionStartRef = useRef(Date.now());

  // Connectivity + background sync
  useEffect(() => {
    function goOnline() {
      setIsOnline(true);
      syncPendingAttempts();
    }
    function goOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    const interval = setInterval(() => {
      if (navigator.onLine) syncPendingAttempts();
    }, 15000);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      clearInterval(interval);
    };
  }, []);

  // Initial load: login, cache bank, get first question
  useEffect(() => {
    (async () => {
      const bank = await ensureQuestionBankCached();
      setLocalBank(bank);
      const { student: s } = await studentLogin(studentId, name);
      setStudent(s);
      await loadNextQuestion(s.theta, new Set(), bank);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadNextQuestion(theta, asked, bank) {
    const res = await getNextQuestion(studentId, asked, theta, bank);
    if (res.done) {
      setQuestion(null);
      return;
    }
    setQuestion(res.question);
    setMeta({
      currentAbilityEstimate: res.currentAbilityEstimate,
      predictedSuccessProbability: res.predictedSuccessProbability,
    });
    setSelected(null);
    setFeedback(null);
    questionStartRef.current = Date.now();
  }

  async function handleAnswer(index) {
    if (feedback) return; // already answered this one
    setSelected(index);
    const timeTakenSec = Math.round((Date.now() - questionStartRef.current) / 1000);
    const res = await submitAnswer({
      studentId,
      questionId: question.id,
      selectedIndex: index,
      timeTakenSec,
      localBank,
      localTheta: student.theta,
    });
    setFeedback(res);
    setHistory((h) => [...h, { difficulty: question.difficulty, wasCorrect: res.wasCorrect }]);

    setStudent((s) => ({
      ...s,
      theta: res.newAbilityEstimate,
      streak: res.streak ?? (res.wasCorrect ? s.streak + 1 : 0),
      badges: res.newBadges?.length ? [...s.badges, ...res.newBadges] : s.badges,
    }));
  }

  async function handleNext() {
    const nextAsked = new Set([...askedIds, question.id]);
    setAskedIds(nextAsked);
    await loadNextQuestion(student.theta, nextAsked, localBank);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-chalk-slate/60">Loading lesson…</div>;
  }

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
      {!isOnline && (
        <div className="bg-chalk-rust/10 border border-chalk-rust/30 text-chalk-rust text-sm rounded-lg px-4 py-2 mb-4 font-medium">
          📴 Offline — your progress is saving on this device and will sync automatically once you're back online.
        </div>
      )}

      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-xl">{name}'s Lesson</h1>
          <p className="text-sm text-chalk-slate/60 font-mono">
            Ability estimate: {student.theta.toFixed(2)} · Level: {levelLabel(student.theta)}
          </p>
        </div>
        <LanguageToggle />
      </header>

      {/* Signature chalk trail visualizing the adaptive path */}
      <div className="bg-chalkboard rounded-2xl px-5 pt-4 pb-1 mb-6">
        <p className="text-chalk-bg/70 text-xs font-mono uppercase tracking-wider mb-1">Your difficulty trail</p>
        <ChalkTrail history={history} />
      </div>

      <div className="mb-6">
        <BadgeRow badges={student.badges} streak={student.streak} />
      </div>

      {question ? (
        <div className="bg-white rounded-2xl border border-chalk-line p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase tracking-wide text-chalk-slate/50">
              {question.topic}
            </span>
            <button
              onClick={() => speak(question.text[lang], LANGUAGES[lang].speechCode)}
              className="text-sm text-chalk-slate/60 hover:text-chalk-board flex items-center gap-1"
              aria-label="Read question aloud"
            >
              🔊 Listen
            </button>
          </div>
          <h2 className="text-lg font-semibold mb-5">{question.text[lang]}</h2>

          <div className="space-y-2.5">
            {question.options[lang].map((opt, i) => {
              const isSelected = selected === i;
              const isCorrectAnswer = feedback && i === feedback.correctIndex;
              const showWrong = feedback && isSelected && !feedback.wasCorrect;
              return (
                <button
                  key={i}
                  disabled={!!feedback}
                  onClick={() => handleAnswer(i)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors font-medium
                    ${isCorrectAnswer ? "bg-green-50 border-green-400 text-green-800" : ""}
                    ${showWrong ? "bg-chalk-rust/10 border-chalk-rust/40 text-chalk-rust" : ""}
                    ${!feedback ? "border-chalk-line hover:border-chalk-accent hover:bg-chalk-accentSoft/30" : ""}
                    ${!feedback && isSelected ? "border-chalk-accent bg-chalk-accentSoft/30" : ""}
                  `}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {feedback && (
            <div className="mt-5 flex items-center justify-between">
              <p className={`font-semibold ${feedback.wasCorrect ? "text-green-700" : "text-chalk-rust"}`}>
                {feedback.wasCorrect ? "✓ Correct — nice work!" : "✗ Not quite — you'll see this topic again soon."}
              </p>
              <button
                onClick={handleNext}
                className="bg-chalk-board text-chalk-bg font-semibold px-5 py-2 rounded-lg hover:bg-chalk-boardDark"
              >
                Next question →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-chalk-line p-8 text-center">
          <p className="text-lg font-semibold mb-1">🎉 Lesson complete for now!</p>
          <p className="text-chalk-slate/60 text-sm">Come back later for more questions matched to your level.</p>
        </div>
      )}
    </div>
  );
}

function levelLabel(theta) {
  if (theta < -1.5) return "Building foundations";
  if (theta < 0) return "Needs support";
  if (theta < 1.5) return "On track";
  return "Advanced";
}
