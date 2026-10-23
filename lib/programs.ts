import type { ProgramWorkout, TrainingProgram, WorkoutExercise } from '@/types'

export const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const DAY_NAMES_LONG = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

type ProgramLike = Pick<TrainingProgram, 'duration_weeks' | 'blocks'> & { start_date?: string | null }

export function isoDayOfWeek(d: Date): number {
  const js = d.getDay()
  return js === 0 ? 7 : js
}

// 'YYYY-MM-DD' → local-midnight Date (no timezone shift).
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function mondayOf(d: Date): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  m.setDate(m.getDate() - (isoDayOfWeek(m) - 1))
  return m
}

export type ProgramStatus = 'upcoming' | 'active' | 'complete'

// Week 1 is the Mon–Sun week containing start_date. Clamped to
// 1..duration; `status` says whether today is before, inside or after.
export function currentWeek(startDate: string | null | undefined, durationWeeks: number, today: Date = new Date()): { week: number; status: ProgramStatus } {
  const duration = Math.max(1, durationWeeks || 1)
  if (!startDate) return { week: 1, status: 'active' }
  const start = mondayOf(parseLocalDate(startDate))
  const now = mondayOf(today)
  const diffDays = Math.round((now.getTime() - start.getTime()) / 86400000)
  const raw = Math.floor(diffDays / 7) + 1
  if (raw < 1) return { week: 1, status: 'upcoming' }
  if (raw > duration) return { week: duration, status: 'complete' }
  return { week: raw, status: 'active' }
}

export function workoutsForWeek(program: ProgramLike, week: number): ProgramWorkout[] {
  const all: ProgramWorkout[] = []
  for (const b of program.blocks ?? []) {
    for (const w of b.workouts ?? []) if (w.week_number === week) all.push(w)
  }
  return all.sort((a, b) => a.day_of_week - b.day_of_week || a.sort_order - b.sort_order)
}

export function todaysWorkout(program: ProgramLike, today: Date = new Date()): ProgramWorkout | null {
  const { week, status } = currentWeek(program.start_date, program.duration_weeks, today)
  if (status !== 'active') return null
  const dow = isoDayOfWeek(today)
  return workoutsForWeek(program, week).find(w => w.day_of_week === dow) ?? null
}

// The next scheduled workout strictly after today: later this week, else
// the first one of the next week, else null when the plan is done.
export function nextWorkout(program: ProgramLike, today: Date = new Date()): { workout: ProgramWorkout; week: number } | null {
  const { week, status } = currentWeek(program.start_date, program.duration_weeks, today)
  if (status === 'complete') return null
  const dow = status === 'upcoming' ? 0 : isoDayOfWeek(today)
  const later = workoutsForWeek(program, week).find(w => w.day_of_week > dow)
  if (later) return { workout: later, week }
  for (let w = week + 1; w <= program.duration_weeks; w++) {
    const first = workoutsForWeek(program, w)[0]
    if (first) return { workout: first, week: w }
  }
  return null
}

// ─── Builders (output = POST /api/exercise/programs body) ──────────────────

export interface PlanWorkoutInput {
  name: string
  description: string
  day_of_week: number
  week_number: number
  exercises: WorkoutExercise[]
}

export interface PlanBlockInput {
  name: string
  focus: string
  week_start: number
  week_end: number
  workouts: PlanWorkoutInput[]
}

export interface PlanPayload {
  title: string
  description: string
  sport: string | null
  goals: string[]
  duration_weeks: number
  start_date: string
  source: 'self' | 'ai'
  blocks: PlanBlockInput[]
}

export interface DayTemplate {
  day_of_week: number
  name: string
  description: string
  exercises: WorkoutExercise[]
}

export interface FromScratchInput {
  title: string
  description?: string
  sport?: string | null
  goals?: string[]
  duration_weeks: number
  start_date: string
  days: DayTemplate[]
}

function cloneExercises(exs: WorkoutExercise[]): WorkoutExercise[] {
  return exs.map(e => ({ name: e.name, sets: e.sets, reps: e.reps, notes: e.notes ?? '' }))
}

// One block, the week template cloned to every week.
export function buildFromScratch(input: FromScratchInput): PlanPayload {
  const duration = Math.max(1, Math.min(52, Math.round(input.duration_weeks || 1)))
  const days = [...input.days]
    .filter(d => d.exercises.length > 0)
    .sort((a, b) => a.day_of_week - b.day_of_week)
  const workouts: PlanWorkoutInput[] = []
  for (let week = 1; week <= duration; week++) {
    for (const d of days) {
      workouts.push({
        name: d.name.trim() || 'Workout',
        description: d.description ?? '',
        day_of_week: d.day_of_week,
        week_number: week,
        exercises: cloneExercises(d.exercises),
      })
    }
  }
  return {
    title: input.title.trim() || 'My Plan',
    description: input.description ?? '',
    sport: input.sport ?? null,
    goals: input.goals ?? [],
    duration_weeks: duration,
    start_date: input.start_date,
    source: 'self',
    blocks: [{ name: 'Plan', focus: '', week_start: 1, week_end: duration, workouts }],
  }
}

// AI returns one week of workouts per block — expand to fill the block's
// weeks. Same behaviour as the old BuildYourPlan expansion.
export function expandAiBlocks(data: any, durationWeeks: number): PlanBlockInput[] {
  const blocks: PlanBlockInput[] = []
  const raw: any[] = Array.isArray(data?.blocks) ? data.blocks : []
  raw.forEach((block, bi) => {
    const weekStart = block?.week_start || bi * 4 + 1
    const weekEnd = block?.week_end || Math.min((bi + 1) * 4, durationWeeks)
    const templates = (block?.workouts || []).filter((w: any) => (w?.exercises || []).length > 0)
    if (templates.length === 0) return
    const workouts: PlanWorkoutInput[] = []
    for (let week = weekStart; week <= weekEnd; week++) {
      templates.forEach((w: any) => {
        workouts.push({
          name: w.name || 'Workout',
          description: w.description || '',
          day_of_week: w.day_of_week || 1,
          week_number: week,
          exercises: (w.exercises || []).map((ex: any) => ({
            name: ex.name || '',
            sets: ex.sets || 3,
            reps: String(ex.reps || '10'),
            notes: ex.notes || '',
          })),
        })
      })
    }
    blocks.push({
      name: block.name || `Phase ${bi + 1}`,
      focus: block.focus || '',
      week_start: weekStart,
      week_end: weekEnd,
      workouts,
    })
  })
  return blocks
}

interface TemplateLike {
  title: string
  description: string
  blocks: { name: string; focus: string; workouts: { name: string; description: string; day_of_week: number; exercises: WorkoutExercise[] }[] }[]
}

// generatePlanTemplate() → PlanBlockInput[] (template blocks repeat one
// week's workouts per week; keep the first of each day and clone it).
export function expandTemplate(plan: TemplateLike, durationWeeks: number): PlanBlockInput[] {
  return plan.blocks.map((block, bi) => {
    const weekStart = bi * 4 + 1
    const weekEnd = Math.min((bi + 1) * 4, durationWeeks)
    const seen = new Set<number>()
    const days = block.workouts.filter(w => !seen.has(w.day_of_week) && (seen.add(w.day_of_week), true))
    const workouts: PlanWorkoutInput[] = []
    for (let week = weekStart; week <= weekEnd; week++) {
      for (const w of days) {
        workouts.push({ name: w.name, description: w.description, day_of_week: w.day_of_week, week_number: week, exercises: cloneExercises(w.exercises) })
      }
    }
    return { name: block.name, focus: block.focus, week_start: weekStart, week_end: weekEnd, workouts }
  })
}

// Saved program → editable day templates (week 1 of the first block).
export function dayTemplatesFromProgram(program: ProgramLike): DayTemplate[] {
  const firstWeek = program.blocks?.[0]?.week_start ?? 1
  return workoutsForWeek(program, firstWeek).map(w => ({
    day_of_week: w.day_of_week,
    name: w.name,
    description: w.description ?? '',
    exercises: cloneExercises(w.exercises as WorkoutExercise[]),
  }))
}

// Apply an edited week template to every week of an existing block layout,
// keeping the blocks' names/focus/week ranges.
export function applyTemplateToBlocks(blocks: PlanBlockInput[], days: DayTemplate[]): PlanBlockInput[] {
  return blocks.map(b => {
    const workouts: PlanWorkoutInput[] = []
    for (let week = b.week_start; week <= b.week_end; week++) {
      for (const d of days) {
        if (d.exercises.length === 0) continue
        workouts.push({ name: d.name, description: d.description, day_of_week: d.day_of_week, week_number: week, exercises: cloneExercises(d.exercises) })
      }
    }
    return { ...b, workouts }
  })
}

export function blocksFromProgram(program: ProgramLike): PlanBlockInput[] {
  return (program.blocks ?? []).map(b => ({
    name: b.name,
    focus: b.focus ?? '',
    week_start: b.week_start,
    week_end: b.week_end,
    workouts: (b.workouts ?? []).map(w => ({
      name: w.name,
      description: w.description ?? '',
      day_of_week: w.day_of_week,
      week_number: w.week_number,
      exercises: cloneExercises(w.exercises as WorkoutExercise[]),
    })),
  }))
}
