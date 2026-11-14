import { test } from 'node:test'
import assert from 'node:assert/strict'
import { awardDragon, newlyEarned, progressFor, type UnlockFacts } from '../lib/guide-unlocks'
import { ALL_GUIDES, earnText, guideFor } from '../lib/guide-characters'

const facts = (over: Partial<UnlockFacts> = {}): UnlockFacts => ({
  owned: ['dog'], bestStreak: 0, clutchDays: 0, maxLeagueTier: 1, titles: [], levels: ['rookie'], tierUps: 0, journals: 0, mpiGain: 0, ...over,
})

test('nothing is earned on day one', () => {
  assert.deepEqual(newlyEarned(facts()), [])
})

test('the other two starters come at the first Clutch Day and a 14-day best streak', () => {
  assert.deepEqual(newlyEarned(facts({ clutchDays: 1 })), ['sparrow'])
  assert.deepEqual(newlyEarned(facts({ bestStreak: 14 })), ['fish'])
  assert.deepEqual(newlyEarned(facts({ owned: ['sparrow'], clutchDays: 1, bestStreak: 14 })), ['dog', 'fish'])
})

test('league tiers, titles, levels and personal bests each earn their character', () => {
  assert.deepEqual(newlyEarned(facts({ maxLeagueTier: 5 })), ['fox', 'lion'])
  assert.deepEqual(newlyEarned(facts({ titles: ['monk', 'chef'] })), ['owl', 'raccoon'])
  assert.deepEqual(newlyEarned(facts({ levels: ['legend'], tierUps: 2, journals: 30, mpiGain: 10 })), ['stag', 'ram', 'chameleon', 'beaver'])
  assert.deepEqual(newlyEarned(facts({ clutchDays: 10 })), ['sparrow', 'tiger'])
})

test('a character already owned is not earned again', () => {
  assert.deepEqual(newlyEarned(facts({ owned: ['dog', 'fox', 'sparrow'], maxLeagueTier: 3, clutchDays: 2 })), [])
})

test('with no starter picked yet, the other starters are not handed out', () => {
  assert.deepEqual(newlyEarned(facts({ owned: [], clutchDays: 3, bestStreak: 20 })), [])
})

test('free-text sports map to the sport we draw', async () => {
  const { sportKey } = await import('../components/guide/art/Wear')
  assert.equal(sportKey('Track & Field'), 'track')
  assert.equal(sportKey('Cross Country'), 'crosscountry')
  assert.equal(sportKey('Basketball'), 'basketball')
  assert.equal(sportKey('Swimming'), 'swimming')
  assert.equal(sportKey('Lacrosse'), 'lacrosse')
  assert.equal(sportKey("Men's Lacrosse"), 'lacrosse')
  assert.equal(sportKey('XC'), 'crosscountry')
  assert.equal(sportKey('CrossFit'), null)
  assert.equal(sportKey('Other'), null)
  assert.equal(sportKey(null), null)
})

test('the Dragon is never earned by the everyday rules, whatever the numbers', () => {
  const max = facts({ bestStreak: 400, clutchDays: 300, maxLeagueTier: 6, titles: ['monk', 'gym_rat', 'chef', 'recharger', 'clutch'], levels: ['legend'], tierUps: 9, journals: 500, mpiGain: 40 })
  assert.ok(!newlyEarned(max).includes('dragon'))
  assert.equal(guideFor('dragon').voice, 'dragon')
})

test('progress counts toward each character and stops at the goal', () => {
  const p = progressFor(facts({ maxLeagueTier: 4, clutchDays: 4, journals: 45, mpiGain: -3, bestStreak: 9 }))
  assert.deepEqual(p.fox, [3, 3])
  assert.deepEqual(p.lion, [4, 5])
  assert.deepEqual(p.tiger, [4, 10])
  assert.deepEqual(p.beaver, [30, 30])
  assert.deepEqual(p.chameleon, [0, 10])
  // Ace was picked, so Scout comes at a Clutch Day and Finn at a 14-day best streak.
  assert.deepEqual(p.sparrow, [1, 1])
  assert.deepEqual(p.fish, [9, 14])
  assert.equal(p.dog, undefined)
  assert.equal(p.dragon, undefined)
})

test('every locked character says how it is earned', () => {
  for (const g of ALL_GUIDES) assert.ok(earnText(g.key, 'dog').length > 0, g.key)
  assert.equal(earnText('sparrow', 'dog'), 'Close all four rings in one day')
  assert.equal(earnText('fish', 'dog'), 'Reach a 14-day best streak')
  assert.equal(earnText('dog', 'sparrow'), 'Close all four rings in one day')
  assert.equal(earnText('dragon', 'dog'), 'Finish a month as the #1 athlete on The Board')
})

test('the Dragon is only awarded on the 2nd to 5th, for a month in the race', async () => {
  // Any database call would throw here, so these all return before touching it.
  const none = {} as never
  assert.deepEqual(await awardDragon(none, new Date('2026-12-01T12:00:00Z')), { month: '2026-11', winners: [] })
  assert.deepEqual(await awardDragon(none, new Date('2026-12-06T00:00:00Z')), { month: '2026-11', winners: [] })
  assert.deepEqual(await awardDragon(none, new Date('2026-11-03T12:00:00Z')), { month: '2026-10', winners: [] })
})

test('the Dragon job names a month once and tells the winners', async () => {
  const calls: string[] = []
  const table = (name: string) => {
    const q: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'gt', 'order', 'contains']) q[m] = () => q
    q.limit = () => Promise.resolve({ data: [], error: null })
    q.then = (ok: (v: unknown) => unknown) => ok({ count: name === 'guide_unlocks' && calls.includes('rpc') ? 1 : 0, error: null })
    return q
  }
  const admin = {
    from: (name: string) => table(name),
    rpc: (fn: string, args: { p_month: string }) => { calls.push('rpc'); return Promise.resolve({ data: [{ winner: 'a1' }], error: null, fn, args }) },
  } as never
  const at = new Date('2026-12-02T03:00:00Z')
  assert.deepEqual(await awardDragon(admin, at), { month: '2026-11', winners: ['a1'] })
  // The next hourly run finds the month already awarded and stops.
  assert.deepEqual(await awardDragon(admin, at), { month: '2026-11', winners: [] })
  assert.equal(calls.length, 1)
})
