import type { DistanceUnit, ExerciseLibraryRow, ExerciseMeasure, StartWorkoutInput, WorkoutSource } from '@/types/exercise'
import { defaultUnit, parseTime } from '@/lib/running'
import { matchExercise } from '@/lib/exercise-library'
import { toLocalDateString } from '@/lib/programs'

export const DRAFT_KEY = 'mindfit.workout-draft.v1'
export const DRAFT_VERSION = 1 as const

export interface DraftSet {
  setNumber: number
  targetReps: string | null   // plan target (reps, or distance for runs), shown as placeholder only
  reps: string
  weight: string
  rpe: string
  distance: string            // distance_time only
  time: string                // distance_time only, "4.62" / "5:30" / "1:02:10"
  rest: string                // distance_time only, seconds
  done: boolean
}

export interface DraftExercise {
  key: string
  exerciseId: string | null
  name: string
  measure: ExerciseMeasure
  unit: DistanceUnit | null   // distance_time only
  isBodyweight: boolean
  notes: string
  sets: DraftSet[]
}

export interface WorkoutDraft {
  version: typeof DRAFT_VERSION
  startedAt: string
  updatedAt: string
  name: string
  categoryName: string
  source: WorkoutSource
  workoutId: string | null
  programWorkoutId: string | null
  coachWorkoutId: string | null
  notes: string
  exercises: DraftExercise[]
}

let keyCounter = 0
export function nextKey(): string {
  keyCounter += 1
  return `d${Date.now().toString(36)}${keyCounter}`
}

export function emptySet(setNumber: number, targetReps: string | null = null): DraftSet {
  return { setNumber, targetReps, reps: '', weight: '', rpe: '', distance: '', time: '', rest: '', done: false }
}

// Plan "reps" strings like "8-10", "30 sec", "5 each" are targets, never
// performed reps: they go to targetReps (placeholder) and reps stays ''.
export function exerciseFromPlan(name: string, sets: number, targetReps: string | null, library: ExerciseLibraryRow[]): DraftExercise {
  const match = matchExercise(library, name)
  const count = Math.max(1, Math.min(20, Math.round(sets || 3)))
  const measure = match?.measure ?? 'weight_reps'
  return {
    key: nextKey(),
    exerciseId: match?.id ?? null,
    name: match?.name ?? name,
    measure,
    unit: measure === 'distance_time' ? defaultUnit(match?.slug, name) : null,
    isBodyweight: measure !== 'weight_reps',
    notes: '',
    sets: Array.from({ length: count }, (_, i) => emptySet(i + 1, targetReps)),
  }
}

// Repeat of a logged workout: one set per previous set, previous reps as placeholder.
export function exerciseFromHistory(name: string, reps: (string | null)[], library: ExerciseLibraryRow[]): DraftExercise {
  const ex = exerciseFromPlan(name, Math.max(1, reps.length), null, library)
  ex.sets = ex.sets.map((s, i) => ({ ...s, targetReps: reps[i] || null }))
  return ex
}

export function exerciseFromLibrary(row: ExerciseLibraryRow, sets = 3): DraftExercise {
  return {
    key: nextKey(),
    exerciseId: row.id,
    name: row.name,
    measure: row.measure,
    unit: row.measure === 'distance_time' ? defaultUnit(row.slug, row.name) : null,
    isBodyweight: row.measure !== 'weight_reps',
    notes: '',
    sets: Array.from({ length: sets }, (_, i) => emptySet(i + 1)),
  }
}

export function draftFromWorkout(input: StartWorkoutInput, library: ExerciseLibraryRow[], now: Date = new Date()): WorkoutDraft {
  const iso = now.toISOString()
  return {
    version: DRAFT_VERSION,
    startedAt: iso,
    updatedAt: iso,
    name: input.name,
    categoryName: input.categoryName,
    source: input.source,
    workoutId: input.workoutId ?? null,
    programWorkoutId: input.programWorkoutId ?? null,
    coachWorkoutId: input.coachWorkoutId ?? null,
    notes: '',
    exercises: input.prefill?.length
      ? input.prefill.map(p => exerciseFromHistory(p.name, p.reps, library))
      : input.exercises.map(ex => exerciseFromPlan(ex.name, ex.sets, ex.reps || null, library)),
  }
}

export function emptyDraft(now: Date = new Date()): WorkoutDraft {
  return draftFromWorkout({ name: '', categoryName: 'Custom', exercises: [], source: 'custom' }, [], now)
}

export interface SessionSetPayload {
  set_number: number
  reps: number | null
  weight: number | null
  rpe: number | null
  notes: string | null
  distance: number | null
  distance_unit: DistanceUnit | null
  duration_sec: number | null
  rest_sec: number | null
}

export interface SessionExercisePayload {
  exercise_id: string | null
  exercise_name: string
  is_bodyweight: boolean
  sets: SessionSetPayload[]
}

export interface SessionPayload {
  log: {
    workout_id: string | null
    program_workout_id: string | null
    coach_workout_id: string | null
    category_name: string
    workout_name: string
    duration_min: number | null
    notes: string | null
    source: WorkoutSource
    started_at: string
    log_date: string
  }
  exercises: SessionExercisePayload[]
}

const toInt = (s: string): number | null => {
  const n = parseInt(s, 10)
  return Number.isFinite(n) ? n : null
}
const toNum = (s: string): number | null => {
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

// Only sets marked done that carry reps or weight are saved; set numbers
// are renumbered so history reads 1..n.
export function draftToSessionPayload(draft: WorkoutDraft, finishedAt: Date = new Date()): SessionPayload {
  const started = new Date(draft.startedAt)
  const minutes = Math.max(0, Math.round((finishedAt.getTime() - started.getTime()) / 60000))
  const exercises: SessionExercisePayload[] = []
  for (const ex of draft.exercises) {
    if (!ex.name.trim()) continue
    const sets: SessionSetPayload[] = []
    const timed = ex.measure === 'distance_time'
    for (const s of ex.sets) {
      if (!s.done) continue
      const reps = timed ? null : toInt(s.reps)
      const weight = timed ? null : toNum(s.weight)
      const distance = timed ? toNum(s.distance) : null
      const duration_sec = timed ? parseTime(s.time) : null
      if (reps === null && weight === null && distance === null && duration_sec === null) continue
      sets.push({
        set_number: sets.length + 1,
        reps,
        weight,
        rpe: toInt(s.rpe),
        notes: null,
        distance,
        distance_unit: timed && distance !== null ? ex.unit : null,
        duration_sec,
        rest_sec: timed ? toInt(s.rest) : null,
      })
    }
    if (sets.length === 0) continue
    exercises.push({
      exercise_id: ex.exerciseId,
      exercise_name: ex.name.trim(),
      is_bodyweight: ex.isBodyweight,
      sets,
    })
  }
  return {
    log: {
      workout_id: draft.workoutId,
      program_workout_id: draft.programWorkoutId,
      coach_workout_id: draft.coachWorkoutId,
      category_name: draft.categoryName || 'Custom',
      workout_name: draft.name.trim() || 'Workout',
      duration_min: minutes > 0 ? minutes : null,
      notes: draft.notes.trim() || null,
      source: draft.source,
      started_at: draft.startedAt,
      log_date: toLocalDateString(finishedAt),
    },
    exercises,
  }
}

export function draftStats(draft: WorkoutDraft): { doneSets: number; totalSets: number; volume: number } {
  let doneSets = 0
  let totalSets = 0
  let volume = 0
  for (const ex of draft.exercises) {
    for (const s of ex.sets) {
      totalSets++
      if (!s.done) continue
      doneSets++
      const r = toInt(s.reps) ?? 0
      const w = toNum(s.weight) ?? 0
      volume += r * w
    }
  }
  return { doneSets, totalSets, volume: Math.round(volume) }
}

// Version guard: anything that isn't a v1 draft with an exercises array is
// ignored (and should be cleared by the caller).
export function parseDraft(raw: string | null): WorkoutDraft | null {
  if (!raw) return null
  try {
    const d = JSON.parse(raw)
    if (!d || d.version !== DRAFT_VERSION || !Array.isArray(d.exercises) || typeof d.startedAt !== 'string') return null
    // Drafts saved before runs/sprints lack the distance fields.
    for (const ex of d.exercises) {
      if (ex.unit === undefined) ex.unit = ex.measure === 'distance_time' ? defaultUnit(null, ex.name ?? '') : null
      for (const s of ex.sets ?? []) {
        s.distance ??= ''
        s.time ??= ''
        s.rest ??= ''
      }
    }
    return d as WorkoutDraft
  } catch {
    return null
  }
}

export function loadDraft(): WorkoutDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const d = parseDraft(window.localStorage.getItem(DRAFT_KEY))
    if (!d) window.localStorage.removeItem(DRAFT_KEY)
    return d
  } catch {
    return null
  }
}

export function saveDraft(draft: WorkoutDraft): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, updatedAt: new Date().toISOString() })) } catch {}
}

export function clearDraft(): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(DRAFT_KEY) } catch {}
}
