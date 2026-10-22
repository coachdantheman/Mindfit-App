'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { Bucket } from '@/lib/nutrition'

export default function CaloriesChart({ buckets, goal }: { buckets: Bucket[]; goal: number | null }) {
  const data = buckets.map(b => ({ label: b.label, calories: b.loggedDays > 0 ? b.calories : null }))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgb(var(--fg-4))' }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11, fill: 'rgb(var(--fg-4))' }} />
        <Tooltip
          contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'rgb(var(--surface))', color: 'rgb(var(--fg-1))', fontSize: 13 }}
          formatter={(v) => v == null ? 'not logged' : `${v} kcal`}
        />
        {goal && <ReferenceLine y={goal} stroke="var(--cta)" strokeDasharray="3 3" strokeOpacity={0.6} />}
        <Bar dataKey="calories" fill="var(--cta)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
