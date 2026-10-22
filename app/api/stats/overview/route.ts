import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { calcActivityStreak } from '@/lib/streaks'
import { calcMPI } from '@/lib/mpi'

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const since = new Date()
  since.setDate(since.getDate() - 60)
  const sinceDate = since.toISOString().split('T')[0]

  // Any logged activity keeps the streak alive — even a single small entry.
  const dates = async (table: string, col: string, floor: string): Promise<string[]> =>
    admin.from(table).select(col).eq('user_id', auth.userId).gte(col, floor)
      .then(r => ((r.data ?? []) as unknown as Record<string, string>[]).map(row => row[col]))
  const byDate = (table: string, col: string) => dates(table, col, sinceDate)
  const byTimestamp = (table: string, col: string) => dates(table, col, since.toISOString())

  const [journal, flow, food, sleep, workouts, recovery, visualization, meditation, affirmations, goals, weighIns, assessments] = await Promise.all([
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
    admin.from('weekly_assessments').select('*').eq('user_id', auth.userId).order('week_date', { ascending: false }),
  ])

  const streak = calcActivityStreak([
    journal, flow, food, sleep, workouts, recovery, visualization, meditation, affirmations, goals, weighIns,
    assessments.data?.filter(a => a.week_date >= sinceDate).map(a => a.week_date),
  ])

  const all = assessments.data ?? []
  const latest = all[0] ?? null
  const baseline = [...all].reverse().find(a => a.assessment_type === 'baseline') ?? null

  return NextResponse.json({
    streak,
    latestMpi: latest ? calcMPI(latest) : null,
    baselineMpi: baseline ? calcMPI(baseline) : null,
  })
}
