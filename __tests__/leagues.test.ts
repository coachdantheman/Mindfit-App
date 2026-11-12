import { test } from 'node:test'
import assert from 'node:assert/strict'
import { daysLeftIn, leagueName, weekPoints, weekStartOf, zoneOf } from '../lib/leagues'

test('weeks start on Monday', () => {
  assert.equal(weekStartOf('2026-11-11'), '2026-11-09') // Wednesday
  assert.equal(weekStartOf('2026-11-09'), '2026-11-09') // Monday
  assert.equal(weekStartOf('2026-11-15'), '2026-11-09') // Sunday
  assert.equal(weekStartOf('2026-11-01'), '2026-10-26') // Sunday, across a month
})

test('days left counts today; Sunday is the last day', () => {
  assert.equal(daysLeftIn('2026-11-09', '2026-11-09'), 7)
  assert.equal(daysLeftIn('2026-11-09', '2026-11-15'), 1)
  assert.equal(daysLeftIn('2026-11-09', '2026-11-16'), 0)
})

test('week points only count the week, but keep a streak that started earlier', () => {
  const row = (day: string) => ({ user_id: 'u', day, food: 0, journal: 2 } as any)
  const rows = ['03', '04', '05', '06', '07', '08', '09', '10'].map(d => row(`2026-11-${d}`))
  // Nov 9 is day 7 of the run (x1.25 → 13), Nov 10 is day 8 (13).
  assert.equal(weekPoints(rows, '2026-11-09', 'u'), 26)
  assert.equal(weekPoints(rows, '2026-11-16', 'u'), 0)
})

test('zones: top 5 up, bottom 5 down, none in small groups or at the ends', () => {
  assert.equal(zoneOf(1, 30, 100, 2), 'up')
  assert.equal(zoneOf(5, 30, 100, 2), 'up')
  assert.equal(zoneOf(6, 30, 100, 2), null)
  assert.equal(zoneOf(26, 30, 10, 2), 'down')
  assert.equal(zoneOf(26, 30, 10, 1), null)
  assert.equal(zoneOf(1, 30, 100, 6), null)
  assert.equal(zoneOf(1, 9, 100, 2), null)
  assert.equal(zoneOf(3, 30, 0, 2), null)
  assert.equal(leagueName(1), 'Rookie League')
  assert.equal(leagueName(6), 'Legend League')
})
