import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ghlEligible } from '../lib/ghl'

const now = new Date('2026-11-11T12:00:00Z')

test('athletes under 18 never go to the contact system', () => {
  assert.equal(ghlEligible({ role: 'member', birth_year: 2010, birth_month: 5 }, now), false)
  assert.equal(ghlEligible({ role: 'member', birth_year: 2008, birth_month: 12 }, now), false)
  assert.equal(ghlEligible({ role: 'member', birth_year: null, birth_month: null }, now), false)
})

test('adult athletes, coaches, parents and admins are eligible', () => {
  assert.equal(ghlEligible({ role: 'member', birth_year: 2008, birth_month: 10 }, now), true)
  assert.equal(ghlEligible({ role: 'coach' }, now), true)
  assert.equal(ghlEligible({ role: 'parent' }, now), true)
  assert.equal(ghlEligible({ role: 'admin' }, now), true)
})
