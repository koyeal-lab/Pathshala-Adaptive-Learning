import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const navigate = useNavigate();

  function startQuiz(e) {
    e.preventDefault();
    if (!studentId.trim()) return;
    navigate(`/quiz?id=${encodeURIComponent(studentId)}&name=${encodeURIComponent(name)}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="mb-8 text-center">
          <div className="inline-block bg-chalk-board text-chalk-bg text-xs tracking-widest font-mono uppercase px-3 py-1 rounded-full mb-4">
            IEMH4-ED-01 · Adaptive Learning
          </div>
          <h1 className="text-4xl font-bold text-chalk-slate mb-2">Pathshala</h1>
          <p className="text-chalk-slate/70">
            One classroom, every pace. Adaptive lessons that work on any device — online or off.
          </p>
        </div>

        <form
          onSubmit={startQuiz}
          className="bg-white rounded-2xl border border-chalk-line p-6 shadow-sm space-y-4"
        >
          <h2 className="font-display font-semibold text-lg">Start learning</h2>
          <div>
            <label className="text-sm font-medium text-chalk-slate/80">Your name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Riya"
              className="mt-1 w-full rounded-lg border border-chalk-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-chalk-accent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-chalk-slate/80">Student ID / Roll No.</label>
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g. 7A-14"
              required
              className="mt-1 w-full rounded-lg border border-chalk-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-chalk-accent"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-chalk-board text-chalk-bg font-semibold rounded-lg py-2.5 hover:bg-chalk-boardDark transition-colors"
          >
            Start today's lesson →
          </button>
        </form>

        <div className="text-center mt-4">
          <a href="/teacher" className="text-sm text-chalk-slate/60 underline hover:text-chalk-slate">
            I'm a teacher — view class dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
