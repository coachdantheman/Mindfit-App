import test from 'node:test'
import assert from 'node:assert/strict'
import { VAULT, vaultOrder, vaultQuoteIndex } from '../lib/data/quote-vault'

// Quote counts per person when favorites were first saved (Nov 2026). Saved
// favorites point at these ids, so they must never move or disappear.
const ORIGINAL: Record<string, number> = {"iroh": 5, "goku": 2, "vegeta": 2, "hiccup": 3, "oogway": 3, "naruto": 1, "rock-lee": 1, "rocky": 2, "yoda": 2, "ted-lasso": 3, "herb-brooks": 2, "batman-begins": 1, "goggins": 4, "kobe": 2, "jordan": 3, "ali": 3, "serena": 1, "biles": 1, "kipchoge": 2, "mia-hamm": 1, "prefontaine": 1, "gretzky": 1, "bruce-lee": 3, "saban": 2, "wooden": 3, "lombardi": 1, "phil-jackson": 1, "all-blacks": 2, "jim-rohn": 1}

test('vault — every original person and quote id still exists', () => {
  for (const [key, count] of Object.entries(ORIGINAL)) {
    const person = VAULT.find(p => p.key === key)
    assert.ok(person, `missing ${key}`)
    assert.equal(person!.featured, true)
    for (let i = 1; i <= count; i++) assert.ok(person!.quotes.some(q => q.id === `${key}-${i}`), `missing ${key}-${i}`)
  }
})

test('vault — keys, ids and texts are unique, nobody is empty', () => {
  const quotes = VAULT.flatMap(p => p.quotes)
  assert.equal(new Set(VAULT.map(p => p.key)).size, VAULT.length)
  assert.equal(new Set(quotes.map(q => q.id)).size, quotes.length)
  assert.equal(new Set(quotes.map(q => q.text.toLowerCase().replace(/\W+/g, ' ').trim())).size, quotes.length)
  for (const p of VAULT) assert.ok(p.quotes.length > 0, p.key)
})

test('vault — everyone reshuffles by day, stable within a day', () => {
  const a = vaultOrder(VAULT, '2026-11-11')
  const b = vaultOrder(VAULT, '2026-11-12')
  assert.equal(a.length, VAULT.length)
  assert.deepEqual([...a.map(p => p.key)].sort(), [...VAULT.map(p => p.key)].sort())
  assert.notDeepEqual(a.map(p => p.key), b.map(p => p.key))
  assert.deepEqual(a.map(p => p.key), vaultOrder(VAULT, '2026-11-11').map(p => p.key))
})

test('vault — daily index is always in range', () => {
  for (const p of VAULT) assert.ok(vaultQuoteIndex(p, '2026-11-11') < p.quotes.length)
})
