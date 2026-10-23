import test from 'node:test'
import assert from 'node:assert/strict'
import { QUOTES, quoteForDateKey, quoteDateKey, getQuoteOfTheDay, getQuoteById } from '../lib/data/quotes'

test('quotes — library has at least 120 entries', () => {
  assert.ok(QUOTES.length >= 120, `only ${QUOTES.length} quotes`)
})

test('quotes — ids and texts are unique', () => {
  const ids = new Set(QUOTES.map(q => q.id))
  const texts = new Set(QUOTES.map(q => q.text.toLowerCase().replace(/\W+/g, ' ').trim()))
  assert.equal(ids.size, QUOTES.length)
  assert.equal(texts.size, QUOTES.length)
})

test('quotes — every quote is short enough for a push notification and has an author', () => {
  for (const q of QUOTES) {
    assert.ok(q.text.length > 0 && q.text.length <= 160, `${q.id} is ${q.text.length} chars`)
    assert.ok(q.author.trim().length > 0, `${q.id} missing author`)
  }
})

test('quoteForDateKey — stable for a given date', () => {
  const a = quoteForDateKey('2026-10-22')
  const b = quoteForDateKey('2026-10-22')
  assert.equal(a.id, b.id)
  assert.equal(getQuoteById(a.id)?.text, a.text)
})

test('quoteForDateKey — consecutive days differ and full cycle covers every quote', () => {
  assert.notEqual(quoteForDateKey('2026-10-22').id, quoteForDateKey('2026-10-23').id)
  const seen = new Set<string>()
  const start = Date.UTC(2026, 0, 1)
  for (let i = 0; i < QUOTES.length; i++) {
    const d = new Date(start + i * 86_400_000)
    seen.add(quoteForDateKey(d.toISOString().slice(0, 10)).id)
  }
  assert.equal(seen.size, QUOTES.length)
})

test('quoteDateKey — uses US Central calendar day', () => {
  // 03:30 UTC on Oct 23 is still Oct 22 in Chicago (CDT, UTC-5).
  assert.equal(quoteDateKey(new Date('2026-10-23T03:30:00Z')), '2026-10-22')
  assert.equal(quoteDateKey(new Date('2026-10-23T12:00:00Z')), '2026-10-23')
  assert.match(getQuoteOfTheDay().date, /^\d{4}-\d{2}-\d{2}$/)
})
