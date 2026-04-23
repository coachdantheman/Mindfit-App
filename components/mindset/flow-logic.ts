import { FlowLog, FlowSession, FlowStage, FlowStageCheckin, FlowTrigger } from '@/types'

export type ZoneResult = 'too_easy' | 'in_zone' | 'too_hard'

export function is4PctZone(challenge: number, skill: number): ZoneResult {
  if (skill <= 0) return 'too_easy'
  const delta = ((challenge - skill) / skill) * 100
  if (delta < 1) return 'too_easy'
  if (delta > 8) return 'too_hard'
  return 'in_zone'
}

export const ZONE_COLOR: Record<ZoneResult, { label: string; tw: string }> = {
  too_easy: { label: 'Too easy',    tw: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
  in_zone:  { label: 'In the zone', tw: 'bg-green-500/20 text-green-300 border-green-500/40' },
  too_hard: { label: 'Too hard',    tw: 'bg-red-500/20 text-red-300 border-red-500/40' },
}

/** Local-date ISO string (YYYY-MM-DD). */
export function localDateISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return localDateISO(dt)
}

/**
 * Consecutive calendar days ending today (or yesterday if nothing logged today).
 * `sessionDates` is an array of YYYY-MM-DD strings in the user's local time.
 */
export function calcStreak(sessionDates: string[], today = localDateISO(new Date())): number {
  if (sessionDates.length === 0) return 0
  const set = new Set(sessionDates)
  let cursor = set.has(today) ? today : addDays(today, -1)
  if (!set.has(cursor)) return 0
  let n = 0
  while (set.has(cursor)) {
    n++
    cursor = addDays(cursor, -1)
  }
  return n
}

/**
 * Consecutive competitions (flow logs), most-recent first, where the athlete
 * also ran a 5A session. A competition "counts" toward the streak if the log
 * has flow_session_id set OR a session was started on the same local day as
 * the log. A competition without a preceding 5A session breaks the streak.
 */
export function calcCompetitionStreak(logs: FlowLog[], sessions: FlowSession[]): number {
  if (logs.length === 0) return 0
  const sessionDays = new Set(
    sessions.map(s => localDateISO(new Date(s.started_at))),
  )
  const orderedLogs = [...logs].sort(
    (a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime(),
  )
  let n = 0
  for (const l of orderedLogs) {
    const ran5A =
      l.flow_session_id != null ||
      sessionDays.has(localDateISO(new Date(l.logged_at)))
    if (!ran5A) break
    n++
  }
  return n
}

export function topTrigger(logs: FlowLog[]): FlowTrigger | null {
  const counts = new Map<FlowTrigger, number>()
  for (const l of logs) {
    for (const t of l.triggers_fired || []) counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  let best: FlowTrigger | null = null
  let bestN = 0
  for (const [t, n] of counts) {
    if (n > bestN) { best = t; bestN = n }
  }
  return best
}

export function mostCommonStage(logs: FlowLog[]): FlowStage | null {
  const counts = new Map<FlowStage, number>()
  for (const l of logs) {
    if (!l.ending_stage) continue
    counts.set(l.ending_stage, (counts.get(l.ending_stage) ?? 0) + 1)
  }
  let best: FlowStage | null = null
  let bestN = 0
  for (const [s, n] of counts) {
    if (n > bestN) { best = s; bestN = n }
  }
  return best
}

export function mostCommonCheckinStage(checkins: FlowStageCheckin[]): FlowStage | null {
  const counts = new Map<FlowStage, number>()
  for (const c of checkins) counts.set(c.stage, (counts.get(c.stage) ?? 0) + 1)
  let best: FlowStage | null = null
  let bestN = 0
  for (const [s, n] of counts) {
    if (n > bestN) { best = s; bestN = n }
  }
  return best
}

export function avgFlowScore(logs: FlowLog[]): number | null {
  if (logs.length === 0) return null
  const sum = logs.reduce((a, l) => a + l.flow_score, 0)
  return Math.round((sum / logs.length) * 10) / 10
}

export function flowPct(logs: FlowLog[]): number | null {
  const scored = logs.filter(l => l.ending_stage != null)
  if (scored.length === 0) return null
  const n = scored.filter(l => l.ending_stage === 'flow').length
  return Math.round((n / scored.length) * 100)
}

export function flowPctFromCheckins(checkins: FlowStageCheckin[]): number | null {
  if (checkins.length === 0) return null
  const n = checkins.filter(c => c.stage === 'flow').length
  return Math.round((n / checkins.length) * 100)
}

/**
 * Coach "needs attention" flags:
 *  - 3+ consecutive logs ending in Struggle (most recent first)
 *  - Flow score 7d dropped >2 vs prior 7d
 *  - No 5A session run in 5+ days
 */
export function needsAttention(
  logs: FlowLog[],
  sessions: FlowSession[],
  today = localDateISO(new Date()),
  checkins: FlowStageCheckin[] = [],
): string[] {
  const reasons: string[] = []

  // Stage-stuck check: prefer check-ins (that's where stages live now).
  // Fall back to legacy ending_stage on logs for older data.
  const orderedCheckins = [...checkins].sort(
    (a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime(),
  )
  if (
    orderedCheckins.length >= 3 &&
    orderedCheckins.slice(0, 3).every(c => c.stage === 'struggle')
  ) {
    reasons.push('Stuck in Struggle — 3+ recent check-ins')
  } else {
    const orderedByLogged = [...logs].sort(
      (a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime(),
    )
    const withStage = orderedByLogged.filter(l => l.ending_stage != null)
    if (
      withStage.length >= 3 &&
      withStage.slice(0, 3).every(l => l.ending_stage === 'struggle')
    ) {
      reasons.push('3+ recent sessions ended in Struggle')
    }
  }

  const todayDate = new Date(today)
  const cutoff7 = new Date(todayDate); cutoff7.setDate(cutoff7.getDate() - 7)
  const cutoff14 = new Date(todayDate); cutoff14.setDate(cutoff14.getDate() - 14)
  const recent = logs.filter(l => new Date(l.logged_at) >= cutoff7)
  const prior = logs.filter(l => new Date(l.logged_at) >= cutoff14 && new Date(l.logged_at) < cutoff7)
  const avgRecent = avgFlowScore(recent)
  const avgPrior = avgFlowScore(prior)
  if (avgRecent != null && avgPrior != null && avgPrior - avgRecent > 2) {
    reasons.push(`Flow score dropped ${(avgPrior - avgRecent).toFixed(1)} vs prior week`)
  }

  const lastSession = sessions
    .map(s => new Date(s.started_at).getTime())
    .sort((a, b) => b - a)[0]
  if (!lastSession) {
    reasons.push('No 5A session ever run')
  } else {
    const daysSince = Math.floor((todayDate.getTime() - lastSession) / (1000 * 60 * 60 * 24))
    if (daysSince >= 5) reasons.push(`No 5A session in ${daysSince} days`)
  }

  return reasons
}

/**
 * Auto-recommendation — first matching rule wins.
 */
export function generateRecommendation(logs: FlowLog[], sessions: FlowSession[]): string {
  if (logs.length === 0 && sessions.length === 0) {
    return 'Start with one 5A Flow Stack today. The habit beats the hack.'
  }

  const tooEasyDays = logs.filter(l => is4PctZone(l.challenge_level, l.skill_level) === 'too_easy').length
  const tooHardDays = logs.filter(l => is4PctZone(l.challenge_level, l.skill_level) === 'too_hard').length

  if (logs.length >= 3 && tooEasyDays / logs.length > 0.5) {
    return 'Your workouts are too easy. Ask your coach for a +4% bump.'
  }
  if (logs.length >= 3 && tooHardDays / logs.length > 0.5) {
    return 'Challenge is outpacing skill. Pull back by 4–6% until reps feel sharp.'
  }

  const orderedByLogged = [...logs].sort(
    (a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime(),
  )
  const stagedLogs = orderedByLogged.filter(l => l.ending_stage != null)
  if (
    stagedLogs.length >= 3 &&
    stagedLogs.slice(0, 3).every(l => l.ending_stage === 'struggle')
  ) {
    return "You're not completing the cycle. Build in a Release step — 90 seconds of deliberate walk-away before the next rep."
  }

  const activateSkips = sessions.filter(s => (s.skipped_steps || []).includes('A3')).length
  if (activateSkips > 3) {
    return "Box breathing is the activation bridge. Don't skip ACTIVATE this week."
  }

  const flowOnes = logs.filter(l => l.ending_stage === 'flow').length
  if (logs.length > 0 && flowOnes / logs.length >= 0.5) {
    return 'Flow is firing. Keep your identity statement and cue word locked — consistency compounds.'
  }

  return 'Keep running the stack daily. Flow is a practiced state, not an accident.'
}
