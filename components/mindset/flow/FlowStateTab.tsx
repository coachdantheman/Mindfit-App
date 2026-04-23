'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { FlowLog, FlowSession } from '@/types'
import {
  calcStreak, localDateISO, topTrigger,
} from '@/components/mindset/flow-logic'
import { STAGE_META, TRIGGER_LABEL } from '@/components/mindset/flow/flow-constants'
import { format, parseISO, differenceInCalendarDays } from 'date-fns'

const FlowBarChart = dynamic(() => import('@/components/mindset/flow/FlowBarChart'), { ssr: false })

export default function FlowStateTab() {
  const router = useRouter()
  const [sessions, setSessions] = useState<FlowSession[]>([])
  const [logs, setLogs] = useState<FlowLog[]>([])
  const [profile, setProfile] = useState<{ primary_sport: string | null; next_competition_at: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [sportPrompt, setSportPrompt] = useState('')
  const [savingSport, setSavingSport] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/mindset/flow-state/sessions?days=14').then(r => r.json()),
      fetch('/api/mindset/flow-state/logs?days=14').then(r => r.json()),
      fetch('/api/mindset/flow-state/profile').then(r => r.json()),
    ]).then(([s, l, p]) => {
      setSessions(Array.isArray(s) ? s : [])
      setLogs(Array.isArray(l) ? l : [])
      setProfile(p)
      setLoading(false)
    })
  }, [])

  const saveSport = async () => {
    if (!sportPrompt.trim()) return
    setSavingSport(true)
    const res = await fetch('/api/mindset/flow-state/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primary_sport: sportPrompt }),
    })
    if (res.ok) setProfile(await res.json())
    setSavingSport(false)
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>

  if (profile && !profile.primary_sport) {
    return (
      <div className="bg-gray-900 rounded-2xl border border-white/10 p-6 max-w-md">
        <h3 className="font-semibold text-gray-100 mb-1">What sport do you play?</h3>
        <p className="text-sm text-gray-500 mb-4">
          We'll autofill this for every 5A session and flow log. You can change it later.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={sportPrompt}
            onChange={e => setSportPrompt(e.target.value)}
            placeholder="e.g. Basketball"
            className="input-field flex-1"
          />
          <button onClick={saveSport} disabled={savingSport || !sportPrompt.trim()} className="btn-primary">
            {savingSport ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  const sessionDates = Array.from(
    new Set(sessions.map(s => localDateISO(new Date(s.started_at)))),
  )
  const streak = calcStreak(sessionDates)
  const lastLog = logs[0] ?? null
  const top = topTrigger(logs)

  let compBanner: string | null = null
  if (profile?.next_competition_at) {
    const days = differenceInCalendarDays(parseISO(profile.next_competition_at), new Date())
    if (days > 0) compBanner = `Next competition in ${days} day${days === 1 ? '' : 's'}`
    else if (days === 0) compBanner = 'Competition today — run your stack.'
  }

  return (
    <div className="space-y-5">
      {compBanner && (
        <div className="bg-cta/10 border border-cta/30 rounded-xl px-4 py-3 text-sm text-cta font-medium">
          {compBanner}
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
        <StatCard label="Streak" value={streak > 0 ? `${streak}` : '—'} suffix={streak > 0 ? (streak === 1 ? 'day' : 'days') : 'start today'} gold />
        <StatCard label="Sessions (14d)" value={sessions.length.toString()} />
        <StatCard label="Logs (14d)" value={logs.length.toString()} />
        <StatCard label="Top trigger" value={top ? TRIGGER_LABEL[top] : '—'} small />
      </div>

      <FlowBarChart logs={logs} days={14} />

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
            <StageBadge stage={lastLog.ending_stage} />
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

function StageBadge({ stage }: { stage: FlowLog['ending_stage'] }) {
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
