import test from 'node:test'
import assert from 'node:assert/strict'
import { calcMPI, MPI_DIMENSIONS } from '../lib/mpi'
import { calcActivityStreak, localDateISO } from '../lib/streaks'

function iso(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return localDateISO(d)
}

test('calcMPI — all 5s gives 50', () => {
  const scores = Object.fromEntries(MPI_DIMENSIONS.map(d => [d.key, 5]))
  assert.equal(calcMPI(scores), 50)
})

test('calcMPI — all 10s gives 100', () => {
  const scores = Object.fromEntries(MPI_DIMENSIONS.map(d => [d.key, 10]))
  assert.equal(calcMPI(scores), 100)
})

test('calcMPI — missing keys count as 0', () => {
  assert.equal(calcMPI({}), 0)
})

test('calcActivityStreak — union of sources counts once per day', () => {
  const streak = calcActivityStreak([
    [iso(0), iso(1)],           // journal
    [new Date().toISOString()], // flow timestamp, same day as iso(0)
    [iso(2)],                   // food
  ])
  assert.equal(streak, 3)
})

test('calcActivityStreak — gap breaks the streak', () => {
  const streak = calcActivityStreak([[iso(0), iso(2), iso(3)]])
  assert.equal(streak, 1)
})

test('calcActivityStreak — empty and undefined groups give 0', () => {
  assert.equal(calcActivityStreak([[], undefined]), 0)
})

// Sleep hours calculation (mirrors calcHours in app/(app)/sleep/page.tsx)
function calcHours(bedtime: string, wakeTime: string): string {
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = wakeTime.split(':').map(Number)
  const bedMins = bh * 60 + bm
  let wakeMins = wh * 60 + wm
  if (wakeMins <= bedMins) wakeMins += 24 * 60
  return ((wakeMins - bedMins) / 60).toFixed(1)
}

test('sleep hours — across midnight', () => {
  assert.equal(calcHours('22:30', '06:30'), '8.0')
})

test('sleep hours — same-day nap window', () => {
  assert.equal(calcHours('13:00', '14:30'), '1.5')
})

test('sleep hours — wake equals bed rolls a full day', () => {
  assert.equal(calcHours('22:00', '22:00'), '24.0')
})
