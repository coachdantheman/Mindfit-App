import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTrendSeries } from '../lib/rating-trends'

const now = new Date(2026, 9, 30, 12) // Fri Oct 30 2026

function entry(date: string, m: number, f = m, c = m, a = m) {
  return { entry_date: date, rating_motivation: m, rating_focus: f, rating_confidence: c, rating_anxiety: a }
}

test('week view — only the last 7 days, oldest first', () => {
  const pts = buildTrendSeries([entry('2026-10-30', 8), entry('2026-10-23', 5), entry('2026-10-24', 6)], 'week', now)
  assert.deepEqual(pts.map(p => p.Motivation), [6, 8])
  assert.equal(pts[0].label, 'Sat 24')
})

test('month view — last 30 days', () => {
  const pts = buildTrendSeries([entry('2026-09-30', 3), entry('2026-10-01', 4), entry('2026-10-30', 9)], 'month', now)
  assert.deepEqual(pts.map(p => p.Motivation), [4, 9])
  assert.equal(pts[0].label, 'Oct 1')
})

test('weekly average — groups Monday-start weeks and rounds to 1 decimal', () => {
  const pts = buildTrendSeries([
    entry('2026-10-26', 6), entry('2026-10-28', 7), entry('2026-10-30', 9), // week of Oct 26
    entry('2026-10-20', 4),                                                  // week of Oct 19
  ], 'weekly_avg', now)
  assert.equal(pts.length, 2)
  assert.equal(pts[0].label, 'Oct 19')
  assert.equal(pts[1].label, 'Oct 26')
  assert.equal(pts[1].Motivation, 7.3)
  assert.equal(pts[1].entries, 3)
})

test('monthly average — one point per month, capped at 12', () => {
  const entries = []
  for (let m = 0; m < 14; m++) {
    const d = new Date(2025, 8 + m, 15)
    entries.push(entry(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-15`, 5))
  }
  const pts = buildTrendSeries(entries, 'monthly_avg', now)
  assert.equal(pts.length, 12)
  assert.equal(pts[pts.length - 1].label, 'Oct 26')
  assert.equal(pts[0].label, 'Nov 25')
})

test('empty input gives empty series', () => {
  assert.deepEqual(buildTrendSeries([], 'week', now), [])
})
