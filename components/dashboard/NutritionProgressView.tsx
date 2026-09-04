'use client'
import { useMemo } from 'react'
import { FoodEntry, NutritionGoal } from '@/types'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import StatCard from '@/components/dashboard/StatCard'

interface Props {
  entries: FoodEntry[]          // last ~30d
  goal: NutritionGoal | null
}

interface DayTotal {
  date: string
  label: string
  calories: number
  protein: number
  carbs: number
  fat: number
  entryCount: number
}

function groupByDay(entries: FoodEntry[]): DayTotal[] {
  const map = new Map<string, DayTotal>()
  for (const e of entries) {
    const cur = map.get(e.entry_date) ?? {
      date: e.entry_date,
      label: format(parseISO(e.entry_date), 'M/d'),
      calories: 0, protein: 0, carbs: 0, fat: 0, entryCount: 0,
    }
    cur.calories += e.calories
    cur.protein  += Number(e.protein_g)
    cur.carbs    += Number(e.carbs_g)
    cur.fat      += Number(e.fat_g)
    cur.entryCount += 1
    map.set(e.entry_date, cur)
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

function fillMissingDays(days: DayTotal[], totalDays: number): DayTotal[] {
  const today = new Date()
  const bins: DayTotal[] = []
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    const iso = d.toISOString().split('T')[0]
    const existing = days.find(x => x.date === iso)
    bins.push(existing ?? {
      date: iso, label: format(d, 'M/d'),
      calories: 0, protein: 0, carbs: 0, fat: 0, entryCount: 0,
    })
  }
  return bins
}

export default function NutritionProgressView({ entries, goal }: Props) {
  const byDay30 = useMemo(() => fillMissingDays(groupByDay(entries), 30), [entries])
  const logged30 = useMemo(() => byDay30.filter(d => d.entryCount > 0), [byDay30])
  const last7 = useMemo(() => byDay30.slice(-7), [byDay30])
  const logged7 = last7.filter(d => d.entryCount > 0)

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-fg-3">
        <p className="font-medium">No nutrition data yet</p>
        <p className="text-sm mt-1">Log food in the Nutrition tab to see your progress.</p>
      </div>
    )
  }

  const avg = (arr: DayTotal[], key: keyof Pick<DayTotal, 'calories' | 'protein' | 'carbs' | 'fat'>) => {
    if (arr.length === 0) return 0
    return Math.round(arr.reduce((a, d) => a + (d[key] as number), 0) / arr.length)
  }

  const avgCal7    = avg(logged7, 'calories')
  const avgProt7   = avg(logged7, 'protein')
  const avgCarb7   = avg(logged7, 'carbs')
  const avgFat7    = avg(logged7, 'fat')
  const avgCal30   = avg(logged30, 'calories')
  const dailyDelta = avgCal7 - avgCal30

  // Goal adherence — % of logged days within ±10% of calorie goal
  let adherencePct: number | null = null
  if (goal && logged30.length > 0) {
    const inRange = logged30.filter(d => {
      const diff = Math.abs(d.calories - goal.calories) / goal.calories
      return diff <= 0.10
    }).length
    adherencePct = Math.round((inRange / logged30.length) * 100)
  }

  // Streak of consecutive logged days (most recent first)
  let loggingStreak = 0
  for (let i = byDay30.length - 1; i >= 0; i--) {
    if (byDay30[i].entryCount > 0) loggingStreak++
    else break
  }

  const chartData = byDay30.map(d => ({
    label: d.label,
    calories: d.calories || null,  // null hides zero bars so gaps read as "not logged"
  }))

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Avg Calories"
          value={avgCal7 || '—'}
          unit={goal ? `/${goal.calories}` : 'kcal'}
          delta={logged30.length > 0 ? {
            value: `${dailyDelta > 0 ? '+' : ''}${dailyDelta}`,
            direction: dailyDelta > 0 ? 'up' : dailyDelta < 0 ? 'down' : 'flat',
          } : undefined}
          sparkline={last7.map(d => d.calories === 0 ? 0 : Math.min(1, d.calories / (goal?.calories || 2000)))}
          color="var(--cta)"
          context="7-day avg · vs 30-day avg"
        />
        <StatCard
          label="Goal Adherence"
          value={adherencePct != null ? adherencePct : '—'}
          unit={adherencePct != null ? '%' : ''}
          color="var(--chart-4)"
          context={goal ? 'Days within ±10% of calorie goal' : 'Set a calorie goal to track'}
        />
        <StatCard
          label="Logging Streak"
          value={loggingStreak}
          unit={loggingStreak === 1 ? 'day' : 'days'}
          color="var(--chart-2)"
          context="Consecutive days logged"
        />
        <StatCard
          label="Days Logged"
          value={logged30.length}
          unit={`/${30}`}
          color="var(--chart-3)"
          context="Last 30 days"
        />
      </div>

      {/* 7-day macro avg vs goal */}
      {goal && logged7.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-fg-1 text-sm">7-Day Macro Averages</h3>
            <span className="text-xs text-fg-4">{logged7.length} of last 7 days logged</span>
          </div>
          <MacroRow label="Calories" current={avgCal7}  target={goal.calories} unit="kcal" color="bg-cta" />
          <MacroRow label="Protein"  current={avgProt7} target={goal.protein_g} unit="g" color="bg-blue-500" />
          <MacroRow label="Carbs"    current={avgCarb7} target={goal.carbs_g}   unit="g" color="bg-green-500" />
          <MacroRow label="Fat"      current={avgFat7}  target={goal.fat_g}     unit="g" color="bg-orange-500" />
        </div>
      )}

      {/* 30-day calorie chart with goal reference line */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-fg-1 text-sm">Calories — Last 30 Days</h3>
          {goal && <span className="text-xs text-fg-4">goal {goal.calories} kcal</span>}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgb(var(--fg-4))' }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: 'rgb(var(--fg-4))' }} />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'rgb(var(--surface))',
                color: 'rgb(var(--fg-1))',
                fontSize: 13,
              }}
              formatter={(v) => v == null ? 'not logged' : `${v} kcal`}
            />
            {goal && (
              <ReferenceLine
                y={goal.calories}
                stroke="var(--cta)"
                strokeDasharray="3 3"
                strokeOpacity={0.6}
              />
            )}
            <Bar dataKey="calories" fill="var(--cta)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent entries across days */}
      <div className="card p-5">
        <h3 className="font-semibold text-fg-1 mb-3 text-sm">Recent Food Log</h3>
        <div className="space-y-2">
          {entries.slice(0, 25).map(e => (
            <div key={e.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-2/30">
              <div>
                <p className="text-sm text-fg-2">{e.food_name}</p>
                <p className="text-xs text-fg-4">
                  {e.meal_name} · {e.calories} cal · {Number(e.protein_g)}p · {Number(e.carbs_g)}c · {Number(e.fat_g)}f
                </p>
              </div>
              <span className="text-xs text-fg-4">{format(parseISO(e.entry_date), 'MMM d')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MacroRow({
  label, current, target, unit, color,
}: { label: string; current: number; target: number; unit: string; color: string }) {
  const pct = Math.min(100, Math.round((current / target) * 100))
  const diff = current - target
  const onTrack = Math.abs(diff) / target <= 0.10
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-fg-3">{label}</span>
        <span className="text-fg-2 font-medium tabular-nums">
          {current} / {target} {unit}
          <span className={`ml-2 text-[10px] ${onTrack ? 'text-green-400' : diff > 0 ? 'text-orange-400' : 'text-red-400'}`}>
            {diff > 0 ? '+' : ''}{diff}
          </span>
        </span>
      </div>
      <div className="bg-surface-3 rounded-full h-2 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
