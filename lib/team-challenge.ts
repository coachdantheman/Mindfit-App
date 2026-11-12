import { isUnder13 } from '@/lib/age'
import type { SupabaseClient } from '@supabase/supabase-js'
import { chunk, fetchAll } from '@/lib/fetch-all'
import { shiftDayBy } from '@/lib/leaderboard'

export const CHALLENGE_KINDS = [
  'journal', 'workouts', 'sleep', 'meals', 'flow_stacks', 'gratitude',
  'habits', 'practices', 'visualization', 'mpi', 'custom',
] as const
export type ChallengeKind = typeof CHALLENGE_KINDS[number]

export const CHALLENGE_LABELS: Record<ChallengeKind, string> = {
  journal: 'Journal entries',
  workouts: 'Workouts',
  sleep: 'Nights of sleep logged',
  meals: 'Days of meals logged',
  flow_stacks: 'Pre-game Flow Stacks',
  gratitude: 'Gratitude entries',
  habits: 'Habit check-offs',
  practices: 'Practices logged',
  visualization: 'Visualization sessions',
  mpi: 'Weekly MPI check-ins',
  custom: 'Custom goal',
}

export const isChallengeKind = (v: unknown): v is ChallengeKind =>
  typeof v === 'string' && (CHALLENGE_KINDS as readonly string[]).includes(v)

export const GOAL_DURATIONS = { '1w': 7, '2w': 14, '4w': 28, season: 84 } as const
export type GoalDuration = keyof typeof GOAL_DURATIONS

export const isGoalDuration = (v: unknown): v is GoalDuration =>
  typeof v === 'string' && (Object.keys(GOAL_DURATIONS) as string[]).includes(v)

// Logs one athlete is expected to add per week, used to suggest a team target.
const WEEKLY_RATE: Record<ChallengeKind, number> = {
  journal: 5, workouts: 3, sleep: 5, meals: 5, flow_stacks: 1, gratitude: 5,
  habits: 5, practices: 3, visualization: 5, mpi: 1, custom: 5,
}

export const suggestedTarget = (kind: ChallengeKind, members: number, days: number) =>
  Math.max(1, members * Math.ceil(days / 7) * WEEKLY_RATE[kind])

export const GOAL_COLS = 'id, kind, target, title, week_start, ends_on'

export interface GoalRow {
  id: string
  kind: ChallengeKind
  target: number
  title: string | null
  week_start: string
  ends_on: string
}

export interface GoalView {
  id: string
  kind: ChallengeKind
  title: string | null
  label: string
  target: number
  progress: number
  daysLeft: number
  start: string
  ends_on: string
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

interface CountSpec {
  table: string
  who: 'user_id' | 'athlete_id'
  column: string
  timestamp?: boolean
  eq?: [string, string | boolean]
}

const COUNTED: Record<Exclude<ChallengeKind, 'meals'>, CountSpec> = {
  journal: { table: 'journal_entries', who: 'user_id', column: 'entry_date' },
  workouts: { table: 'workout_logs', who: 'user_id', column: 'log_date' },
  sleep: { table: 'sleep_entries', who: 'user_id', column: 'entry_date' },
  flow_stacks: { table: 'flow_sessions', who: 'user_id', column: 'started_at', timestamp: true },
  gratitude: { table: 'gratitude_entries', who: 'user_id', column: 'entry_date' },
  habits: { table: 'habit_checks', who: 'user_id', column: 'check_date' },
  practices: { table: 'practice_logs', who: 'user_id', column: 'log_date' },
  visualization: { table: 'visualization_entries', who: 'user_id', column: 'entry_date', eq: ['completed', true] },
  mpi: { table: 'weekly_assessments', who: 'user_id', column: 'week_date', eq: ['assessment_type', 'weekly'] },
  custom: { table: 'team_goal_checks', who: 'athlete_id', column: 'check_date' },
}

// Counts a team's goal across its athletes between start and end (inclusive).
// Sleep is dated by the night, so it runs from the day before start to the day
// before end.
export async function goalProgress(
  admin: SupabaseClient,
  goal: { id: string; kind: ChallengeKind; start: string; end: string },
  athleteIds: string[],
): Promise<number> {
  if (athleteIds.length === 0) return 0
  const { kind, start, end } = goal

  if (kind === 'meals') {
    const days = new Set<string>()
    for (const ids of chunk(athleteIds, 100)) {
      const rows = await fetchAll(async (from, to) => admin
        .from('food_entries')
        .select('user_id, entry_date')
        .in('user_id', ids)
        .gte('entry_date', start)
        .lte('entry_date', end)
        .order('user_id', { ascending: true })
        .order('entry_date', { ascending: true })
        .range(from, to))
      for (const r of rows) days.add(`${r.user_id}|${r.entry_date}`)
    }
    return days.size
  }

  const spec = COUNTED[kind]
  const from = kind === 'sleep' ? shiftDayBy(start, -1) : start
  const to = kind === 'sleep' ? shiftDayBy(end, -1) : end

  let total = 0
  for (const ids of chunk(athleteIds, 100)) {
    let q = admin
      .from(spec.table)
      .select(spec.who, { count: 'exact', head: true })
      .in(spec.who, ids)
    q = spec.timestamp
      ? q.gte(spec.column, `${start}T00:00:00Z`).lt(spec.column, `${shiftDayBy(end, 1)}T00:00:00Z`)
      : q.gte(spec.column, from).lte(spec.column, to)
    if (spec.eq) q = q.eq(spec.eq[0], spec.eq[1])
    if (kind === 'custom') q = q.eq('challenge_id', goal.id)
    const { count, error } = await q
    if (error) throw new Error(error.message)
    total += count ?? 0
  }
  return total
}

const daysLeftTo = (end: string, today: string) =>
  Math.max(0, Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000) + 1)

export async function goalView(admin: SupabaseClient, row: GoalRow, athleteIds: string[], today: string): Promise<GoalView> {
  const label = row.kind === 'custom' ? (row.title ?? CHALLENGE_LABELS.custom) : CHALLENGE_LABELS[row.kind]
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    label,
    target: row.target,
    progress: await goalProgress(admin, { id: row.id, kind: row.kind, start: row.week_start, end: row.ends_on }, athleteIds),
    daysLeft: daysLeftTo(row.ends_on, today),
    start: row.week_start,
    ends_on: row.ends_on,
  }
}
