/**
 * Unit tests for flow-logic pure functions.
 *
 * Run with Node's built-in test runner via tsx (no deps to install):
 *   npx tsx --test __tests__/flow-logic.test.ts
 *
 * Or with ts-node:
 *   npx ts-node --transpile-only node --test __tests__/flow-logic.test.ts
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  is4PctZone, calcStreak, needsAttention, generateRecommendation,
  avgFlowScore, flowPct, topTrigger, mostCommonStage,
} from '../components/mindset/flow-logic'
import type { FlowLog, FlowSession } from '../types'

function log(partial: Partial<FlowLog>): FlowLog {
  return {
    id: crypto.randomUUID(),
    user_id: 'u',
    flow_session_id: null,
    logged_at: new Date().toISOString(),
    sport: null,
    challenge_level: 5,
    skill_level: 5,
    flow_score: 5,
    ending_stage: 'flow',
    triggers_fired: [],
    journal_note: null,
    created_at: new Date().toISOString(),
    ...partial,
  }
}

function session(partial: Partial<FlowSession>): FlowSession {
  return {
    id: crypto.randomUUID(),
    user_id: 'u',
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    identity_statement: null,
    aim: null,
    cue_word: null,
    external_target: null,
    sport: null,
    skipped_steps: [],
    created_at: new Date().toISOString(),
    ...partial,
  }
}

test('is4PctZone — below 1% is too_easy', () => {
  assert.equal(is4PctZone(5, 5), 'too_easy')       // delta = 0%
  assert.equal(is4PctZone(7, 10), 'too_easy')      // delta = -30%
})

test('is4PctZone — 1%–8% is in_zone', () => {
  assert.equal(is4PctZone(103, 100), 'in_zone')    // delta = 3%
  assert.equal(is4PctZone(108, 100), 'in_zone')    // delta = 8% (upper edge)
  assert.equal(is4PctZone(101, 100), 'in_zone')    // delta = 1% (lower edge)
})

test('is4PctZone — above 8% is too_hard', () => {
  assert.equal(is4PctZone(109, 100), 'too_hard')   // delta = 9%
  assert.equal(is4PctZone(10, 5), 'too_hard')      // delta = 100%
})

test('is4PctZone — skill 0 is handled', () => {
  assert.equal(is4PctZone(5, 0), 'too_easy')
})

test('calcStreak — empty array returns 0', () => {
  assert.equal(calcStreak([]), 0)
})

test('calcStreak — counts consecutive days ending today', () => {
  assert.equal(calcStreak(['2026-04-23', '2026-04-22', '2026-04-21'], '2026-04-23'), 3)
})

test('calcStreak — counts from yesterday when today has no session', () => {
  assert.equal(calcStreak(['2026-04-22', '2026-04-21'], '2026-04-23'), 2)
})

test('calcStreak — gap breaks streak', () => {
  assert.equal(calcStreak(['2026-04-23', '2026-04-21'], '2026-04-23'), 1)
})

test('calcStreak — streak of 0 when last session >1 day ago', () => {
  assert.equal(calcStreak(['2026-04-20'], '2026-04-23'), 0)
})

test('calcStreak — dedupes multiple sessions on same day', () => {
  assert.equal(calcStreak(['2026-04-23', '2026-04-23', '2026-04-22'], '2026-04-23'), 2)
})

test('avgFlowScore — null when empty', () => {
  assert.equal(avgFlowScore([]), null)
})

test('avgFlowScore — one decimal mean', () => {
  assert.equal(avgFlowScore([log({ flow_score: 6 }), log({ flow_score: 8 })]), 7)
  assert.equal(avgFlowScore([log({ flow_score: 7 }), log({ flow_score: 8 })]), 7.5)
})

test('flowPct — percent in flow stage', () => {
  assert.equal(flowPct([]), null)
  assert.equal(flowPct([log({ ending_stage: 'flow' }), log({ ending_stage: 'struggle' })]), 50)
})

test('topTrigger — most frequent wins', () => {
  const logs = [
    log({ triggers_fired: ['deep_focus', 'clear_goals'] }),
    log({ triggers_fired: ['deep_focus'] }),
    log({ triggers_fired: ['risk_consequence'] }),
  ]
  assert.equal(topTrigger(logs), 'deep_focus')
})

test('mostCommonStage — ties resolve to first', () => {
  assert.equal(mostCommonStage([log({ ending_stage: 'flow' })]), 'flow')
  assert.equal(mostCommonStage([]), null)
})

test('needsAttention — fires on 3+ struggle logs', () => {
  const now = new Date()
  const iso = (d: number) => {
    const x = new Date(now); x.setDate(x.getDate() - d); return x.toISOString()
  }
  const logs = [
    log({ ending_stage: 'struggle', logged_at: iso(0) }),
    log({ ending_stage: 'struggle', logged_at: iso(1) }),
    log({ ending_stage: 'struggle', logged_at: iso(2) }),
  ]
  const sessions = [session({ started_at: iso(0) })]
  const reasons = needsAttention(logs, sessions)
  assert.ok(reasons.some(r => r.includes('Struggle')))
})

test('needsAttention — fires when no session in 5+ days', () => {
  const now = new Date()
  const old = new Date(now); old.setDate(old.getDate() - 10)
  const sessions = [session({ started_at: old.toISOString() })]
  const reasons = needsAttention([], sessions)
  assert.ok(reasons.some(r => r.includes('No 5A session')))
})

test('needsAttention — fires when flow score drops >2 WoW', () => {
  const now = new Date()
  const iso = (d: number) => {
    const x = new Date(now); x.setDate(x.getDate() - d); return x.toISOString()
  }
  const logs = [
    log({ flow_score: 3, logged_at: iso(1) }),
    log({ flow_score: 3, logged_at: iso(2) }),
    log({ flow_score: 8, logged_at: iso(8) }),
    log({ flow_score: 9, logged_at: iso(10) }),
  ]
  const sessions = [session({ started_at: iso(0) })]
  const reasons = needsAttention(logs, sessions)
  assert.ok(reasons.some(r => r.toLowerCase().includes('dropped')))
})

test('needsAttention — clean week = no reasons', () => {
  const now = new Date()
  const sessions = [session({ started_at: now.toISOString() })]
  const logs = [log({ flow_score: 8, ending_stage: 'flow', logged_at: now.toISOString() })]
  assert.deepEqual(needsAttention(logs, sessions), [])
})

test('generateRecommendation — empty returns start-today message', () => {
  const rec = generateRecommendation([], [])
  assert.match(rec, /5A Flow Stack today/)
})

test('generateRecommendation — >50% too-easy triggers bump message', () => {
  const logs = [
    log({ challenge_level: 5, skill_level: 10 }),
    log({ challenge_level: 5, skill_level: 10 }),
    log({ challenge_level: 5, skill_level: 10 }),
  ]
  assert.match(generateRecommendation(logs, []), /too easy/i)
})

test('generateRecommendation — 3 consecutive struggle triggers cycle message', () => {
  const now = new Date()
  const iso = (d: number) => {
    const x = new Date(now); x.setDate(x.getDate() - d); return x.toISOString()
  }
  const logs = [
    log({ ending_stage: 'struggle', logged_at: iso(0), challenge_level: 6, skill_level: 6 }),
    log({ ending_stage: 'struggle', logged_at: iso(1), challenge_level: 6, skill_level: 6 }),
    log({ ending_stage: 'struggle', logged_at: iso(2), challenge_level: 6, skill_level: 6 }),
  ]
  // Note: the prior too-easy rule fires first here since challenge=skill. Use balanced.
  const balancedLogs = logs.map(l => ({ ...l, challenge_level: 103, skill_level: 100 }))
  assert.match(generateRecommendation(balancedLogs, []), /completing the cycle/i)
})

test('generateRecommendation — ACTIVATE skips >3 triggers box breathing message', () => {
  const sessions = [
    session({ skipped_steps: ['A3'] }),
    session({ skipped_steps: ['A3'] }),
    session({ skipped_steps: ['A3'] }),
    session({ skipped_steps: ['A3'] }),
  ]
  const logs = [log({ ending_stage: 'flow', challenge_level: 103, skill_level: 100 })]
  assert.match(generateRecommendation(logs, sessions), /ACTIVATE|box breathing/i)
})
