import type { FoodEntry } from '@/types'

export const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const
export type MealName = (typeof MEALS)[number]

export const CAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const

export type GoalType = 'gain' | 'lose' | 'maintain'
export type ActivityLevel = 'light' | 'moderate' | 'high'

export interface MacroSplit { protein_pct: number; carbs_pct: number; fat_pct: number }
export interface MacroGrams { protein_g: number; carbs_g: number; fat_g: number }
export interface FoodMacros extends MacroGrams { calories: number }

export interface QuizInput {
  goal_type: GoalType
  activity_level: ActivityLevel
  current_weight_lb: number
  target_weight_lb: number
}

export interface GoalResult {
  calories: number
  maintenance: number
  adjustment: number
  split: MacroSplit
  grams: MacroGrams
  protein_per_lb: number
  weeks_to_target: number | null
  warnings: string[]
}

// kcal per lb of bodyweight — the quick method sports dietitians use when
// height/age aren't collected.
export const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = { light: 14, moderate: 16, high: 18 }
export const GOAL_ADJUSTMENT: Record<GoalType, number> = { gain: 350, lose: -400, maintain: 0 }
export const PROTEIN_PER_LB: Record<GoalType, number> = { gain: 0.9, lose: 1.0, maintain: 0.8 }
export const FAT_PCT = 28
export const CALORIE_FLOOR = 1600
export const CALORIE_CEILING = 6000
export const MAX_PROTEIN_PCT = 35

export const DEFAULT_SPLIT: MacroSplit = { protein_pct: 30, carbs_pct: 45, fat_pct: 25 }

const round1 = (n: number) => Math.round(n * 10) / 10

export function caloriesFromMacros(g: MacroGrams): number {
  return Math.round(g.protein_g * CAL_PER_G.protein + g.carbs_g * CAL_PER_G.carbs + g.fat_g * CAL_PER_G.fat)
}

export function macrosFromCalories(calories: number, split: MacroSplit): MacroGrams {
  return {
    protein_g: Math.round((calories * split.protein_pct / 100) / CAL_PER_G.protein),
    carbs_g: Math.round((calories * split.carbs_pct / 100) / CAL_PER_G.carbs),
    fat_g: Math.round((calories * split.fat_pct / 100) / CAL_PER_G.fat),
  }
}

export function splitFromGrams(g: MacroGrams): MacroSplit {
  const total = caloriesFromMacros(g)
  if (total <= 0) return { ...DEFAULT_SPLIT }
  const protein_pct = Math.round((g.protein_g * CAL_PER_G.protein / total) * 100)
  const fat_pct = Math.round((g.fat_g * CAL_PER_G.fat / total) * 100)
  return { protein_pct, fat_pct, carbs_pct: 100 - protein_pct - fat_pct }
}

// Change one percentage; the other two keep their ratio so the split still sums to 100.
export function rebalanceSplit(split: MacroSplit, changed: keyof MacroSplit, value: number): MacroSplit {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  const remaining = 100 - clamped
  const otherKeys = (Object.keys(split) as (keyof MacroSplit)[]).filter(k => k !== changed)
  const otherTotal = otherKeys.reduce((s, k) => s + split[k], 0)
  const result = { ...split, [changed]: clamped }

  if (otherTotal === 0) {
    const half = Math.round(remaining / 2)
    result[otherKeys[0]] = half
    result[otherKeys[1]] = remaining - half
  } else {
    result[otherKeys[0]] = Math.round((split[otherKeys[0]] / otherTotal) * remaining)
    result[otherKeys[1]] = remaining - result[otherKeys[0]]
  }
  return result
}

export function weeksToTarget(current: number, target: number, goal: GoalType): number | null {
  if (goal === 'maintain') return null
  const diff = Math.abs(target - current)
  if (diff === 0) return 0
  const perWeek = goal === 'gain' ? 0.5 : 1
  return Math.ceil(diff / perWeek)
}

export function computeGoalFromQuiz(q: QuizInput): GoalResult {
  const warnings: string[] = []
  const weight = q.current_weight_lb
  const maintenance = Math.round(weight * ACTIVITY_MULTIPLIER[q.activity_level])
  const raw = maintenance + GOAL_ADJUSTMENT[q.goal_type]
  let calories = Math.round(raw / 50) * 50
  if (calories < CALORIE_FLOOR) {
    calories = CALORIE_FLOOR
    warnings.push(`Your deficit was reduced so you stay above ${CALORIE_FLOOR.toLocaleString()} kcal — growing athletes should not go lower.`)
  }
  if (calories > CALORIE_CEILING) calories = CALORIE_CEILING
  const adjustment = calories - maintenance

  const protein_per_lb = PROTEIN_PER_LB[q.goal_type]
  const proteinCap = Math.floor((calories * MAX_PROTEIN_PCT / 100) / CAL_PER_G.protein)
  const protein_g = Math.min(Math.round(weight * protein_per_lb), proteinCap)
  const fat_g = Math.round((calories * FAT_PCT / 100) / CAL_PER_G.fat)
  const carbs_g = Math.max(0, Math.round((calories - protein_g * CAL_PER_G.protein - fat_g * CAL_PER_G.fat) / CAL_PER_G.carbs))
  const grams = { protein_g, carbs_g, fat_g }

  if (q.goal_type === 'gain' && q.target_weight_lb < weight) {
    warnings.push('You chose "gain" but your target weight is below your current weight.')
  }
  if (q.goal_type === 'lose' && q.target_weight_lb > weight) {
    warnings.push('You chose "lean out" but your target weight is above your current weight.')
  }
  if (Math.abs(q.target_weight_lb - weight) > weight * 0.3) {
    warnings.push('That target is a big change — talk it through with a parent or coach first.')
  }

  return {
    calories,
    maintenance,
    adjustment,
    split: splitFromGrams(grams),
    grams,
    protein_per_lb,
    weeks_to_target: weeksToTarget(weight, q.target_weight_lb, q.goal_type),
    warnings,
  }
}

export function scaleFood(food: FoodMacros, servings: number): FoodMacros {
  return {
    calories: Math.round(food.calories * servings),
    protein_g: round1(Number(food.protein_g) * servings),
    carbs_g: round1(Number(food.carbs_g) * servings),
    fat_g: round1(Number(food.fat_g) * servings),
  }
}

export interface Totals { calories: number; protein: number; carbs: number; fat: number }

type MacroRow = Pick<FoodEntry, 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'>

export function sumEntries(entries: MacroRow[]): Totals {
  return entries.reduce(
    (t, e) => ({
      calories: t.calories + Number(e.calories),
      protein: t.protein + Number(e.protein_g),
      carbs: t.carbs + Number(e.carbs_g),
      fat: t.fat + Number(e.fat_g),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
}

export interface DayTotal extends Totals { date: string; entryCount: number }

export function groupEntriesByDay(entries: (MacroRow & { entry_date: string })[]): DayTotal[] {
  const map = new Map<string, DayTotal>()
  for (const e of entries) {
    const cur = map.get(e.entry_date) ?? { date: e.entry_date, calories: 0, protein: 0, carbs: 0, fat: 0, entryCount: 0 }
    cur.calories += Number(e.calories)
    cur.protein += Number(e.protein_g)
    cur.carbs += Number(e.carbs_g)
    cur.fat += Number(e.fat_g)
    cur.entryCount += 1
    map.set(e.entry_date, cur)
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function localDateISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days)
  return localDateISO(dt)
}

export function fillMissingDays(days: DayTotal[], n: number, today = new Date()): DayTotal[] {
  const byDate = new Map(days.map(d => [d.date, d]))
  const out: DayTotal[] = []
  const todayIso = localDateISO(today)
  for (let i = n - 1; i >= 0; i--) {
    const iso = shiftDate(todayIso, -i)
    out.push(byDate.get(iso) ?? { date: iso, calories: 0, protein: 0, carbs: 0, fat: 0, entryCount: 0 })
  }
  return out
}

export type TrendRange = 'day' | 'week' | 'month'
export const RANGE_DAYS: Record<TrendRange, number> = { day: 7, week: 56, month: 180 }

export interface Bucket extends Totals { key: string; label: string; loggedDays: number }

function weekStart(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return shiftDate(iso, -dt.getDay())
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function dayLabel(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${m}/${d}`
}

// Averages per bucket over logged days only. Unlogged buckets have loggedDays 0.
export function bucketByRange(days: DayTotal[], range: TrendRange): Bucket[] {
  const keyOf = (iso: string) =>
    range === 'day' ? iso : range === 'week' ? weekStart(iso) : iso.slice(0, 7)
  const labelOf = (key: string) =>
    range === 'month' ? MONTH_LABELS[Number(key.slice(5, 7)) - 1] : dayLabel(key)

  const map = new Map<string, Bucket>()
  for (const d of days) {
    const key = keyOf(d.date)
    const cur = map.get(key) ?? { key, label: labelOf(key), calories: 0, protein: 0, carbs: 0, fat: 0, loggedDays: 0 }
    if (d.entryCount > 0) {
      cur.calories += d.calories
      cur.protein += d.protein
      cur.carbs += d.carbs
      cur.fat += d.fat
      cur.loggedDays += 1
    }
    map.set(key, cur)
  }
  return [...map.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(b => b.loggedDays === 0 ? b : {
      ...b,
      calories: Math.round(b.calories / b.loggedDays),
      protein: Math.round(b.protein / b.loggedDays),
      carbs: Math.round(b.carbs / b.loggedDays),
      fat: Math.round(b.fat / b.loggedDays),
    })
}

export function averageLogged(days: DayTotal[]): Totals | null {
  const logged = days.filter(d => d.entryCount > 0)
  if (logged.length === 0) return null
  const t = logged.reduce(
    (a, d) => ({ calories: a.calories + d.calories, protein: a.protein + d.protein, carbs: a.carbs + d.carbs, fat: a.fat + d.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
  const n = logged.length
  return { calories: Math.round(t.calories / n), protein: Math.round(t.protein / n), carbs: Math.round(t.carbs / n), fat: Math.round(t.fat / n) }
}

export function adherencePct(days: DayTotal[], goalCalories: number, tolerance = 0.1): number | null {
  const logged = days.filter(d => d.entryCount > 0)
  if (logged.length === 0 || goalCalories <= 0) return null
  const within = logged.filter(d => Math.abs(d.calories - goalCalories) <= goalCalories * tolerance).length
  return Math.round((within / logged.length) * 100)
}

export function loggingStreak(days: DayTotal[]): number {
  let streak = 0
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].entryCount > 0) streak++
    else if (i === days.length - 1) continue // today not logged yet doesn't break it
    else break
  }
  return streak
}

// Least-squares line through (dayIndex, value). Slope reported per week.
export function linearTrend(points: { date: string; value: number }[]): { slopePerWeek: number; fitted: number[] } | null {
  if (points.length < 2) return null
  const base = points[0].date
  const xs = points.map(p => {
    const [y, m, d] = p.date.split('-').map(Number)
    const [by, bm, bd] = base.split('-').map(Number)
    return Math.round((new Date(y, m - 1, d).getTime() - new Date(by, bm - 1, bd).getTime()) / 86400000)
  })
  const n = points.length
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = points.reduce((a, p) => a + p.value, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (points[i].value - meanY)
    den += (xs[i] - meanX) ** 2
  }
  if (den === 0) return null
  const slope = num / den
  const intercept = meanY - slope * meanX
  return { slopePerWeek: round1(slope * 7), fitted: xs.map(x => round1(intercept + slope * x)) }
}

export interface SearchableFood { id: string; name: string; brand?: string | null }

// Tokenized, prefix-weighted, case-insensitive search over the cached food list.
export function searchFoods<T extends SearchableFood>(foods: T[], q: string, limit = 25): T[] {
  const tokens = q.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return []
  const scored: { food: T; score: number }[] = []
  for (const food of foods) {
    const name = food.name.toLowerCase()
    const hay = `${name} ${(food.brand ?? '').toLowerCase()}`
    const words = hay.split(/[\s,()/-]+/)
    let score = 0
    let ok = true
    for (const t of tokens) {
      if (name.startsWith(t)) score += 5
      else if (words.some(w => w.startsWith(t))) score += 3
      else if (hay.includes(t)) score += 1
      else { ok = false; break }
    }
    if (!ok) continue
    score -= name.length / 100
    scored.push({ food, score })
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(s => s.food)
}
