import test from 'node:test'
import assert from 'node:assert/strict'
import { latestOf, formatLastSeen } from '../lib/last-seen'

const now = new Date(2026, 9, 30, 15, 0, 0) // Oct 30 2026, local

function ago(days: number): string {
  const d = new Date(now)
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

test('latestOf — picks the most recent, ignores nulls', () => {
  assert.equal(latestOf(null, ago(3), undefined, ago(1), ago(10)), ago(1))
})

test('latestOf — all empty gives null', () => {
  assert.equal(latestOf(null, undefined, ''), null)
})

test('latestOf — mixes date-only and timestamps', () => {
  const r = latestOf('2026-10-01', ago(2))
  assert.equal(r, ago(2))
})

test('formatLastSeen — buckets', () => {
  assert.equal(formatLastSeen(null, now), 'Never')
  assert.equal(formatLastSeen(ago(0), now), 'Today')
  assert.equal(formatLastSeen(ago(1), now), 'Yesterday')
  assert.equal(formatLastSeen(ago(7), now), '7d ago')
  assert.equal(formatLastSeen(ago(60), now), '60d ago')
  assert.equal(formatLastSeen(ago(61), now), 'Aug 30')
  assert.equal(formatLastSeen('2025-02-14T10:00:00.000Z', now), 'Feb 14, 2025')
})

test('formatLastSeen — garbage is Never', () => {
  assert.equal(formatLastSeen('not-a-date', now), 'Never')
})
