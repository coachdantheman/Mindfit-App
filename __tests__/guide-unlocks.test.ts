import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newlyEarned, type UnlockFacts } from '../lib/guide-unlocks'

const facts = (over: Partial<UnlockFacts> = {}): UnlockFacts => ({
  owned: ['dog'], bestStreak: 0, clutchDays: 0, maxLeagueTier: 1, titles: [], levels: ['rookie'], tierUps: 0, journals: 0, mpiGain: 0, ...over,
})

test('nothing is earned on day one', () => {
  assert.deepEqual(newlyEarned(facts()), [])
})

test('the other two starters come at the first Clutch Day and a 14-day best streak', () => {
  assert.deepEqual(newlyEarned(facts({ clutchDays: 1 })), ['sparrow'])
  assert.deepEqual(newlyEarned(facts({ bestStreak: 14 })), ['fish'])
  assert.deepEqual(newlyEarned(facts({ owned: ['sparrow'], clutchDays: 1, bestStreak: 14 })), ['dog', 'fish'])
})

test('league tiers, titles, levels and personal bests each earn their character', () => {
  assert.deepEqual(newlyEarned(facts({ maxLeagueTier: 5 })), ['fox', 'lion'])
  assert.deepEqual(newlyEarned(facts({ titles: ['monk', 'chef'] })), ['owl', 'raccoon'])
  assert.deepEqual(newlyEarned(facts({ levels: ['legend'], tierUps: 2, journals: 30, mpiGain: 10 })), ['stag', 'ram', 'chameleon', 'beaver'])
  assert.deepEqual(newlyEarned(facts({ clutchDays: 10 })), ['sparrow', 'tiger'])
})

test('a character already owned is not earned again', () => {
  assert.deepEqual(newlyEarned(facts({ owned: ['dog', 'fox', 'sparrow'], maxLeagueTier: 3, clutchDays: 2 })), [])
})

test('with no starter picked yet, the other starters are not handed out', () => {
  assert.deepEqual(newlyEarned(facts({ owned: [], clutchDays: 3, bestStreak: 20 })), [])
})
