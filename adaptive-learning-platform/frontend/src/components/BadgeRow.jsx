export default function BadgeRow({ badges, streak }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 bg-chalk-accentSoft text-chalk-slate px-3 py-1 rounded-full text-sm font-semibold font-mono">
        🔥 Streak: {streak}
      </div>
      {badges.map((b, i) => (
        <div
          key={i}
          className="bg-white border border-chalk-line px-3 py-1 rounded-full text-sm font-medium"
        >
          {b}
        </div>
      ))}
      {badges.length === 0 && (
        <span className="text-sm text-chalk-slate/50">Answer well to earn your first badge!</span>
      )}
    </div>
  );
}
