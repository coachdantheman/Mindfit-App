import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_STEPS, STEP_INFO, activeRoutine, cleanSteps, countdownLabel, runProgress, stepClock, triggersSet } from '../lib/pregame'

test('default routine ends on the triggers and runs latest-first', () => {
  assert.equal(DEFAULT_STEPS.at(-1)?.kind, 'triggers')
  const mins = DEFAULT_STEPS.map(s => s.minutes_before)
  assert.deepEqual(mins, [...mins].sort((a, b) => b - a))
})

test('every default step has a research line with a source', () => {
  for (const s of DEFAULT_STEPS) {
    assert.ok(STEP_INFO[s.kind].why, s.kind)
    assert.ok(STEP_INFO[s.kind].source, s.kind)
  }
})

test('cleanSteps drops junk, sorts, clamps and always ends on triggers', () => {
  const out = cleanSteps([
    { kind: 'breath', title: '  ', minutes_before: 5 },
    { kind: 'nope', title: 'x', minutes_before: 1 },
    { kind: 'custom', title: 'Tape ankles', minutes_before: 9999 },
    { kind: 'triggers', title: 'mine', minutes_before: 30 },
    null,
  ])
  assert.deepEqual(out.map(s => s.kind), ['custom', 'breath', 'triggers'])
  assert.equal(out[0].minutes_before, 480)
  assert.equal(out[1].title, 'Breathing reset')
  assert.equal(out[2].minutes_before, 0)
})

test('cleanSteps keeps ids unique and caps the list', () => {
  const many = Array.from({ length: 40 }, () => ({ kind: 'custom', title: 'a', minutes_before: 10 }))
  const out = cleanSteps(many)
  assert.equal(out.length, 15)
  assert.equal(new Set(out.map(s => s.id)).size, 15)
})

test('stepClock and countdownLabel', () => {
  assert.equal(stepClock('19:00', 45), '6:15 PM')
  assert.equal(stepClock('12:30', 30), '12:00 PM')
  assert.equal(stepClock('00:20', 30), null)
  assert.equal(stepClock(null, 30), null)
  assert.equal(countdownLabel(0), 'Game time')
  assert.equal(countdownLabel(45), '45 min before')
  assert.equal(countdownLabel(210), '3.5 hr before')
  assert.equal(countdownLabel(60), '1 hr before')
})

test('runProgress ignores unknown ids and duplicates', () => {
  const p = runProgress(DEFAULT_STEPS, ['meal', 'meal', 'gone'])
  assert.equal(p.done, 1)
  assert.equal(p.complete, false)
  assert.equal(runProgress(DEFAULT_STEPS, DEFAULT_STEPS.map(s => s.id)).complete, true)
})

test('activeRoutine prefers own default, then own, then team', () => {
  const a = { is_default: false, n: 'a' }, b = { is_default: true, n: 'b' }, team = { is_default: false, n: 't' }
  assert.equal(activeRoutine([a, b], team), b)
  assert.equal(activeRoutine([a], team), a)
  assert.equal(activeRoutine([], team), team)
  assert.equal(activeRoutine([], null), null)
})

test('triggersSet needs all three', () => {
  assert.equal(triggersSet({ cue_word: 'Smooth', external_trigger: 'Anthem', physical_trigger: null }), false)
  assert.equal(triggersSet({ cue_word: 'Smooth', external_trigger: 'Anthem', physical_trigger: 'Exhale' }), true)
})
