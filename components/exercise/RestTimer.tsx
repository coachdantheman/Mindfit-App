'use client'
import { useEffect, useState } from 'react'

interface Props {
  endsAt: number | null        // epoch ms
  onChange: (endsAt: number | null) => void
}

export const REST_PRESETS = [60, 90, 120]

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Sticky pill above the tab bar. Starts when a set is checked; the user
// can switch presets, add 15 s or skip.
export default function RestTimer({ endsAt, onChange }: Props) {
  const [now, setNow] = useState(() => Date.now())
  const [buzzed, setBuzzed] = useState(false)

  useEffect(() => {
    if (!endsAt) return
    setBuzzed(false)
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [endsAt])

  const remaining = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0

  useEffect(() => {
    if (!endsAt || remaining > 0 || buzzed) return
    setBuzzed(true)
    try { navigator.vibrate?.([200, 100, 200]) } catch {}
  }, [endsAt, remaining, buzzed])

  if (!endsAt) return null

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-24 sm:bottom-6 z-40 w-[calc(100%-2rem)] max-w-md">
      <div className={`card px-3 py-2 flex items-center gap-2 shadow-lift ${remaining === 0 ? 'border-cta/60' : ''}`}>
        <div className="min-w-[64px]">
          <p className="text-[10px] uppercase tracking-wider text-fg-4">Rest</p>
          <p className={`text-xl font-bold tabular-nums leading-none ${remaining === 0 ? 'text-cta' : 'text-fg-1'}`}>
            {remaining === 0 ? 'Go' : fmt(remaining)}
          </p>
        </div>
        <div className="flex gap-1 ml-auto">
          {REST_PRESETS.map(p => (
            <button key={p} type="button" onClick={() => onChange(Date.now() + p * 1000)}
              className="h-9 min-w-[38px] px-2 rounded-lg text-xs font-medium border border-edge text-fg-3 hover:text-fg-1">
              {p}
            </button>
          ))}
          <button type="button" onClick={() => onChange((endsAt > Date.now() ? endsAt : Date.now()) + 15000)}
            className="h-9 px-2 rounded-lg text-xs font-medium border border-edge text-fg-3 hover:text-fg-1">
            +15
          </button>
          <button type="button" onClick={() => onChange(null)}
            className="h-9 px-2 rounded-lg text-xs font-semibold bg-cta/15 text-cta">
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
