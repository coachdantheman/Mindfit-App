// Pure scheduling rules for the hourly notification job. No I/O, unit-tested.

export type ScheduledKind = 'reminder' | 'streak' | 'weekly_assessment' | 'weekly_recap' | 'month_start'

export interface LocalClock { hour: number; weekday: number; date: string; dayOfMonth: number }

export interface MemberState {
  clock: LocalClock
  reminderHour: number
  loggedToday: boolean
  streak: number
}

// Nothing scheduled goes out before 7 am or after 9 pm local time.
export const QUIET_START = 21
export const QUIET_END = 7
export const STREAK_HOUR = 19
// End-of-day habit check-in, before quiet hours start.
export const HABIT_HOUR = 20

export function inQuietHours(hour: number): boolean {
  return hour < QUIET_END || hour > QUIET_START
}

export function scheduledKinds(s: MemberState): ScheduledKind[] {
  const { hour, weekday, dayOfMonth } = s.clock
  if (inQuietHours(hour)) return []
  const out: ScheduledKind[] = []
  const streakAtRisk = hour === STREAK_HOUR && s.streak >= 3 && !s.loggedToday
  if (streakAtRisk) out.push('streak')
  else if (hour === s.reminderHour && !s.loggedToday) out.push('reminder')
  if (weekday === 0 && hour === 17) out.push('weekly_assessment')
  if (weekday === 0 && hour === 18) out.push('weekly_recap')
  if (dayOfMonth === 1 && hour === 9) out.push('month_start')
  return out
}

export function localClock(tz: string, now: Date = new Date()): LocalClock {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', hour12: false, weekday: 'short',
    }).formatToParts(now).map(p => [p.type, p.value])
  )
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return {
    hour: Number(parts.hour) % 24,
    weekday: weekdays.indexOf(parts.weekday),
    date: `${parts.year}-${parts.month}-${parts.day}`,
    dayOfMonth: Number(parts.day),
  }
}

export function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}
