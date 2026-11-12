'use client'
import { useEffect, useState } from 'react'
import Celebrate from '@/components/shared/Celebrate'
import { cached, clearApiCache } from '@/lib/api-cache'

interface Goal {
  id: string
  kind: string
  label: string
  target: number
  progress: number
  daysLeft: number
  teamName: string
  checkedToday?: boolean
}

interface Loaded { goals: Goal[] }

const SEEN_KEY = 'mf_team_goal_seen'

function readSeen(): string[] {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') } catch { return [] }
}

function writeSeen(ids: string[]) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-100))) } catch {}
}

const daysText = (n: number) => `${n} day${n === 1 ? '' : 's'} left`

const zone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return '' } }

export default function TeamChallengeCard() {
  const [goals, setGoals] = useState<Goal[] | null>(null)
  const [fire, setFire] = useState<number | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const apply = (d: Loaded | null) => {
    if (!d || !Array.isArray(d.goals)) return
    setGoals(d.goals)
  }

  useEffect(() => {
    cached(`/api/me/challenge?tz=${encodeURIComponent(zone())}`, (d: Loaded | null) => apply(d))
      .then(raw => {
        if (!raw || !Array.isArray((raw as Loaded).goals)) return
        const seen = readSeen()
        const done = (raw as Loaded).goals.filter(g => g.progress >= g.target && !seen.includes(g.id))
        if (done.length > 0) {
          writeSeen([...seen, ...done.map(g => g.id)])
          setFire(Date.now())
        }
      })
      .catch(() => {})
  }, [])

  const toggle = async (id: string) => {
    setBusy(id)
    try {
      const res = await fetch('/api/me/challenge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, tz: zone() }),
      })
      if (!res.ok) return
      clearApiCache()
      const fresh = await fetch(`/api/me/challenge?tz=${encodeURIComponent(zone())}`).then(r => r.ok ? r.json() : null)
      apply(fresh)
    } catch {} finally {
      setBusy(null)
    }
  }

  if (!goals || goals.length === 0) return null

  return (
    <section className="card p-5 space-y-4" aria-label="Team goals">
      {goals.map(g => {
        const pct = g.target > 0 ? Math.min(100, Math.round((g.progress / g.target) * 100)) : 0
        const complete = g.progress >= g.target
        const custom = g.kind === 'custom'
        return (
          <div key={g.id} className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs uppercase tracking-wider font-semibold font-mono text-fg-4 truncate">{g.teamName}</p>
              <p className="text-xs text-fg-4 shrink-0">{complete ? '' : daysText(g.daysLeft)}</p>
            </div>
            <p className="text-sm font-semibold text-fg-1">
              {custom ? g.label : `Team goal: ${g.target} ${g.label.toLowerCase()}`}
            </p>
            <div className="h-2.5 rounded-full bg-surface-3 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={g.target} aria-valuenow={Math.min(g.progress, g.target)} aria-label={`${g.label} progress`}>
              <div className="h-full bg-cta rounded-full transition-[width]" style={{ width: `${Math.max(2, pct)}%` }} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-fg-3 tabular-nums">
                {g.progress} of {g.target}{custom ? ' check-ins' : ''}{complete ? '' : ` · ${daysText(g.daysLeft)}`}
              </p>
              {custom && (
                <button
                  type="button"
                  onClick={() => toggle(g.id)}
                  disabled={busy === g.id}
                  aria-pressed={!!g.checkedToday}
                  className={g.checkedToday ? 'tab-btn-active' : 'tab-btn'}
                >
                  {g.checkedToday ? 'Done today' : 'Mark done today'}
                </button>
              )}
            </div>
            {complete && (
              <Celebrate fire={fire}>
                <p className="text-sm font-semibold text-cta">Goal reached.</p>
              </Celebrate>
            )}
          </div>
        )
      })}
    </section>
  )
}
