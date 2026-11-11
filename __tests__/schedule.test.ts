import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanEvent, expandRecurring, nextGame, trainingDayKind } from '../lib/schedule'

test('cleanEvent normalizes loose input and rejects bad dates', () => {
  const e = cleanEvent({ kind: 'game', event_date: '2026-11-13', start_time: '7:00 PM', opponent: '  Central  ', home_away: 'away' })
  assert.deepEqual(e, { kind: 'game', event_date: '2026-11-13', start_time: '19:00', opponent: 'Central', location: null, home_away: 'away', notes: null })
  assert.equal(cleanEvent({ event_date: '2026-02-30' }), null)
  assert.equal(cleanEvent({ event_date: 'Friday' }), null)
  assert.equal(cleanEvent({ event_date: '2026-11-13', start_time: '12:15 am' })?.start_time, '00:15')
  assert.equal(cleanEvent({ event_date: '2026-11-13', start_time: '15:30' })?.start_time, '15:30')
  const p = cleanEvent({ kind: 'practice', event_date: '2026-11-10', opponent: 'x', home_away: 'home' })
  assert.equal(p?.opponent, null)
  assert.equal(p?.home_away, null)
})

test('expandRecurring makes practices on picked weekdays and skips game days', () => {
  // 2026-11-09 is a Monday.
  const rows = expandRecurring({ days: [1, 3], start_time: '15:30', from: '2026-11-09', to: '2026-11-22' }, new Set(['2026-11-18']))
  assert.deepEqual(rows.map(r => r.event_date), ['2026-11-09', '2026-11-11', '2026-11-16'])
  assert.ok(rows.every(r => r.kind === 'practice' && r.start_time === '15:30'))
  assert.deepEqual(expandRecurring({ days: [1], start_time: null, from: '2026-11-20', to: '2026-11-01' }), [])
})

test('trainingDayKind flags game day and the day before', () => {
  const games = ['2026-11-13']
  assert.equal(trainingDayKind('2026-11-13', games), 'game')
  assert.equal(trainingDayKind('2026-11-12', games), 'pre_game')
  assert.equal(trainingDayKind('2026-11-11', games), null)
  assert.equal(trainingDayKind('2026-11-30', ['2026-12-01']), 'pre_game')
})

test('nextGame picks the soonest upcoming game', () => {
  const ev = [
    { kind: 'practice' as const, event_date: '2026-11-07', start_time: null },
    { kind: 'game' as const, event_date: '2026-11-20', start_time: '19:00' },
    { kind: 'game' as const, event_date: '2026-11-05', start_time: '19:00' },
    { kind: 'game' as const, event_date: '2026-11-13', start_time: '18:00' },
  ]
  assert.equal(nextGame(ev, '2026-11-06')?.event_date, '2026-11-13')
  assert.equal(nextGame(ev, '2026-11-21'), null)
})

test('findOverlap uses end time or default lengths', async () => {
  const { findOverlap, eventSpan } = await import('../lib/schedule')
  const practice = { kind: 'practice', event_date: '2026-11-10', start_time: '15:30', end_time: null }
  assert.deepEqual(eventSpan(practice), [930, 1050])
  assert.equal(findOverlap({ kind: 'training', event_date: '2026-11-10', start_time: '17:00', end_time: '18:00' }, [practice]), practice)
  assert.equal(findOverlap({ kind: 'training', event_date: '2026-11-10', start_time: '17:30', end_time: '18:30' }, [practice]), null)
  assert.equal(findOverlap({ kind: 'training', event_date: '2026-11-11', start_time: '16:00' }, [practice]), null)
  assert.equal(findOverlap({ kind: 'training', event_date: '2026-11-10', start_time: null }, [practice]), null)
  const game = { kind: 'game', event_date: '2026-11-13', start_time: '19:00' }
  assert.equal(findOverlap({ kind: 'session', event_date: '2026-11-13', start_time: '21:30' }, [game]), game)
})

test('effectivePrimary: coach schedule wins over the athlete own primary', async () => {
  const { effectivePrimary } = await import('../lib/schedule')
  assert.deepEqual(effectivePrimary([1, 2], [3]), { source: 'coach', events: [1, 2], hiddenOwn: 1 })
  assert.deepEqual(effectivePrimary([], [3]), { source: 'athlete', events: [3], hiddenOwn: 0 })
  assert.deepEqual(effectivePrimary([], []), { source: 'none', events: [], hiddenOwn: 0 })
})

// ─── Training days around the schedule ─────────────────────────────────────
import { suggestMove, suggestTrainingDays, weekdayLoad, weekdayNote } from '../lib/schedule'

const ev = (kind: 'game' | 'practice', event_date: string) => ({ kind, event_date })

test('weekdayLoad counts games and practices by weekday inside the window', () => {
  // 2026-11-13 is a Friday, 2026-11-10 a Tuesday.
  const load = weekdayLoad([ev('game', '2026-11-13'), ev('game', '2026-11-20'), ev('practice', '2026-11-10'), ev('game', '2027-03-05')], '2026-11-09', '2026-12-06')
  assert.equal(load[5].games, 2)
  assert.equal(load[2].practices, 1)
  assert.equal(weekdayNote(load, 5), 'game')
  assert.equal(weekdayNote(load, 4), 'pre_game')
  assert.equal(weekdayNote(load, 2), 'practice')
  assert.equal(weekdayNote(load, 1), null)
})

test('suggestTrainingDays spreads evenly with no schedule', () => {
  const empty = weekdayLoad([], '2026-11-09', '2026-12-06')
  assert.deepEqual(suggestTrainingDays(empty, 3), [1, 3, 5])
  assert.deepEqual(suggestTrainingDays(empty, 4), [1, 2, 4, 5])
  assert.deepEqual(suggestTrainingDays(empty, 2), [1, 4])
})

test('suggestTrainingDays skips game days and the day before', () => {
  const load = weekdayLoad([ev('game', '2026-11-13')], '2026-11-09', '2026-12-06')
  const days = suggestTrainingDays(load, 3)
  assert.equal(days.includes(5), false)
  assert.equal(days.includes(4), false)
  assert.equal(days.length, 3)
})

test('suggestTrainingDays prefers days without practice', () => {
  const load = weekdayLoad([ev('practice', '2026-11-09'), ev('practice', '2026-11-11'), ev('game', '2026-11-13')], '2026-11-09', '2026-12-06')
  assert.deepEqual(suggestTrainingDays(load, 3), [2, 6, 7])
})

test('suggestTrainingDays still returns the count when every day is busy', () => {
  const all = ['09', '10', '11', '12', '13', '14', '15'].map(d => ev('game', `2026-11-${d}`))
  assert.equal(suggestTrainingDays(weekdayLoad(all, '2026-11-09', '2026-11-15'), 4).length, 4)
})

test('suggestMove moves a lift off a game day to the nearest open day', () => {
  // Week of Mon 2026-11-09; lifts Mon/Wed/Fri; game Fri 13th.
  assert.deepEqual(suggestMove([1, 3, 5], '2026-11-09', '2026-11-09', ['2026-11-13']), { from: 5, to: 6 })
})

test('suggestMove ignores days already past and returns null with no clash', () => {
  assert.equal(suggestMove([1, 3, 5], '2026-11-09', '2026-11-09', ['2026-11-12']), null)
  assert.equal(suggestMove([1, 3, 5], '2026-11-09', '2026-11-14', ['2026-11-13']), null)
})
