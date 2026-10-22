import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeGoalFromQuiz, macrosFromCalories, caloriesFromMacros, splitFromGrams, rebalanceSplit,
  scaleFood, sumEntries, groupEntriesByDay, fillMissingDays, bucketByRange, adherencePct,
  linearTrend, weeksToTarget, searchFoods, loggingStreak, CALORIE_FLOOR, shiftDate,
} from '../lib/nutrition'
import { extractJson, sanitizeEstimate } from '../lib/ai-json'

test('quiz — 150 lb moderate maintain', () => {
  const r = computeGoalFromQuiz({ goal_type: 'maintain', activity_level: 'moderate', current_weight_lb: 150, target_weight_lb: 150 })
  assert.equal(r.maintenance, 2400)
  assert.equal(r.calories, 2400)
  assert.equal(r.grams.protein_g, 120)
  assert.equal(r.grams.fat_g, 75)
  assert.equal(r.grams.carbs_g, Math.round((2400 - 120 * 4 - 75 * 9) / 4))
  assert.equal(r.weeks_to_target, null)
  assert.deepEqual(r.warnings, [])
  assert.equal(r.split.protein_pct + r.split.carbs_pct + r.split.fat_pct, 100)
})

test('quiz — 180 lb high gain', () => {
  const r = computeGoalFromQuiz({ goal_type: 'gain', activity_level: 'high', current_weight_lb: 180, target_weight_lb: 190 })
  assert.equal(r.calories, 3600)
  assert.equal(r.grams.protein_g, 162)
  assert.equal(r.weeks_to_target, 20)
})

test('quiz — small athlete losing clamps to floor with warning', () => {
  const r = computeGoalFromQuiz({ goal_type: 'lose', activity_level: 'light', current_weight_lb: 110, target_weight_lb: 105 })
  assert.equal(r.calories, CALORIE_FLOOR)
  assert.ok(r.warnings.some(w => w.includes('1,600')))
})

test('quiz — contradictory target warns', () => {
  const r = computeGoalFromQuiz({ goal_type: 'gain', activity_level: 'moderate', current_weight_lb: 160, target_weight_lb: 150 })
  assert.ok(r.warnings.some(w => w.includes('below')))
})

test('quiz — protein capped at 35% of calories', () => {
  const r = computeGoalFromQuiz({ goal_type: 'lose', activity_level: 'light', current_weight_lb: 250, target_weight_lb: 200 })
  assert.ok(r.grams.protein_g * 4 <= r.calories * 0.35 + 4)
})

test('macrosFromCalories round-trips within 2%', () => {
  const split = { protein_pct: 30, carbs_pct: 45, fat_pct: 25 }
  const grams = macrosFromCalories(2800, split)
  const back = caloriesFromMacros(grams)
  assert.ok(Math.abs(back - 2800) / 2800 < 0.02)
  const s2 = splitFromGrams(grams)
  assert.equal(s2.protein_pct + s2.carbs_pct + s2.fat_pct, 100)
})

test('rebalanceSplit keeps 100 and ratios', () => {
  const r = rebalanceSplit({ protein_pct: 30, carbs_pct: 50, fat_pct: 20 }, 'protein_pct', 40)
  assert.equal(r.protein_pct, 40)
  assert.equal(r.carbs_pct + r.fat_pct, 60)
  assert.equal(r.carbs_pct, 43)
  const zero = rebalanceSplit({ protein_pct: 100, carbs_pct: 0, fat_pct: 0 }, 'protein_pct', 50)
  assert.equal(zero.carbs_pct + zero.fat_pct, 50)
})

test('scaleFood rounds', () => {
  const r = scaleFood({ calories: 187, protein_g: 35, carbs_g: 0, fat_g: 4.2 }, 1.5)
  assert.deepEqual(r, { calories: 281, protein_g: 52.5, carbs_g: 0, fat_g: 6.3 })
})

test('sumEntries handles numeric strings', () => {
  const t = sumEntries([
    { calories: 100, protein_g: '10.5' as unknown as number, carbs_g: 5, fat_g: '2' as unknown as number },
    { calories: 50, protein_g: 1, carbs_g: 1, fat_g: 1 },
  ])
  assert.deepEqual(t, { calories: 150, protein: 11.5, carbs: 6, fat: 3 })
})

test('bucketByRange averages logged days per week', () => {
  const days = fillMissingDays(groupEntriesByDay([
    { entry_date: '2026-10-19', calories: 2000, protein_g: 100, carbs_g: 200, fat_g: 60 },
    { entry_date: '2026-10-20', calories: 3000, protein_g: 150, carbs_g: 300, fat_g: 90 },
    { entry_date: '2026-10-13', calories: 1800, protein_g: 90, carbs_g: 180, fat_g: 50 },
  ]), 14, new Date(2026, 9, 22))
  const weeks = bucketByRange(days, 'week')
  assert.equal(weeks.length, 3)
  const last = weeks[weeks.length - 1]
  assert.equal(last.key, '2026-10-18')
  assert.equal(last.calories, 2500)
  assert.equal(last.loggedDays, 2)
  const months = bucketByRange(days, 'month')
  assert.equal(months[0].label, 'Oct')
})

test('adherencePct null with nothing logged', () => {
  assert.equal(adherencePct(fillMissingDays([], 7), 2400), null)
  const days = groupEntriesByDay([
    { entry_date: '2026-10-20', calories: 2400, protein_g: 0, carbs_g: 0, fat_g: 0 },
    { entry_date: '2026-10-21', calories: 3000, protein_g: 0, carbs_g: 0, fat_g: 0 },
  ])
  assert.equal(adherencePct(days, 2400), 50)
})

test('loggingStreak ignores an unlogged today', () => {
  const days = fillMissingDays(groupEntriesByDay([
    { entry_date: '2026-10-20', calories: 1, protein_g: 0, carbs_g: 0, fat_g: 0 },
    { entry_date: '2026-10-21', calories: 1, protein_g: 0, carbs_g: 0, fat_g: 0 },
  ]), 5, new Date(2026, 9, 22))
  assert.equal(loggingStreak(days), 2)
})

test('linearTrend slope per week', () => {
  const t = linearTrend([
    { date: '2026-10-01', value: 160 },
    { date: '2026-10-08', value: 159 },
    { date: '2026-10-15', value: 158 },
  ])
  assert.equal(t?.slopePerWeek, -1)
  assert.equal(linearTrend([{ date: '2026-10-01', value: 1 }]), null)
})

test('weeksToTarget', () => {
  assert.equal(weeksToTarget(150, 160, 'gain'), 20)
  assert.equal(weeksToTarget(150, 140, 'lose'), 10)
  assert.equal(weeksToTarget(150, 160, 'maintain'), null)
})

test('shiftDate crosses month boundaries locally', () => {
  assert.equal(shiftDate('2026-11-01', -1), '2026-10-31')
})

test('searchFoods ranks prefix matches first', () => {
  const foods = [
    { id: '1', name: 'Chickpeas' },
    { id: '2', name: 'Grilled Chicken Breast' },
    { id: '3', name: 'Beef Jerky' },
  ]
  const r = searchFoods(foods, 'chick')
  assert.deepEqual(r.map(f => f.id), ['1', '2'])
  assert.deepEqual(searchFoods(foods, 'grilled chick').map(f => f.id), ['2'])
  assert.deepEqual(searchFoods(foods, '   '), [])
})

test('extractJson handles fenced, bare and prose-wrapped', () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 })
  assert.deepEqual(extractJson('{"a":1}'), { a: 1 })
  assert.deepEqual(extractJson('Sure! Here: {"a":1} hope that helps'), { a: 1 })
})

test('sanitizeEstimate clamps and coerces', () => {
  const r = sanitizeEstimate({ name: ' Burrito ', calories: '9999', protein_g: '45.55', carbs_g: -3, fat_g: 'x', confidence: 'wild' })
  assert.deepEqual(r, { name: 'Burrito', serving_size: '1 serving', servings: 1, calories: 3000, protein_g: 45.6, carbs_g: 0, fat_g: 0, confidence: 'low' })
  assert.equal(sanitizeEstimate({ calories: 100 }), null)
})
