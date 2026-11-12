import { isUnder13 } from '@/lib/age'
import type { SupabaseClient } from '@supabase/supabase-js'
import { chunk, fetchAll } from '@/lib/fetch-all'
import { shiftDayBy } from '@/lib/leaderboard'
import { daysLeftIn, weekEndOf } from '@/lib/leagues'

export const CHALLENGE_KINDS = ['journal', 'workouts', 'sleep', 'meals'] as const
export type ChallengeKind = typeof CHALLENGE_KINDS[number]

export const CHALLENGE_LABELS: Record<ChallengeKind, string> = {
  journal: 'Journal entries',
  workouts: 'Workouts',
  sleep: 'Nights of sleep logged',
  meals: 'Days of meals logged',
}

export const isChallengeKind = (v: unknown): v is ChallengeKind =>
  typeof v === 'string' && (CHALLENGE_KINDS as readonly string[]).includes(v)

export const suggestedTarget = (kind: ChallengeKind, members: number) => members * (kind === 'workouts' ? 3 : 5)

export interface ChallengeRow { kind: ChallengeKind; target: number; week_start: string }

export interface ChallengeView {
  kind: ChallengeKind
  target: number
  label: string
  progress: number
  daysLeft: number
}

export async function membersOf(admin: SupabaseClient, teamId: string): Promise<string[]> {
  const rows = await fetchAll(async (from, to) => admin
    .from('team_members')
    .select('athlete_id')
    .eq('team_id', teamId)
    .order('athlete_id', { ascending: true })
    .range(from, to))
  const ids = rows.map(r => r.athlete_id as string)
  // Athletes waiting on consent, or under 13 without coach sharing, are left
  // out, so a team total never reveals anything about them to a coach.
  const allowed: string[] = []
  for (const part of chunk(ids, 100)) {
    const { data, error } = await admin.from('profiles')
      .select('id, role, birth_year, birth_month, consent_status, consent_share_coaches').in('id', part)
    if (error) throw new Error(error.message)
    for (const p of data ?? []) {
      const pending = (p.consent_status ?? 'not_required') === 'pending'
      const blocked = pending || (p.role === 'member' && isUnder13(p) && !p.consent_share_coaches)
      if (!blocked) allowed.push(p.id)
    }
  }
  return allowed.sort()
}

// Counts one week of a team's goal across its athletes. Sleep is dated by the
// night, so the window runs from the Sunday before to the Saturday.
export async function challengeProgress(admin: SupabaseClient, kind: ChallengeKind, athleteIds: string[], weekStart: string): Promise<number> {
  if (athleteIds.length === 0) return 0
  const end = weekEndOf(weekStart)

  if (kind === 'meals') {
    const days = new Set<string>()
    for (const ids of chunk(athleteIds, 100)) {
      const rows = await fetchAll(async (from, to) => admin
        .from('food_entries')
        .select('user_id, entry_date')
        .in('user_id', ids)
        .gte('entry_date', weekStart)
        .lte('entry_date', end)
        .order('user_id', { ascending: true })
        .order('entry_date', { ascending: true })
        .range(from, to))
      for (const r of rows) days.add(`${r.user_id}|${r.entry_date}`)
    }
    return days.size
  }

  const table = { journal: 'journal_entries', workouts: 'workout_logs', sleep: 'sleep_entries' } as const
  const column = kind === 'workouts' ? 'log_date' : 'entry_date'
  const from = kind === 'sleep' ? shiftDayBy(weekStart, -1) : weekStart
  const to = kind === 'sleep' ? shiftDayBy(weekStart, 5) : end

  let total = 0
  for (const ids of chunk(athleteIds, 100)) {
    const { count, error } = await admin
      .from(table[kind])
      .select('user_id', { count: 'exact', head: true })
      .in('user_id', ids)
      .gte(column, from)
      .lte(column, to)
    if (error) throw new Error(error.message)
    total += count ?? 0
  }
  return total
}

export async function challengeView(admin: SupabaseClient, row: ChallengeRow, athleteIds: string[], today: string): Promise<ChallengeView> {
  return {
    kind: row.kind,
    target: row.target,
    label: CHALLENGE_LABELS[row.kind],
    progress: await challengeProgress(admin, row.kind, athleteIds, row.week_start),
    daysLeft: daysLeftIn(row.week_start, today),
  }
}
