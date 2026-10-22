'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { NutritionGoal, WeighIn } from '@/types'
import { DayTotal, RANGE_DAYS, TrendRange, adherencePct, averageLogged, bucketByRange, fillMissingDays, loggingStreak } from '@/lib/nutrition'
import StatCard from '@/components/dashboard/StatCard'
import CaloriesChart from './CaloriesChart'
import MacroAverages from './MacroAverages'
import WeighInCard from './WeighInCard'

const RANGES: { key: TrendRange; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
]

export default function TrendsView({ goal }: { goal: NutritionGoal | null }) {
  const [range, setRange] = useState<TrendRange>('day')
  const [raw, setRaw] = useState<DayTotal[]>([])
  const [weighIns, setWeighIns] = useState<WeighIn[]>([])

  useEffect(() => {
    fetch(`/api/nutrition/entries?summary=1&days=${RANGE_DAYS[range]}`).then(r => r.json()).then(d => setRaw(Array.isArray(d) ? d : []))
  }, [range])

  const loadWeighIns = useCallback(() => {
    fetch('/api/nutrition/weigh-ins?days=180').then(r => r.json()).then(d => setWeighIns(Array.isArray(d) ? d : []))
  }, [])
  useEffect(() => { loadWeighIns() }, [loadWeighIns])

  const days = useMemo(() => fillMissingDays(raw, RANGE_DAYS[range]), [raw, range])
  const buckets = useMemo(() => bucketByRange(days, range), [days, range])
  const avg = useMemo(() => averageLogged(days), [days])
  const adherence = goal ? adherencePct(days, goal.calories) : null
  const streak = loggingStreak(days)
  const loggedDays = days.filter(d => d.entryCount > 0).length
  const caption = range === 'day' ? 'last 7 days' : range === 'week' ? 'last 8 weeks' : 'last 6 months'

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {RANGES.map(r => (
          <button key={r.key} type="button" onClick={() => setRange(r.key)} className={range === r.key ? 'tab-btn-active' : 'tab-btn'}>{r.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Avg Calories" value={avg?.calories ?? '—'} unit={goal ? `/${goal.calories}` : 'kcal'} context={`${caption} · logged days`} color="var(--cta)"
          sparkline={buckets.slice(-10).map(b => b.loggedDays ? Math.min(1, b.calories / (goal?.calories || 2000)) : 0)} />
        <StatCard label="Goal Adherence" value={adherence ?? '—'} unit={adherence != null ? '%' : ''} color="var(--chart-4)" context={goal ? 'days within ±10% of goal' : 'set a goal to track'} />
        <StatCard label="Logging Streak" value={streak} unit={streak === 1 ? 'day' : 'days'} color="var(--chart-2)" context="consecutive days logged" />
        <StatCard label="Avg Protein" value={avg?.protein ?? '—'} unit={goal ? `/${goal.protein_g}g` : 'g'} color="var(--chart-3)" context={`${loggedDays} of ${RANGE_DAYS[range]} days logged`} />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-fg-1 text-sm">Calories · {caption}</h3>
          {goal && <span className="text-xs text-fg-4">goal {goal.calories} kcal</span>}
        </div>
        {loggedDays === 0 ? (
          <p className="text-sm text-fg-4 text-center py-8">Nothing logged in this range yet.</p>
        ) : (
          <CaloriesChart buckets={buckets} goal={goal?.calories ?? null} />
        )}
      </div>

      {goal && avg && <MacroAverages avg={avg} goal={goal} caption={caption} />}

      <WeighInCard weighIns={weighIns} targetWeight={goal?.target_weight_lb ?? null} onSaved={loadWeighIns} />
    </div>
  )
}
