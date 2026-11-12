'use client'
import { useState } from 'react'
import { NutritionGoal } from '@/types'
import { GoalResult, MacroSplit, QuizInput, computeGoalFromQuiz } from '@/lib/nutrition'
import GoalQuiz from './GoalQuiz'
import GoalEditor from './GoalEditor'
import GoalSummaryCard from './GoalSummaryCard'
import { showWeight, useUnits, weightUnit } from '@/lib/units'

interface Props {
  goal: NutritionGoal | null
  onSaved: (goal: NutritionGoal) => void
  notify: (msg: string, kind?: 'success' | 'error') => void
}

export default function GoalsView({ goal, onSaved, notify }: Props) {
  const [retaking, setRetaking] = useState(false)
  const u = useUnits()
  const hasQuiz = !!goal?.quiz_completed_at

  const put = async (payload: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/nutrition/goals', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { notify(data.error ?? "Couldn't save. Try again.", 'error'); return false }
      onSaved(data)
      return true
    } catch {
      notify("Couldn't save. Try again.", 'error')
      return false
    }
  }

  const saveQuiz = async (input: QuizInput, result: GoalResult) => {
    if (!(await put({ mode: 'percentage', calories: result.calories, ...result.split, ...input }))) return false
    setRetaking(false)
    notify('Goal saved')
    return true
  }

  const saveEditor = async (payload: { calories: number } & MacroSplit) => {
    if (!(await put({ mode: 'percentage', ...payload }))) return false
    notify('Goal updated')
    return true
  }

  const recalc = () => {
    if (!goal?.goal_type || !goal.activity_level || !goal.current_weight_lb || !goal.target_weight_lb) return
    const input: QuizInput = {
      goal_type: goal.goal_type, activity_level: goal.activity_level,
      current_weight_lb: Number(goal.current_weight_lb), target_weight_lb: Number(goal.target_weight_lb),
      height_in: goal.height_in ? Number(goal.height_in) : null,
      age: goal.age ? Number(goal.age) : null,
      sex: goal.sex ?? null,
      protein_level: goal.protein_level ?? null,
    }
    return saveQuiz(input, computeGoalFromQuiz(input))
  }

  if (!hasQuiz || retaking) {
    return (
      <div className="space-y-4">
        <GoalQuiz
          initial={goal ? {
            goal_type: goal.goal_type ?? undefined, activity_level: goal.activity_level ?? undefined,
            current_weight_lb: goal.current_weight_lb ?? undefined, target_weight_lb: goal.target_weight_lb ?? undefined,
            height_in: goal.height_in ? Number(goal.height_in) : undefined, age: goal.age ? Number(goal.age) : undefined,
            sex: goal.sex ?? undefined, protein_level: goal.protein_level ?? undefined,
          } : undefined}
          onSave={saveQuiz}
          onCancel={hasQuiz ? () => setRetaking(false) : undefined}
        />
        {!hasQuiz && goal && (
          <p className="text-xs text-fg-4 text-center">Your current goal: {goal.calories} kcal · {goal.protein_g}P / {goal.carbs_g}C / {goal.fat_g}F. The quiz will replace it.</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <GoalSummaryCard goal={goal!} onRetake={() => setRetaking(true)} />
      <GoalEditor goal={goal!} onSave={saveEditor} />
      <button type="button" onClick={recalc} className="btn-ghost w-full text-xs">
        Recalculate from my latest weight ({showWeight(Number(goal!.current_weight_lb), u)} {weightUnit(u)})
      </button>
    </div>
  )
}
