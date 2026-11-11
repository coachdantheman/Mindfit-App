import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sectionOf } from '../lib/api-cache'

test('sectionOf groups an API url by its first two path parts', () => {
  assert.equal(sectionOf('/api/nutrition/entries?days=30'), '/api/nutrition')
  assert.equal(sectionOf('/api/nutrition'), '/api/nutrition')
  assert.equal(sectionOf('https://mindfit.academy/api/sleep/recovery?date=2026-11-11'), '/api/sleep')
  assert.equal(sectionOf('/api/journal'), '/api/journal')
})
