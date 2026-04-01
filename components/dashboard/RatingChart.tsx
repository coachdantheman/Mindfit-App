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
    <div className="bg-gray-900 rounded-2xl border border-white/10 p-6">
      <h3 className="font-semibold text-gray-100 mb-4">Mental Performance Trends</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#9ca3af' }} />
          <YAxis domain={[1, 10]} tick={{ fontSize: 12, fill: '#9ca3af' }} tickCount={10} />
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: '#111827', color: '#f3f4f6', fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
          <Line type="monotone" dataKey="Motivation" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Focus" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Confidence" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Anxiety" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
