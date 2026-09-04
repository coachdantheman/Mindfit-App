'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FlowInsights } from '@/types'
import { STAGE_META, TRIGGER_LABEL } from '@/components/mindset/flow/flow-constants'
import Skeleton from '@/components/shared/Skeleton'

export default function FlowInsightsView() {
  const router = useRouter()
  const [data, setData] = useState<{ insights: FlowInsights; needs_attention: string[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/mindset/flow-state/insights').then(r => r.json()).then(d => {
      setData(d)
      setLoading(false)
    })
  }, [])

  if (loading) return <Skeleton />
  if (!data) return null

  const { insights, needs_attention } = data

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <button onClick={() => router.push('/mindset')} className="text-sm text-fg-4 hover:text-fg-2">
        ← Back to Mindset
      </button>
      <div>
        <h1 className="text-2xl font-bold text-fg-1">Flow insights — last 7 days</h1>
        <p className="text-sm text-fg-4 mt-1">
          {insights.sessions_7d} session{insights.sessions_7d === 1 ? '' : 's'} · {insights.logs_7d} log{insights.logs_7d === 1 ? '' : 's'}
        </p>
      </div>

      {needs_attention.length > 0 && (
        <div className="bg-cta/10 border border-cta/40 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-cta mb-1">Needs attention</p>
          <ul className="list-disc list-inside text-sm text-fg-2 space-y-0.5">
            {needs_attention.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <BigStat label="Avg flow score" value={insights.avg_flow_score != null ? insights.avg_flow_score.toFixed(1) : '—'} gold />
        <BigStat label="Flow % of sessions" value={insights.flow_pct != null ? `${insights.flow_pct}%` : '—'} />
        <BigStat
          label="Most common stage"
          value={insights.most_common_stage ? STAGE_META[insights.most_common_stage].label : '—'}
          emoji={insights.most_common_stage ? STAGE_META[insights.most_common_stage].emoji : undefined}
        />
        <BigStat
          label="Top trigger"
          value={insights.top_trigger ? TRIGGER_LABEL[insights.top_trigger] : '—'}
          small
        />
      </div>

      <div className="bg-surface rounded-2xl border border-cta/30 p-5">
        <p className="text-xs uppercase tracking-wide text-cta mb-2">Recommendation</p>
        <p className="text-fg-1 text-base">{insights.recommendation}</p>
      </div>

      <div className="card p-5">
        <p className="text-xs uppercase tracking-wide text-fg-4 mb-2">Coach note</p>
        {insights.coach_note ? (
          <p className="text-fg-2 text-sm whitespace-pre-wrap">{insights.coach_note}</p>
        ) : (
          <p className="text-sm text-fg-4 italic">Your coach hasn't left a note yet.</p>
        )}
      </div>
    </div>
  )
}

function BigStat({
  label, value, small, gold, emoji,
}: { label: string; value: string; small?: boolean; gold?: boolean; emoji?: string }) {
  return (
    <div className="bg-surface rounded-xl border border-edge p-4">
      <p className="text-[11px] uppercase tracking-wide text-fg-4">{label}</p>
      <p className={`mt-1 font-bold ${small ? 'text-base' : 'text-3xl'} ${gold ? 'text-cta' : 'text-fg-1'}`}>
        {emoji ? <span className="mr-2">{emoji}</span> : null}{value}
      </p>
    </div>
  )
}
