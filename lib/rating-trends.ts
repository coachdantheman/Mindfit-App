import { format, parseISO, startOfWeek, subDays } from 'date-fns'
import type { JournalEntry } from '@/types'

export type TrendView = 'week' | 'month' | 'weekly_avg' | 'monthly_avg'

export const TREND_VIEWS: { key: TrendView; label: string; hint: string }[] = [
  { key: 'week', label: 'Week', hint: 'Each entry from the last 7 days' },
  { key: 'month', label: 'Month', hint: 'Each entry from the last 30 days' },
  { key: 'weekly_avg', label: 'Weekly avg', hint: 'Average per week, up to 12 weeks' },
  { key: 'monthly_avg', label: 'Monthly avg', hint: 'Average per month, up to 12 months' },
]

export interface TrendPoint {
  label: string
  Motivation: number
  Focus: number
  Confidence: number
  Anxiety: number
  entries: number
}

type Ratings = Pick<JournalEntry, 'entry_date' | 'rating_motivation' | 'rating_focus' | 'rating_confidence' | 'rating_anxiety'>

const round1 = (n: number) => Math.round(n * 10) / 10

function pointFrom(label: string, group: Ratings[]): TrendPoint {
  const avg = (pick: (e: Ratings) => number) => round1(group.reduce((s, e) => s + pick(e), 0) / group.length)
  return {
    label,
    Motivation: avg(e => e.rating_motivation),
    Focus: avg(e => e.rating_focus),
    Confidence: avg(e => e.rating_confidence),
    Anxiety: avg(e => e.rating_anxiety),
    entries: group.length,
  }
}

// Chart series for the journal ratings. Entries may be in any order and
// may contain several per day; output is oldest -> newest.
export function buildTrendSeries(entries: Ratings[], view: TrendView, now: Date = new Date()): TrendPoint[] {
  const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date))

  if (view === 'week' || view === 'month') {
    const since = format(subDays(now, view === 'week' ? 6 : 29), 'yyyy-MM-dd')
    return sorted
      .filter(e => e.entry_date >= since)
      .map(e => pointFrom(format(parseISO(e.entry_date), view === 'week' ? 'EEE d' : 'MMM d'), [e]))
  }

  const keyOf = (e: Ratings) => view === 'weekly_avg'
    ? format(startOfWeek(parseISO(e.entry_date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    : e.entry_date.slice(0, 7)
  const groups = new Map<string, Ratings[]>()
  for (const e of sorted) {
    const k = keyOf(e)
    const g = groups.get(k)
    if (g) g.push(e); else groups.set(k, [e])
  }
  const keys = [...groups.keys()].sort().slice(-12)
  return keys.map(k => pointFrom(
    view === 'weekly_avg' ? format(parseISO(k), 'MMM d') : format(parseISO(`${k}-01`), 'MMM yy'),
    groups.get(k)!,
  ))
}
