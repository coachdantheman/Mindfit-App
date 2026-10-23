import type { Sex, StandardKey } from '@/types/exercise'

// ─────────────────────────────────────────────────────────────────────────────
// APPROXIMATIONS, NOT MEASURED DATA.
//
// Tier thresholds are modeled on the published ExRx / StrengthLevel ratio
// tables (e.g. male bench at 180 lb ≈ 0.6 / 0.9 / 1.2 / 1.6 / 2.0 × BW for
// beginner / novice / intermediate / advanced / elite), with the ratio
// tapering at heavier bodyweights. Each row is
//   [bodyweight_lb, beginner, novice, intermediate, advanced, elite]
// in pounds for barbell lifts, reps for pull-ups/push-ups, and inches for
// jumps. Rows are spaced ~20 lb apart; lib/strength.ts interpolates between
// them and clamps outside the range. Bodyweight-measured tests use a single
// row per sex (bodyweight does not shift the threshold).
//
// AGE_FACTOR is a guess for younger athletes (thresholds scale down for
// 14–17-year-olds). TRAINED_SHARE is the assumed fraction of the general
// population that trains with weights; it drives the "general population"
// estimate. Daniel should sanity-check a few rows per lift before relying
// on these numbers for anything beyond motivation.
// ─────────────────────────────────────────────────────────────────────────────

export type StandardRow = [number, number, number, number, number, number]

export const TIER_NAMES = ['beginner', 'novice', 'intermediate', 'advanced', 'elite'] as const
export const TIER_PERCENTILES = [5, 20, 50, 80, 95] as const
export const TRAINED_SHARE = 0.25

export const AGE_FACTOR: Record<number, number> = {
  14: 0.80,
  15: 0.86,
  16: 0.92,
  17: 0.96,
}

export function ageFactor(age: number | null | undefined): number {
  if (age == null || !Number.isFinite(age)) return 1
  if (age <= 14) return AGE_FACTOR[14]
  if (age >= 18) return 1
  return AGE_FACTOR[Math.round(age)] ?? 1
}

export const BODYWEIGHT_KEYS: StandardKey[] = ['pullup', 'pushup', 'vertical_jump', 'broad_jump']

export const STANDARD_LABELS: Record<StandardKey, string> = {
  bench: 'Bench Press',
  squat: 'Back Squat',
  deadlift: 'Deadlift',
  ohp: 'Overhead Press',
  power_clean: 'Power Clean',
  front_squat: 'Front Squat',
  hip_thrust: 'Hip Thrust',
  row: 'Barbell Row',
  pullup: 'Pull-Ups',
  pushup: 'Push-Ups',
  vertical_jump: 'Vertical Jump',
  broad_jump: 'Broad Jump',
}

export const STANDARD_UNITS: Record<StandardKey, 'lb' | 'reps' | 'in'> = {
  bench: 'lb', squat: 'lb', deadlift: 'lb', ohp: 'lb', power_clean: 'lb',
  front_squat: 'lb', hip_thrust: 'lb', row: 'lb',
  pullup: 'reps', pushup: 'reps', vertical_jump: 'in', broad_jump: 'in',
}

const MALE_BW = [110, 130, 150, 170, 190, 210, 230, 250, 270, 290, 310]
const FEMALE_BW = [90, 110, 130, 150, 170, 190, 210, 230, 250, 260]

// Build rows from a per-bodyweight ratio curve: ratios at the lightest and
// heaviest rows, linearly interpolated, then scaled by bodyweight.
function ratioRows(
  bws: number[],
  light: [number, number, number, number, number],
  heavy: [number, number, number, number, number],
): StandardRow[] {
  const lo = bws[0]
  const hi = bws[bws.length - 1]
  return bws.map(bw => {
    const t = (bw - lo) / (hi - lo)
    const vals = light.map((l, i) => Math.round(bw * (l + (heavy[i] - l) * t) / 5) * 5)
    return [bw, vals[0], vals[1], vals[2], vals[3], vals[4]] as StandardRow
  })
}

export const STRENGTH_STANDARDS: Record<StandardKey, Record<Sex, StandardRow[]>> = {
  bench: {
    male: ratioRows(MALE_BW, [0.65, 0.95, 1.25, 1.65, 2.05], [0.50, 0.75, 1.05, 1.35, 1.65]),
    female: ratioRows(FEMALE_BW, [0.35, 0.55, 0.80, 1.05, 1.35], [0.25, 0.40, 0.60, 0.80, 1.00]),
  },
  squat: {
    male: ratioRows(MALE_BW, [0.85, 1.25, 1.65, 2.15, 2.65], [0.65, 1.00, 1.35, 1.75, 2.15]),
    female: ratioRows(FEMALE_BW, [0.55, 0.85, 1.20, 1.60, 2.00], [0.40, 0.65, 0.90, 1.20, 1.50]),
  },
  deadlift: {
    male: ratioRows(MALE_BW, [1.05, 1.50, 2.00, 2.55, 3.10], [0.80, 1.15, 1.55, 2.00, 2.45]),
    female: ratioRows(FEMALE_BW, [0.65, 1.00, 1.40, 1.85, 2.30], [0.50, 0.75, 1.05, 1.40, 1.75]),
  },
  ohp: {
    male: ratioRows(MALE_BW, [0.40, 0.60, 0.80, 1.05, 1.30], [0.32, 0.48, 0.65, 0.85, 1.05]),
    female: ratioRows(FEMALE_BW, [0.25, 0.38, 0.55, 0.72, 0.90], [0.18, 0.28, 0.40, 0.55, 0.70]),
  },
  power_clean: {
    male: ratioRows(MALE_BW, [0.55, 0.80, 1.05, 1.35, 1.65], [0.42, 0.62, 0.85, 1.10, 1.35]),
    female: ratioRows(FEMALE_BW, [0.35, 0.52, 0.72, 0.95, 1.20], [0.25, 0.40, 0.55, 0.72, 0.90]),
  },
  front_squat: {
    male: ratioRows(MALE_BW, [0.70, 1.00, 1.35, 1.75, 2.15], [0.52, 0.80, 1.10, 1.42, 1.75]),
    female: ratioRows(FEMALE_BW, [0.45, 0.70, 0.98, 1.30, 1.62], [0.32, 0.52, 0.72, 0.98, 1.22]),
  },
  hip_thrust: {
    male: ratioRows(MALE_BW, [0.90, 1.35, 1.90, 2.50, 3.10], [0.70, 1.05, 1.50, 1.95, 2.45]),
    female: ratioRows(FEMALE_BW, [0.80, 1.20, 1.70, 2.25, 2.80], [0.60, 0.90, 1.25, 1.65, 2.05]),
  },
  row: {
    male: ratioRows(MALE_BW, [0.55, 0.80, 1.05, 1.35, 1.65], [0.42, 0.62, 0.85, 1.10, 1.35]),
    female: ratioRows(FEMALE_BW, [0.30, 0.48, 0.68, 0.90, 1.12], [0.22, 0.35, 0.50, 0.68, 0.85]),
  },
  // Bodyweight tests: one row per sex. Units are reps or inches.
  pullup: {
    male: [[0, 1, 5, 10, 16, 24]],
    female: [[0, 0, 1, 4, 8, 13]],
  },
  pushup: {
    male: [[0, 10, 20, 35, 50, 70]],
    female: [[0, 4, 10, 20, 32, 45]],
  },
  vertical_jump: {
    male: [[0, 14, 18, 23, 28, 33]],
    female: [[0, 10, 13, 17, 21, 25]],
  },
  broad_jump: {
    male: [[0, 70, 82, 94, 106, 118]],
    female: [[0, 54, 64, 74, 84, 94]],
  },
}
