'use client'
import { useEffect, useRef } from 'react'
import { haptic } from '@/lib/haptics'

interface Props {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  /** Shown after the number, e.g. "hr", "lb". */
  unit?: string
  format?: (v: number) => string
}

// Big − / + with the number between. Hold a button to keep going.
export default function Stepper({ label, value, onChange, min, max, step = 1, unit, format }: Props) {
  const latest = useRef(value)
  latest.current = value
  const timers = useRef<{ wait?: ReturnType<typeof setTimeout>; repeat?: ReturnType<typeof setInterval> }>({})

  const bump = (dir: 1 | -1) => {
    const next = Math.max(min, Math.min(max, Math.round((latest.current + dir * step) / step) * step))
    if (next === latest.current) return
    latest.current = next
    haptic.tick()
    onChange(Number(next.toFixed(4)))
  }
  const stop = () => {
    clearTimeout(timers.current.wait)
    clearInterval(timers.current.repeat)
  }
  const start = (dir: 1 | -1) => {
    stop()
    bump(dir)
    timers.current.wait = setTimeout(() => { timers.current.repeat = setInterval(() => bump(dir), 90) }, 380)
  }
  useEffect(() => stop, [])

  const btn = 'w-12 h-12 shrink-0 rounded-full bg-surface-2 border border-edge text-fg-2 text-xl hover:text-fg-1 active:scale-95 transition-transform touch-none select-none disabled:opacity-40'
  const hold = (dir: 1 | -1) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); start(dir) },
    onPointerUp: stop, onPointerLeave: stop, onPointerCancel: stop,
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bump(dir) } },
  })

  return (
    <div className="flex items-center justify-between gap-4" role="group" aria-label={label}>
      <button type="button" {...hold(-1)} disabled={value <= min} className={btn} aria-label={`Less ${label}`}>−</button>
      <div className="text-center min-w-0" aria-live="polite">
        <span key={value} className="mf-pop inline-block text-4xl font-extrabold tracking-tight text-fg-1 tabular-nums">{format ? format(value) : value}</span>
        {unit && <span className="text-sm text-fg-4 ml-1">{unit}</span>}
        <p className="text-[11px] uppercase tracking-[0.16em] text-cta font-semibold mt-0.5">{label}</p>
      </div>
      <button type="button" {...hold(1)} disabled={value >= max} className={btn} aria-label={`More ${label}`}>+</button>
    </div>
  )
}
