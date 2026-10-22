import { NutritionGoal } from '@/types'
import MacroBar from '@/components/nutrition/MacroBar'

interface Totals {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export default function MacroBars({ totals, goal, title }: { totals: Totals; goal: NutritionGoal; title?: string }) {
  return (
    <div className="card p-5">
      {title && <h3 className="font-semibold text-fg-1 mb-3 text-sm">{title}</h3>}
      <div className="space-y-3">
        <MacroBar label="Calories" current={totals.calories} goal={goal.calories} unit="kcal" colorClass="bg-cta" />
        <MacroBar label="Protein" current={totals.protein} goal={goal.protein_g} unit="g" colorClass="bg-chart-2" />
        <MacroBar label="Carbs" current={totals.carbs} goal={goal.carbs_g} unit="g" colorClass="bg-chart-4" />
        <MacroBar label="Fat" current={totals.fat} goal={goal.fat_g} unit="g" colorClass="bg-chart-5" />
      </div>
    </div>
  )
}
