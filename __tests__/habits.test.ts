import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dailyStreak, weekCount } from '../lib/habits'

test('dailyStreak counts consecutive days ending today', () => {
  const checks = ['2026-11-07', '2026-11-08', '2026-11-09']
  assert.equal(dailyStreak(checks, '2026-11-09'), 3)
  assert.equal(dailyStreak(['2026-11-05', '2026-11-07', '2026-11-08', '2026-11-09'], '2026-11-09'), 3)
})

test('dailyStreak starts from yesterday when today is not checked yet', () => {
  assert.equal(dailyStreak(['2026-11-07', '2026-11-08'], '2026-11-09'), 2)
  assert.equal(dailyStreak(['2026-11-06'], '2026-11-09'), 0)
})

test('dailyStreak handles no checks and month boundaries', () => {
  assert.equal(dailyStreak([], '2026-11-09'), 0)
  assert.equal(dailyStreak(['2026-10-30', '2026-10-31', '2026-11-01'], '2026-11-01'), 3)
})

test('weekCount counts checks in the Mon-Sun week of today', () => {
  // 2026-11-09 is a Monday, so its ISO week runs 11-09 to 11-15.
  const checks = ['2026-11-08', '2026-11-09', '2026-11-11', '2026-11-15', '2026-11-16']
  assert.equal(weekCount(checks, '2026-11-11'), 3)
  assert.equal(weekCount(checks, '2026-11-15'), 3)
  assert.equal(weekCount(checks, '2026-11-09'), 3)
  assert.equal(weekCount([], '2026-11-11'), 0)
})

test('weekCount on a Sunday stays in the week that began the Monday before', () => {
  assert.equal(weekCount(['2026-11-09', '2026-11-15'], '2026-11-15'), 2)
  assert.equal(weekCount(['2026-11-16'], '2026-11-15'), 0)
})
