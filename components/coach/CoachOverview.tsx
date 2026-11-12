'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import type { MemberWithCount } from '@/types'
import { FLAG_LABELS } from '@/components/shared/flag-labels'
import { localDateISO } from '@/lib/dates'

interface Team { id: string; name: string; members: { id: string }[] }
interface TeamEvent { id: string; kind: string; event_date: string; start_time: string | null; opponent: string | null; title?: string | null }

// First tab of the Coach dashboard: the whole program at a glance.
export default function CoachOverview({ athletes, teams, onOpen }: {
  athletes: MemberWithCount[]
  teams: Team[]
  onOpen: (tab: 'athletes' | 'teams' | 'schedule') => void
}) {
  const today = localDateISO()
  const [games, setGames] = useState<{ team: string; event: TeamEvent }[]>([])

  useEffect(() => {
    if (!teams.length) return
    Promise.all(teams.slice(0, 8).map(t =>
      fetch(`/api/coach/schedule?team_id=${t.id}`)
        .then(r => (r.ok ? r.json() : []))
        .then((events: TeamEvent[]) => {
          const next = (Array.isArray(events) ? events : []).find(e => e.kind === 'game' && e.event_date >= today)
          return next ? { team: t.name, event: next } : null
        })
        .catch(() => null),
    )).then(list => setGames(list.filter((g): g is { team: string; event: TeamEvent } => !!g).sort((a, b) => a.event.event_date.localeCompare(b.event.event_date))))
  }, [teams, today])

  const stats = useMemo(() => {
    const active = athletes.filter(a => a.status !== 'invited')
    const loggedToday = active.filter(a => a.overview?.last_journal_date === today || a.last_seen_at?.slice(0, 10) === today).length
    const activeWeek = active.filter(a => (a.overview?.journal_count_7d ?? 0) > 0).length
    const mpis = active.map(a => a.overview?.latest_mpi).filter((n): n is number => typeof n === 'number')
    const avgMpi = mpis.length ? Math.round(mpis.reduce((s, n) => s + n, 0) / mpis.length) : null
    const flagged = active.filter(a => (a.overview?.flags?.length ?? 0) > 0)
    const streaks = [...active].sort((a, b) => (b.overview?.streak ?? 0) - (a.overview?.streak ?? 0)).slice(0, 3).filter(a => (a.overview?.streak ?? 0) > 0)
    return { total: active.length, loggedToday, activeWeek, avgMpi, flagged, streaks }
  }, [athletes, today])

  const pct = (n: number) => (stats.total ? Math.round((n / stats.total) * 100) : 0)
  const name = (a: MemberWithCount) => a.full_name || a.email

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile label="Athletes" value={stats.total} />
        <Tile label="Logged today" value={`${stats.loggedToday}`} sub={`${pct(stats.loggedToday)}% of roster`} />
        <Tile label="Active this week" value={`${stats.activeWeek}`} sub={`${pct(stats.activeWeek)}% of roster`} />
        <Tile label="Avg MPI" value={stats.avgMpi ?? '-'} sub="Mental Performance Index" />
      </div>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-fg-1">Needs your attention</h3>
          <button type="button" onClick={() => onOpen('athletes')} className="text-xs text-cta">All athletes →</button>
        </div>
        {stats.flagged.length === 0 ? (
          <p className="text-sm text-fg-4">No flags right now. Your athletes are on track.</p>
        ) : (
          <ul className="divide-y divide-edge-muted">
            {stats.flagged.slice(0, 5).map(a => (
              <li key={a.id} className="py-2.5 flex items-center justify-between gap-3">
                <Link href={`/coach/athlete/${a.id}`} className="text-sm text-fg-2 hover:text-cta truncate">{name(a)}</Link>
                <span className="flex flex-wrap gap-1 justify-end">
                  {(a.overview?.flags ?? []).slice(0, 2).map(f => (
                    <span key={f} className="text-[11px] px-2 py-0.5 rounded-full border border-amber-400/40 text-amber-400">{FLAG_LABELS[f]?.label ?? f}</span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid sm:grid-cols-2 gap-6">
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-fg-1">Upcoming games</h3>
            <button type="button" onClick={() => onOpen('schedule')} className="text-xs text-cta">Schedule →</button>
          </div>
          {games.length === 0 ? (
            <p className="text-sm text-fg-4">No games on the schedule yet.</p>
          ) : (
            <ul className="space-y-2">
              {games.slice(0, 4).map(g => (
                <li key={g.event.id} className="rounded-xl border border-edge-muted bg-surface-2/50 px-3 py-2">
                  <p className="text-sm text-fg-1">{g.team}{g.event.opponent ? ` vs ${g.event.opponent}` : ''}</p>
                  <p className="text-xs text-fg-4">{format(parseISO(g.event.event_date), 'EEE, MMM d')}{g.event.start_time ? ` · ${g.event.start_time}` : ''}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-fg-1">Longest streaks</h3>
            <button type="button" onClick={() => onOpen('teams')} className="text-xs text-cta">Team goals →</button>
          </div>
          {stats.streaks.length === 0 ? (
            <p className="text-sm text-fg-4">No streaks yet. Push a team goal to get things moving.</p>
          ) : (
            <ul className="space-y-2">
              {stats.streaks.map(a => (
                <li key={a.id} className="flex items-center justify-between text-sm">
                  <span className="text-fg-2 truncate">{name(a)}</span>
                  <span className="text-cta tabular-nums">🔥 {a.overview?.streak}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function Tile({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-edge bg-surface-2/50 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-fg-4">{label}</p>
      <p className="text-2xl font-light text-fg-1 tabular-nums mt-1">{value}</p>
      {sub && <p className="text-[11px] text-fg-4 mt-0.5">{sub}</p>}
    </div>
  )
}
