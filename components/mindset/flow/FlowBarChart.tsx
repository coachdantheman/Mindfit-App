'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { FlowLog } from '@/types'
import { format, parseISO } from 'date-fns'

interface Props {
  logs: FlowLog[]
  title?: string
}

export default function FlowBarChart({ logs, title = 'Flow Log' }: Props) {
  // Oldest on the left → most recent on the right; one bar per competition.
  const data = [...logs]
    .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
    .map(l => ({
      label: format(parseISO(l.logged_at), 'M/d'),
      score: l.flow_score,
      stage: l.ending_stage,
      sport: l.sport || '—',
    }))

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-fg-1">{title}</h3>
        <span className="text-xs text-fg-4">
          {data.length > 0 ? `${data.length} competition${data.length === 1 ? '' : 's'}` : ''}
        </span>
      </div>
      {data.length === 0 ? (
        <div className="text-center py-8 text-sm text-fg-4">
          No flow sessions logged yet. Run your first 5A Flow Stack on your next competition.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgb(var(--fg-3))' }} interval="preserveStartEnd" />
            <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: 'rgb(var(--fg-3))' }} tickCount={6} />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'rgb(var(--surface))',
                color: 'rgb(var(--fg-1))',
                fontSize: 13,
              }}
              formatter={(v) => (v == null ? '—' : String(v))}
            />
            <Bar dataKey="score" fill="var(--cta)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
