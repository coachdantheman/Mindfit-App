'use client'
import { useState } from 'react'
import { NutritionGoal } from '@/types'
import { ACTIVITY_FACTOR, ACTIVITY_MULTIPLIER, CALORIE_FLOOR, FAT_PCT, PROTEIN_PER_LB, GoalType, ActivityLevel, ProteinLevel, restingCalories } from '@/lib/nutrition'
import { showWeight, useUnits, weightUnit } from '@/lib/units'

const GOAL_LABEL: Record<GoalType, string> = { gain: 'Build muscle', lose: 'Lean out', maintain: 'Maintain' }
const ACTIVITY_LABEL: Record<ActivityLevel, string> = { light: 'light', moderate: 'moderate', high: 'high' }

export default function GoalSummaryCard({ goal, onRetake }: { goal: NutritionGoal; onRetake: () => void }) {
  const [why, setWhy] = useState(false)
  const u = useUnits()
  const gt = goal.goal_type as GoalType | null
  const al = goal.activity_level as ActivityLevel | null
  const w = goal.current_weight_lb ? Number(goal.current_weight_lb) : null
  const protein: ProteinLevel = goal.protein_level ?? 'standard'
  const perWeight = u === 'metric' ? `${(PROTEIN_PER_LB[protein] * 2.20462).toFixed(1)} g per kg` : `${PROTEIN_PER_LB[protein]} g per lb`
  const body = goal.height_in && goal.age && goal.sex ? { height_in: Number(goal.height_in), age: Number(goal.age), sex: goal.sex } : null
  const maintenance = w && al
    ? Math.round(body ? restingCalories(w, body.height_in, body.age, body.sex) * ACTIVITY_FACTOR[al] : w * ACTIVITY_MULTIPLIER[al])
    : null

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-fg-4 font-mono">Your daily plan</p>
          <p className="text-3xl font-bold text-fg-1 tabular-nums mt-1">{goal.calories.toLocaleString()} <span className="text-base font-medium text-fg-3">kcal</span></p>
          {gt && (
            <p className="text-xs text-fg-4 mt-1">
              {GOAL_LABEL[gt]}{w ? ` · ${showWeight(w, u)} ${weightUnit(u)}` : ''}{goal.target_weight_lb && gt !== 'maintain' ? ` → ${showWeight(Number(goal.target_weight_lb), u)} ${weightUnit(u)}` : ''}
            </p>
          )}
        </div>
        <button type="button" onClick={onRetake} className="btn-ghost text-xs">Retake quiz</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Protein', v: goal.protein_g, color: 'border-chart-2/40 text-chart-2' },
          { label: 'Carbs', v: goal.carbs_g, color: 'border-chart-4/40 text-chart-4' },
          { label: 'Fat', v: goal.fat_g, color: 'border-chart-5/40 text-chart-5' },
        ].map(m => (
          <div key={m.label} className={`rounded-xl border ${m.color} bg-surface-2/40 py-2 text-center`}>
            <p className="text-lg font-semibold tabular-nums">{m.v}g</p>
            <p className="text-xs uppercase tracking-wider text-fg-4">{m.label}</p>
          </div>
        ))}
      </div>
      {gt && al && w && maintenance && (
        <div>
          <button type="button" onClick={() => setWhy(o => !o)} className="text-xs text-cta hover:underline">
            {why ? 'Hide' : 'Why these numbers?'}
          </button>
          {why && (
            <ul className="mt-2 text-xs text-fg-3 space-y-1.5 list-disc pl-4">
              <li>Calories are {body ? 'based on your height, age, weight and training' : 'based on your weight and training'}. Maintenance ≈ {maintenance.toLocaleString()} kcal at {ACTIVITY_LABEL[al]} activity.</li>
              <li>{gt === 'maintain' ? 'Maintain: no surplus or deficit.' : gt === 'gain' ? 'Build muscle: a moderate +350 kcal surplus (enough to grow, not enough to add much fat).' : `Lean out: a −400 kcal deficit, never below ${CALORIE_FLOOR.toLocaleString()} kcal. Growing athletes should not cut harder than this.`}</li>
              <li>{goal.protein_level ? `Protein ${perWeight} of your ${gt === 'maintain' ? 'current' : 'target'} weight.` :`Protein ${Math.round(Number(goal.protein_g))} g a day.`}</li>
              <li>Fat ≈ {FAT_PCT}% of calories for hormones and recovery; carbs fill the rest to fuel practice and games.</li>
              <li>Weight-class or appearance sport? Talk this through with a parent or coach before cutting.</li>
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
