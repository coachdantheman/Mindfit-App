import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LINES, guideLine, type LineKey } from '../lib/data/guide-lines'

const VOICES = ['sky', 'pack', 'deep', 'dragon'] as const
const keys = Object.keys(LINES) as LineKey[]
const all: { key: LineKey; voice: string; text: string }[] = keys.flatMap(key =>
  VOICES.flatMap(voice => (LINES[key][voice] as string[]).map(text => ({ key, voice, text }))))

// Lines over a large character get more room than lines in the small bubble.
function limit(key: string): number {
  if (key === 'pick.intro') return 120
  return /^(greet|reveal|end|tour|dayone)\.|^night\.done$/.test(key) ? 110 : 90
}

test('every moment has at least one line in each voice', () => {
  for (const key of keys) for (const voice of VOICES) {
    assert.ok((LINES[key][voice] as string[]).length >= 1, `${key} ${voice}`)
  }
})

test('lines fit their bubble, even with a long name and streak', () => {
  for (const l of all) {
    const shown = l.text.replace(', {name}', ', Alexandria').replace('{streak}', '100')
    assert.ok(shown.length <= limit(l.key), `${l.key} ${l.voice} is ${shown.length}: ${l.text}`)
  }
})

test('no exclamation marks, dashes or semicolons', () => {
  for (const l of all) assert.ok(!/[!;—–]| - /.test(l.text), `${l.key} ${l.voice}: ${l.text}`)
})

test('tokens: ", {name}" only in that form, {streak} only in greet.streak, nothing else in braces', () => {
  for (const l of all) {
    const rest = l.text.replace(', {name}', '').replace('{streak}', '')
    assert.ok(!/[{}]/.test(rest), `${l.key} ${l.voice}: ${l.text}`)
    if (l.text.includes('{streak}')) assert.equal(l.key, 'greet.streak')
    if (l.text.includes('{name}')) assert.ok(/^(greet\.(morning|midday|evening|gameday)|dayone\.done)$/.test(l.key), `${l.key} uses {name}`)
  }
})

test('offers, never orders or guilt', () => {
  const banned = /you must|you need to|you have to|you should|don't break|don't forget|don't lose|should have|calm down|lazy|fail|behind|disappoint|missed/i
  for (const l of all) assert.ok(!banned.test(l.text), `${l.key} ${l.voice}: ${l.text}`)
})

test('the voices never say the same thing at the same moment', () => {
  for (const key of keys) {
    const first = VOICES.map(v => (LINES[key][v] as string[])[0])
    assert.equal(new Set(first).size, VOICES.length, key)
  }
})

test('guideLine fills the name and streak, and reads right without a name', () => {
  assert.equal(guideLine('sky', 'greet.streak', { streak: 12 }).startsWith('12 days'), true)
  const named = guideLine('pack', 'greet.morning', { name: 'Jordan' })
  const bare = guideLine('pack', 'greet.morning')
  assert.ok(named.includes(', Jordan.'))
  assert.ok(!/[{}]/.test(bare) && !bare.includes(' ,') && !bare.includes(',.'))
})

test('a second line for a moment is picked by the seed', () => {
  for (const key of keys) for (const voice of VOICES) {
    const options = LINES[key][voice] as string[]
    assert.equal(guideLine(voice, key, { seed: options.length, streak: 5 }), guideLine(voice, key, { seed: 0, streak: 5 }))
  }
})
