import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scheduledKinds, localClock, shiftDate } from '../lib/notify-jobs'

const base = { reminderHour: 18, loggedToday: false, streak: 0 }
const clock = (hour: number, weekday = 2, dayOfMonth = 10) => ({ hour, weekday, dayOfMonth, date: '2026-11-10' })

test('reminder only at the chosen hour and only if nothing logged', () => {
  assert.deepEqual(scheduledKinds({ ...base, clock: clock(18) }), ['reminder'])
  assert.deepEqual(scheduledKinds({ ...base, clock: clock(17) }), [])
  assert.deepEqual(scheduledKinds({ ...base, loggedToday: true, clock: clock(18) }), [])
})

test('streak-at-risk at 7 pm replaces the reminder', () => {
  assert.deepEqual(scheduledKinds({ ...base, reminderHour: 19, streak: 5, clock: clock(19) }), ['streak'])
  assert.deepEqual(scheduledKinds({ ...base, reminderHour: 19, streak: 2, clock: clock(19) }), ['reminder'])
  assert.deepEqual(scheduledKinds({ ...base, streak: 5, loggedToday: true, clock: clock(19) }), [])
})

test('Sunday check-in and recap, first-of-month reset', () => {
  assert.deepEqual(scheduledKinds({ ...base, loggedToday: true, clock: clock(17, 0) }), ['weekly_assessment'])
  assert.deepEqual(scheduledKinds({ ...base, loggedToday: true, clock: clock(18, 0) }), ['weekly_recap'])
  assert.deepEqual(scheduledKinds({ ...base, loggedToday: true, clock: clock(9, 3, 1) }), ['month_start'])
})

test('Sunday 3 pm final hours for the league', () => {
  assert.deepEqual(scheduledKinds({ ...base, loggedToday: true, clock: clock(15, 0) }), ['league_final'])
  assert.deepEqual(scheduledKinds({ ...base, loggedToday: true, clock: clock(15, 1) }), [])
  assert.deepEqual(scheduledKinds({ ...base, loggedToday: true, clock: clock(14, 0) }), [])
})

test('quiet hours send nothing', () => {
  assert.deepEqual(scheduledKinds({ ...base, reminderHour: 18, clock: clock(23) }), [])
  assert.deepEqual(scheduledKinds({ ...base, clock: clock(6, 0, 1) }), [])
})

test('local clock follows the timezone', () => {
  const now = new Date('2026-11-08T02:30:00Z')
  assert.deepEqual(localClock('America/Denver', now), { hour: 19, weekday: 6, date: '2026-11-07', dayOfMonth: 7 })
  assert.equal(localClock('UTC', now).date, '2026-11-08')
  assert.equal(shiftDate('2026-12-31', 1), '2027-01-01')
})
