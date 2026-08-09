// The page's signature element: a hand-drawn chalk line tracing the
// student's difficulty journey through the session — climbing when they're
// mastering material, dipping when a question was chosen easier to rebuild
// confidence. It's the one visual on the page that actually encodes the
// adaptive algorithm at work, rather than decorating it.
export default function ChalkTrail({ history }) {
  const width = 320;
  const height = 90;
  const padding = 12;

  if (history.length < 2) {
    return (
      <div className="h-[90px] flex items-center text-chalk-bg/50 text-sm font-mono">
        Your difficulty trail will appear here as you answer…
      </div>
    );
  }

  const diffs = history.map((h) => h.difficulty);
  const min = Math.min(...diffs, -3);
  const max = Math.max(...diffs, 3);
  const range = max - min || 1;

  const points = history.map((h, i) => {
    const x = padding + (i / (history.length - 1)) * (width - padding * 2);
    const y = height - padding - ((h.difficulty - min) / range) * (height - padding * 2);
    return { x, y, correct: h.wasCorrect };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[90px]" aria-hidden="true">
      <path
        d={pathD}
        fill="none"
        stroke="#F4EFDD"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="1 5"
        opacity="0.9"
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="4"
          fill={p.correct ? "#C9A24B" : "#B4552F"}
          stroke="#FBF7EC"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}
