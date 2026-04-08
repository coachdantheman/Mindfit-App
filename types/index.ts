export type UserRole = 'member' | 'admin' | 'coach'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
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
  log_date: string
  category_name: string
  workout_name: string
  duration_min: number | null
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
