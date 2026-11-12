import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readinessScore, readinessVerdict } from '../lib/readiness'

test('readinessScore averages motivation, focus, confidence and inverted anxiety to 0-100', () => {
  assert.equal(readinessScore({ rating_motivation: 10, rating_focus: 10, rating_confidence: 10, rating_anxiety: 1 }), 100)
  assert.equal(readinessScore({ rating_motivation: 5, rating_focus: 5, rating_confidence: 5, rating_anxiety: 5 }), 53)
  assert.equal(readinessScore({ rating_motivation: 1, rating_focus: 1, rating_confidence: 1, rating_anxiety: 10 }), 10)
})

test('readinessScore rounds to a whole number', () => {
  assert.equal(readinessScore({ rating_motivation: 7, rating_focus: 6, rating_confidence: 6, rating_anxiety: 4 }), 65)
  assert.equal(readinessScore({ rating_motivation: 8, rating_focus: 7, rating_confidence: 7, rating_anxiety: 3 }), 75)
})

test('readinessVerdict maps score bands to the existing verdict strings', () => {
  assert.equal(readinessVerdict(80), 'Locked in — peak window.')
  assert.equal(readinessVerdict(65), 'Solid. Execute with intent.')
  assert.equal(readinessVerdict(50), 'Steady. Protect your focus.')
  assert.equal(readinessVerdict(49), 'Recover first. Identity over output.')
})
