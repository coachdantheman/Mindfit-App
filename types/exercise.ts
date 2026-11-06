import type { ExerciseLog, TrainingProgram, WorkoutLog, WorkoutExercise } from '@/types'

export type Sex = 'male' | 'female'

export interface AthleteProfile {
  user_id: string
  sex: Sex
  bodyweight_lb: number
  age: number
  created_at: string
  updated_at: string
}

export type ExerciseMeasure = 'weight_reps' | 'reps' | 'distance_in' | 'time_sec' | 'distance_time'

export type DistanceUnit = 'yd' | 'm' | 'mi' | 'km'

export type StandardKey =
  | 'bench' | 'squat' | 'deadlift' | 'ohp' | 'power_clean' | 'front_squat'
  | 'hip_thrust' | 'row' | 'pullup' | 'pushup' | 'vertical_jump' | 'broad_jump'

export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'glutes' | 'core'
  | 'full_body' | 'conditioning' | 'mobility'

export interface ExerciseLibraryRow {
  id: string
  user_id: string | null
  slug: string
  name: string
  aliases: string[]
  muscle_group: MuscleGroup
  equipment: string
  measure: ExerciseMeasure
  standard_key: StandardKey | null
  source: 'curated' | 'user'
  created_at?: string
}

export type WorkoutSource = 'custom' | 'prebuilt' | 'program' | 'coach_program' | 'coach_workout'

export type ExerciseLogRow = ExerciseLog & {
  exercise_id: string | null
  is_bodyweight: boolean
  distance: number | null
  distance_unit: DistanceUnit | null
  duration_sec: number | null
  rest_sec: number | null
}

export type WorkoutLogRow = WorkoutLog & {
  source: WorkoutSource
  started_at: string | null
  exercise_logs?: ExerciseLogRow[]
}

export type TrainingProgramRow = TrainingProgram & { start_date: string | null }

export type CoachProgramRow = TrainingProgramRow & { label: string; coach_name: string }

export type StrengthTier = 'untrained' | 'beginner' | 'novice' | 'intermediate' | 'advanced' | 'elite'

export interface StartWorkoutInput {
  name: string
  categoryName: string
  exercises: WorkoutExercise[]
  source: WorkoutSource
  workoutId?: string | null
  programWorkoutId?: string | null
  coachWorkoutId?: string | null
  // Repeating a logged workout: last session's reps per set become the placeholders.
  prefill?: { name: string; reps: (string | null)[] }[]
}

export interface SessionPr {
  exercise_id: string | null
  exercise_name: string
  e1rm: number
  previous: number | null
}

export interface CustomWorkoutSet {
  set_number: number
  reps: number | null
  weight: number | null
  distance: number | null
  distance_unit: DistanceUnit | null
  duration_sec: number | null
}

export interface CustomWorkoutRow {
  id: string
  name: string
  category: string
  exercises: { exercise_id: string | null; exercise_name: string; is_bodyweight: boolean; sets: CustomWorkoutSet[] }[]
  times_done: number
  last_done_at: string
}
