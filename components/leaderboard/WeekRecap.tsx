'use client'
import { useEffect, useState } from 'react'
import Skeleton from '@/components/shared/Skeleton'
import { useToast } from '@/components/shared/Toast'
import { cached } from '@/lib/api-cache'
import { localDateISO } from '@/lib/dates'
import { shiftDayBy } from '@/lib/leaderboard'
import { weekStartOf } from '@/lib/leagues'

interface Recap {
  week: string
  days: boolean[]
  activeDays: number
  points: number
  clutchDays: number
  bestPillar: 'mind' | 'body' | 'fuel' | 'rest' | null
  pillars: { mind: number; body: number; fuel: number; rest: number }
  streak: number
  freezes: number
  league: { name: string; rank: number; size: number } | null
}

const PILLAR_NAME = { mind: 'Mind', body: 'Body', fuel: 'Fuel', rest: 'Rest' } as const
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

export default function WeekRecap() {
  const notify = useToast()
  const [data, setData] = useState<Recap | null>(null)
  const [failed, setFailed] = useState(false)
  // Monday shows the week that just finished. Other days show the week in progress.
  const today = localDateISO()
  const thisWeek = weekStartOf(today)
  const isMonday = new Date(`${today}T12:00:00`).getDay() === 1
  const week = isMonday ? shiftDayBy(thisWeek, -7) : thisWeek
  const title = isMonday ? 'Last week' : 'Your week'

  useEffect(() => {
    let tz = ''
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone } catch {}
    setFailed(false)
    cached(`/api/recap?week=${week}&tz=${encodeURIComponent(tz)}`, (d: Recap) => {
      if (d && 'days' in d) setData(d)
    })
      .then(d => { if (!d || !('days' in d)) setFailed(true) })
      .catch(() => setFailed(true))
  }, [week])

  if (failed && !data) return null
  if (!data) return <Skeleton rows={2} />

  const share = async () => {
    const place = data.league ? `, ${ordinal(data.league.rank)} in ${data.league.name}` : ''
    const text = `My MindFit week: ${data.activeDays} of 7 days, ${data.points} points${place}.`
    if (typeof navigator !== 'undefined' && 'share' in navigator && typeof navigator.share === 'function') {
      try { await navigator.share({ text }) } catch {}
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      notify('Copied')
    } catch {
      notify('Could not copy', 'error')
    }
  }

  const stats = [
    { label: 'Points', value: data.points.toLocaleString('en-US') },
    { label: 'League', value: data.league ? `${ordinal(data.league.rank)} of ${data.league.size}` : '—' },
    { label: 'Clutch Days', value: String(data.clutchDays) },
    { label: 'Streak', value: data.streak > 0 ? `${data.streak} day${data.streak === 1 ? '' : 's'}` : '—' },
  ]

  return (
    <section className="card p-5 space-y-4" aria-label={title}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-fg-1">{title}</h2>
        <button type="button" onClick={share} className="btn-ghost text-xs px-2">Share</button>
      </div>

      <div className="flex items-center justify-between gap-2" role="img" aria-label={`${data.activeDays} of 7 days active`}>
        {data.days.map((on, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span className={`w-8 h-8 rounded-full border ${on ? 'bg-cta border-cta' : 'border-edge bg-transparent'}`} aria-hidden />
            <span className="text-[10px] font-semibold text-fg-4" aria-hidden>{DAY_LETTERS[i]}</span>
          </div>
        ))}
      </div>
      <p className="text-sm text-fg-3 tabular-nums">{data.activeDays} of 7 days</p>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        {stats.map(s => (
          <div key={s.label} className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wider text-fg-4">{s.label}</dt>
            <dd className="text-base font-bold text-fg-1 tabular-nums truncate">{s.value}</dd>
          </div>
        ))}
      </dl>

      {(data.bestPillar || data.freezes > 0) && (
        <p className="text-xs text-fg-3 border-t border-edge-muted pt-3">
          {data.bestPillar && <>Strongest: {PILLAR_NAME[data.bestPillar]}</>}
          {data.bestPillar && data.freezes > 0 && ' · '}
          {data.freezes > 0 && <>{data.freezes === 1 ? '1 freeze' : `${data.freezes} freezes`} held</>}
        </p>
      )}
    </section>
  )
}
