'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { FlowLog, FlowSession } from '@/types'
import {
  calcCompetitionStreak, topTrigger,
} from '@/components/mindset/flow-logic'
import { STAGE_META, TRIGGER_LABEL } from '@/components/mindset/flow/flow-constants'
import { format, parseISO } from 'date-fns'
import Skeleton from '@/components/shared/Skeleton'
import { flowZone, ZONE_COLOR } from '@/components/mindset/flow-logic'
import { flowFindings, type FlowContext } from '@/components/mindset/flow-findings'
import { loadNextGame, type UpcomingGame } from '@/lib/team-schedule'
import { formatClock, parseTime } from '@/lib/game-day'
import { localDateISO } from '@/lib/dates'
import { shiftDate } from '@/lib/nutrition'

const FlowBarChart = dynamic(() => import('@/components/mindset/flow/FlowBarChart'), { ssr: false })
const StageTracker = dynamic(() => import('@/components/mindset/flow/StageTracker'), { ssr: false })

interface FlowProfile {
  primary_sport: string | null
  secondary_sport: string | null
  next_competition_at: string | null
}

export default function FlowStateTab() {
  const router = useRouter()
  const [sessions, setSessions] = useState<FlowSession[]>([])
  const [logs, setLogs] = useState<FlowLog[]>([])
  const [profile, setProfile] = useState<FlowProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [staleCache, setStaleCache] = useState(false)
  const [context, setContext] = useState<FlowContext>({ sleep: [], practice: [] })
  const [game, setGame] = useState<UpcomingGame | null>(null)
  const [showStats, setShowStats] = useState(false)

  useEffect(() => {
    const readJsonOrArray = async (r: Response): Promise<any> => {
      if (r.ok) return r.json()
      const body = await r.json().catch(() => ({}))
      if (body?.stale_schema_cache) setStaleCache(true)
      return []
    }
    Promise.all([
      fetch('/api/mindset/flow-state/sessions?all=1').then(readJsonOrArray),
      fetch('/api/mindset/flow-state/logs?all=1').then(readJsonOrArray),
      fetch('/api/profile').then(r => r.ok ? r.json() : null),
      fetch('/api/mindset/flow-state/context').then(r => r.ok ? r.json() : null).catch(() => null),
      loadNextGame(localDateISO()),
    ]).then(([s, l, p, ctx, g]) => {
      setSessions(Array.isArray(s) ? s : [])
      setLogs(Array.isArray(l) ? l : [])
      setProfile(p)
      if (ctx) setContext(ctx)
      setGame(g)
      setLoading(false)
    })
  }, [])

  if (loading) return <Skeleton />

  const streak = calcCompetitionStreak(logs, sessions)
  const lastLog = logs[0] ?? null
  const top = topTrigger(logs)

  const findings = flowFindings(logs, context)
  const lastZone = lastLog ? flowZone(lastLog.challenge_level, lastLog.skill_level) : null
  const routine = gameRoutine(game)
  // Today's finished stack with no flow log yet: remind the athlete to log after competing.
  const todayKey = localDateISO()
  const openStack = sessions.find(s =>
    s.completed_at && localDateISO(new Date(s.completed_at)) === todayKey && !logs.some(l => l.flow_session_id === s.id))
  const showSportHint = profile && !profile.primary_sport

  return (
    <div className="space-y-5">
      {staleCache && (
        <div className="bg-yellow-500/10 border border-yellow-500/40 rounded-xl px-4 py-3 text-sm">
          <p className="font-semibold text-yellow-400 mb-1">Flow State is updating</p>
          <p className="text-xs text-fg-2">Your data is safe. Give it a minute, then reload.</p>
        </div>
      )}

      {routine && (
        <div className="rounded-2xl border border-cta/40 bg-cta/10 p-4 space-y-2">
          <p className="text-xs uppercase tracking-wider font-semibold text-cta">{routine.label}</p>
          <p className="text-sm text-fg-1 font-medium">{routine.headline}</p>
          <ul className="text-sm text-fg-2 space-y-1">
            {routine.steps.map((step, i) => <li key={i}>{i + 1}. {step}</li>)}
          </ul>
          {routine.cta && (
            <button type="button" onClick={() => router.push(routine.cta!.href)} className="btn-primary text-sm mt-1">{routine.cta.label}</button>
          )}
        </div>
      )}

      {openStack && (
        <div className="rounded-2xl border border-cta/40 bg-cta/10 p-4 space-y-2">
          <p className="text-xs uppercase tracking-wider font-semibold text-cta">After competition</p>
          <p className="text-sm text-fg-1">You ran your pre-game Flow Stack today. Once the game is over, log how it went. Your flow score links to the stack.</p>
          <button type="button" onClick={() => router.push(`/exercise?tab=practice&session=${openStack.id}`)} className="btn-primary text-sm">Log today&apos;s game</button>
        </div>
      )}

      <div className="card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-fg-4">Last session</p>
            {lastLog ? (
              <p className="text-sm text-fg-2 mt-0.5">
                {format(parseISO(lastLog.logged_at), 'EEE, MMM d')} · flow score <span className="text-cta font-semibold">{lastLog.flow_score}/10</span>
              </p>
            ) : (
              <p className="text-sm text-fg-3 mt-0.5">Run the stack before your next game, then log your flow after it.</p>
            )}
          </div>
          {lastZone && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${ZONE_COLOR[lastZone].tw}`}>{ZONE_COLOR[lastZone].label}</span>
          )}
        </div>
        <div>
          <button onClick={() => router.push('/mindset/flow-state/session')} className="btn-primary text-base py-3 w-full">
            Start Pre-Game Flow Stack · ~4.5 min
          </button>
          <p className="text-xs text-fg-4 text-center mt-2">Do this before competition, not practice. Log your flow after the game.</p>
        </div>
        <button onClick={() => router.push('/mindset/flow-state/log')} className="btn-secondary w-full">
          Log a practice or game
        </button>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-fg-1 mb-2">What gets you into flow</h3>
        {findings.length > 0 ? (
          <ul className="space-y-2">
            {findings.map((f, i) => <li key={i} className="text-sm text-fg-2">{f}</li>)}
          </ul>
        ) : (
          <p className="text-sm text-fg-4">
            {logs.length < 4
              ? `Log ${4 - logs.length} more session${4 - logs.length === 1 ? '' : 's'} and this shows what puts you in the zone: sleep, the 5-A Stack, games vs practice.`
              : 'No clear pattern yet. Keep logging after practices and games.'}
          </p>
        )}
        <button onClick={() => router.push('/mindset/flow-state/insights')} className="text-sm text-cta hover:underline mt-3">
          Weekly insights →
        </button>
      </div>

      {showSportHint && (
        <div className="bg-surface border border-edge rounded-xl px-4 py-3 text-sm text-fg-3 flex items-center justify-between gap-3">
          <span>Set your sport in Settings so sessions autofill it.</span>
          <button onClick={() => router.push('/settings')} className="text-cta text-sm font-medium hover:underline whitespace-nowrap">Settings →</button>
        </div>
      )}

      <div className="card">
        <button type="button" onClick={() => setShowStats(v => !v)} aria-expanded={showStats} className="w-full flex items-center justify-between px-5 py-4 text-left">
          <span className="font-semibold text-fg-1 text-sm">Stats, chart and stages</span>
          <span className="text-xs text-fg-4">{showStats ? '▲' : '▼'}</span>
        </button>
        {showStats && (
          <div className="px-5 pb-5 space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Competition streak" value={streak > 0 ? `${streak}` : '—'}
                suffix={streak > 0 ? (streak === 1 ? 'competition' : 'competitions') : 'run stack next comp'} gold />
              <StatCard label="Competitions" value={logs.length.toString()} />
              <StatCard label="5A sessions" value={sessions.length.toString()} />
              <StatCard label="Top trigger" value={top ? TRIGGER_LABEL[top] : '—'} small />
            </div>
            <FlowBarChart logs={logs} />
            <StageTracker />
            {lastLog?.ending_stage && (
              <div className="flex items-center gap-2 text-sm text-fg-3">Last ending stage <StageBadge stage={lastLog.ending_stage} /></div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface Routine { label: string; headline: string; steps: string[]; cta?: { label: string; href: string } }

// Pre-game routine from the team schedule (or the athlete's own game date).
function gameRoutine(game: UpcomingGame | null, now = new Date()): Routine | null {
  if (!game) return null
  const today = localDateISO(now)
  const vs = game.opponent ? ` vs ${game.opponent}` : ''
  const start = parseTime(game.time)
  if (game.date === shiftDate(today, 1)) {
    return {
      label: 'Game tomorrow',
      headline: `Tomorrow${vs}${start !== null ? ` at ${formatClock(start)}` : ''}. Set up flow tonight.`,
      steps: [
        'Visualize your first three plays going right — two minutes, eyes closed.',
        'Pick the cue word you’ll use when it gets loud.',
        'Lights out on time. Sleep is the strongest flow trigger you control.',
      ],
    }
  }
  if (game.date !== today) return null
  const nowMin = now.getHours() * 60 + now.getMinutes()
  if (start !== null && nowMin >= start + 90) {
    return {
      label: 'After the game',
      headline: 'Log it while it’s fresh. Two minutes now makes next game easier.',
      steps: ['Rate challenge and skill honestly.', 'Note which triggers fired.'],
      cta: { label: 'Log this game', href: '/mindset/flow-state/log' },
    }
  }
  return {
    label: 'Game day',
    headline: start !== null
      ? `Game${vs} at ${formatClock(start)}. Run your 5-A Stack around ${formatClock(start - 60)}.`
      : `Game day${vs}. Run your 5-A Stack about an hour before the start.`,
    steps: [
      'Run the 5-A Stack 45–60 minutes before warm-ups.',
      'Lock in your cue word during warm-ups.',
      'After the game, log your flow.',
    ],
    cta: { label: 'Start 5-A Stack', href: '/mindset/flow-state/session' },
  }
}

function StatCard({
  label, value, suffix, small, gold,
}: { label: string; value: string; suffix?: string; small?: boolean; gold?: boolean }) {
  return (
    <div className="bg-surface rounded-xl border border-edge p-3">
      <p className="text-xs uppercase tracking-wide text-fg-4">{label}</p>
      <p className={`${small ? 'text-sm' : 'text-2xl'} font-bold mt-1 ${gold ? 'text-cta' : 'text-fg-1'}`}>
        {value}
      </p>
      {suffix && <p className="text-xs text-fg-4 mt-0.5">{suffix}</p>}
    </div>
  )
}

function StageBadge({ stage }: { stage: NonNullable<FlowLog['ending_stage']> }) {
  const meta = STAGE_META[stage]
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.fg}`}
      style={{ backgroundColor: meta.hex }}
    >
      <span>{meta.emoji}</span>
      {meta.label}
    </span>
  )
}
