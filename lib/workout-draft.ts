import type { ExerciseLibraryRow, ExerciseMeasure, StartWorkoutInput, WorkoutSource } from '@/types/exercise'
import { matchExercise } from '@/lib/exercise-library'
import { toLocalDateString } from '@/lib/programs'

export const DRAFT_KEY = 'mindfit.workout-draft.v1'
export const DRAFT_VERSION = 1 as const

export interface DraftSet {
  setNumber: number
  targetReps: string | null   // plan target, shown as placeholder only
  reps: string
  weight: string
  rpe: string
  done: boolean
}

export interface DraftExercise {
  key: string
  exerciseId: string | null
  name: string
  measure: ExerciseMeasure
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
  return { setNumber, targetReps, reps: '', weight: '', rpe: '', done: false }
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
    isBodyweight: measure !== 'weight_reps',
    notes: '',
    sets: Array.from({ length: count }, (_, i) => emptySet(i + 1, targetReps)),
  }
}

export function exerciseFromLibrary(row: ExerciseLibraryRow, sets = 3): DraftExercise {
  return {
    key: nextKey(),
    exerciseId: row.id,
    name: row.name,
    measure: row.measure,
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
    exercises: input.exercises.map(ex => exerciseFromPlan(ex.name, ex.sets, ex.reps || null, library)),
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
    for (const s of ex.sets) {
      if (!s.done) continue
      const reps = toInt(s.reps)
      const weight = ex.isBodyweight ? toNum(s.weight) : toNum(s.weight)
      if (reps === null && weight === null) continue
      sets.push({
        set_number: sets.length + 1,
        reps,
        weight,
        rpe: toInt(s.rpe),
        notes: null,
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
