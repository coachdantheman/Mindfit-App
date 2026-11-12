'use client'
import { useRef } from 'react'
import { haptic } from '@/lib/haptics'

interface Props {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  /** Words under the number for the low and high ends, e.g. "Rough" / "Great". */
  lowLabel?: string
  highLabel?: string
  size?: number
}

const SWEEP = 240
const START = -120

// A tick-marked arc for 1–10 style ratings. Drag along the arc, tap a spot,
// use − / +, or the arrow keys. Each step gives a haptic tick.
export default function Dial({ label, value, onChange, min = 1, max = 10, lowLabel, highLabel, size = 220 }: Props) {
  const ref = useRef<SVGSVGElement>(null)
  const c = size / 2
  const r = size * 0.38
  const steps = max - min
  const angleOf = (v: number) => START + ((v - min) / steps) * SWEEP
  const point = (deg: number, radius: number) => {
    const a = (deg * Math.PI) / 180
    return [c + radius * Math.sin(a), c - radius * Math.cos(a)] as const
  }

  const set = (v: number) => {
    const next = Math.max(min, Math.min(max, Math.round(v)))
    if (next === value) return
    haptic.tick()
    onChange(next)
  }

  const fromPointer = (e: React.PointerEvent) => {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    const dx = e.clientX - (box.left + box.width / 2)
    const dy = e.clientY - (box.top + (box.width / 2))
    let deg = (Math.atan2(dx, -dy) * 180) / Math.PI
    // Below the arc's open gap: snap to the nearer end.
    if (deg < START) deg = START
    if (deg > START + SWEEP) deg = START + SWEEP
    set(min + ((deg - START) / SWEEP) * steps)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); set(value + 1) }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); set(value - 1) }
    else if (e.key === 'Home') { e.preventDefault(); set(min) }
    else if (e.key === 'End') { e.preventDefault(); set(max) }
  }

  const arc = (from: number, to: number) => {
    const [x1, y1] = point(from, r)
    const [x2, y2] = point(to, r)
    return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`
  }
  const [kx, ky] = point(angleOf(value), r)
  const height = c + r * Math.cos((60 * Math.PI) / 180) + 22
  const btn = 'w-11 h-11 shrink-0 rounded-full bg-surface-2 border border-edge text-fg-2 text-lg hover:text-fg-1 active:scale-95 transition-transform'

  return (
    <div className="flex flex-col items-center select-none">
      <div className="relative" style={{ width: size, height }}>
        <svg
          ref={ref}
          width={size}
          height={height}
          viewBox={`0 0 ${size} ${height}`}
          className="touch-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-cta/50 rounded-2xl"
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          onKeyDown={onKeyDown}
          onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); fromPointer(e) }}
          onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e) }}
        >
          <path d={arc(START, START + SWEEP)} fill="none" stroke="var(--border-muted)" strokeWidth={10} strokeLinecap="round" />
          {value > min && <path d={arc(START, angleOf(value))} fill="none" stroke="var(--cta)" strokeWidth={10} strokeLinecap="round" />}
          {Array.from({ length: steps + 1 }, (_, i) => {
            const v = min + i
            const [x1, y1] = point(angleOf(v), r + 11)
            const [x2, y2] = point(angleOf(v), r + (v === value ? 20 : 16))
            return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke={v <= value ? 'var(--cta)' : 'var(--border)'} strokeWidth={v === value ? 3 : 2} strokeLinecap="round" />
          })}
          <circle cx={kx} cy={ky} r={11} fill="rgb(var(--surface))" stroke="var(--cta)" strokeWidth={3} />
        </svg>
        <div className="absolute inset-x-0 flex flex-col items-center pointer-events-none" style={{ top: c - 30 }}>
          <span key={value} className="mf-pop text-[44px] leading-none font-extrabold tracking-tight text-fg-1 tabular-nums">{value}</span>
          <span className="text-[11px] uppercase tracking-[0.16em] text-cta font-semibold mt-1">{label}</span>
        </div>
      </div>
      <div className="flex items-center justify-between w-full -mt-2" style={{ maxWidth: size }}>
        <button type="button" onClick={() => set(value - 1)} className={btn} aria-label={`Lower ${label}`}>−</button>
        <span className="text-xs text-fg-4">{value <= min + steps / 4 ? lowLabel : value >= max - steps / 4 ? highLabel : ''}</span>
        <button type="button" onClick={() => set(value + 1)} className={btn} aria-label={`Raise ${label}`}>+</button>
      </div>
    </div>
  )
}
