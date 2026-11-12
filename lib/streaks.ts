import { calcStreak, localDateISO } from '@/components/mindset/flow-logic'
import { withFreezes } from '@/lib/streak-freeze'

export { calcStreak, localDateISO }

// Consecutive days with ANY logged activity (journal, flow session,
// food, sleep, workout). Pass raw date/timestamp strings from each source.
export function calcActivityStreak(dateGroups: (string[] | undefined)[]): number {
  const days = new Set<string>()
  for (const group of dateGroups) {
    for (const value of group ?? []) {
      if (!value) continue
      // entry_date columns are already YYYY-MM-DD; timestamps get localized
      days.add(value.length === 10 ? value : localDateISO(new Date(value)))
    }
  }
  return activityStreakOf(days).streak
}

// The same streak with freezes applied: how long it is, how many freezes
// are held, and whether yesterday was saved by one.
export function activityStreakOf(days: Iterable<string>, today = localDateISO(new Date())): { streak: number; freezes: number; savedYesterday: boolean } {
  const [y, m, d] = today.split('-').map(Number)
  const yesterday = localDateISO(new Date(y, m - 1, d - 1))
  const f = withFreezes(days, yesterday)
  const streak = calcStreak(f.days, today)
  return { streak, freezes: f.bank, savedYesterday: streak > 0 && f.frozen.includes(yesterday) }
}
