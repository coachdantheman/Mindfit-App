import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasProfanity } from '../lib/profanity'

test('clean names pass', () => {
  assert.equal(hasProfanity('Coach Dan'), false)
  assert.equal(hasProfanity('Scunthorpe Tigers'), false)
  assert.equal(hasProfanity('Assistant'), false)
})

test('obvious profanity fails', () => {
  assert.equal(hasProfanity('fuck this'), true)
  assert.equal(hasProfanity('Total Shit'), true)
})

test('leetspeak variants fail', () => {
  assert.equal(hasProfanity('Sh1t Team'), true)
  assert.equal(hasProfanity('b1tch'), true)
})

test('worst slurs are caught even when spaced out', () => {
  assert.equal(hasProfanity('n i g g e r'), true)
})

test('report token — seals and opens a user id, rejects junk', async () => {
  const { sealId, openId } = await import('../lib/report-token')
  const id = '3f2b8c1e-0000-4000-8000-123456789abc'
  const token = sealId(id)
  assert.notEqual(token, id)
  assert.equal(openId(token), id)
  assert.equal(openId('not-a-token'), null)
  assert.equal(openId(id), null)
})
