import { test } from 'node:test'
import assert from 'node:assert/strict'
import { withFreezes } from '../lib/streak-freeze'
import { calcStreak } from '../components/mindset/flow-logic'

const run = (from: number, to: number, month = '10') => Array.from({ length: to - from + 1 }, (_, i) => `2026-${month}-${String(from + i).padStart(2, '0')}`)

test('no freezes before 7 active days: a miss breaks the streak', () => {
  const f = withFreezes([...run(1, 5), ...run(7, 8)], '2026-10-08')
  assert.deepEqual(f.frozen, [])
  assert.equal(calcStreak(f.days, '2026-10-08'), 2)
})

test('7 days earns one freeze, and a missed day uses it', () => {
  const f = withFreezes([...run(1, 7), ...run(9, 10)], '2026-10-10')
  assert.deepEqual(f.frozen, ['2026-10-08'])
  assert.equal(f.bank, 0)
  assert.equal(calcStreak(f.days, '2026-10-10'), 10)
})

test('the bank never holds more than 2', () => {
  const f = withFreezes(run(1, 28), '2026-10-28')
  assert.equal(f.bank, 2)
})

test('two saved freezes cover two missed days in a row; a third breaks it', () => {
  const base = run(1, 14)
  const two = withFreezes([...base, '2026-10-17'], '2026-10-17')
  assert.deepEqual(two.frozen, ['2026-10-15', '2026-10-16'])
  assert.equal(calcStreak(two.days, '2026-10-17'), 17)
  const three = withFreezes([...base, '2026-10-18'], '2026-10-18')
  assert.equal(calcStreak(three.days, '2026-10-18'), 1)
})

test('yesterday missed with a freeze held: streak still stands today', () => {
  const f = withFreezes(run(1, 7), '2026-10-08') // today is the 9th, nothing logged yet
  assert.deepEqual(f.frozen, ['2026-10-08'])
  assert.equal(calcStreak(f.days, '2026-10-09'), 8)
})

test('today is never treated as missed', () => {
  const f = withFreezes(run(1, 7), '2026-10-07') // today is the 8th
  assert.deepEqual(f.frozen, [])
  assert.equal(f.bank, 1)
  assert.equal(calcStreak(f.days, '2026-10-08'), 7)
})

test('without `through`, only gaps between active days are bridged', () => {
  const f = withFreezes(run(1, 7))
  assert.deepEqual(f.frozen, [])
  assert.deepEqual(withFreezes([]).days, [])
})
