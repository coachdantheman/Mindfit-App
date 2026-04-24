'use client'
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { FlowLog, FlowSession, FlowStageCheckin, FlowStage } from '@/types'
import {
  avgFlowScore, calcCompetitionStreak, calcFlowReadiness,
  generateRecommendation, needsAttention, ritualStepSkipRate,
  stageDistribution, triggerEffectiveness, is4PctZone,
} from '@/components/mindset/flow-logic'
import { STAGE_META, TRIGGER_LABEL, FIVE_A_STEPS } from '@/components/mindset/flow/flow-constants'
import ReadinessHero from '@/components/dashboard/ReadinessHero'
import StatCard from '@/components/dashboard/StatCard'

const FlowBarChart = dynamic(() => import('@/components/mindset/flow/FlowBarChart'), { ssr: false })

export default function FlowProgressView() {
  const [sessions, setSessions] = useState<FlowSession[]>([])
  const [logs, setLogs] = useState<FlowLog[]>([])
  const [checkins, setCheckins] = useState<FlowStageCheckin[]>([])
  const [loading, setLoading] = useState(true)
  const [staleCache, setStaleCache] = useState(false)

  useEffect(() => {
    const readArr = async (r: Response) => {
      if (r.ok) return r.json()
      const body = await r.json().catch(() => ({}))
      if (body?.stale_schema_cache) setStaleCache(true)
      return []
    }
    Promise.all([
      fetch('/api/mindset/flow-state/sessions?all=1').then(readArr),
      fetch('/api/mindset/flow-state/logs?all=1').then(readArr),
      fetch('/api/mindset/flow-state/stage-checkins?limit=500').then(readArr),
    ]).then(([s, l, c]) => {
      setSessions(Array.isArray(s) ? s : [])
      setLogs(Array.isArray(l) ? l : [])
      setCheckins(Array.isArray(c) ? c : [])
      setLoading(false)
    })
  }, [])

  const readiness = useMemo(() => calcFlowReadiness(logs, sessions, checkins), [logs, sessions, checkins])
  const streak = useMemo(() => calcCompetitionStreak(logs, sessions), [logs, sessions])
  const stages30 = useMemo(() => {
    const since = new Date(); since.setDate(since.getDate() - 30)
    const recent = checkins.filter(c => new Date(c.checked_at) >= since)
    return stageDistribution(recent)
  }, [checkins])
  const triggerStats = useMemo(() => triggerEffectiveness(logs), [logs])
  const skipRates = useMemo(() => ritualStepSkipRate(sessions.slice(0, 30)), [sessions])

  if (loading) return <p className="text-sm text-gray-500">Loading flow progress…</p>

  if (staleCache) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/40 rounded-xl px-4 py-3 text-sm">
        <p className="font-semibold text-yellow-300 mb-1">Supabase schema cache is stale</p>
        <p className="text-xs text-gray-300">
          Reload this page in a minute. If it persists, run{' '}
          <code className="text-cta">NOTIFY pgrst, 'reload schema';</code> in the SQL editor, or restart the API from Supabase settings.
        </p>
      </div>
    )
  }

  if (logs.length === 0 && sessions.length === 0 && checkins.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="font-medium">No flow data yet</p>
        <p className="text-sm mt-1">
          Run your first 5A Flow Stack or log a competition in the Mindset tab to start tracking.
        </p>
      </div>
    )
  }

  // Sparklines — last 10 logs worth, oldest → newest, normalized 0-1
  const flowSpark = [...logs].slice(0, 10).reverse().map(l => l.flow_score / 10)
  const zoneSpark = [...logs].slice(0, 10).reverse().map(l =>
    is4PctZone(l.challenge_level, l.skill_level) === 'in_zone' ? 1 : 0.25
  )

  const flowAvg = avgFlowScore(logs.slice(0, 14))
  const flowAvgPrev = avgFlowScore(logs.slice(14, 28))
  const flowDelta = flowAvg != null && flowAvgPrev != null
    ? Math.round((flowAvg - flowAvgPrev) * 10) / 10
    : null

  const zoneHit = logs.length > 0
    ? Math.round(
        (logs.slice(0, 14).filter(l => is4PctZone(l.challenge_level, l.skill_level) === 'in_zone').length /
         Math.min(14, logs.length)) * 100,
      )
    : 0

  const ritualComplete = sessions.length > 0
    ? Math.round(
        (sessions.slice(0, 14).filter(s => (s.skipped_steps ?? []).length === 0).length /
         Math.min(14, sessions.length)) * 100,
      )
    : 0

  const attention = needsAttention(logs, sessions, new Date().toISOString().split('T')[0], checkins)
  const recommendation = generateRecommendation(logs, sessions)

  return (
    <div className="space-y-6">
      <ReadinessHero
        score={readiness.score}
        verdict={readiness.verdict}
        subtitle={`Flow avg ${flowAvg != null ? flowAvg.toFixed(1) : '—'} · ${logs.length} competition${logs.length === 1 ? '' : 's'} · ${sessions.length} 5A session${sessions.length === 1 ? '' : 's'}`}
        date="Flow Readiness · last 14 days"
        pills={[
          { label: 'Streak', value: `${streak}` },
          { label: 'Zone', value: `${zoneHit}%` },
          { label: 'Ritual', value: `${ritualComplete}%` },
        ]}
      />

      {/* Component breakdown — shows WHY the score is what it is */}
      <ReadinessBreakdown readiness={readiness} />

      {/* Primary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Flow Score"
          value={flowAvg != null ? flowAvg.toFixed(1) : '—'}
          unit="/10"
          delta={flowDelta != null ? {
            value: `${flowDelta > 0 ? '+' : ''}${flowDelta.toFixed(1)}`,
            direction: flowDelta > 0 ? 'up' : flowDelta < 0 ? 'down' : 'flat',
          } : undefined}
          sparkline={flowSpark}
          color="#C4B400"
          context="14-day avg vs prior 14"
        />
        <StatCard
          label="Comp Streak"
          value={streak}
          unit={streak === 1 ? 'comp' : 'comps'}
          context="Consecutive comps with a 5A ritual"
        />
        <StatCard
          label="4% Zone"
          value={zoneHit}
          unit="%"
          sparkline={zoneSpark}
          color="#22c55e"
          context="Challenge slightly above skill"
        />
        <StatCard
          label="Ritual Complete"
          value={ritualComplete}
          unit="%"
          color="#a855f7"
          context="5A sessions with zero skips"
        />
      </div>

      {/* Needs attention + recommendation */}
      {(attention.length > 0 || recommendation) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {attention.length > 0 ? (
            <div className="bg-gray-900 rounded-2xl border border-orange-500/30 p-5">
              <p className="text-xs uppercase tracking-wide text-orange-400 font-semibold mb-2">Needs attention</p>
              <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                {attention.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-2xl border border-green-500/30 p-5">
              <p className="text-xs uppercase tracking-wide text-green-400 font-semibold mb-2">Clean week</p>
              <p className="text-sm text-gray-300">No red flags. Keep compounding.</p>
            </div>
          )}
          <div className="bg-gray-900 rounded-2xl border border-cta/30 p-5">
            <p className="text-xs uppercase tracking-wide text-cta font-semibold mb-2">Coach Dan says</p>
            <p className="text-sm text-gray-100">{recommendation}</p>
          </div>
        </div>
      )}

      {/* Flow log chart */}
      <FlowBarChart logs={logs} title="Flow Journey" />

      {/* Stage distribution + Ritual adherence side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StageDistributionCard stages={stages30} total={checkins.filter(c => {
          const d = new Date(); d.setDate(d.getDate() - 30)
          return new Date(c.checked_at) >= d
        }).length} />
        <RitualAdherenceCard skipRates={skipRates} sessionCount={Math.min(30, sessions.length)} />
      </div>

      {/* Trigger effectiveness */}
      {triggerStats.length > 0 && <TriggerEffectivenessCard stats={triggerStats} />}
    </div>
  )
}

// -----------------------------------------------------------
function ReadinessBreakdown({ readiness }: { readiness: ReturnType<typeof calcFlowReadiness> }) {
  const parts = [
    { key: 'flow',      label: 'Flow Score',       value: readiness.components.flow,       max: 40, tint: 'bg-cta' },
    { key: 'ritual',    label: '5A Ritual',        value: readiness.components.ritual,     max: 20, tint: 'bg-purple-500' },
    { key: 'zone',      label: '4% Zone',          value: readiness.components.zone,       max: 20, tint: 'bg-green-500' },
    { key: 'diversity', label: 'Stage Diversity',  value: readiness.components.diversity,  max: 10, tint: 'bg-blue-500' },
    { key: 'activity',  label: 'Comp Activity',    value: readiness.components.activity,   max: 10, tint: 'bg-orange-500' },
  ]
  return (
    <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold font-mono">Score breakdown</p>
        <span className="text-xs text-gray-500">out of 100</span>
      </div>
      <div className="space-y-2.5">
        {parts.map(p => (
          <div key={p.key} className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-28 shrink-0">{p.label}</span>
            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${p.tint}`}
                style={{ width: `${(p.value / p.max) * 100}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-200 w-12 text-right tabular-nums">
              {p.value}<span className="text-gray-500 text-xs">/{p.max}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// -----------------------------------------------------------
function StageDistributionCard({ stages, total }: { stages: { stage: FlowStage; count: number; pct: number }[]; total: number }) {
  return (
    <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-gray-100 text-sm">Stage Distribution</h3>
        <span className="text-xs text-gray-500">last 30 days · {total} check-in{total === 1 ? '' : 's'}</span>
      </div>
      {total === 0 ? (
        <p className="text-sm text-gray-500 mt-3">No stage check-ins in the last 30 days.</p>
      ) : (
        <div className="space-y-2.5 mt-3">
          {stages.map(s => {
            const meta = STAGE_META[s.stage]
            return (
              <div key={s.stage} className="flex items-center gap-3">
                <span className="text-xs text-gray-300 w-24 shrink-0">
                  {meta.emoji} {meta.label}
                </span>
                <div className="flex-1 h-2.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${s.pct}%`, backgroundColor: meta.hex }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-200 w-10 text-right tabular-nums">{s.pct}%</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// -----------------------------------------------------------
function RitualAdherenceCard({
  skipRates, sessionCount,
}: { skipRates: Record<'A1' | 'A2' | 'A3' | 'A4' | 'A5', number>; sessionCount: number }) {
  const worst = (Object.entries(skipRates) as [keyof typeof skipRates, number][])
    .filter(([_, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-gray-100 text-sm">5A Ritual Adherence</h3>
        <span className="text-xs text-gray-500">{sessionCount} session{sessionCount === 1 ? '' : 's'}</span>
      </div>
      {sessionCount === 0 ? (
        <p className="text-sm text-gray-500 mt-3">No 5A sessions yet — run one before your next competition.</p>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-2 mt-3">
            {FIVE_A_STEPS.map(step => {
              const skip = skipRates[step.code]
              const tint = skip === 0
                ? 'border-green-500/40 text-green-300 bg-green-500/10'
                : skip < 30
                  ? 'border-cta/40 text-cta bg-cta/10'
                  : 'border-orange-500/50 text-orange-300 bg-orange-500/10'
              return (
                <div key={step.code} className={`rounded-lg border p-2 text-center ${tint}`}>
                  <p className="text-[10px] uppercase tracking-wide font-mono">{step.code}</p>
                  <p className="text-sm font-bold mt-0.5">{skip}%</p>
                  <p className="text-[9px] opacity-70 mt-0.5">skipped</p>
                </div>
              )
            })}
          </div>
          {worst && worst[1] >= 30 && (
            <p className="text-xs text-orange-300 mt-3">
              <span className="font-semibold">{worst[0]} is your weakest step</span> — skipped in {worst[1]}% of sessions.
              Make it non-negotiable next week.
            </p>
          )}
          {(!worst || worst[1] < 30) && (
            <p className="text-xs text-green-300 mt-3">Ritual is holding up. No step is consistently getting cut.</p>
          )}
        </>
      )}
    </div>
  )
}

// -----------------------------------------------------------
function TriggerEffectivenessCard({
  stats,
}: { stats: { trigger: import('@/types').FlowTrigger; firedCount: number; avgFlow: number }[] }) {
  const max = Math.max(...stats.map(s => s.avgFlow), 10)
  return (
    <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-gray-100 text-sm">Trigger Effectiveness</h3>
        <span className="text-xs text-gray-500">Avg flow score when fired</span>
      </div>
      <p className="text-xs text-gray-500 mb-4">Sorted by average flow score — top triggers drive your best performances.</p>
      <div className="space-y-2">
        {stats.map(s => (
          <div key={s.trigger} className="flex items-center gap-3">
            <span className="text-xs text-gray-300 w-40 shrink-0 truncate" title={TRIGGER_LABEL[s.trigger]}>
              {TRIGGER_LABEL[s.trigger]}
            </span>
            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all bg-cta"
                style={{ width: `${(s.avgFlow / max) * 100}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-200 w-14 text-right tabular-nums">
              {s.avgFlow.toFixed(1)}
              <span className="text-gray-500 text-[10px] ml-0.5">×{s.firedCount}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
