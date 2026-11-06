'use client'
import { nextGame, type ScheduleEvent } from '@/lib/schedule'

export type MyEvent = ScheduleEvent & { id: string; team_id: string; team_name: string }

let cache: Promise<MyEvent[]> | null = null

// Games and practices for the teams this athlete is on, fetched once per page load.
export function loadMySchedule(): Promise<MyEvent[]> {
  cache ??= fetch('/api/me/schedule').then(r => (r.ok ? r.json() : [])).then(d => (Array.isArray(d) ? d : [])).catch(() => [])
  return cache
}

export interface UpcomingGame { date: string; time: string | null; opponent: string | null; teamName: string | null; fromSchedule: boolean }

// The athlete's next game: the soonest of their team schedule and the
// date they set themselves on their profile.
export async function loadNextGame(today: string): Promise<UpcomingGame | null> {
  const [events, profile] = await Promise.all([
    loadMySchedule(),
    fetch('/api/profile').then(r => (r.ok ? r.json() : null)).catch(() => null),
  ])
  const team = nextGame(events, today)
  const ownDate: string | null = profile?.next_competition_at?.slice(0, 10) ?? null
  const own = ownDate && ownDate >= today
    ? { date: ownDate, time: profile?.next_competition_time?.slice(0, 5) ?? null, opponent: null, teamName: null, fromSchedule: false }
    : null
  const fromTeam = team
    ? { date: team.event_date, time: team.start_time, opponent: team.opponent, teamName: team.team_name, fromSchedule: true }
    : null
  if (own && fromTeam) return own.date < fromTeam.date ? own : fromTeam
  return own ?? fromTeam
}
