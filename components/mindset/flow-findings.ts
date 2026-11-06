import type { FlowLog } from '@/types'
import { flowZone } from './flow-logic'
import { TRIGGER_LABEL } from './flow/flow-constants'

export interface FlowContext {
  sleep: { entry_date: string; hours_slept: number | null }[]
  practice: { kind: 'practice' | 'game'; flow_log_id: string | null }[]
}

const inZone = (l: FlowLog) => flowZone(l.challenge_level, l.skill_level) === 'in_zone'
const ofN = (list: FlowLog[]) => `${list.filter(inZone).length} of ${list.length}`
const rate = (list: FlowLog[]) => (list.length ? list.filter(inZone).length / list.length : 0)

function dayBefore(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10)
}

// Plain-language patterns in what puts this athlete in the zone. A finding
// only shows when both sides have at least `min` logs and the gap is real.
export function flowFindings(logs: FlowLog[], ctx: FlowContext, min = 2): string[] {
  const out: { text: string; gap: number }[] = []
  const compare = (a: FlowLog[], b: FlowLog[], text: (a: string, b: string) => string) => {
    if (a.length < min || b.length < min) return
    const gap = Math.abs(rate(a) - rate(b))
    if (gap >= 0.2) out.push({ text: text(ofN(a), ofN(b)), gap })
  }

  // Sleep the night before (entries are dated by the night).
  const hours = new Map(ctx.sleep.filter(s => s.hours_slept != null).map(s => [s.entry_date, Number(s.hours_slept)]))
  const slept = logs.map(l => ({ l, h: hours.get(dayBefore(l.logged_at.slice(0, 10))) })).filter(x => x.h !== undefined)
  compare(slept.filter(x => x.h! >= 8).map(x => x.l), slept.filter(x => x.h! < 8).map(x => x.l),
    (a, b) => `After 8+ hours of sleep you were in the zone ${a} times. On less sleep: ${b}.`)

  // Ran the 5-A Stack first.
  compare(logs.filter(l => l.flow_session_id), logs.filter(l => !l.flow_session_id),
    (a, b) => `When you ran the 5-A Stack first you hit the zone ${a} times. Without it: ${b}.`)

  // Games vs practice.
  const kind = new Map(ctx.practice.filter(p => p.flow_log_id).map(p => [p.flow_log_id!, p.kind]))
  compare(logs.filter(l => kind.get(l.id) === 'game'), logs.filter(l => kind.get(l.id) === 'practice'),
    (a, b) => `In games you were in the zone ${a} times, in practice ${b}.`)

  // Strongest trigger.
  const byTrigger = new Map<string, FlowLog[]>()
  for (const l of logs) for (const t of l.triggers_fired ?? []) byTrigger.set(t, [...(byTrigger.get(t) ?? []), l])
  const best = [...byTrigger.entries()].filter(([, list]) => list.length >= min + 1).sort((a, b) => rate(b[1]) - rate(a[1]))[0]
  if (best && rate(best[1]) >= 0.6 && rate(best[1]) > rate(logs)) {
    out.push({ text: `${TRIGGER_LABEL[best[0] as keyof typeof TRIGGER_LABEL] ?? best[0]} is your best trigger: in the zone ${ofN(best[1])} times it fired.`, gap: rate(best[1]) - rate(logs) })
  }

  return out.sort((a, b) => b.gap - a.gap).slice(0, 3).map(f => f.text)
}
