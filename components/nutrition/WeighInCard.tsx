'use client'
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { WeighIn } from '@/types'
import { linearTrend, localDateISO } from '@/lib/nutrition'
import ProgressPhotoSheet from './ProgressPhotoSheet'

interface Props {
  weighIns: WeighIn[]
  targetWeight: number | null
  onSaved: () => void
}

export default function WeighInCard({ weighIns, targetWeight, onSaved }: Props) {
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(() => localDateISO(new Date()))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [photoFor, setPhotoFor] = useState<WeighIn | null>(null)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch('/api/nutrition/weigh-ins', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight_lb: parseFloat(weight), entry_date: date }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error ?? 'Could not save.')
    else { setWeight(''); onSaved(); setPhotoFor({ ...data, photo_slots: [] }) }
    setSaving(false)
  }

  const remove = async (id: string) => {
    await fetch('/api/nutrition/weigh-ins', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    onSaved()
  }

  const points = weighIns.map(w => ({ date: w.entry_date, value: Number(w.weight_lb) }))
  const trend = linearTrend(points)
  const data = points.map((p, i) => ({ label: `${Number(p.date.slice(5, 7))}/${Number(p.date.slice(8, 10))}`, weight: p.value, trend: trend?.fitted[i] ?? null }))
  const latest = weighIns[weighIns.length - 1]

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-fg-1 text-sm">Weight</h3>
        {latest && <span className="text-xs text-fg-4">latest {Number(latest.weight_lb)} lb · {latest.entry_date}</span>}
      </div>

      <form onSubmit={save} className="grid grid-cols-[5rem_1fr] sm:flex gap-2">
        <input type="number" inputMode="decimal" step="0.1" min="50" max="500" required placeholder="lb" value={weight} onChange={e => setWeight(e.target.value)} className="input-field w-24" />
        <input type="date" value={date} max={localDateISO(new Date())} onChange={e => setDate(e.target.value)} className="input-field flex-1" />
        <button type="submit" disabled={saving} className="btn-primary col-span-2 sm:col-span-1">Log</button>
      </form>
      {error && <p className="text-xs text-red-400">{error}</p>}

      {points.length >= 2 ? (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgb(var(--fg-4))' }} interval="preserveStartEnd" />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'rgb(var(--fg-4))' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'rgb(var(--surface))', color: 'rgb(var(--fg-1))', fontSize: 13 }} />
              {targetWeight && <ReferenceLine y={targetWeight} stroke="var(--chart-4)" strokeDasharray="3 3" strokeOpacity={0.7} />}
              <Line type="monotone" dataKey="weight" stroke="var(--cta)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="linear" dataKey="trend" stroke="rgb(var(--fg-4))" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          {trend && (
            <p className="text-xs text-fg-3">
              Trend: <span className={`font-medium ${trend.slopePerWeek > 0 ? 'text-green-400' : trend.slopePerWeek < 0 ? 'text-orange-400' : 'text-fg-2'}`}>
                {trend.slopePerWeek > 0 ? '+' : ''}{trend.slopePerWeek} lb/week
              </span>
              {targetWeight ? ` · target ${targetWeight} lb` : ''}
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-fg-4">Log a few weigh-ins to see your trend. Same time of day, same conditions, gives the cleanest line.</p>
      )}

      {weighIns.length > 0 && (
        <div className="divide-y divide-edge-muted">
          {[...weighIns].reverse().slice(0, 5).map(w => (
            <div key={w.id} className="flex items-center justify-between gap-3 py-1.5 text-xs">
              <span className="text-fg-3">{w.entry_date}</span>
              <span className="text-fg-2 tabular-nums">{Number(w.weight_lb)} lb</span>
              <button
                type="button"
                onClick={() => setPhotoFor(w)}
                className={`py-1 px-2 rounded-lg ${w.photo_slots?.length ? 'text-cta' : 'text-fg-4 hover:text-fg-2'}`}
                aria-label="Progress photos"
              >
                📷{w.photo_slots?.length ? ` ${w.photo_slots.length}` : ''}
              </button>
              <button type="button" onClick={() => remove(w.id)} className="text-fg-4 hover:text-red-400">Remove</button>
            </div>
          ))}
        </div>
      )}

      {photoFor && (
        <ProgressPhotoSheet weighIn={photoFor} onChange={onSaved} onClose={() => setPhotoFor(null)} />
      )}
    </div>
  )
}
