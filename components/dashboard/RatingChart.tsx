'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { JournalEntry } from '@/types'
import { format, parseISO } from 'date-fns'

interface Props {
  entries: JournalEntry[]
}

export default function RatingChart({ entries }: Props) {
  const data = [...entries]
    .reverse()   // oldest first for chart
    .map(e => ({
      date: format(parseISO(e.entry_date), 'MMM d'),
      Motivation: e.rating_motivation,
      Focus: e.rating_focus,
      Confidence: e.rating_confidence,
      Anxiety: e.rating_anxiety,
    }))

  if (data.length === 0) return null

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-fg-1 mb-4">Mental Performance Trends</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'rgb(var(--fg-4))' }} />
          <YAxis domain={[1, 10]} tick={{ fontSize: 12, fill: 'rgb(var(--fg-4))' }} tickCount={10} />
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'rgb(var(--surface))', color: 'rgb(var(--fg-1))', fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
          <Line type="monotone" dataKey="Motivation" stroke="var(--rating-motivation)" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Focus" stroke="var(--rating-focus)" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Confidence" stroke="var(--rating-confidence)" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Anxiety" stroke="var(--rating-anxiety)" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
