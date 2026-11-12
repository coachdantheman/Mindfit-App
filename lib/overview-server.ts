import type { SupabaseClient } from '@supabase/supabase-js'
import { activityStreakOf, localDateISO } from '@/lib/streaks'
import { calcMPI } from '@/lib/mpi'

export interface OverviewStats { streak: number; freezes: number; savedYesterday: boolean; latestMpi: number | null; baselineMpi: number | null }

// Activity streak (any log keeps it alive) + latest/baseline MPI for one user.
export async function loadOverview(admin: SupabaseClient, userId: string): Promise<OverviewStats> {
  const since = new Date()
  since.setDate(since.getDate() - 60)
  const sinceDate = since.toISOString().split('T')[0]

  const [days, assessments] = await Promise.all([
    admin.rpc('get_user_activity_dates', { p_user: userId, p_since: sinceDate }),
    admin.from('weekly_assessments').select('*').eq('user_id', userId).order('week_date', { ascending: false }),
  ])

  const activeDays = new Set<string>()
  for (const value of [
    ...((days.data ?? []) as { day: string }[]).map(r => r.day),
    ...(assessments.data?.filter(a => a.week_date >= sinceDate).map(a => a.week_date) ?? []),
  ]) {
    if (value) activeDays.add(value.length === 10 ? value : localDateISO(new Date(value)))
  }
  const { streak, freezes, savedYesterday } = activityStreakOf(activeDays)

  const all = assessments.data ?? []
  const latest = all[0] ?? null
  const baseline = [...all].reverse().find(a => a.assessment_type === 'baseline') ?? null

  return {
    streak,
    freezes,
    savedYesterday,
    latestMpi: latest ? calcMPI(latest) : null,
    baselineMpi: baseline ? calcMPI(baseline) : null,
  }
}
