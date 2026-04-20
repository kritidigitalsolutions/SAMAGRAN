export default function Card({
  title,
  value,
  subtitle,
  trend,
  progress,
  icon,
  tone = "from-[var(--admin-primary)] to-[var(--admin-primary-strong)]",
  delay = 0,
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[var(--admin-shadow)] transition duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${tone}`} />

      <div className="relative mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--admin-muted)]">{title}</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--admin-text)]">
            {value}
          </h2>
        </div>

        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-semibold text-white ${tone}`}>
          {icon}
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="relative mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--admin-muted)]">{subtitle}</p>
          {trend && (
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
              {trend}
            </span>
          )}
        </div>
      )}

      {typeof progress === "number" && (
        <div className="relative">
          <div className="mb-2 flex items-center justify-between text-xs text-[var(--admin-muted)]">
            <span>Goal progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#ca1755]/10">
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
