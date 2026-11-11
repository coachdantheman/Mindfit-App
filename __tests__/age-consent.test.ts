import test from 'node:test'
import assert from 'node:assert/strict'
import { ageOn, isUnder13, validBirth, consentExpired } from '../lib/age'
import { hashToken, newToken } from '../lib/consent'

const NOV_7_2026 = new Date(Date.UTC(2026, 10, 7))

test('ageOn — birthday month counts only once it has fully passed', () => {
  assert.equal(ageOn(2013, 10, NOV_7_2026), 13)
  assert.equal(ageOn(2013, 11, NOV_7_2026), 12)
  assert.equal(ageOn(2013, 12, NOV_7_2026), 12)
  assert.equal(ageOn(2010, 1, NOV_7_2026), 16)
})

test('isUnder13 — needs both fields', () => {
  assert.equal(isUnder13({ birth_year: 2013, birth_month: 11 }, NOV_7_2026), true)
  assert.equal(isUnder13({ birth_year: 2013, birth_month: 10 }, NOV_7_2026), false)
  assert.equal(isUnder13({ birth_year: null, birth_month: null }, NOV_7_2026), false)
})

test('validBirth — rejects future, absurd and malformed dates', () => {
  assert.deepEqual(validBirth('2012', '5', NOV_7_2026), { year: 2012, month: 5 })
  assert.equal(validBirth(2026, 12, NOV_7_2026), null)
  assert.equal(validBirth(1900, 1, NOV_7_2026), null)
  assert.equal(validBirth(2012, 13, NOV_7_2026), null)
  assert.equal(validBirth('abc', 1, NOV_7_2026), null)
})

test('consentExpired — 14 day window', () => {
  assert.equal(consentExpired('2026-10-20T00:00:00Z', NOV_7_2026), true)
  assert.equal(consentExpired('2026-10-30T00:00:00Z', NOV_7_2026), false)
  assert.equal(consentExpired(null, NOV_7_2026), false)
})

test('consent tokens — random, hashed deterministically', () => {
  const a = newToken()
  assert.notEqual(a, newToken())
  assert.ok(a.length >= 40)
  assert.equal(hashToken(a), hashToken(a))
  assert.equal(hashToken(a).length, 64)
})

test('isAdult — 18 only once the birthday month has fully passed', async () => {
  const { isAdult } = await import('../lib/age')
  const now = new Date(Date.UTC(2026, 10, 11)) // Nov 2026
  assert.equal(isAdult({ birth_year: 2008, birth_month: 10 }, now), true)
  assert.equal(isAdult({ birth_year: 2008, birth_month: 11 }, now), false)
  assert.equal(isAdult({ birth_year: 2012, birth_month: 1 }, now), false)
  assert.equal(isAdult({ birth_year: null, birth_month: null }, now), false)
})
