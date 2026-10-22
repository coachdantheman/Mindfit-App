'use client'
import { useState } from 'react'
import { NutritionGoal } from '@/types'
import { GoalResult, MacroSplit, QuizInput, computeGoalFromQuiz } from '@/lib/nutrition'
import GoalQuiz from './GoalQuiz'
import GoalEditor from './GoalEditor'
import GoalSummaryCard from './GoalSummaryCard'

interface Props {
  goal: NutritionGoal | null
  onSaved: (goal: NutritionGoal) => void
  notify: (msg: string) => void
}

export default function GoalsView({ goal, onSaved, notify }: Props) {
  const [retaking, setRetaking] = useState(false)
  const hasQuiz = !!goal?.quiz_completed_at

  const put = async (payload: Record<string, unknown>) => {
    const res = await fetch('/api/nutrition/goals', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json()
    if (!res.ok) { notify(data.error ?? 'Could not save.'); return }
    onSaved(data)
  }

  const saveQuiz = async (input: QuizInput, result: GoalResult) => {
    await put({ mode: 'percentage', calories: result.calories, ...result.split, ...input })
    setRetaking(false)
    notify('Goal saved')
  }

  const saveEditor = async (payload: { calories: number } & MacroSplit) => {
    await put({ mode: 'percentage', ...payload })
    notify('Goal updated')
  }

  const recalc = () => {
    if (!goal?.goal_type || !goal.activity_level || !goal.current_weight_lb || !goal.target_weight_lb) return
    const input: QuizInput = {
      goal_type: goal.goal_type, activity_level: goal.activity_level,
      current_weight_lb: Number(goal.current_weight_lb), target_weight_lb: Number(goal.target_weight_lb),
    }
    return saveQuiz(input, computeGoalFromQuiz(input))
  }

  if (!hasQuiz || retaking) {
    return (
      <div className="space-y-4">
        <GoalQuiz
          initial={goal ? { goal_type: goal.goal_type ?? undefined, activity_level: goal.activity_level ?? undefined, current_weight_lb: goal.current_weight_lb ?? undefined, target_weight_lb: goal.target_weight_lb ?? undefined } : undefined}
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
        Recalculate from my latest weight ({Number(goal!.current_weight_lb)} lb)
      </button>
    </div>
  )
}
