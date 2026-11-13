import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lowMetric, offerDue } from '../lib/low-score'

const r = (motivation: number, focus: number, confidence: number, anxiety = 5) => ({ motivation, focus, confidence, anxiety })

test('nothing is flagged at 4 or above', () => {
  assert.equal(lowMetric(r(4, 5, 6)), null)
})

test('the lowest of the three is named when it is 3 or lower', () => {
  assert.equal(lowMetric(r(5, 3, 6)), 'focus')
  assert.equal(lowMetric(r(3, 2, 1)), 'confidence')
  assert.equal(lowMetric(r(2, 2, 5)), 'motivation')
})

test('high anxiety takes over, so only the support note shows', () => {
  assert.equal(lowMetric(r(1, 1, 1, 8)), null)
  assert.equal(lowMetric(r(1, 5, 5, 7)), 'motivation')
})

test('the coaching line is due once a week', () => {
  const day = 86_400_000
  assert.equal(offerDue(0, 10 * day), true)
  assert.equal(offerDue(10 * day, 16 * day), false)
  assert.equal(offerDue(10 * day, 17 * day), true)
})
