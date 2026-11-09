export type HabitFrequency = 'daily' | 'weekly'

export interface Habit {
  id: string
  user_id: string
  title: string
  frequency: HabitFrequency
  times_per_week: number | null
  goal_id: string | null
  sort: number
  archived_at: string | null
  created_at: string
}

export interface HabitCheck {
  habit_id: string
  check_date: string
}

const DAY_MS = 86_400_000

function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS)
}

function isoOf(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10)
}

export function dailyStreak(checkDates: string[], today: string): number {
  const checked = new Set(checkDates)
  let day = dayNumber(today)
  if (!checked.has(today)) day -= 1
  let streak = 0
  while (checked.has(isoOf(day))) {
    streak += 1
    day -= 1
  }
  return streak
}

export function weekCount(checkDates: string[], today: string): number {
  const checked = new Set(checkDates)
  const day = dayNumber(today)
  const mondayIndex = (((day + 3) % 7) + 7) % 7
  const monday = day - mondayIndex
  let count = 0
  for (let d = monday; d < monday + 7; d++) {
    if (checked.has(isoOf(d))) count += 1
  }
  return count
}
