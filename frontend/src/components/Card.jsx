export default function Card({
  title,
  value,
  subtitle,
  trend,
  progress,
  icon,
  tone = "from-[#6f1d2d] via-[#3B0D14] to-[#120709]",
  delay = 0,
}) {
  return (
    <div
      className="card-hover card-enter group relative overflow-hidden rounded-[30px] border border-[#dcc59d]/45 bg-[linear-gradient(160deg,rgba(255,250,241,0.82),rgba(244,232,212,0.76))] p-5 shadow-[0_26px_70px_rgba(59,13,20,0.12)] backdrop-blur-xl transition duration-300 dark:border-white/10 dark:bg-[linear-gradient(160deg,rgba(59,13,20,0.92),rgba(18,7,9,0.96))] dark:shadow-[0_24px_70px_rgba(0,0,0,0.34)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tone}`} />
      <div className={`absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br opacity-20 blur-2xl transition duration-500 group-hover:scale-125 ${tone}`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.15),transparent_30%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.12),transparent_28%)]" />

      <div className="relative mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#7e5b4a] dark:text-[#e7d8ba]/72">{title}</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#2f1618] dark:text-[#fff5e5]">
            {value}
          </h2>
        </div>

        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-semibold text-[#fff8e8] shadow-[0_12px_30px_rgba(59,13,20,0.24)] ring-1 ring-white/20 ${tone}`}>
          {icon}
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="relative mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-[#6f5145] dark:text-[#eadcc4]/74">{subtitle}</p>
          {trend && (
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              {trend}
            </span>
          )}
        </div>
      )}

      {typeof progress === "number" && (
        <div className="relative">
          <div className="mb-2 flex items-center justify-between text-xs text-[#7d6153] dark:text-[#e4d7c0]/70">
            <span>Goal progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#8B1E3F]/10 dark:bg-white/10">
            <div
              className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${tone}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
