import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { clampNumber, isISODate, optionalString, requireString } from '@/lib/validate'
import { bestE1rm, detectPrs, prKey, type PrCandidate } from '@/lib/strength'
import type { WorkoutSource } from '@/types/exercise'

const SOURCES: WorkoutSource[] = ['custom', 'prebuilt', 'program', 'coach_program', 'coach_workout']
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_EXERCISES = 40
const MAX_SETS = 20

const uuidOrNull = (v: unknown): string | null => (typeof v === 'string' && UUID_RE.test(v) ? v : null)

function numOrNull(v: unknown, min: number, max: number): number | null | undefined {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  if (!Number.isFinite(n) || n < min || n > max) return undefined
  return n
}

interface CleanSet { set_number: number; reps: number | null; weight: number | null; rpe: number | null; notes: string | null }
interface CleanExercise { exercise_id: string | null; exercise_name: string; is_bodyweight: boolean; sets: CleanSet[] }

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  const rawLog = body?.log
  if (!rawLog || typeof rawLog !== 'object') return NextResponse.json({ error: 'Missing log.' }, { status: 400 })

  const workout_name = requireString(rawLog.workout_name, 120)
  if (!workout_name) return NextResponse.json({ error: 'Workout name is required.' }, { status: 400 })
  const source: WorkoutSource = SOURCES.includes(rawLog.source) ? rawLog.source : 'custom'
  const duration = rawLog.duration_min == null ? null : clampNumber(rawLog.duration_min, 0, 1440)
  const started_at = typeof rawLog.started_at === 'string' && !isNaN(Date.parse(rawLog.started_at)) ? new Date(rawLog.started_at).toISOString() : null

  const log = {
    workout_id: uuidOrNull(rawLog.workout_id),
    program_workout_id: uuidOrNull(rawLog.program_workout_id),
    coach_workout_id: uuidOrNull(rawLog.coach_workout_id),
    log_date: isISODate(rawLog.log_date) ? rawLog.log_date : new Date().toISOString().slice(0, 10),
    category_name: optionalString(rawLog.category_name, 60) ?? 'Custom',
    workout_name,
    duration_min: duration === null ? null : Math.round(duration),
    notes: optionalString(rawLog.notes, 2000),
    source,
    started_at,
  }

  const rawExercises = Array.isArray(body.exercises) ? body.exercises : []
  if (rawExercises.length > MAX_EXERCISES) return NextResponse.json({ error: `At most ${MAX_EXERCISES} exercises per workout.` }, { status: 400 })

  const exercises: CleanExercise[] = []
  for (const ex of rawExercises) {
    const exercise_name = requireString(ex?.exercise_name, 120)
    if (!exercise_name) return NextResponse.json({ error: 'Every exercise needs a name.' }, { status: 400 })
    const rawSets = Array.isArray(ex.sets) ? ex.sets : []
    if (rawSets.length > MAX_SETS) return NextResponse.json({ error: `At most ${MAX_SETS} sets per exercise.` }, { status: 400 })
    const sets: CleanSet[] = []
    for (const s of rawSets) {
      const reps = numOrNull(s?.reps, 0, 500)
      const weight = numOrNull(s?.weight, 0, 2000)
      const rpe = numOrNull(s?.rpe, 1, 10)
      if (reps === undefined || weight === undefined || rpe === undefined) {
        return NextResponse.json({ error: `Out-of-range set on ${exercise_name} (reps 0–500, weight 0–2000, RPE 1–10).` }, { status: 400 })
      }
      if (reps === null && weight === null) continue
      sets.push({
        set_number: sets.length + 1,
        reps: reps === null ? null : Math.round(reps),
        weight: weight === null ? null : Math.round(weight * 100) / 100,
        rpe: rpe === null ? null : Math.round(rpe),
        notes: optionalString(s?.notes, 200),
      })
    }
    if (sets.length === 0) continue
    exercises.push({ exercise_id: uuidOrNull(ex.exercise_id), exercise_name, is_bodyweight: ex.is_bodyweight === true, sets })
  }

  const admin = createAdminClient()

  // Previous best e1RM per exercise, for PR detection.
  const ids = exercises.map(e => e.exercise_id).filter((v): v is string => !!v)
  const names = exercises.filter(e => !e.exercise_id).map(e => e.exercise_name)
  const [byId, byName] = await Promise.all([
    ids.length
      ? admin.from('exercise_logs').select('exercise_id, exercise_name, reps, weight').eq('user_id', auth.userId).in('exercise_id', ids).limit(5000)
      : Promise.resolve({ data: [] as any[] }),
    names.length
      ? admin.from('exercise_logs').select('exercise_id, exercise_name, reps, weight').eq('user_id', auth.userId).is('exercise_id', null).in('exercise_name', names).limit(5000)
      : Promise.resolve({ data: [] as any[] }),
  ])
  const previous = new Map<string, number>()
  const grouped = new Map<string, { reps: number | null; weight: number | null }[]>()
  for (const row of [...(byId.data ?? []), ...(byName.data ?? [])]) {
    const key = prKey(row.exercise_id ?? null, row.exercise_name)
    const g = grouped.get(key)
    if (g) g.push(row)
    else grouped.set(key, [row])
  }
  for (const [key, rows] of grouped) previous.set(key, bestE1rm(rows))

  const candidates: PrCandidate[] = exercises
    .filter(e => !e.is_bodyweight)
    .map(e => ({ exercise_id: e.exercise_id, exercise_name: e.exercise_name, sets: e.sets }))
  const prs = detectPrs(candidates, previous)

  const p_sets = exercises.flatMap(e => e.sets.map(s => ({
    exercise_id: e.exercise_id,
    exercise_name: e.exercise_name,
    is_bodyweight: e.is_bodyweight,
    set_number: s.set_number,
    reps: s.reps,
    weight: s.weight,
    rpe: s.rpe,
    notes: s.notes,
  })))

  const { data: id, error } = await admin.rpc('log_workout_session', {
    p_user_id: auth.userId,
    p_log: log,
    p_sets,
  })

  if (error || !id) {
    console.error('log_workout_session failed:', error?.message)
    return NextResponse.json({ error: "Couldn't save the workout. Nothing was written — try again." }, { status: 500 })
  }

  return NextResponse.json({ id, prs }, { status: 201 })
}
