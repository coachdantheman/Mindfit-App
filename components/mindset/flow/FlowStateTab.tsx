'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { FlowLog, FlowSession } from '@/types'
import {
  calcCompetitionStreak, topTrigger,
} from '@/components/mindset/flow-logic'
import { STAGE_META, TRIGGER_LABEL } from '@/components/mindset/flow/flow-constants'
import { format, parseISO, differenceInCalendarDays } from 'date-fns'

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

  useEffect(() => {
    Promise.all([
      fetch('/api/mindset/flow-state/sessions?all=1').then(r => r.ok ? r.json() : []),
      fetch('/api/mindset/flow-state/logs?all=1').then(r => r.ok ? r.json() : []),
      fetch('/api/profile').then(r => r.ok ? r.json() : null),
    ]).then(([s, l, p]) => {
      setSessions(Array.isArray(s) ? s : [])
      setLogs(Array.isArray(l) ? l : [])
      setProfile(p)
      setLoading(false)
    })
  }, [])

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>

  const streak = calcCompetitionStreak(logs, sessions)
  const lastLog = logs[0] ?? null
  const top = topTrigger(logs)

  let compBanner: string | null = null
  if (profile?.next_competition_at) {
    const days = differenceInCalendarDays(parseISO(profile.next_competition_at), new Date())
    if (days > 0) compBanner = `Next competition in ${days} day${days === 1 ? '' : 's'}`
    else if (days === 0) compBanner = 'Competition today — run your stack.'
  }

  const showSportHint = profile && !profile.primary_sport

  return (
    <div className="space-y-5">
      {compBanner && (
        <div className="bg-cta/10 border border-cta/30 rounded-xl px-4 py-3 text-sm text-cta font-medium">
          {compBanner}
        </div>
      )}

      {showSportHint && (
        <div className="bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-400 flex items-center justify-between gap-3">
          <span>Set your sport in Settings so sessions autofill it.</span>
          <button
            onClick={() => router.push('/settings')}
            className="text-cta text-sm font-medium hover:underline whitespace-nowrap"
          >
            Go to Settings →
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => router.push('/mindset/flow-state/session')}
          className="btn-primary text-base py-3 px-6 flex-1"
        >
          Start 5A Flow Stack · ~4.5 min
        </button>
        <button
          onClick={() => router.push('/mindset/flow-state/log')}
          className="px-5 py-3 rounded-xl text-sm font-semibold border border-cta/40 text-cta hover:bg-cta/10 transition-colors flex-1 sm:flex-none"
        >
          Log Flow Session
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Competition streak"
          value={streak > 0 ? `${streak}` : '—'}
          suffix={streak > 0 ? (streak === 1 ? 'competition' : 'competitions') : 'run stack next comp'}
          gold
        />
        <StatCard label="Competitions" value={logs.length.toString()} />
        <StatCard label="5A sessions" value={sessions.length.toString()} />
        <StatCard label="Top trigger" value={top ? TRIGGER_LABEL[top] : '—'} small />
      </div>

      <FlowBarChart logs={logs} />

      <StageTracker />

      <div className="bg-gray-900 rounded-2xl border border-white/10 p-6">
        <h3 className="font-semibold text-gray-100 mb-3">Last flow session</h3>
        {!lastLog ? (
          <p className="text-sm text-gray-500">No flow logs yet. Run the stack and log your first session.</p>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm text-gray-300">
                {format(parseISO(lastLog.logged_at), 'EEEE, MMM d · h:mma')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {lastLog.sport || profile?.primary_sport || '—'} · flow score{' '}
                <span className="text-cta font-semibold">{lastLog.flow_score}/10</span>
              </p>
            </div>
            {lastLog.ending_stage && <StageBadge stage={lastLog.ending_stage} />}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => router.push('/mindset/flow-state/insights')}
          className="text-sm text-cta hover:underline"
        >
          View weekly insights →
        </button>
      </div>
    </div>
  )
}

function StatCard({
  label, value, suffix, small, gold,
}: { label: string; value: string; suffix?: string; small?: boolean; gold?: boolean }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-white/10 p-3">
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`${small ? 'text-sm' : 'text-2xl'} font-bold mt-1 ${gold ? 'text-cta' : 'text-gray-100'}`}>
        {value}
      </p>
      {suffix && <p className="text-[11px] text-gray-500 mt-0.5">{suffix}</p>}
    </div>
  )
}

function StageBadge({ stage }: { stage: NonNullable<FlowLog['ending_stage']> }) {
  const meta = STAGE_META[stage]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: meta.hex }}
    >
      <span>{meta.emoji}</span>
      {meta.label}
    </span>
  )
}
