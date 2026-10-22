import { NutritionGoal } from '@/types'
import { Totals } from '@/lib/nutrition'
import MacroBar from './MacroBar'

export default function DailySummary({ totals, goal, onSetGoal }: { totals: Totals; goal: NutritionGoal | null; onSetGoal: () => void }) {
  const target = goal?.calories ?? 2000
  const remaining = target - totals.calories
  const pct = Math.min(1, totals.calories / target)
  const r = 44
  const c = 2 * Math.PI * r

  return (
    <div className="card p-5">
      <div className="flex items-center gap-5">
        <div className="relative w-28 h-28 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(var(--surface-3))" strokeWidth="8" />
            <circle
              cx="50" cy="50" r={r} fill="none"
              stroke={remaining < 0 ? 'var(--chart-5)' : 'var(--cta)'}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
            <span className="text-2xl font-bold text-fg-1 tabular-nums">{Math.abs(Math.round(remaining))}</span>
            <span className="text-[10px] uppercase tracking-wider text-fg-4 mt-1">{remaining < 0 ? 'over' : 'left'}</span>
          </div>
        </div>
        <div className="flex-1 space-y-3 min-w-0">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-fg-3">{Math.round(totals.calories)} eaten</span>
            {goal?.quiz_completed_at ? (
              <span className="text-fg-4">goal {target}</span>
            ) : (
              <button type="button" onClick={onSetGoal} className="text-cta hover:underline">Set a goal →</button>
            )}
          </div>
          <MacroBar label="Protein" current={totals.protein} goal={goal?.protein_g ?? 150} unit="g" colorClass="bg-chart-2" compact />
          <MacroBar label="Carbs" current={totals.carbs} goal={goal?.carbs_g ?? 250} unit="g" colorClass="bg-chart-4" compact />
          <MacroBar label="Fat" current={totals.fat} goal={goal?.fat_g ?? 65} unit="g" colorClass="bg-chart-5" compact />
        </div>
      </div>
    </div>
  )
}
