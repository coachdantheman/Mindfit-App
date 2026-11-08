import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { bestE1rm, evaluateLift, prsFromSeries, sessionMaxSeries, sessionSeries } from '@/lib/strength'
import type { AthleteProfile, ExerciseLibraryRow } from '@/types/exercise'
import { distanceTimeSeries, lowsFromSeries } from '@/lib/running'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// { series, best, prs, tier?, measure } for one exercise (by id, or by
// name for unlinked history).
export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const exerciseId = searchParams.get('exercise_id')
  const name = searchParams.get('name')?.trim()
  if ((!exerciseId || !UUID_RE.test(exerciseId)) && !name) {
    return NextResponse.json({ error: 'exercise_id or name required' }, { status: 400 })
  }

  const admin = createAdminClient()
  let query = admin
    .from('exercise_logs')
    .select('workout_log_id, set_number, reps, weight, rpe, distance, distance_unit, duration_sec, created_at')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: true })
    .limit(3000)
  query = exerciseId && UUID_RE.test(exerciseId) ? query.eq('exercise_id', exerciseId) : query.is('exercise_id', null).eq('exercise_name', name!)

  const [{ data: sets, error }, { data: exercise }, { data: profile }] = await Promise.all([
    query,
    exerciseId && UUID_RE.test(exerciseId)
      ? admin.from('exercise_library').select('*').eq('id', exerciseId).maybeSingle()
      : Promise.resolve({ data: null as ExerciseLibraryRow | null }),
    admin.from('athlete_profiles').select('*').eq('user_id', auth.userId).maybeSingle(),
  ])
  if (error) return dbError(error)

  const rows = (sets ?? []).map(s => ({
    ...s,
    weight: s.weight == null ? null : Number(s.weight),
    distance: s.distance == null ? null : Number(s.distance),
    duration_sec: s.duration_sec == null ? null : Number(s.duration_sec),
  }))
  const lib = exercise as ExerciseLibraryRow | null
  const measure = lib?.measure ?? (rows.some(r => r.duration_sec != null || r.distance != null) ? 'distance_time' : 'weight_reps')

  // Runs and sprints: lower is better, so the series and PRs come from
  // lib/running instead of the e1RM helpers.
  if (measure === 'distance_time') {
    const dt = distanceTimeSeries(rows)
    const series = (dt?.series ?? []).map(p => ({ date: p.date, e1rm: p.value, topSet: null, workout_log_id: p.workout_log_id }))
    const best = series.length ? Math.min(...series.map(p => p.e1rm)) : 0
    const prs = lowsFromSeries(dt?.series ?? []).map(p => ({ date: p.date, e1rm: p.value, topSet: null, workout_log_id: p.workout_log_id }))
    return NextResponse.json({ measure, series, best, prs, tier: null, exercise: lib, timed: dt ? { metric: dt.metric, unit: dt.unit, refDistance: dt.refDistance } : null })
  }

  const series = measure === 'weight_reps'
    ? sessionSeries(rows)
    : sessionMaxSeries(rows, measure === 'distance_in' ? 'weight' : 'reps')
  const best = measure === 'weight_reps' ? bestE1rm(rows) : (series.length ? Math.max(...series.map(p => p.e1rm)) : 0)
  const prs = prsFromSeries(series)

  let tier: ReturnType<typeof evaluateLift> | null = null
  const ap = profile as AthleteProfile | null
  if (lib?.standard_key && ap && best > 0) {
    tier = measure === 'weight_reps'
      ? evaluateLift({ key: lib.standard_key, sex: ap.sex, bodyweight_lb: Number(ap.bodyweight_lb), age: ap.age, weight: best, reps: 1 })
      : evaluateLift({ key: lib.standard_key, sex: ap.sex, bodyweight_lb: Number(ap.bodyweight_lb), age: ap.age, value: best })
  }

  return NextResponse.json({ measure, series, best, prs, tier, exercise: lib })
}
