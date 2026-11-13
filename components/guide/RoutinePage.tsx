'use client'
import { useEffect, useRef, useState } from 'react'
import type { RoutineStep } from '@/lib/data/routines'
import { haptic } from '@/lib/haptics'

const R = 44
const C = 2 * Math.PI * R

// One routine step as a page in a guide flow. A step with `seconds` gets a
// timer the athlete can start or leave alone; `onTimerDone` fires when it runs
// out. `children` sit under the text (an input, the identity statement).
// Render it with key={step.id} so each step starts with a fresh timer.
export default function RoutinePage({ step, done = false, onTimerDone, children }: {
  step: RoutineStep
  done?: boolean
  onTimerDone?: () => void
  children?: React.ReactNode
}) {
  const secs = step.seconds ?? 0
  const [endAt, setEndAt] = useState<number | null>(null)
  const [now, setNow] = useState(0)
  const onDone = useRef(onTimerDone)
  onDone.current = onTimerDone

  useEffect(() => {
    if (endAt === null) return
    const timer = setInterval(() => {
      if (Date.now() < endAt) return setNow(Date.now())
      clearInterval(timer)
      setEndAt(null)
      haptic.success()
      onDone.current?.()
    }, 250)
    return () => clearInterval(timer)
  }, [endAt])

  const running = endAt !== null
  const left = running ? Math.max(0, Math.ceil((endAt - now) / 1000)) : secs
  const progress = done ? 1 : running ? 1 - left / secs : 0

  const start = () => {
    setNow(Date.now())
    setEndAt(Date.now() + secs * 1000)
  }

  return (
    <div className="mf-rise flex flex-col items-center text-center pt-2">
      <h2 className="font-display text-2xl leading-tight text-fg-1 text-balance">{step.title}</h2>
      <p className="mt-2 text-sm text-fg-3 text-balance">{step.detail}</p>

      {secs > 0 && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90" aria-hidden>
              <circle cx="50" cy="50" r={R} fill="none" stroke="var(--border-muted)" strokeWidth="4" />
              <circle cx="50" cy="50" r={R} fill="none" stroke="var(--cta)" strokeWidth="4" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - progress)} className="transition-[stroke-dashoffset] duration-300 ease-linear" />
            </svg>
            <span role="timer" aria-label={done ? `${step.title}: done` : `${step.title}: ${left} seconds left`} className="absolute inset-0 grid place-items-center text-2xl font-semibold tabular-nums text-fg-1">
              {done ? '✓' : `${left}s`}
            </span>
          </div>
          {!done && (
            <button type="button" onClick={running ? () => setEndAt(null) : start}
              className="text-sm font-medium text-cta border border-cta/40 rounded-full px-5 min-h-[44px] hover:bg-cta/10 transition-colors">
              {running ? 'Stop' : `Start ${secs}s`}
            </button>
          )}
        </div>
      )}

      {children && <div className="mt-6 w-full text-left">{children}</div>}
    </div>
  )
}
