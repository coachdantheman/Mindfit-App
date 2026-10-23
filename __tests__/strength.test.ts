import test from 'node:test'
import assert from 'node:assert/strict'
import {
  epley, brzycki, e1rm, isReliableReps, interpolateRow, thresholdsFor, tierFor,
  liftersPercentile, generalPopulationPercentile, evaluateLift, bestE1rm, sessionSeries, detectPrs, prKey,
} from '../lib/strength'
import { STRENGTH_STANDARDS, AGE_FACTOR, ageFactor, TIER_PERCENTILES } from '../lib/data/strength-standards'
import type { StandardKey } from '../types/exercise'

test('epley / brzycki / e1rm', () => {
  assert.equal(epley(100, 10), 100 * (1 + 10 / 30))
  assert.equal(Math.round(brzycki(100, 10)), 133)
  assert.equal(e1rm(225, 1), 225)
  assert.equal(Math.round(e1rm(200, 5)), Math.round((epley(200, 5) + brzycki(200, 5)) / 2))
  assert.equal(e1rm(0, 5), 0)
  assert.equal(isReliableReps(10), true)
  assert.equal(isReliableReps(11), false)
})

test('interpolateRow — between rows, clamped outside', () => {
  const rows = STRENGTH_STANDARDS.bench.male
  const lo = interpolateRow(rows, rows[0][0])
  assert.deepEqual(lo, rows[0].slice(1))
  const mid = interpolateRow(rows, (rows[0][0] + rows[1][0]) / 2)
  for (let i = 0; i < 5; i++) assert.equal(mid[i], (rows[0][i + 1] + rows[1][i + 1]) / 2)
  const above = interpolateRow(rows, 999)
  assert.deepEqual(above, rows[rows.length - 1].slice(1))
  const single = interpolateRow(STRENGTH_STANDARDS.pullup.male, 185)
  assert.deepEqual(single, STRENGTH_STANDARDS.pullup.male[0].slice(1))
})

test('tier floors — value exactly at a threshold lands in that tier', () => {
  const th = thresholdsFor('squat', 'male', 180)
  assert.equal(tierFor(th[0] - 1, th), 'untrained')
  assert.equal(tierFor(th[0], th), 'beginner')
  assert.equal(tierFor(th[2], th), 'intermediate')
  assert.equal(tierFor(th[4], th), 'elite')
  assert.equal(tierFor(th[4] + 50, th), 'elite')
})

test('percentiles hit 5/20/50/80/95 at the thresholds', () => {
  const th = thresholdsFor('deadlift', 'male', 200)
  th.forEach((t, i) => assert.equal(liftersPercentile(t, th), TIER_PERCENTILES[i]))
  assert.ok(liftersPercentile(1, th) >= 1)
  assert.ok(liftersPercentile(th[4] * 3, th) <= 99)
  assert.equal(generalPopulationPercentile(50), 88)
  assert.equal(generalPopulationPercentile(99), 99)
})

test('185 lb male, bench 315×1 → Advanced, lifters 80–95 %, general ≥ 95 %', () => {
  const r = evaluateLift({ key: 'bench', sex: 'male', bodyweight_lb: 185, age: 25, weight: 315, reps: 1 })
  assert.equal(r.tier, 'advanced')
  assert.ok(r.liftersPct >= 80 && r.liftersPct <= 95, `lifters ${r.liftersPct}`)
  assert.ok(r.generalPct >= 95, `general ${r.generalPct}`)
  assert.equal(r.e1rm, 315)
  assert.equal(r.nextTier?.tier, 'elite')
  assert.ok((r.nextTier?.value ?? 0) > 315)
  assert.equal(r.reliable, true)
  assert.ok(r.ratio && r.ratio > 1.6)
})

test('female path — 135 lb squat 185×3 is a real tier with sane percentiles', () => {
  const r = evaluateLift({ key: 'squat', sex: 'female', bodyweight_lb: 135, age: 22, weight: 185, reps: 3 })
  assert.ok(['intermediate', 'advanced'].includes(r.tier), r.tier)
  assert.ok(r.liftersPct > 50 && r.liftersPct < 99)
  assert.ok(r.generalPct > r.liftersPct)
  const male = evaluateLift({ key: 'squat', sex: 'male', bodyweight_lb: 135, age: 22, weight: 185, reps: 3 })
  assert.ok(male.liftersPct < r.liftersPct, 'same lift ranks lower for a male athlete')
})

test('bodyweight test path — pull-ups use reps, no ratio, zero thresholds handled', () => {
  const r = evaluateLift({ key: 'pullup', sex: 'male', bodyweight_lb: 170, age: 20, value: 10 })
  assert.equal(r.unit, 'reps')
  assert.equal(r.e1rm, 10)
  assert.equal(r.tier, 'intermediate')
  assert.equal(r.ratio, null)
  assert.equal(r.liftersPct, 50)
  const f = evaluateLift({ key: 'pullup', sex: 'female', bodyweight_lb: 130, age: 20, value: 0 })
  assert.equal(f.liftersPct >= 1, true)
  assert.equal(f.tier, 'beginner')
  const jump = evaluateLift({ key: 'vertical_jump', sex: 'male', bodyweight_lb: 170, age: 20, value: 28 })
  assert.equal(jump.unit, 'in')
  assert.equal(jump.tier, 'advanced')
})

test('age factor scales thresholds down for younger athletes', () => {
  assert.equal(ageFactor(14), AGE_FACTOR[14])
  assert.equal(ageFactor(17), AGE_FACTOR[17])
  assert.equal(ageFactor(18), 1)
  assert.equal(ageFactor(40), 1)
  const adult = thresholdsFor('bench', 'male', 160, 25)
  const teen = thresholdsFor('bench', 'male', 160, 15)
  for (let i = 0; i < 5; i++) assert.ok(Math.abs(teen[i] - adult[i] * AGE_FACTOR[15]) < 1e-9)
  const r = evaluateLift({ key: 'bench', 'sex': 'male', bodyweight_lb: 160, age: 15, weight: 185, reps: 1 })
  assert.ok(r.assumptions.some(a => a.includes('age 15')))
})

test('>10 reps flagged unreliable', () => {
  const r = evaluateLift({ key: 'ohp', sex: 'male', bodyweight_lb: 180, age: 30, weight: 95, reps: 15 })
  assert.equal(r.reliable, false)
  assert.ok(r.assumptions.some(a => a.toLowerCase().includes('unreliable')))
})

test('every lift × sex has rows that increase across tiers and bodyweights', () => {
  for (const key of Object.keys(STRENGTH_STANDARDS) as StandardKey[]) {
    for (const sex of ['male', 'female'] as const) {
      const rows = STRENGTH_STANDARDS[key][sex]
      assert.ok(rows.length >= 1)
      rows.forEach((row, ri) => {
        for (let i = 2; i <= 5; i++) assert.ok(row[i] > row[i - 1], `${key} ${sex} row ${ri} tier ${i} not increasing`)
        if (ri > 0) {
          assert.ok(row[0] > rows[ri - 1][0], `${key} ${sex} bodyweights must ascend`)
          assert.ok(row[5] >= rows[ri - 1][5], `${key} ${sex} elite should not drop with bodyweight`)
        }
      })
    }
  }
})

test('bestE1rm / sessionSeries / detectPrs', () => {
  const sets = [
    { reps: 5, weight: 200, created_at: '2026-10-01T10:00:00Z', workout_log_id: 'a' },
    { reps: 3, weight: 225, created_at: '2026-10-01T10:05:00Z', workout_log_id: 'a' },
    { reps: 1, weight: 255, created_at: '2026-10-08T10:00:00Z', workout_log_id: 'b' },
    { reps: null, weight: null, created_at: '2026-10-08T10:00:00Z', workout_log_id: 'b' },
    { reps: 8, weight: 185, created_at: '2026-10-15T10:00:00Z', workout_log_id: null },
  ]
  assert.equal(bestE1rm(sets), 255)
  const series = sessionSeries(sets)
  assert.equal(series.length, 3)
  assert.deepEqual(series.map(s => s.date), ['2026-10-01', '2026-10-08', '2026-10-15'])
  assert.equal(series[1].e1rm, 255)
  assert.deepEqual(series[0].topSet, { weight: 225, reps: 3 })

  const prev = new Map<string, number>([[prkey('x', 'Bench Press'), 250], [prKey(null, 'Pull-Ups'), 0]])
  const prs = detectPrs([
    { exercise_id: 'x', exercise_name: 'Bench Press', sets: sets.slice(0, 3) },
    { exercise_id: 'y', exercise_name: 'Squat', sets: [{ reps: 5, weight: 100 }] },
    { exercise_id: 'z', exercise_name: 'Nothing', sets: [{ reps: null, weight: null }] },
  ], prev)
  assert.equal(prs.length, 2)
  assert.equal(prs[0].exercise_name, 'Bench Press')
  assert.equal(prs[0].previous, 250)
  assert.equal(prs[1].previous, null)
  const none = detectPrs([{ exercise_id: 'x', exercise_name: 'Bench Press', sets: [{ reps: 1, weight: 240 }] }], prev)
  assert.equal(none.length, 0)
  function prkey(id: string | null, n: string) { return prKey(id, n) }
})
