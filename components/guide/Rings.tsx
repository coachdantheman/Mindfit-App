'use client'
import { useEffect, useState } from 'react'
import { PILLARS, type TodayData } from '@/lib/guide'

// Counts up from 0 on mount (eased), straight to the value with reduced motion.
export function ReadinessRing({ score, size = 120, label = 'Readiness' }: { score: number | null; size?: number; label?: string }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const value = score ?? 0
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return }
    // A timer, not an animation frame: frames pause in a background tab and
    // the ring would sit empty.
    const start = Date.now()
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / 1400)
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p >= 1) clearInterval(id)
    }, 16)
    return () => clearInterval(id)
  }, [score])

  const C = 2 * Math.PI * 44
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--border-muted)" strokeWidth="5" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--cta)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(shown / 100) * C} ${C}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-label={score == null ? 'No readiness yet' : `${label} ${score} out of 100`}>
        <span className="font-display text-cta tabular-nums leading-none" style={{ fontSize: size * 0.3 }}>{score == null ? '-' : shown}</span>
        <span className="text-[10px] text-fg-4 uppercase tracking-[0.18em] mt-1">{label}</span>
      </div>
    </div>
  )
}

function PillarRing({ label, done }: { label: string; done: boolean }) {
  const C = 2 * Math.PI * 19
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-0" role="img" aria-label={`${label}, ${done ? 'complete' : 'not yet'}`}>
      <span className="relative w-11 h-11 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" width={44} height={44} viewBox="0 0 44 44" aria-hidden>
          <circle cx={22} cy={22} r={19} fill="none" stroke="var(--border-muted)" strokeWidth={3} />
          <circle cx={22} cy={22} r={19} fill="none" stroke="var(--cta)" strokeWidth={3} strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={done ? 0 : C} style={{ transition: 'stroke-dashoffset 700ms ease-out' }} />
        </svg>
        {done && (
          <svg className="relative text-cta mf-pop" width={16} height={16} viewBox="0 0 16 16" aria-hidden>
            <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="text-[11px] uppercase tracking-[0.16em] text-fg-3 font-semibold">{label}</span>
    </div>
  )
}

export function PillarRings({ pillars }: { pillars: TodayData['pillars'] }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {PILLARS.map(p => <PillarRing key={p.key} label={p.label} done={pillars[p.key]} />)}
    </div>
  )
}
