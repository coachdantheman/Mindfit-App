'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ROUTINES, routineByKey, routineFor, readRoutineChecks, writeRoutineChecks, type Routine } from '@/lib/data/routines'
import { haptic } from '@/lib/haptics'
import { localDateISO } from '@/lib/dates'

type Key = Routine['key']

const LABEL: Record<Key, string> = { morning: 'Morning', night: 'Night' }
const RING_R = 9
const RING_C = 2 * Math.PI * RING_R

export default function DailyRoutine() {
  const [day] = useState(() => localDateISO())
  const [key, setKey] = useState<Key>(() => routineFor(new Date().getHours()))
  const [done, setDone] = useState<string[]>([])
  const doneRef = useRef<string[]>([])
  const [running, setRunning] = useState<{ id: string; endAt: number; secs: number } | null>(null)
  const [now, setNow] = useState(0)

  const routine = ROUTINES.find(r => r.key === key)!
  const total = routine.steps.length
  const doneCount = routine.steps.filter(s => done.includes(s.id)).length
  const complete = doneCount === total

  useEffect(() => {
    const ids = readRoutineChecks(key, day)
    doneRef.current = ids
    setDone(ids)
    let active = true
    fetch(`/api/mindset/routine?day=${day}`)
      .then(r => (r.ok ? r.json() : null))
      .then((data: { morning?: boolean; night?: boolean } | null) => {
        if (!active || !data) return
        const stepIds = routineByKey(key).steps.map(s => s.id)
        const localDone = stepIds.every(id => doneRef.current.includes(id))
        // Finished here but never saved (offline at the time): save it now.
        if (!data[key]) { if (localDone) postRoutine(key); return }
        if (!localDone) saveDone(key, stepIds)
      })
      .catch(() => {})
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, day])

  const saveDone = (k: Key, next: string[]) => {
    doneRef.current = next
    setDone(next)
    writeRoutineChecks(k, day, next)
  }

  const allDone = (k: Key, ids: string[]) => routineByKey(k).steps.every(s => ids.includes(s.id))

  const postRoutine = (k: Key) => {
    fetch('/api/mindset/routine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day, kind: k }),
    }).catch(() => {})
  }

  const deleteRoutine = (k: Key) => {
    fetch(`/api/mindset/routine?day=${day}&kind=${k}`, { method: 'DELETE' }).catch(() => {})
  }

  const switchKey = (k: Key) => {
    setRunning(null)
    setKey(k)
  }

  const toggle = (id: string) => {
    const isDone = doneRef.current.includes(id)
    const next = isDone ? doneRef.current.filter(x => x !== id) : [...doneRef.current, id]
    const wasComplete = allDone(key, doneRef.current)
    saveDone(key, next)
    const isComplete = allDone(key, next)
    if (!wasComplete && isComplete) postRoutine(key)
    else if (wasComplete && !isComplete) deleteRoutine(key)
    if (!isDone && next.length === total) haptic.success()
    else haptic.tick()
  }

  const startTimer = (id: string, secs: number) => {
    setNow(Date.now())
    setRunning({ id, endAt: Date.now() + secs * 1000, secs })
  }

  // Runs the step's countdown and checks it off when the timer reaches zero.
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => {
      if (Date.now() < running.endAt) {
        setNow(Date.now())
        return
      }
      clearInterval(timer)
      setRunning(null)
      const ids = doneRef.current
      if (ids.includes(running.id)) return
      const next = [...ids, running.id]
      saveDone(key, next)
      if (allDone(key, next)) postRoutine(key)
      if (next.length === total) haptic.success()
      else haptic.tick()
    }, 250)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  return (
    <div className="space-y-5">
      <div className="card p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-fg-4 font-mono">Daily routine</p>
            <h2 className="text-lg font-semibold text-fg-1 mt-0.5">{routine.name}</h2>
          </div>
          <div role="group" aria-label="Routine" className="inline-flex rounded-full border border-edge p-1">
            {(['morning', 'night'] as Key[]).map(k => (
              <button
                key={k}
                type="button"
                onClick={() => switchKey(k)}
                aria-pressed={key === k}
                className={`px-4 h-9 rounded-full text-xs font-medium transition-colors ${key === k ? 'bg-cta text-fg-inverse' : 'text-fg-3 hover:text-fg-1'}`}
              >
                {LABEL[k]}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-fg-3">{routine.promise}</p>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-fg-3">
            <span>{doneCount} of {total}</span>
            {complete && <span className="text-cta font-medium">Routine complete. That&apos;s a rep.</span>}
          </div>
          <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={doneCount}>
            <div className="h-full bg-cta rounded-full transition-[width] duration-500 ease-out" style={{ width: `${(doneCount / total) * 100}%` }} />
          </div>
        </div>

        <ul className="space-y-3">
          {routine.steps.map(step => {
            const isDone = done.includes(step.id)
            const isRunning = running?.id === step.id
            const left = isRunning ? Math.max(0, Math.ceil((running.endAt - now) / 1000)) : 0
            const progress = isRunning ? 1 - left / running.secs : 0
            return (
              <li
                key={step.id}
                className={`rounded-2xl border p-4 flex gap-3 transition-colors ${isDone ? 'border-cta/40 bg-cta/[0.06]' : 'border-edge bg-surface'}`}
              >
                <button
                  type="button"
                  onClick={() => toggle(step.id)}
                  aria-pressed={isDone}
                  aria-label={`${isDone ? 'Undo' : 'Complete'}: ${step.title}`}
                  className={`mt-0.5 w-7 h-7 shrink-0 rounded-full border grid place-items-center transition-colors ${isDone ? 'border-cta bg-cta text-fg-inverse' : 'border-edge text-transparent hover:border-cta/50'}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </button>

                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${isDone ? 'text-fg-3 line-through' : 'text-fg-1'}`}>{step.title}</p>
                  <p className="text-xs text-fg-3 mt-0.5">{step.detail}</p>

                  {(step.href || (step.seconds && !isDone)) && (
                    <div className="flex flex-wrap items-center gap-3 mt-2.5">
                      {step.href && (
                        <Link href={step.href} className="text-xs font-semibold text-cta hover:underline">Open →</Link>
                      )}
                      {step.seconds && !isDone && !isRunning && (
                        <button
                          type="button"
                          onClick={() => startTimer(step.id, step.seconds!)}
                          className="text-xs font-medium text-cta border border-cta/40 rounded-lg px-3 py-1.5 hover:bg-cta/10 transition-colors"
                        >
                          Start {step.seconds}s
                        </button>
                      )}
                      {isRunning && (
                        <div className="flex items-center gap-3">
                          <div className="relative w-6 h-6" aria-live="off">
                            <svg viewBox="0 0 24 24" className="w-6 h-6 -rotate-90" aria-hidden="true">
                              <circle cx="12" cy="12" r={RING_R} fill="none" stroke="var(--border-muted)" strokeWidth="1.5" />
                              <circle
                                cx="12"
                                cy="12"
                                r={RING_R}
                                fill="none"
                                stroke="var(--cta)"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeDasharray={RING_C}
                                strokeDashoffset={RING_C * (1 - progress)}
                              />
                            </svg>
                          </div>
                          <span role="timer" className="text-xs tabular-nums text-fg-2">{left}s</span>
                          <button type="button" onClick={() => setRunning(null)} className="text-xs text-fg-4 hover:text-fg-2">Stop</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
