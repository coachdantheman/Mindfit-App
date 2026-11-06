import type { SupabaseClient } from '@supabase/supabase-js'
import { calcActivityStreak } from '@/lib/streaks'
import { calcMPI } from '@/lib/mpi'
import { shiftDate } from '@/lib/nutrition'

export interface OverviewStats { streak: number; latestMpi: number | null; baselineMpi: number | null }

// Activity streak (any log keeps it alive) + latest/baseline MPI for one user.
export async function loadOverview(admin: SupabaseClient, userId: string): Promise<OverviewStats> {
  const since = new Date()
  since.setDate(since.getDate() - 60)
  const sinceDate = since.toISOString().split('T')[0]

  const dates = async (table: string, col: string, floor: string): Promise<string[]> =>
    admin.from(table).select(col).eq('user_id', userId).gte(col, floor)
      .then(r => ((r.data ?? []) as unknown as Record<string, string>[]).map(row => row[col]))
  const byDate = (table: string, col: string) => dates(table, col, sinceDate)
  const byTimestamp = (table: string, col: string) => dates(table, col, since.toISOString())

  const [journal, flow, food, sleep, workouts, recovery, visualization, meditation, affirmations, goals, weighIns, assessments, gratitude] = await Promise.all([
    byDate('journal_entries', 'entry_date'),
    byTimestamp('flow_sessions', 'started_at'),
    byDate('food_entries', 'entry_date'),
    byDate('sleep_entries', 'entry_date'),
    byDate('workout_logs', 'log_date'),
    byDate('recovery_entries', 'entry_date'),
    byDate('visualization_entries', 'entry_date'),
    byDate('meditation_entries', 'entry_date'),
    byTimestamp('affirmations', 'created_at'),
    byTimestamp('goals', 'created_at'),
    byDate('weigh_ins', 'entry_date'),
    admin.from('weekly_assessments').select('*').eq('user_id', userId).order('week_date', { ascending: false }),
    byDate('gratitude_entries', 'entry_date'),
  ])

  // Sleep is logged for the night before, so it counts on the wake-up day.
  const sleepWakeDays = sleep.map(d => shiftDate(d, 1))
  const streak = calcActivityStreak([
    journal, flow, food, sleepWakeDays, workouts, recovery, visualization, meditation, affirmations, goals, weighIns, gratitude,
    assessments.data?.filter(a => a.week_date >= sinceDate).map(a => a.week_date),
  ])

  const all = assessments.data ?? []
  const latest = all[0] ?? null
  const baseline = [...all].reverse().find(a => a.assessment_type === 'baseline') ?? null

  return {
    streak,
    latestMpi: latest ? calcMPI(latest) : null,
    baselineMpi: baseline ? calcMPI(baseline) : null,
  }
}
