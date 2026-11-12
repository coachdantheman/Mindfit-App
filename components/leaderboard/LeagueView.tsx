'use client'
import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import Skeleton from '@/components/shared/Skeleton'
import Celebrate from '@/components/shared/Celebrate'
import ReportButton from '@/components/shared/ReportButton'
import { cached } from '@/lib/api-cache'
import { initialsOf } from './types'

type Zone = 'up' | 'down' | null

export interface LeagueRow { id: string; rank: number; displayName: string; sport: string | null; points: number; isMe: boolean; zone: Zone }

export interface LeagueResponse {
  week: string
  daysLeft: number
  tier: number | null
  name: string | null
  size: number
  rows: LeagueRow[]
  me: { rank: number; points: number; zone: Zone } | null
  last: { tier: number; name: string; rank: number | null; size: number; moved: 'up' | 'down' | 'same' } | null
}

const SEEN_KEY = 'mf_league_seen'
const MIN_FOR_MOVES = 10

function readSeen(): string | null {
  try { return localStorage.getItem(SEEN_KEY) } catch { return null }
}

function writeSeen(week: string) {
  try { localStorage.setItem(SEEN_KEY, week) } catch {}
}

function Divider({ caption, tone }: { caption: string; tone: 'gold' | 'muted' }) {
  const line = tone === 'gold' ? 'bg-cta/60' : 'bg-edge'
  const text = tone === 'gold' ? 'text-cta' : 'text-fg-4'
  return (
    <li aria-hidden className="flex items-center gap-3 py-1.5">
      <span className={`flex-1 h-px ${line}`} />
      <span className={`text-[10px] uppercase tracking-[0.16em] font-semibold ${text}`}>{caption}</span>
      <span className={`flex-1 h-px ${line}`} />
    </li>
  )
}

function Row({ r }: { r: LeagueRow }) {
  return (
    <li className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${r.isMe ? 'border-cta/40 bg-cta/5' : 'border-transparent'}`}>
      <span className="w-7 text-center text-sm font-bold tabular-nums text-fg-2 shrink-0">{r.rank}</span>
      <span className="w-9 h-9 rounded-full bg-gradient-to-br from-cta to-brand-700 text-fg-inverse flex items-center justify-center text-xs font-bold shrink-0" aria-hidden>
        {initialsOf(r.displayName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg-1 truncate">
          {r.displayName}{r.isMe && <span className="text-fg-4 font-normal"> (you)</span>}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
          {r.sport && <span className="text-xs text-fg-4 truncate">{r.sport}</span>}
          {!r.isMe && <span className="ml-auto"><ReportButton kind="leaderboard_name" targetUserId={r.id} compact /></span>}
        </div>
      </div>
      <span className="text-sm font-bold tabular-nums text-fg-1 shrink-0">{r.points}<span className="text-xs font-medium text-fg-4 ml-0.5">pts</span></span>
    </li>
  )
}

export default function LeagueView() {
  const [data, setData] = useState<LeagueResponse | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [fire, setFire] = useState<number | null>(null)

  useEffect(() => {
    let tz = ''
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone } catch {}
    setError(false)
    cached(`/api/league?tz=${encodeURIComponent(tz)}`, (d: LeagueResponse) => {
      if (!d || !('week' in d)) setError(true)
      else { setError(false); setData(d) }
    })
      .then(d => {
        if (!d || !('week' in d)) { setError(true); return }
        if (d.last && d.last.moved !== 'same' && readSeen() !== d.week) {
          writeSeen(d.week)
          setFire(Date.now())
        }
      })
      .catch(() => setError(true))
  }, [attempt])

  if (error && !data) {
    return (
      <div className="card p-5 text-center">
        <p className="text-sm text-fg-3">Could not load the league.</p>
        <button type="button" onClick={() => setAttempt(a => a + 1)} className="btn-secondary text-sm mt-3">Retry</button>
      </div>
    )
  }

  if (!data) return <Skeleton rows={4} />

  const endsIn = data.daysLeft <= 1 ? 'Last day' : `Week ends in ${data.daysLeft} days`

  if (data.tier === null) {
    return (
      <div className="card p-6 text-center space-y-3">
        <p className="font-semibold text-fg-1">Log anything this week to join a league.</p>
        <p className="text-sm text-fg-4">Every athlete starts in the first league. Your place comes from your points this week.</p>
        <Link href="/mindset" className="btn-primary inline-block mt-1">Open Mindset</Link>
      </div>
    )
  }

  const moveText = data.last && data.last.moved !== 'same'
    ? data.last.moved === 'up'
      ? `You moved up to ${data.name}.`
      : `You moved down to ${data.name}. Win it back this week.`
    : null

  return (
    <div className="space-y-4">
      <Celebrate fire={fire}>
        <div className="card p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider font-semibold font-mono text-fg-4">This week</p>
              <h2 className="text-xl font-bold text-fg-1 leading-tight">{data.name}</h2>
              <p className="text-sm text-fg-3 mt-0.5">{endsIn}</p>
            </div>
            {data.me && (
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold text-fg-1 tabular-nums leading-none">{data.me.rank}</p>
                <p className="text-xs text-fg-4 tabular-nums mt-1">of {data.size}</p>
              </div>
            )}
          </div>
          {moveText && (
            <p role="status" className="text-sm text-cta border-t border-edge-muted pt-3">{moveText}</p>
          )}
        </div>
      </Celebrate>

      <div className="card p-3 sm:p-4">
        <ol className="space-y-1">
          {data.rows.map((r, i) => {
            const prev = data.rows[i - 1]
            const next = data.rows[i + 1]
            const startsDown = r.zone === 'down' && prev?.zone !== 'down'
            const endsUp = r.zone === 'up' && next?.zone !== 'up'
            return (
              <Fragment key={r.id}>
                {startsDown && <Divider caption="Bottom 5 move down" tone="muted" />}
                <Row r={r} />
                {endsUp && <Divider caption="Top 5 move up" tone="gold" />}
              </Fragment>
            )
          })}
        </ol>
        {data.size < MIN_FOR_MOVES && (
          <p className="text-xs text-fg-4 px-3 pt-3">Moving up and down starts when a league has {MIN_FOR_MOVES} athletes.</p>
        )}
      </div>
    </div>
  )
}
