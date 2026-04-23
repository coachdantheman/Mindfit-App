export type UserRole = 'member' | 'admin' | 'coach'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  primary_sport: string | null
  secondary_sport: string | null
  next_competition_at: string | null
  created_at: string
}

export interface JournalEntry {
  id: string
  user_id: string
  entry_date: string          // 'YYYY-MM-DD'
  objective: string
  action_step_1: string
  action_step_2: string
  action_step_3: string
  strength_1: string
  strength_2: string
  strength_3: string
  weakness: string
  extra_notes: string | null
  rating_motivation: number   // 1–10
  rating_focus: number        // 1–10
  rating_confidence: number   // 1–10
  rating_anxiety: number      // 1–10
  created_at: string
}

export interface JournalFormData {
  objective: string
  action_step_1: string
  action_step_2: string
  action_step_3: string
  strength_1: string
  strength_2: string
  strength_3: string
  weakness: string
  extra_notes: string
  rating_motivation: number
  rating_focus: number
  rating_confidence: number
  rating_anxiety: number
}

export interface ApprovedEmail {
  id: string
  email: string
  notes: string | null
  registered: boolean
  added_by: string | null
  added_at: string
}

export interface MemberWithCount extends Profile {
  entry_count: number
}

export interface CoachAthlete {
  id: string
  coach_id: string
  athlete_id: string
  created_at: string
}

// Nutrition
export interface NutritionGoal {
  id: string
  user_id: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  mode: 'absolute' | 'percentage'
  protein_pct: number
  carbs_pct: number
  fat_pct: number
  updated_at: string
}

export interface FoodEntry {
  id: string
  user_id: string
  entry_date: string
  meal_name: string
  food_name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  created_at: string
}

// Exercise
export interface WorkoutCategory {
  id: string
  name: string
  description: string | null
  sort_order: number
}

export interface WorkoutExercise {
  name: string
  sets: number
  reps: string
  notes: string
}

export interface Workout {
  id: string
  category_id: string
  name: string
  description: string | null
  exercises: WorkoutExercise[]
  sort_order: number
}

export interface WorkoutLog {
  id: string
  user_id: string
  workout_id: string | null
  program_workout_id: string | null
  coach_workout_id: string | null
  log_date: string
  category_name: string
  workout_name: string
  duration_min: number | null
  notes: string | null
  created_at: string
  exercise_logs?: ExerciseLog[]
}

// Training Programs
export interface TrainingProgram {
  id: string
  user_id: string
  created_by: string
  title: string
  sport: string | null
  goals: string[]
  description: string | null
  duration_weeks: number
  is_active: boolean
  source: 'ai' | 'coach' | 'self'
  created_at: string
  blocks?: ProgramBlock[]
}

export interface ProgramBlock {
  id: string
  program_id: string
  name: string
  week_start: number
  week_end: number
  focus: string | null
  sort_order: number
  workouts?: ProgramWorkout[]
}

export interface ProgramWorkout {
  id: string
  block_id: string
  program_id: string
  day_of_week: number
  week_number: number
  name: string
  description: string | null
  exercises: WorkoutExercise[]
  sort_order: number
}

export interface CoachWorkout {
  id: string
  coach_id: string
  athlete_id: string
  name: string
  description: string | null
  exercises: WorkoutExercise[]
  assigned_date: string | null
  is_completed: boolean
  created_at: string
}

export interface CoachProgramAssignment {
  id: string
  program_id: string
  athlete_id: string
  coach_id: string
  label: string
  assigned_at: string
}

export interface ExerciseLog {
  id: string
  user_id: string
  workout_log_id: string | null
  exercise_name: string
  set_number: number
  reps: number | null
  weight: number | null
  rpe: number | null
  notes: string | null
  created_at: string
}

// Mindset
export interface VisualizationEntry {
  id: string
  user_id: string
  entry_date: string
  completed: boolean
  duration_min: number | null
  notes: string | null
  created_at: string
}

export interface MeditationEntry {
  id: string
  user_id: string
  entry_date: string
  completed: boolean
  duration_min: number | null
  meditation_type: string | null
  notes: string | null
  created_at: string
}

export interface Affirmation {
  id: string
  user_id: string
  text: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export type GoalType = 'weekly' | 'season' | 'year'

export interface Goal {
  id: string
  user_id: string
  goal_type: GoalType
  title: string
  description: string | null
  target_date: string | null
  progress: number
  is_completed: boolean
  created_at: string
}

// Weekly Assessment
export interface WeeklyAssessment {
  id: string
  user_id: string
  week_date: string
  self_identity_clarity: number
  confidence: number
  focus_quality: number
  anxiety_management: number
  resilience: number
  motivation: number
  mental_imagery: number
  routine_consistency: number
  team_relationships: number
  vision_clarity: number
  notes: string | null
  created_at: string
}

// Sleep & Recovery
export interface SleepEntry {
  id: string
  user_id: string
  entry_date: string
  bedtime: string | null
  wake_time: string | null
  hours_slept: number | null
  sleep_quality: number | null
  notes: string | null
  created_at: string
}

export interface RecoveryEntry {
  id: string
  user_id: string
  entry_date: string
  is_rest_day: boolean
  activities: { type: string; duration_min: number }[]
  notes: string | null
  created_at: string
}

// Flow State
export type FlowStage = 'struggle' | 'release' | 'flow' | 'recovery'
export type FlowTrigger =
  | 'clear_goals'
  | 'immediate_feedback'
  | 'challenge_skill_balance'
  | 'deep_focus'
  | 'risk_consequence'
  | 'novelty_complexity'
  | 'deep_embodiment'
export type FiveAStep = 'A1' | 'A2' | 'A3' | 'A4' | 'A5'

export interface FlowSession {
  id: string
  user_id: string
  started_at: string
  completed_at: string | null
  identity_statement: string | null
  aim: string | null
  cue_word: string | null
  external_target: string | null
  sport: string | null
  skipped_steps: FiveAStep[]
  created_at: string
}

export interface FlowLog {
  id: string
  user_id: string
  flow_session_id: string | null
  logged_at: string
  sport: string | null
  challenge_level: number
  skill_level: number
  flow_score: number
  ending_stage: FlowStage | null
  triggers_fired: FlowTrigger[]
  journal_note: string | null
  created_at: string
}

export interface FlowStageCheckin {
  id: string
  user_id: string
  stage: FlowStage
  note: string | null
  checked_at: string
  created_at: string
}

export interface FlowCueWord {
  id: string
  user_id: string
  cue_word: string
  is_active: boolean
  created_at: string
}

export interface FlowCoachNote {
  id: string
  athlete_id: string
  coach_id: string
  note: string
  created_at: string
  updated_at: string
}

export interface FlowInsights {
  avg_flow_score: number | null
  flow_pct: number | null
  most_common_stage: FlowStage | null
  top_trigger: FlowTrigger | null
  recommendation: string
  coach_note: string | null
  sessions_7d: number
  logs_7d: number
}
