import test from 'node:test'
import assert from 'node:assert/strict'
import { gameDayPhase, gameDayGuide, daysUntil } from '../lib/game-day'

test('phase — game day, night before, none', () => {
  assert.equal(gameDayPhase('2026-10-29', '2026-10-29'), 'game_day')
  assert.equal(gameDayPhase('2026-10-29', '2026-10-28'), 'night_before')
  assert.equal(gameDayPhase('2026-11-01', '2026-10-31'), 'night_before')
  assert.equal(gameDayPhase('2026-10-30', '2026-10-28'), 'none')
  assert.equal(gameDayPhase('2026-10-27', '2026-10-28'), 'none')
  assert.equal(gameDayPhase(null, '2026-10-28'), 'none')
  assert.equal(gameDayPhase('2026-10-29T00:00:00+00:00', '2026-10-29'), 'game_day')
})

test('daysUntil', () => {
  assert.equal(daysUntil('2026-11-04', '2026-10-28'), 7)
  assert.equal(daysUntil('2026-10-28', '2026-10-28'), 0)
  assert.equal(daysUntil('2026-10-20', '2026-10-28'), -8)
  assert.equal(daysUntil(null, '2026-10-28'), null)
})

test('guide scales carbs with body weight', () => {
  const g = gameDayGuide('game_day', 165)   // ~75 kg
  const pre = g.blocks[0].items[0]
  assert.match(pre, /75–150 g carbs/)
  assert.match(pre, /30 g protein/)
  const generic = gameDayGuide('game_day')
  assert.match(generic.blocks[0].items[0], /75–150 g carbs/)
  assert.match(generic.blocks[0].items[0], /25–35 g protein/)
})

test('night-before guide has dinner, hydration, rules', () => {
  const g = gameDayGuide('night_before', 130)
  assert.equal(g.blocks.length, 3)
  assert.match(g.blocks[0].items[0], /90–120 g/)
  assert.ok(g.title.includes('Tomorrow'))
})
