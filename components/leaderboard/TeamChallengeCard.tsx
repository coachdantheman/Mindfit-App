'use client'
import { useEffect, useState } from 'react'
import Celebrate from '@/components/shared/Celebrate'
import { cached } from '@/lib/api-cache'

interface Challenge {
  teamName: string
  week: string
  kind: string
  label: string
  target: number
  progress: number
  daysLeft: number
}

const SEEN_KEY = 'mf_team_goal_seen'

function readSeen(): string | null {
  try { return localStorage.getItem(SEEN_KEY) } catch { return null }
}

function writeSeen(week: string) {
  try { localStorage.setItem(SEEN_KEY, week) } catch {}
}

export default function TeamChallengeCard() {
  const [data, setData] = useState<Challenge | null>(null)
  const [fire, setFire] = useState<number | null>(null)

  useEffect(() => {
    let tz = ''
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone } catch {}
    const valid = (d: Challenge | null | { error?: string }): Challenge | null => (d && 'teamName' in d ? d : null)
    cached(`/api/me/challenge?tz=${encodeURIComponent(tz)}`, (d: Challenge | null) => setData(valid(d)))
      .then(raw => {
        const d = valid(raw)
        if (!d) return
        if (d.progress >= d.target && readSeen() !== d.week) {
          writeSeen(d.week)
          setFire(Date.now())
        }
      })
      .catch(() => {})
  }, [])

  if (!data) return null

  const pct = Math.min(100, Math.round((data.progress / data.target) * 100))
  const complete = data.progress >= data.target
  const daysText = `${data.daysLeft} day${data.daysLeft === 1 ? '' : 's'} left`

  return (
    <section className="card p-5 space-y-3" aria-label="Team goal">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs uppercase tracking-wider font-semibold font-mono text-fg-4 truncate">{data.teamName}</p>
        <p className="text-xs text-fg-4 shrink-0">{complete ? '' : daysText}</p>
      </div>
      <p className="text-sm font-semibold text-fg-1">Team goal: {data.target} {data.label.toLowerCase()}</p>
      <div className="h-2.5 rounded-full bg-surface-3 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={data.target} aria-valuenow={Math.min(data.progress, data.target)} aria-label="Team goal progress">
        <div className="h-full bg-cta rounded-full transition-[width]" style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <p className="text-xs text-fg-3 tabular-nums">
        {data.progress} of {data.target}{complete ? '' : ` · ${daysText}`}
      </p>
      {complete && (
        <Celebrate fire={fire}>
          <p className="text-sm font-semibold text-cta">Goal reached.</p>
        </Celebrate>
      )}
    </section>
  )
}
