import { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  unit?: string
  delta?: { value: string; direction: 'up' | 'down' | 'flat' }
  context?: string
  icon?: ReactNode
  /** Sparkline points normalized 0..1 */
  sparkline?: number[]
  /** Hex for sparkline stroke; defaults to gold */
  color?: string
}

export default function StatCard({
  label,
  value,
  unit,
  delta,
  context,
  icon,
  sparkline,
  color = '#C4B400',
}: StatCardProps) {
  return (
    <div className="bg-gray-900 border border-white/10 rounded-2xl p-4 transition-colors hover:border-white/20">
      <div className="flex items-center justify-between text-gray-500 mb-2.5">
        <span className="text-[11px] uppercase tracking-wider font-semibold font-mono">
          {label}
        </span>
        {icon && <span className="w-3.5 h-3.5">{icon}</span>}
      </div>
      <div className="leading-none">
        <span className="text-[30px] font-bold tracking-tight text-gray-100 tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-sm font-medium text-gray-400 ml-0.5">{unit}</span>
        )}
      </div>
      <div className="flex items-center justify-between mt-2.5">
        {delta && (
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums ${
              delta.direction === 'up'
                ? 'bg-green-500/10 text-green-400'
                : delta.direction === 'down'
                ? 'bg-orange-500/10 text-orange-400'
                : 'bg-white/5 text-gray-400'
            }`}
          >
            {delta.direction === 'up' ? '▲' : delta.direction === 'down' ? '▼' : '—'}{' '}
            {delta.value}
          </span>
        )}
        {sparkline && sparkline.length > 1 && (
          <Sparkline points={sparkline} color={color} />
        )}
      </div>
      {context && <p className="text-[10.5px] text-gray-500 mt-1.5">{context}</p>}
    </div>
  )
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
  const w = 90
  const h = 32
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w
    const y = h - Math.max(0, Math.min(1, p)) * (h - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth={1.8} points={coords.join(' ')} />
    </svg>
  )
}
