import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { TodayData } from '../lib/guide'
import { daySeed, flowFor, greetKey, needFrom, planSteps, revealKey, sleepKey, slotFor, stepLineKey } from '../lib/guide-brain'

const journal = (over: Partial<NonNullable<TodayData['journal']>> = {}): NonNullable<TodayData['journal']> => ({
  objective: 'Win the first five minutes', rating_motivation: 6, rating_focus: 6, rating_confidence: 6, rating_anxiety: 4,
  quick: true, objective_result: null, ...over,
})

const day = (over: Partial<TodayData> = {}): TodayData => ({
  journal: null, sleep: null,
  pillars: { mind: false, body: false, fuel: false, rest: false },
  affirmation: null, focus: null, recent: null,
  routines: { morning: false, night: false },
  ...over,
})

const plan = (data: TodayData, over: Partial<Parameters<typeof planSteps>[0]> = {}) =>
  planSteps({ data, hour: 9, gameToday: false, done: [], focus: [], skips: {}, ...over }).map(s => s.id)

test('the day splits at noon and 5 pm', () => {
  assert.equal(slotFor(11), 'morning')
  assert.equal(slotFor(12), 'midday')
  assert.equal(slotFor(16), 'midday')
  assert.equal(slotFor(17), 'evening')
})

test('with no journal yet: morning routine before noon, short check-in after', () => {
  const base = { hasJournal: false, dayOne: false, checkOpen: false, nightOpen: true }
  assert.equal(flowFor({ ...base, hour: 7 }), 'morning')
  assert.equal(flowFor({ ...base, hour: 13 }), 'check-in')
  assert.equal(flowFor({ ...base, hour: 20 }), 'check-in')
})

test('day one skips the check-in, whatever the hour', () => {
  assert.equal(flowFor({ hour: 7, hasJournal: false, dayOne: true, checkOpen: false, nightOpen: true }), 'day-one')
  assert.equal(flowFor({ hour: 19, hasJournal: false, dayOne: true, checkOpen: false, nightOpen: true }), 'day-one')
})

test('evenings close the day only while something is still open', () => {
  const base = { hour: 19, hasJournal: true, dayOne: false }
  assert.equal(flowFor({ ...base, checkOpen: true, nightOpen: false }), 'evening')
  assert.equal(flowFor({ ...base, checkOpen: false, nightOpen: true }), 'evening')
  assert.equal(flowFor({ ...base, checkOpen: false, nightOpen: false }), 'steps')
  assert.equal(flowFor({ ...base, hour: 14, checkOpen: true, nightOpen: true }), 'steps')
})

test('need: high anxiety first, then the lowest of the other three at 4 or under', () => {
  assert.equal(needFrom({ motivation: 2, focus: 2, confidence: 2, anxiety: 7 }, null), 'calm')
  assert.equal(needFrom({ motivation: 6, focus: 4, confidence: 5, anxiety: 3 }, null), 'focus')
  assert.equal(needFrom({ motivation: 5, focus: 5, confidence: 5, anxiety: 6 }, null), null)
  assert.equal(needFrom(null, null), null)
})

test("need: today's ratings win over the recent average", () => {
  const recent = { motivation: 3, focus: 8, confidence: 8, anxiety: 2 }
  assert.equal(needFrom(null, recent), 'motivation')
  assert.equal(needFrom({ motivation: 8, focus: 8, confidence: 3, anxiety: 2 }, recent), 'confidence')
})

test('steps keep the time-of-day order when the guide has no focus', () => {
  assert.deepEqual(plan(day()), ['rest', 'mind', 'fuel', 'body'])
})

test("the guide's own rings come first", () => {
  assert.deepEqual(plan(day(), { focus: ['body'] }), ['body', 'rest', 'mind', 'fuel'])
  assert.deepEqual(plan(day(), { focus: ['rest', 'fuel'] }), ['rest', 'fuel', 'mind', 'body'])
})

test('a step put off three times moves to the back, even for the guide that favors it', () => {
  assert.deepEqual(plan(day(), { focus: ['body'], skips: { body: 3 } }), ['rest', 'mind', 'fuel', 'body'])
  assert.deepEqual(plan(day(), { skips: { rest: 2 } }), ['rest', 'mind', 'fuel', 'body'])
})

test('pregame leads on game day, then the need step', () => {
  const data = day({ journal: journal({ rating_anxiety: 8 }), pillars: { mind: true, body: false, fuel: false, rest: true } })
  assert.deepEqual(plan(data, { gameToday: true }), ['pregame', 'need', 'fuel', 'body'])
  assert.deepEqual(plan(data, { gameToday: true, done: ['need', 'pregame'] }), ['fuel', 'body'])
})

test('evenings add the objective check first and the night routine last', () => {
  const data = day({ journal: journal(), pillars: { mind: true, body: true, fuel: false, rest: true } })
  assert.deepEqual(plan(data, { hour: 19 }), ['check', 'fuel', 'night'])
  assert.deepEqual(plan(data, { hour: 14 }), ['fuel'])
})

test('an answered objective and a finished night routine drop out', () => {
  const data = day({
    journal: journal({ objective_result: 'partly' }),
    pillars: { mind: true, body: true, fuel: true, rest: true },
    routines: { morning: true, night: true },
  })
  assert.deepEqual(plan(data, { hour: 20 }), [])
})

test('the evening steps open inside the guide', () => {
  const data = day({ journal: journal(), pillars: { mind: true, body: true, fuel: true, rest: true } })
  const steps = planSteps({ data, hour: 19, gameToday: false, done: [], focus: [], skips: {} })
  assert.deepEqual(steps.map(s => [s.id, !!s.inline]), [['check', true], ['night', true]])
})

test('each step has a line for the character', () => {
  const step = (id: string) => ({ id, tag: '', text: '', why: '', href: '' })
  assert.equal(stepLineKey(step('mind'), null), 'step.mind')
  assert.equal(stepLineKey(step('focus'), null), 'step.bonus')
  assert.equal(stepLineKey(step('need'), 'calm'), 'need.calm')
  assert.equal(stepLineKey(step('check'), null), 'evening.check')
  assert.equal(stepLineKey(step('night'), null), 'night.start')
})

test('greeting: game day, then a streak, then a welcome back, then time of day', () => {
  assert.equal(greetKey({ hour: 8, streak: 5, gameToday: true }), 'greet.gameday')
  assert.equal(greetKey({ hour: 8, streak: 3, gameToday: false }), 'greet.streak')
  assert.equal(greetKey({ hour: 8, streak: 0, gameToday: false }), 'greet.back')
  assert.equal(greetKey({ hour: 8, streak: 1, gameToday: false }), 'greet.morning')
  assert.equal(greetKey({ hour: 18, streak: null, gameToday: false }), 'greet.evening')
})

test('sleep and readiness lines follow the numbers', () => {
  assert.equal(sleepKey(5, false), 'sleep.ask')
  assert.equal(sleepKey(6, true), 'sleep.short')
  assert.equal(sleepKey(7, true), 'sleep.ask')
  assert.equal(sleepKey(8, true), 'sleep.good')
  assert.equal(revealKey(80), 'reveal.high')
  assert.equal(revealKey(60), 'reveal.mid')
  assert.equal(revealKey(40), 'reveal.low')
})

test('the daily seed is the day of the year', () => {
  assert.equal(daySeed('2026-01-01'), 1)
  assert.equal(daySeed('2026-11-13'), 317)
})
