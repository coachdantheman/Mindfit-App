import type { SupabaseClient } from '@supabase/supabase-js'
import { calcActivityStreak } from '@/lib/streaks'
import { calcMPI } from '@/lib/mpi'

export interface OverviewStats { streak: number; latestMpi: number | null; baselineMpi: number | null }

// Activity streak (any log keeps it alive) + latest/baseline MPI for one user.
export async function loadOverview(admin: SupabaseClient, userId: string): Promise<OverviewStats> {
  const since = new Date()
  since.setDate(since.getDate() - 60)
  const sinceDate = since.toISOString().split('T')[0]

  const [days, assessments] = await Promise.all([
    admin.rpc('get_user_activity_dates', { p_user: userId, p_since: sinceDate }),
    admin.from('weekly_assessments').select('*').eq('user_id', userId).order('week_date', { ascending: false }),
  ])

  const streak = calcActivityStreak([
    ((days.data ?? []) as { day: string }[]).map(r => r.day),
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
