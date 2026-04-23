'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { FlowLog } from '@/types'
import { format } from 'date-fns'
import { localDateISO } from '@/components/mindset/flow-logic'

interface Props {
  logs: FlowLog[]
  days?: number
}

export default function FlowBarChart({ logs, days = 14 }: Props) {
  const today = new Date()
  const bins: { date: string; label: string; score: number | null }[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = localDateISO(d)
    bins.push({ date: iso, label: format(d, 'M/d'), score: null })
  }

  const byDate = new Map<string, { sum: number; n: number }>()
  for (const l of logs) {
    const iso = localDateISO(new Date(l.logged_at))
    const cur = byDate.get(iso) ?? { sum: 0, n: 0 }
    cur.sum += l.flow_score
    cur.n += 1
    byDate.set(iso, cur)
  }
  for (const bin of bins) {
    const agg = byDate.get(bin.date)
    if (agg) bin.score = Math.round((agg.sum / agg.n) * 10) / 10
  }

  const hasData = bins.some(b => b.score !== null)

  return (
    <div className="bg-gray-900 rounded-2xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-100">{days}-Day Flow Log</h3>
        <span className="text-xs text-gray-500">avg flow score / day</span>
      </div>
      {!hasData ? (
        <div className="text-center py-8 text-sm text-gray-500">
          No flow sessions logged yet. Run your first 5A Flow Stack.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={bins} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#9ca3af' }} tickCount={6} />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: '#111827',
                color: '#f3f4f6',
                fontSize: 13,
              }}
              formatter={(v) => (v == null ? '—' : String(v))}
            />
            <Bar dataKey="score" fill="#C4B400" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
