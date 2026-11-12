'use client'
import { useRef, useState } from 'react'
import { haptic } from '@/lib/haptics'

const MILESTONES = [25, 50, 75, 100]
const MILESTONE_LINE: Record<number, string> = {
  25: 'A quarter of the way. Momentum is real.',
  50: 'Halfway. This is who you are now.',
  75: 'Three quarters. Finish like a champion.',
  100: 'Goal complete. You did what you said you would.',
}

// Drag the gold bar or tap the steps. Snaps to 5%, ticks on every step and
// lights up each milestone as you pass it.
export default function GoalTracker({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const track = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [burst, setBurst] = useState<string | null>(null)
  const last = useRef(value)

  const commit = (raw: number) => {
    const v = Math.max(0, Math.min(100, Math.round(raw / 5) * 5))
    if (v === last.current) return
    const prev = last.current
    last.current = v
    haptic.tick()
    const crossed = MILESTONES.find(m => prev < m && v >= m)
    if (crossed) {
      if (crossed === 100) haptic.success()
      setBurst(MILESTONE_LINE[crossed])
      setTimeout(() => setBurst(null), 2600)
    }
    onChange(v)
  }

  const fromPointer = (clientX: number) => {
    const r = track.current?.getBoundingClientRect()
    if (!r) return
    commit(((clientX - r.left) / r.width) * 100)
  }

  last.current = dragging ? last.current : value
  const done = value >= 100

  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between mb-2">
        <span className={`text-2xl font-light tabular-nums ${done ? 'text-cta' : 'text-fg-1'}`}>
          {value}<span className="text-sm text-fg-4">%</span>
        </span>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => commit(value - 5)} disabled={value <= 0} aria-label={`Lower ${label} progress`}
            className="w-11 h-11 rounded-full border border-edge text-fg-3 hover:text-fg-1 disabled:opacity-30">−</button>
          <button type="button" onClick={() => commit(value + 5)} disabled={value >= 100} aria-label={`Raise ${label} progress`}
            className="w-11 h-11 rounded-full border border-cta/50 text-cta hover:bg-cta/10 disabled:opacity-30">+</button>
        </div>
      </div>

      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-label={`${label} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        onKeyDown={e => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); commit(value + 5) }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); commit(value - 5) }
        }}
        onPointerDown={e => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); setDragging(true); fromPointer(e.clientX) }}
        onPointerMove={e => { if (dragging) fromPointer(e.clientX) }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        className="relative h-11 flex items-center cursor-pointer touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-cta/60 rounded-full"
      >
        <div className="absolute inset-x-0 h-3 rounded-full bg-surface-3/70 overflow-hidden">
          <div
            className={`h-full rounded-full ${dragging ? '' : 'transition-[width] duration-300 ease-out'}`}
            style={{
              width: `${value}%`,
              background: 'linear-gradient(90deg, #9A8B00 0%, rgb(var(--cta-rgb)) 70%, var(--gold-light) 100%)',
              boxShadow: value > 0 ? '0 0 12px rgb(var(--cta-rgb) / 0.45)' : undefined,
            }}
          />
        </div>
        {[25, 50, 75].map(m => (
          <span key={m} aria-hidden="true"
            className={`absolute w-1.5 h-1.5 rounded-full -translate-x-1/2 transition-colors ${value >= m ? 'bg-page' : 'bg-fg-4/50'}`}
            style={{ left: `${m}%` }} />
        ))}
        <span aria-hidden="true"
          className={`absolute w-6 h-6 -translate-x-1/2 rounded-full border-2 border-cta bg-page shadow-[0_0_14px_rgb(var(--cta-rgb)/0.5)] ${dragging ? 'scale-110' : 'transition-[left] duration-300 ease-out'}`}
          style={{ left: `${value}%` }} />
      </div>

      <div className="flex justify-between text-[10px] uppercase tracking-[0.18em] text-fg-4 mt-1 px-0.5" aria-hidden="true">
        <span>Start</span><span>25</span><span>50</span><span>75</span><span>Done</span>
      </div>

      {burst && (
        <p role="status" className="mt-2 rounded-lg border border-cta/40 bg-cta/10 px-3 py-2 text-xs font-medium text-cta animate-[mf-fade-in_0.3s_ease-out]">
          {burst}
        </p>
      )}
    </div>
  )
}
