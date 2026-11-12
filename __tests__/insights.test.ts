import { test } from 'node:test'
import assert from 'node:assert/strict'
import { progressInsights, type InsightData } from '../lib/insights'

const empty: InsightData = { journal: [], sleep: [], workouts: [], food: [], proteinGoal: null, games: [], routineDates: [] }
const j = (entry_date: string, conf: number, focus = 5, mot = 5) => ({ entry_date, rating_motivation: mot, rating_focus: focus, rating_confidence: conf, rating_anxiety: 3 })

test('no data, no insights', () => {
  assert.deepEqual(progressInsights(empty), [])
})

test('sleep insight needs both sides and uses the next day', () => {
  const sleep = ['01', '02', '03'].map(d => ({ entry_date: `2026-11-${d}`, hours_slept: 8.5 }))
    .concat(['04', '05', '06'].map(d => ({ entry_date: `2026-11-${d}`, hours_slept: 6 })))
  const journal = [j('2026-11-02', 8), j('2026-11-03', 8), j('2026-11-04', 8), j('2026-11-05', 5), j('2026-11-06', 5), j('2026-11-07', 5)]
  const out = progressInsights({ ...empty, sleep, journal })
  const s = out.find(i => i.section === 'sleep')
  assert.ok(s)
  assert.match(s!.text, /8\.0.*5\.0/)
  assert.equal(progressInsights({ ...empty, sleep: sleep.slice(0, 3), journal }).some(i => i.section === 'sleep'), false)
})

test('small gaps stay hidden', () => {
  const sleep = ['01', '02', '03'].map(d => ({ entry_date: `2026-11-${d}`, hours_slept: 9 }))
    .concat(['04', '05', '06'].map(d => ({ entry_date: `2026-11-${d}`, hours_slept: 6 })))
  const journal = ['02', '03', '04', '05', '06', '07'].map(d => j(`2026-11-${d}`, 7))
  assert.equal(progressInsights({ ...empty, sleep, journal }).some(i => i.section === 'sleep'), false)
})

test('protein hit rate counts logged days against 90% of the goal', () => {
  const food = ['01', '02', '03', '04', '05'].map((d, i) => ({ entry_date: `2026-11-${d}`, protein_g: i < 3 ? 140 : 60 }))
  const out = progressInsights({ ...empty, food, proteinGoal: 150 })
  assert.equal(out[0].text, 'You reached your protein target on 3 of your last 5 logged days.')
})

test('routine insight compares rated games', () => {
  const games = ['01', '02', '03'].map(d => ({ log_date: `2026-10-${d}`, performance: 8 }))
    .concat(['10', '11', '12'].map(d => ({ log_date: `2026-10-${d}`, performance: 6 })))
  const out = progressInsights({ ...empty, games, routineDates: ['2026-10-01', '2026-10-02', '2026-10-03'] })
  assert.equal(out[0].section, 'flow')
  assert.match(out[0].text, /8\.0.*6\.0/)
})
