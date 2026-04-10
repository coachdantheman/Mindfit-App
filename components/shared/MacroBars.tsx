import { NutritionGoal } from '@/types'

interface Totals {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export default function MacroBars({ totals, goal, title }: { totals: Totals; goal: NutritionGoal; title?: string }) {
  const pct = (c: number, g: number) => Math.min(100, Math.round((c / g) * 100))

  const macros = [
    { label: 'Calories', current: totals.calories, goal: goal.calories, unit: 'kcal', color: 'bg-cta' },
    { label: 'Protein', current: totals.protein, goal: goal.protein_g, unit: 'g', color: 'bg-blue-500' },
    { label: 'Carbs', current: totals.carbs, goal: goal.carbs_g, unit: 'g', color: 'bg-green-500' },
    { label: 'Fat', current: totals.fat, goal: goal.fat_g, unit: 'g', color: 'bg-orange-500' },
  ]

  return (
    <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
      {title && <h3 className="font-semibold text-gray-100 mb-3 text-sm">{title}</h3>}
      <div className="space-y-3">
        {macros.map(m => (
          <div key={m.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">{m.label}</span>
              <span className="text-gray-300 font-medium">{Math.round(m.current)} / {m.goal} {m.unit}</span>
            </div>
            <div className="bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${m.color}`}
                style={{ width: `${pct(m.current, m.goal)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
