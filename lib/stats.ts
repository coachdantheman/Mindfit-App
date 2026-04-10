import { JournalEntry, SleepEntry } from '@/types'

export function avgOfJournal(entries: JournalEntry[], key: keyof JournalEntry): string {
  if (entries.length === 0) return '—'
  const sum = entries.reduce((acc, e) => acc + (e[key] as number), 0)
  return (sum / entries.length).toFixed(1)
}

export function calcSleepAverages(entries: SleepEntry[]) {
  const avgSleep = entries.length > 0
    ? (entries.reduce((acc, e) => acc + (Number(e.hours_slept) || 0), 0) / entries.length).toFixed(1)
    : '—'

  const withQuality = entries.filter(e => e.sleep_quality)
  const avgSleepQuality = withQuality.length > 0
    ? (withQuality.reduce((acc, e) => acc + (e.sleep_quality || 0), 0) / withQuality.length).toFixed(1)
    : '—'

  return { avgSleep, avgSleepQuality }
}
