interface ReadinessHeroProps {
  score: number              // 0–100
  verdict: string            // short sentence
  subtitle?: string
  date?: string              // e.g. "Today · Apr 21"
  pills?: { label: string; value: string; delta?: string }[]
}

export default function ReadinessHero({
  score,
  verdict,
  subtitle,
  date = 'Today',
  pills = [],
}: ReadinessHeroProps) {
  const r = 82
  const c = 2 * Math.PI * r
  const offset = c * (1 - score / 100)

  return (
    <div className="relative overflow-hidden rounded-[18px] bg-gray-900 border border-white/10 p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-cta/[0.08] via-cta/[0.02] to-transparent pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-[280px] h-[280px] rounded-full bg-cta/15 blur-3xl pointer-events-none" />

      <div className="relative grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-7 items-center">
        <div className="relative w-[200px] h-[200px] flex items-center justify-center mx-auto sm:mx-0">
          <svg className="-rotate-90" width={200} height={200} viewBox="0 0 200 200">
            <defs>
              <linearGradient id="mf-readiness-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#e8dc70" />
                <stop offset="100%" stopColor="#9A8B00" />
              </linearGradient>
            </defs>
            <circle cx={100} cy={100} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={14} />
            <circle
              cx={100}
              cy={100}
              r={r}
              fill="none"
              stroke="url(#mf-readiness-grad)"
              strokeWidth={14}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 800ms ease-out' }}
            />
          </svg>
          <div className="absolute text-center">
            <div className="text-[52px] font-extrabold tracking-tight text-gray-100 leading-none tabular-nums">
              {score}
            </div>
            <div className="text-[10px] text-cta uppercase tracking-[0.18em] font-semibold font-mono mt-1">
              Readiness
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="text-[13px] text-cta uppercase tracking-widest font-semibold font-mono">
            {date}
          </div>
          <div className="text-[26px] font-semibold leading-tight tracking-tight text-gray-100 max-w-sm">
            {verdict}
          </div>
          {subtitle && (
            <p className="text-sm text-gray-400 leading-relaxed max-w-md">{subtitle}</p>
          )}
          {pills.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-1">
              {pills.map((p, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] text-gray-300 font-medium"
                >
                  <span className="text-[10px] text-gray-500">{p.label}</span>
                  <span className="font-bold text-gray-100 tabular-nums">{p.value}</span>
                  {p.delta && (
                    <span
                      className={
                        p.delta.startsWith('+') ? 'text-green-400' : 'text-orange-400'
                      }
                    >
                      {p.delta}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
