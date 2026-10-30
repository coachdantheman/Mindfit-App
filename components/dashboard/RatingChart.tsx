'use client'
import { useEffect, useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { JournalEntry } from '@/types'
import { buildTrendSeries, TREND_VIEWS, type TrendView } from '@/lib/rating-trends'

interface Props {
  entries: JournalEntry[]
}

const VIEW_KEY = 'mf_trend_view'
const isView = (v: unknown): v is TrendView => TREND_VIEWS.some(t => t.key === v)

export default function RatingChart({ entries }: Props) {
  const [view, setView] = useState<TrendView>('month')

  useEffect(() => {
    try { const saved = localStorage.getItem(VIEW_KEY); if (isView(saved)) setView(saved) } catch {}
  }, [])

  const select = (v: TrendView) => {
    setView(v)
    try { localStorage.setItem(VIEW_KEY, v) } catch {}
  }

  const data = useMemo(() => buildTrendSeries(entries, view), [entries, view])
  const meta = TREND_VIEWS.find(t => t.key === view)!
  const averaged = view === 'weekly_avg' || view === 'monthly_avg'

  if (entries.length === 0) return null

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <h3 className="font-semibold text-fg-1">Mental Performance Trends</h3>
        <div role="group" aria-label="Trend view" className="flex gap-1 p-1 bg-surface-2 rounded-xl overflow-x-auto scrollbar-none max-w-full">
          {TREND_VIEWS.map(t => (
            <button
              key={t.key}
              type="button"
              aria-pressed={view === t.key}
              onClick={() => select(t.key)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                view === t.key ? 'bg-surface text-cta shadow-sm' : 'text-fg-4 hover:text-fg-2'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-fg-4 mb-4">{meta.hint}{averaged ? ' · hover a point for the entry count' : ''}</p>

      {data.length === 0 ? (
        <p className="text-sm text-fg-4 py-10 text-center">No journal entries in this window yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'rgb(var(--fg-4))' }} interval="preserveStartEnd" minTickGap={16} />
            <YAxis domain={[1, 10]} tick={{ fontSize: 12, fill: 'rgb(var(--fg-4))' }} tickCount={10} />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'rgb(var(--surface))', color: 'rgb(var(--fg-1))', fontSize: 13 }}
              labelFormatter={(label, payload) => {
                const n = payload?.[0]?.payload?.entries
                return averaged && n ? `${label} · avg of ${n} entr${n === 1 ? 'y' : 'ies'}` : String(label)
              }}
            />
            <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
            <Line type="monotone" dataKey="Motivation" stroke="var(--rating-motivation)" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Focus" stroke="var(--rating-focus)" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Confidence" stroke="var(--rating-confidence)" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Anxiety" stroke="var(--rating-anxiety)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
