import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { API_BASE } from "../lib/api";

const MASTERY_COLOR = {
  "at-risk": "#B4552F",
  "needs-support": "#C9A24B",
  "on-track": "#5C8A6E",
  "advanced": "#2E5339",
};

export default function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/teacher/dashboard`);
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError(true);
      }
    }
    load();
    const interval = setInterval(load, 8000); // near-real-time refresh
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <p className="font-semibold text-chalk-rust mb-1">Can't reach the server.</p>
          <p className="text-sm text-chalk-slate/60">
            Start the backend (`npm run dev` in /backend) and refresh this page.
          </p>
        </div>
      </div>
    );
  }
  if (!data) {
    return <div className="min-h-screen flex items-center justify-center text-chalk-slate/60">Loading class data…</div>;
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <div className="inline-block bg-chalk-board text-chalk-bg text-xs tracking-widest font-mono uppercase px-3 py-1 rounded-full mb-3">
          Teacher View
        </div>
        <h1 className="text-3xl font-bold">Class Dashboard</h1>
        <p className="text-chalk-slate/60">Live view of who's struggling — before exams, not after.</p>
      </header>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Students tracked" value={data.roster.length} />
        <StatCard label="Flagged at-risk" value={data.strugglingCount} accent={data.strugglingCount > 0} />
        <StatCard label="Class avg. ability" value={data.classAverageMastery} />
      </div>

      <section className="bg-white rounded-2xl border border-chalk-line p-6 mb-8">
        <h2 className="font-display font-semibold text-lg mb-4">Topic-wise weak spots</h2>
        {data.topicBreakdown.length === 0 ? (
          <p className="text-sm text-chalk-slate/50">No attempts logged yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.topicBreakdown} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#D8CFB8" />
              <XAxis type="number" domain={[0, 100]} unit="%" stroke="#3D3229" fontSize={12} />
              <YAxis type="category" dataKey="topic" width={140} stroke="#3D3229" fontSize={12} />
              <Tooltip formatter={(v) => `${v}% correct`} />
              <Bar dataKey="accuracy" radius={[0, 6, 6, 0]}>
                {data.topicBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.accuracy < 50 ? "#B4552F" : "#2E5339"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-chalk-line overflow-hidden">
        <h2 className="font-display font-semibold text-lg p-6 pb-4">Student roster</h2>
        <table className="w-full text-sm">
          <thead className="bg-chalk-bg text-chalk-slate/60 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-6 py-2 font-medium">Student</th>
              <th className="text-left px-6 py-2 font-medium">Mastery</th>
              <th className="text-left px-6 py-2 font-medium">Accuracy</th>
              <th className="text-left px-6 py-2 font-medium">Streak</th>
              <th className="text-left px-6 py-2 font-medium">Badges</th>
              <th className="text-left px-6 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.roster.map((s) => (
              <tr key={s.id} className="border-t border-chalk-line/60">
                <td className="px-6 py-3 font-medium">{s.name}</td>
                <td className="px-6 py-3">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: MASTERY_COLOR[s.mastery] }}
                  >
                    {s.mastery}
                  </span>
                </td>
                <td className="px-6 py-3">{s.accuracy != null ? `${s.accuracy}%` : "—"}</td>
                <td className="px-6 py-3">{s.streak}</td>
                <td className="px-6 py-3">{s.badges.join(" ") || "—"}</td>
                <td className="px-6 py-3">
                  {s.isStruggling ? (
                    <span className="text-chalk-rust font-semibold">⚠ Needs attention</span>
                  ) : (
                    <span className="text-chalk-slate/40">OK</span>
                  )}
                </td>
              </tr>
            ))}
            {data.roster.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-center text-chalk-slate/40">
                  No students have logged in yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "border-chalk-rust/40 bg-chalk-rust/5" : "border-chalk-line bg-white"}`}>
      <p className="text-xs uppercase tracking-wide text-chalk-slate/50 mb-1">{label}</p>
      <p className={`text-3xl font-display font-bold ${accent ? "text-chalk-rust" : "text-chalk-slate"}`}>{value}</p>
    </div>
  );
}
