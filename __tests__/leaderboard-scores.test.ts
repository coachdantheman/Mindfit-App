import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildScoreRows, liveStreak } from '../lib/leaderboard-scores'
import { scoreMonth, type ActivityRow } from '../lib/leaderboard'
import { ACTIONS } from '../lib/leaderboard-config'

const blank = Object.fromEntries(ACTIONS.map(a => [a.key, 0]))
const row = (day: string, over: Partial<ActivityRow> = {}): ActivityRow =>
  ({ user_id: 'u1', day, food: 0, ...blank, ...over } as ActivityRow)

const now = new Date('2026-11-11T17:00:00Z')
const tz = 'America/New_York'

test('buildScoreRows matches scoreMonth for this month and last month', () => {
  const rows = [
    row('2026-10-30', { journal: 2 }), row('2026-10-31', { journal: 2, food: 3 }),
    row('2026-11-09', { journal: 2 }), row('2026-11-10', { journal: 2, workouts: 1 }), row('2026-11-11', { food: 2 }),
  ]
  const [thisMonth, lastMonth] = buildScoreRows('u1', rows, tz, now)
  assert.equal(thisMonth.month, '2026-11')
  assert.equal(lastMonth.month, '2026-10')
  assert.equal(thisMonth.points, scoreMonth(rows.filter(r => r.day >= '2026-11-01'), rows).get('u1')!.total)
  assert.equal(lastMonth.points, scoreMonth(rows.filter(r => r.day < '2026-11-01'), rows).get('u1')!.total)
  assert.ok(thisMonth.points > 0 && lastMonth.points > 0)
  assert.equal(thisMonth.mind + thisMonth.body + thisMonth.fuel + thisMonth.rest + thisMonth.bonus, thisMonth.points)
})

test('streak, last active day and recent days come from the activity', () => {
  const rows = [row('2026-10-20', { journal: 2 }), row('2026-11-09', { journal: 2 }), row('2026-11-10', { journal: 2 }), row('2026-11-11', { food: 1 })]
  const [r] = buildScoreRows('u1', rows, tz, now)
  assert.equal(r.streak, 3)
  assert.equal(r.last_active_day, '2026-11-11')
  assert.deepEqual(r.recent_days, ['2026-11-09', '2026-11-10', '2026-11-11'])
})

test('no activity gives zero rows, not a crash', () => {
  const [r] = buildScoreRows('u1', [], tz, now)
  assert.equal(r.points, 0)
  assert.equal(r.streak, 0)
  assert.equal(r.last_active_day, null)
})

test('a stored streak expires once a full day is missed', () => {
  const stored = { streak: 5, last_active_day: '2026-11-10' }
  assert.equal(liveStreak(stored, '2026-11-10'), 5)
  assert.equal(liveStreak(stored, '2026-11-11'), 5)
  assert.equal(liveStreak(stored, '2026-11-12'), 0)
  assert.equal(liveStreak(null, '2026-11-12'), 0)
})
