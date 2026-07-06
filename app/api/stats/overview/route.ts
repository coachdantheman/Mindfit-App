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

  const [journal, flow, food, sleep, workouts, assessments] = await Promise.all([
    admin.from('journal_entries').select('entry_date').eq('user_id', auth.userId).gte('entry_date', sinceDate),
    admin.from('flow_sessions').select('started_at').eq('user_id', auth.userId).gte('started_at', since.toISOString()),
    admin.from('food_entries').select('entry_date').eq('user_id', auth.userId).gte('entry_date', sinceDate),
    admin.from('sleep_entries').select('entry_date').eq('user_id', auth.userId).gte('entry_date', sinceDate),
    admin.from('workout_logs').select('log_date').eq('user_id', auth.userId).gte('log_date', sinceDate),
    admin.from('weekly_assessments').select('*').eq('user_id', auth.userId).order('week_date', { ascending: false }),
  ])

  const streak = calcActivityStreak([
    journal.data?.map(r => r.entry_date),
    flow.data?.map(r => r.started_at),
    food.data?.map(r => r.entry_date),
    sleep.data?.map(r => r.entry_date),
    workouts.data?.map(r => r.log_date),
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
