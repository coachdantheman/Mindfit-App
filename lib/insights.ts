// Plain-language patterns in an athlete's own data, for the Progress tab.
// Pure and unit-tested. An insight only shows when both sides of a
// comparison have at least `min` days and the gap is big enough to matter.

export type InsightSection = 'mindset' | 'flow' | 'nutrition' | 'exercise' | 'sleep'
export interface Insight { section: InsightSection; text: string }

export interface InsightData {
  journal: { entry_date: string; rating_motivation: number; rating_focus: number; rating_confidence: number; rating_anxiety: number }[]
  sleep: { entry_date: string; hours_slept: number | null }[]
  workouts: { log_date: string }[]
  food: { entry_date: string; protein_g: number }[]
  proteinGoal: number | null
  games: { log_date: string; performance: number | null }[]
  routineDates: string[]      // game dates with a completed pregame routine
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const one = (n: number) => (Math.round(n * 10) / 10).toFixed(1)
const DAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']

function addDay(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}
const dow = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay() }

export function progressInsights(data: InsightData, min = 3): Insight[] {
  const out: (Insight & { gap: number })[] = []
  const journalByDay = new Map(data.journal.map(j => [j.entry_date, j]))

  // Sleep the night before (entries are dated by the night) vs confidence.
  const long: number[] = [], short: number[] = []
  for (const s of data.sleep) {
    if (s.hours_slept == null) continue
    const j = journalByDay.get(addDay(s.entry_date, 1))
    if (j) (Number(s.hours_slept) >= 8 ? long : short).push(j.rating_confidence)
  }
  if (long.length >= min && short.length >= min && avg(long) - avg(short) >= 0.5) {
    out.push({ section: 'sleep', gap: avg(long) - avg(short), text: `After 8+ hours of sleep your confidence averages ${one(avg(long))}. On less sleep: ${one(avg(short))}.` })
  }

  // Training days vs focus that day.
  const trained = new Set(data.workouts.map(w => w.log_date))
  const onDays = data.journal.filter(j => trained.has(j.entry_date)).map(j => j.rating_focus)
  const offDays = data.journal.filter(j => !trained.has(j.entry_date)).map(j => j.rating_focus)
  if (onDays.length >= min && offDays.length >= min && Math.abs(avg(onDays) - avg(offDays)) >= 0.5) {
    const up = avg(onDays) > avg(offDays)
    out.push({ section: 'exercise', gap: Math.abs(avg(onDays) - avg(offDays)), text: `On days you train your focus averages ${one(avg(onDays))}. On days off: ${one(avg(offDays))}.${up ? '' : ' Rest days are sharpening you.'}` })
  }

  // Strongest day of the week across motivation, focus and confidence.
  const byDow = new Map<number, number[]>()
  for (const j of data.journal) {
    byDow.set(dow(j.entry_date), [...(byDow.get(dow(j.entry_date)) ?? []), (j.rating_motivation + j.rating_focus + j.rating_confidence) / 3])
  }
  const ranked = [...byDow.entries()].filter(([, v]) => v.length >= min).map(([d, v]) => ({ d, a: avg(v) })).sort((a, b) => b.a - a.a)
  if (ranked.length >= 3 && ranked[0].a - ranked[ranked.length - 1].a >= 1) {
    out.push({ section: 'mindset', gap: ranked[0].a - ranked[ranked.length - 1].a, text: `${DAYS[ranked[0].d]} are your strongest day (${one(ranked[0].a)}). ${DAYS[ranked[ranked.length - 1].d]} are your toughest (${one(ranked[ranked.length - 1].a)}).` })
  }

  // Protein target hit rate on logged days.
  if (data.proteinGoal && data.proteinGoal > 0) {
    const perDay = new Map<string, number>()
    for (const f of data.food) perDay.set(f.entry_date, (perDay.get(f.entry_date) ?? 0) + Number(f.protein_g || 0))
    const days = [...perDay.values()]
    if (days.length >= Math.max(min, 5)) {
      const hit = days.filter(p => p >= data.proteinGoal! * 0.9).length
      out.push({ section: 'nutrition', gap: 0.4, text: `You reached your protein target on ${hit} of your last ${days.length} logged days.` })
    }
  }

  // Pregame routine vs how the game went.
  const routine = new Set(data.routineDates)
  const rated = data.games.filter(g => g.performance != null)
  const withR = rated.filter(g => routine.has(g.log_date)).map(g => g.performance!)
  const without = rated.filter(g => !routine.has(g.log_date)).map(g => g.performance!)
  if (withR.length >= min && without.length >= min && Math.abs(avg(withR) - avg(without)) >= 0.5) {
    out.push({ section: 'flow', gap: Math.abs(avg(withR) - avg(without)) + 1, text: `In games after your full pregame routine you rate your performance ${one(avg(withR))}. Without it: ${one(avg(without))}.` })
  }

  return out.sort((a, b) => b.gap - a.gap).map(({ section, text }) => ({ section, text }))
}
