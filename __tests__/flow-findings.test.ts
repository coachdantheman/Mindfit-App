import { test } from 'node:test'
import assert from 'node:assert/strict'
import { flowFindings } from '../components/mindset/flow-findings'
import type { FlowLog } from '../types'

let n = 0
function log(day: string, inZone: boolean, extra: Partial<FlowLog> = {}): FlowLog {
  n++
  return {
    id: `l${n}`, user_id: 'u', flow_session_id: null, logged_at: `${day}T18:00:00Z`, sport: null,
    challenge_level: 7, skill_level: inZone ? 7 : 3, flow_score: inZone ? 8 : 4, ending_stage: null,
    triggers_fired: [], journal_note: null, created_at: `${day}T18:00:00Z`, ...extra,
  }
}

test('sleep finding uses the night before and needs two of each', () => {
  const logs = [log('2026-11-02', true), log('2026-11-03', true), log('2026-11-04', false), log('2026-11-05', false)]
  const sleep = [
    { entry_date: '2026-11-01', hours_slept: 8.5 }, { entry_date: '2026-11-02', hours_slept: 9 },
    { entry_date: '2026-11-03', hours_slept: 6 }, { entry_date: '2026-11-04', hours_slept: 6.5 },
  ]
  const f = flowFindings(logs, { sleep, practice: [] })
  assert.equal(f[0], 'After 8+ hours of sleep you were in the zone 2 of 2 times. On less sleep: 0 of 2.')
  assert.deepEqual(flowFindings(logs.slice(0, 3), { sleep, practice: [] }), [])
})

test('5-A Stack and game/practice findings; small gaps stay quiet', () => {
  const a = log('2026-11-02', true, { flow_session_id: 's1' })
  const b = log('2026-11-03', true, { flow_session_id: 's2' })
  const c = log('2026-11-04', false)
  const d = log('2026-11-05', false)
  const practice = [
    { kind: 'game' as const, flow_log_id: a.id }, { kind: 'game' as const, flow_log_id: c.id },
    { kind: 'practice' as const, flow_log_id: b.id }, { kind: 'practice' as const, flow_log_id: d.id },
  ]
  const f = flowFindings([a, b, c, d], { sleep: [], practice })
  assert.ok(f.includes('When you ran the 5-A Stack first you hit the zone 2 of 2 times. Without it: 0 of 2.'))
  assert.ok(!f.some(x => x.startsWith('In games')))
})
