import { calcStreak, localDateISO } from '@/components/mindset/flow-logic'

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
  return calcStreak([...days])
}
