import type { Sex, StandardKey, StrengthTier } from '@/types/exercise'
import {
  STRENGTH_STANDARDS, TIER_NAMES, TIER_PERCENTILES, TRAINED_SHARE, BODYWEIGHT_KEYS,
  STANDARD_UNITS, ageFactor, type StandardRow,
} from '@/lib/data/strength-standards'

export type Thresholds = [number, number, number, number, number]

export function epley(weight: number, reps: number): number {
  return weight * (1 + reps / 30)
}

export function brzycki(weight: number, reps: number): number {
  return weight * 36 / (37 - reps)
}

export const MAX_RELIABLE_REPS = 10

export function isReliableReps(reps: number): boolean {
  return reps >= 1 && reps <= MAX_RELIABLE_REPS
}

// 1 rep → the weight; 2–10 → mean of Epley and Brzycki; >10 → same formula,
// flagged unreliable by the caller via isReliableReps.
export function e1rm(weight: number, reps: number): number {
  if (!(weight > 0) || !(reps >= 1)) return 0
  if (reps === 1) return weight
  const r = Math.min(reps, 36)
  return (epley(weight, r) + brzycki(weight, r)) / 2
}

export function interpolateRow(rows: StandardRow[], bodyweight: number): Thresholds {
  if (rows.length === 1) return rows[0].slice(1) as Thresholds
  const first = rows[0]
  const last = rows[rows.length - 1]
  if (bodyweight <= first[0]) return first.slice(1) as Thresholds
  if (bodyweight >= last[0]) return last.slice(1) as Thresholds
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i]
    const b = rows[i + 1]
    if (bodyweight >= a[0] && bodyweight <= b[0]) {
      const t = (bodyweight - a[0]) / (b[0] - a[0])
      return [1, 2, 3, 4, 5].map(j => a[j] + (b[j] - a[j]) * t) as Thresholds
    }
  }
  return last.slice(1) as Thresholds
}

export function isBodyweightKey(key: StandardKey): boolean {
  return BODYWEIGHT_KEYS.includes(key)
}

export function thresholdsFor(key: StandardKey, sex: Sex, bodyweight: number, age?: number | null): Thresholds {
  const base = interpolateRow(STRENGTH_STANDARDS[key][sex], bodyweight)
  const f = ageFactor(age)
  return base.map(v => v * f) as Thresholds
}

export function tierFor(value: number, thresholds: Thresholds): StrengthTier {
  let tier: StrengthTier = 'untrained'
  for (let i = 0; i < thresholds.length; i++) {
    if (value >= thresholds[i]) tier = TIER_NAMES[i]
  }
  return tier
}

const Z = [-1.645, -0.842, 0, 0.842, 1.645]

// Abramowitz & Stegun 7.1.26
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * ax)
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax)
  return sign * y
}

export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2))
}

// Piecewise map of value → z using the five tier thresholds as anchors at
// the 5/20/50/80/95th percentiles, in log space when every anchor is
// positive (strength scales multiplicatively), otherwise linear. Clamped
// to 1–99 so nobody reads "100 %".
export function liftersPercentile(value: number, thresholds: Thresholds): number {
  if (!(value > 0)) return 1
  const useLog = thresholds.every(t => t > 0)
  const f = (v: number) => (useLog ? Math.log(v) : v)
  const xs = thresholds.map(f)
  const x = f(value)
  let z: number
  if (x <= xs[0]) {
    const slope = (Z[1] - Z[0]) / (xs[1] - xs[0] || 1)
    z = Z[0] + (x - xs[0]) * slope
  } else if (x >= xs[4]) {
    const slope = (Z[4] - Z[3]) / (xs[4] - xs[3] || 1)
    z = Z[4] + (x - xs[4]) * slope
  } else {
    z = Z[4]
    for (let i = 0; i < 4; i++) {
      if (x >= xs[i] && x <= xs[i + 1]) {
        const span = xs[i + 1] - xs[i]
        const t = span === 0 ? 1 : (x - xs[i]) / span
        z = Z[i] + (Z[i + 1] - Z[i]) * t
        break
      }
    }
  }
  const pct = Math.round(normalCdf(z) * 100)
  return Math.min(99, Math.max(1, pct))
}

export function generalPopulationPercentile(liftersPct: number): number {
  const pct = Math.round(100 - TRAINED_SHARE * (100 - liftersPct))
  return Math.min(99, Math.max(1, pct))
}

export interface LiftInput {
  key: StandardKey
  sex: Sex
  bodyweight_lb: number
  age?: number | null
  // weight_reps lifts: weight + reps; bodyweight tests: value = reps or inches
  weight?: number
  reps?: number
  value?: number
}

export interface LiftEvaluation {
  key: StandardKey
  unit: 'lb' | 'reps' | 'in'
  e1rm: number
  tier: StrengthTier
  thresholds: Thresholds
  liftersPct: number
  generalPct: number
  ratio: number | null
  nextTier: { tier: StrengthTier; value: number } | null
  reliable: boolean
  assumptions: string[]
}

export function evaluateLift(input: LiftInput): LiftEvaluation {
  const { key, sex, bodyweight_lb, age } = input
  const bodyweightTest = isBodyweightKey(key)
  const unit = STANDARD_UNITS[key]
  let value: number
  let reliable = true
  if (bodyweightTest) {
    value = input.value ?? input.reps ?? 0
  } else {
    const w = input.weight ?? 0
    const r = input.reps ?? 1
    value = e1rm(w, r)
    reliable = isReliableReps(r)
  }
  const thresholds = thresholdsFor(key, sex, bodyweight_lb, age)
  const tier = tierFor(value, thresholds)
  const liftersPct = liftersPercentile(value, thresholds)
  const generalPct = generalPopulationPercentile(liftersPct)
  const tierIdx = TIER_NAMES.indexOf(tier as typeof TIER_NAMES[number])
  const nextIdx = tierIdx + 1
  const nextTier = nextIdx < TIER_NAMES.length
    ? { tier: TIER_NAMES[nextIdx] as StrengthTier, value: roundValue(thresholds[nextIdx], unit) }
    : null
  const assumptions = [
    'Tier thresholds are modeled approximations of published strength standards, not measured data.',
    `General-population estimate assumes ${Math.round(TRAINED_SHARE * 100)}% of people train with weights.`,
  ]
  if (ageFactor(age) < 1) assumptions.push(`Thresholds scaled by ${ageFactor(age).toFixed(2)} for age ${age}.`)
  if (!reliable) assumptions.push(`Sets over ${MAX_RELIABLE_REPS} reps give an unreliable 1RM estimate.`)
  return {
    key,
    unit,
    e1rm: roundValue(value, unit),
    tier,
    thresholds,
    liftersPct,
    generalPct,
    ratio: bodyweightTest || !(bodyweight_lb > 0) ? null : Math.round((value / bodyweight_lb) * 100) / 100,
    nextTier,
    reliable,
    assumptions,
  }
}

function roundValue(v: number, unit: 'lb' | 'reps' | 'in'): number {
  if (unit === 'lb') return Math.round(v)
  if (unit === 'in') return Math.round(v * 10) / 10
  return Math.round(v)
}

export interface SetLike {
  reps: number | null
  weight: number | null
  created_at?: string
  workout_log_id?: string | null
}

export function bestE1rm(sets: SetLike[]): number {
  let best = 0
  for (const s of sets) {
    if (s.reps && s.weight && s.reps > 0 && s.weight > 0) {
      const v = e1rm(Number(s.weight), s.reps)
      if (v > best) best = v
    }
  }
  return Math.round(best)
}

export interface SessionPoint {
  date: string       // YYYY-MM-DD
  e1rm: number
  topSet: { weight: number; reps: number } | null
  workout_log_id: string | null
}

// One point per session (workout_log_id, falling back to calendar day),
// best e1RM in that session, oldest first.
export function sessionSeries(sets: SetLike[]): SessionPoint[] {
  const groups = new Map<string, { date: string; sets: SetLike[]; logId: string | null }>()
  for (const s of sets) {
    const date = (s.created_at ?? '').slice(0, 10)
    const key = s.workout_log_id ?? `day:${date}`
    const g = groups.get(key)
    if (g) g.sets.push(s)
    else groups.set(key, { date, sets: [s], logId: s.workout_log_id ?? null })
  }
  const points: SessionPoint[] = []
  for (const g of groups.values()) {
    let best = 0
    let top: { weight: number; reps: number } | null = null
    for (const s of g.sets) {
      if (s.reps && s.weight && s.reps > 0 && s.weight > 0) {
        const v = e1rm(Number(s.weight), s.reps)
        if (v > best) { best = v; top = { weight: Number(s.weight), reps: s.reps } }
      }
    }
    if (best > 0) points.push({ date: g.date, e1rm: Math.round(best), topSet: top, workout_log_id: g.logId })
  }
  return points.sort((a, b) => a.date.localeCompare(b.date))
}

export type ProgressMetric = 'e1rm' | 'reps' | 'weight'

// Bodyweight-measured exercises track a raw max per session instead of
// e1RM: reps (pull-ups, push-ups, seconds) or weight (inches for jumps).
export function sessionMaxSeries(sets: SetLike[], metric: 'reps' | 'weight'): SessionPoint[] {
  const groups = new Map<string, { date: string; sets: SetLike[]; logId: string | null }>()
  for (const s of sets) {
    const date = (s.created_at ?? '').slice(0, 10)
    const key = s.workout_log_id ?? `day:${date}`
    const g = groups.get(key)
    if (g) g.sets.push(s)
    else groups.set(key, { date, sets: [s], logId: s.workout_log_id ?? null })
  }
  const points: SessionPoint[] = []
  for (const g of groups.values()) {
    let best = 0
    let top: { weight: number; reps: number } | null = null
    for (const s of g.sets) {
      const v = Number(metric === 'reps' ? s.reps : s.weight) || 0
      if (v > best) { best = v; top = { weight: Number(s.weight) || 0, reps: s.reps ?? 0 } }
    }
    if (best > 0) points.push({ date: g.date, e1rm: Math.round(best * 10) / 10, topSet: top, workout_log_id: g.logId })
  }
  return points.sort((a, b) => a.date.localeCompare(b.date))
}

// Sessions whose value beat every earlier session.
export function prsFromSeries(series: SessionPoint[]): SessionPoint[] {
  const out: SessionPoint[] = []
  let best = 0
  for (const p of series) {
    if (p.e1rm > best) { out.push(p); best = p.e1rm }
  }
  return out
}

export interface PrCandidate {
  exercise_id: string | null
  exercise_name: string
  sets: SetLike[]
}

export interface DetectedPr {
  exercise_id: string | null
  exercise_name: string
  e1rm: number
  previous: number | null
}

// A PR is a session best e1RM that beats every previous session for that
// exercise. previousBest is keyed by exercise_id when linked, else by
// lowercased name.
export function detectPrs(candidates: PrCandidate[], previousBest: Map<string, number>): DetectedPr[] {
  const prs: DetectedPr[] = []
  for (const c of candidates) {
    const best = bestE1rm(c.sets)
    if (best <= 0) continue
    const key = prKey(c.exercise_id, c.exercise_name)
    const prev = previousBest.get(key) ?? null
    if (prev === null || best > prev) prs.push({ exercise_id: c.exercise_id, exercise_name: c.exercise_name, e1rm: best, previous: prev })
  }
  return prs
}

export function prKey(exerciseId: string | null, name: string): string {
  return exerciseId ? `id:${exerciseId}` : `name:${name.trim().toLowerCase()}`
}

export { TIER_NAMES, TIER_PERCENTILES, TRAINED_SHARE }
