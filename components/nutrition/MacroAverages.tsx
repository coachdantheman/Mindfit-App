import { NutritionGoal } from '@/types'
import { Totals } from '@/lib/nutrition'
import MacroBar from './MacroBar'

export default function MacroAverages({ avg, goal, caption }: { avg: Totals; goal: NutritionGoal; caption: string }) {
  const rows = [
    { label: 'Calories', cur: avg.calories, target: goal.calories, unit: 'kcal', color: 'bg-cta' },
    { label: 'Protein', cur: avg.protein, target: goal.protein_g, unit: 'g', color: 'bg-chart-2' },
    { label: 'Carbs', cur: avg.carbs, target: goal.carbs_g, unit: 'g', color: 'bg-chart-4' },
    { label: 'Fat', cur: avg.fat, target: goal.fat_g, unit: 'g', color: 'bg-chart-5' },
  ]
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-fg-1 text-sm">Average vs goal</h3>
        <span className="text-xs text-fg-4">{caption}</span>
      </div>
      <div className="space-y-3">
        {rows.map(r => {
          const diff = r.cur - r.target
          const pct = r.target ? Math.abs(diff) / r.target : 0
          const tone = pct <= 0.1 ? 'text-green-400' : pct <= 0.25 ? 'text-amber-400' : 'text-red-400'
          return (
            <div key={r.label} className="flex items-end gap-3">
              <div className="flex-1"><MacroBar label={r.label} current={r.cur} goal={r.target} unit={r.unit} colorClass={r.color} /></div>
              <span className={`text-xs tabular-nums w-14 text-right ${tone}`}>{diff > 0 ? '+' : ''}{Math.round(diff)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
