import test from 'node:test'
import assert from 'node:assert/strict'
import {
  scoreDay, scoreMonth, levelFor, nextLevel, levelProgress, titleFor, rankEntries, neighbours,
  displayNameFor, isValidAlias, monthBounds, isoWeekKey, type ActivityRow, type Score,
} from '../lib/leaderboard'
import { LEVELS, CLUTCH_DAY_BONUS, MIN_TITLE_POINTS } from '../lib/leaderboard-config'

function row(user_id: string, day: string, counts: Partial<ActivityRow> = {}): ActivityRow {
  return {
    user_id, day,
    journal: 0, assessments: 0, flow_sessions: 0, flow_logs: 0, flow_checkins: 0,
    visualization: 0, meditation: 0, affirmations: 0, goals_done: 0,
    workouts: 0, sets: 0, food: 0, sleep: 0, recovery: 0,
    ...counts,
  }
}

test('scoreDay — per-day caps', () => {
  assert.equal(scoreDay(row('u', '2026-10-05', { journal: 3 })).mind, 10)
  const body = scoreDay(row('u', '2026-10-05', { workouts: 3, sets: 14 })).body
  assert.equal(body, 2 * 25 + 10)
  assert.equal(scoreDay(row('u', '2026-10-05', { flow_checkins: 5 })).mind, 15)
})

test('scoreDay — fuel', () => {
  assert.equal(scoreDay(row('u', '2026-10-05')).fuel, 0)
  assert.equal(scoreDay(row('u', '2026-10-05', { food: 1 })).fuel, 10)
  assert.equal(scoreDay(row('u', '2026-10-05', { food: 3 })).fuel, 15)
  assert.equal(scoreDay(row('u', '2026-10-05', { food: 9 })).fuel, 15)
})

test('scoreMonth — weekly assessment counts once per ISO week', () => {
  const same = scoreMonth([row('u', '2026-10-05', { assessments: 1 }), row('u', '2026-10-07', { assessments: 1 })])
  assert.equal(same.get('u')!.pillars.mind, 25)
  const twoWeeks = scoreMonth([row('u', '2026-10-05', { assessments: 1 }), row('u', '2026-10-12', { assessments: 1 })])
  assert.equal(twoWeeks.get('u')!.pillars.mind, 50)
})

test('scoreMonth — Clutch Day only with all four pillars', () => {
  const clutch = scoreMonth([row('u', '2026-10-05', { journal: 1, workouts: 1, food: 1, sleep: 1 })]).get('u')!
  assert.equal(clutch.pillars.bonus, CLUTCH_DAY_BONUS)
  assert.equal(clutch.clutchDays, 1)
  assert.equal(clutch.total, 10 + 25 + 10 + 10 + CLUTCH_DAY_BONUS)
  const three = scoreMonth([row('u', '2026-10-05', { journal: 1, workouts: 1, food: 1 })]).get('u')!
  assert.equal(three.pillars.bonus, 0)
  assert.equal(three.activeDays, 1)
})

test('levels — boundaries and progress', () => {
  assert.equal(levelFor(0).key, 'rookie')
  assert.equal(levelFor(199).key, 'rookie')
  assert.equal(levelFor(200).key, 'starter')
  assert.equal(levelFor(3000).key, 'legend')
  assert.equal(levelFor(9999).key, 'legend')
  assert.equal(nextLevel(3000), null)
  assert.equal(nextLevel(250)!.key, 'captain')
  assert.equal(levelProgress(400), 0.5)
  assert.equal(levelProgress(5000), 1)
  assert.deepEqual(LEVELS.map(l => l.min), [...LEVELS.map(l => l.min)].sort((a, b) => a - b))
})

const pillars = (mind: number, body: number, fuel: number, rest: number, bonus = 0) => ({ mind, body, fuel, rest, bonus })

test('titles — precedence and thresholds', () => {
  assert.equal(titleFor(pillars(60, 20, 10, 5), 95).key, 'warming_up')
  assert.equal(titleFor(pillars(60, 20, 10, 10), 100).key, 'monk')
  assert.equal(titleFor(pillars(10, 70, 10, 10), 100).key, 'gym_rat')
  assert.equal(titleFor(pillars(40, 35, 15, 10), 100).key, 'gym_monk')
  assert.equal(titleFor(pillars(35, 10, 15, 40), 100).key, 'dreamer')
  assert.equal(titleFor(pillars(25, 25, 25, 25), 100).key, 'clutch')
  assert.equal(titleFor(pillars(45, 28, 27, 0), 100).key, 'utility')
})

test('titles — bonus excluded from shares but counted toward minimum', () => {
  // 50 base + 60 bonus = 110 total ≥ MIN, shares from the 50 base only
  const t = titleFor(pillars(30, 10, 5, 5, 60), 110)
  assert.ok(110 >= MIN_TITLE_POINTS)
  assert.equal(t.key, 'monk')
})

function scores(entries: Record<string, number>): Map<string, Score> {
  return new Map(Object.entries(entries).map(([id, total]) => [id, { total, pillars: pillars(total, 0, 0, 0), clutchDays: 0, activeDays: 1 }]))
}
const member = (id: string, fullName: string, alias: string | null = null) => ({ id, fullName, alias, sport: null })

test('rankEntries — competition ranking, zero points unranked', () => {
  const list = rankEntries(scores({ a: 300, b: 200, c: 200, d: 100, e: 0 }), [
    member('a', 'Ann A'), member('b', 'Bob B'), member('c', 'Cal C'), member('d', 'Dee D'), member('e', 'Eve E'),
  ], { meId: 'd' })
  assert.deepEqual(list.map(e => e.rank), [1, 2, 2, 4])
  assert.equal(list.find(e => e.isMe)!.displayName, 'Dee D.')
  assert.ok(!list.some(e => e.displayName === 'Eve E.'))
})

test('neighbours — null inside top 10, two above/below otherwise, clamped', () => {
  const pool = Array.from({ length: 15 }, (_, i) => member(`u${i}`, `User ${i}`))
  const sc = scores(Object.fromEntries(pool.map((m, i) => [m.id, 1000 - i * 10])))
  assert.equal(neighbours(rankEntries(sc, pool, { meId: 'u3' })), null)
  const mid = neighbours(rankEntries(sc, pool, { meId: 'u12' }))!
  assert.deepEqual(mid.map(e => e.rank), [11, 12, 13, 14, 15])
  const last = neighbours(rankEntries(sc, pool, { meId: 'u14' }))!
  assert.deepEqual(last.map(e => e.rank), [13, 14, 15])
  const tenth = neighbours(rankEntries(sc, pool, { meId: 'u10' }))!
  assert.deepEqual(tenth.map(e => e.rank), [11, 12, 13])
})

test('displayNameFor — first name + last initial, alias wins', () => {
  assert.equal(displayNameFor('Daniel Jacobsen'), 'Daniel J.')
  assert.equal(displayNameFor('Daniel'), 'Daniel')
  assert.equal(displayNameFor('  mary jo  smith '), 'mary S.')
  assert.equal(displayNameFor(null), 'Athlete')
  assert.equal(displayNameFor('Daniel Jacobsen', 'DJ the Monk'), 'DJ the Monk')
  assert.equal(displayNameFor('Daniel Jacobsen', 'x'), 'Daniel J.')
})

test('isValidAlias', () => {
  assert.equal(isValidAlias('x'), false)
  assert.equal(isValidAlias('ab'), true)
  assert.equal(isValidAlias('a'.repeat(20)), true)
  assert.equal(isValidAlias('a'.repeat(21)), false)
  assert.equal(isValidAlias('line\nbreak'), false)
})

test('monthBounds — across the year boundary and in a timezone', () => {
  const jan = monthBounds(new Date(Date.UTC(2027, 0, 15, 12)), 'UTC')
  assert.equal(jan.month, '2027-01')
  assert.equal(jan.thisStart, '2027-01-01')
  assert.equal(jan.thisEnd, '2027-01-31')
  assert.equal(jan.lastStart, '2026-12-01')
  assert.equal(jan.lastEnd, '2026-12-31')
  assert.equal(jan.lastMonth, '2026-12')
  assert.equal(jan.daysLeft, 17)
  // 03:00 UTC on Nov 1 is still Oct 31 in New York
  const ny = monthBounds(new Date(Date.UTC(2026, 10, 1, 3)), 'America/New_York')
  assert.equal(ny.month, '2026-10')
  assert.equal(ny.daysLeft, 1)
})

test('isoWeekKey', () => {
  assert.equal(isoWeekKey('2026-10-05'), '2026-W41')
  assert.equal(isoWeekKey('2026-10-11'), '2026-W41')
  assert.equal(isoWeekKey('2026-10-12'), '2026-W42')
  assert.equal(isoWeekKey('2027-01-01'), '2026-W53')
})
