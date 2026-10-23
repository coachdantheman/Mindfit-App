'use client'
import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parseISO } from 'date-fns'
import BottomSheet from '@/components/shared/BottomSheet'
import { TierBadge } from './TierResult'
import type { LiftEvaluation, SessionPoint } from '@/lib/strength'
import type { ExerciseLibraryRow, ExerciseMeasure } from '@/types/exercise'

interface ProgressData {
  measure: ExerciseMeasure
  series: SessionPoint[]
  best: number
  prs: SessionPoint[]
  tier: LiftEvaluation | null
  exercise: ExerciseLibraryRow | null
}

interface Props {
  exerciseId: string | null
  name: string
  onClose: () => void
}

const UNIT: Record<ExerciseMeasure, string> = { weight_reps: 'lb', reps: 'reps', distance_in: 'in', time_sec: 'sec' }
const METRIC: Record<ExerciseMeasure, string> = { weight_reps: 'Est. 1RM', reps: 'Max reps', distance_in: 'Best distance', time_sec: 'Longest hold' }

export default function LiftProgress({ exerciseId, name, onClose }: Props) {
  const [data, setData] = useState<ProgressData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const qs = exerciseId ? `exercise_id=${exerciseId}` : `name=${encodeURIComponent(name)}`
    fetch(`/api/exercise/progress?${qs}`)
      .then(async r => { if (!r.ok) throw new Error(); setData(await r.json()) })
      .catch(() => setError("Couldn't load progress."))
  }, [exerciseId, name])

  const measure = data?.measure ?? 'weight_reps'
  const chart = (data?.series ?? []).map(p => ({ date: format(parseISO(p.date), 'MMM d'), value: p.e1rm }))

  return (
    <BottomSheet title={name} onClose={onClose}>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!data && !error && <p className="text-sm text-fg-4 py-6 text-center">Loading…</p>}
      {data && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-fg-4">{METRIC[measure]}</p>
              <p className="text-2xl font-bold text-fg-1 tabular-nums">{data.best || '—'} <span className="text-sm text-fg-4 font-medium">{data.best ? UNIT[measure] : ''}</span></p>
            </div>
            {data.tier && <TierBadge tier={data.tier.tier} />}
          </div>

          {chart.length >= 2 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chart} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'rgb(var(--fg-4))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'rgb(var(--fg-4))' }} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'rgb(var(--surface))', color: 'rgb(var(--fg-1))', fontSize: 12 }} formatter={(v: number) => [`${v} ${UNIT[measure]}`, METRIC[measure]]} />
                <Line type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-fg-4 text-center py-4">
              {chart.length === 0 ? 'No sessions logged yet.' : 'One session so far — log another to see a trend.'}
            </p>
          )}

          {data.tier && (
            <p className="text-xs text-fg-4">
              Stronger than <span className="text-fg-2 font-semibold">{data.tier.liftersPct}%</span> of lifters at your bodyweight (approx.) · ≈ {data.tier.generalPct}% of the general population (est.)
            </p>
          )}

          {data.prs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-fg-2 mb-1.5">Personal records</p>
              <div className="divide-y divide-edge-muted">
                {[...data.prs].reverse().slice(0, 8).map(p => (
                  <div key={p.date + p.e1rm} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-fg-3">{format(parseISO(p.date), 'MMM d, yyyy')}</span>
                    <span className="text-fg-1 tabular-nums font-medium">
                      {p.e1rm} {UNIT[measure]}
                      {p.topSet && measure === 'weight_reps' ? <span className="text-fg-4 font-normal"> · {p.topSet.weight}×{p.topSet.reps}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  )
}
