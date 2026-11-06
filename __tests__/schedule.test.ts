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
