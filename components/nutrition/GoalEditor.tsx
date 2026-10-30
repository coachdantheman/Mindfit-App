'use client'
import { useEffect, useState } from 'react'
import { NutritionGoal } from '@/types'
import { CALORIE_CEILING, MacroSplit, macrosFromCalories, splitFromGrams } from '@/lib/nutrition'
import MacroPercentageSlider from './MacroPercentageSlider'

interface Props {
  goal: NutritionGoal
  onSave: (payload: { calories: number } & MacroSplit) => Promise<void>
}

export default function GoalEditor({ goal, onSave }: Props) {
  const [calories, setCalories] = useState(goal.calories)
  const [split, setSplit] = useState<MacroSplit>(() => goal.mode === 'percentage'
    ? { protein_pct: goal.protein_pct, carbs_pct: goal.carbs_pct, fat_pct: goal.fat_pct }
    : splitFromGrams(goal))
  const [showSplit, setShowSplit] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setCalories(goal.calories)
    setSplit(goal.mode === 'percentage'
      ? { protein_pct: goal.protein_pct, carbs_pct: goal.carbs_pct, fat_pct: goal.fat_pct }
      : splitFromGrams(goal))
  }, [goal])

  const grams = macrosFromCalories(calories, split)
  const dirty = calories !== goal.calories || split.protein_pct !== goal.protein_pct || split.carbs_pct !== goal.carbs_pct || split.fat_pct !== goal.fat_pct

  const save = async () => {
    setSaving(true)
    try { await onSave({ calories, ...split }) } finally { setSaving(false) }
  }

  return (
    <div className="card p-5 space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="goal-calories" className="text-xs text-fg-4">Daily calories</label>
          <span className="text-[11px] text-fg-4">macros follow automatically</span>
        </div>
        <div className="flex items-center gap-3">
          <input type="range" aria-label="Daily calories slider" min={1200} max={CALORIE_CEILING} step={50} value={calories} onChange={e => setCalories(parseInt(e.target.value))} className="flex-1 h-2 rounded-full appearance-none bg-surface-3 accent-cta" />
          <input id="goal-calories" type="number" min={1200} max={CALORIE_CEILING} step={50} value={calories} onChange={e => setCalories(Math.max(1200, Math.min(CALORIE_CEILING, parseInt(e.target.value) || 1200)))} className="input-field w-24 text-center tabular-nums" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[['Protein', grams.protein_g, split.protein_pct], ['Carbs', grams.carbs_g, split.carbs_pct], ['Fat', grams.fat_g, split.fat_pct]].map(([l, g, p]) => (
          <div key={l} className="rounded-xl bg-surface-2 py-2">
            <p className="text-lg font-semibold text-fg-1 tabular-nums">{g}g</p>
            <p className="text-[10px] uppercase tracking-wider text-fg-4">{l} · {p}%</p>
          </div>
        ))}
      </div>

      <button type="button" onClick={() => setShowSplit(o => !o)} className="text-xs text-cta hover:underline">{showSplit ? 'Hide split' : 'Adjust the split'}</button>
      {showSplit && <MacroPercentageSlider totalCalories={calories} split={split} onChange={setSplit} />}

      <button type="button" onClick={save} disabled={!dirty || saving} className="btn-primary w-full">{saving ? 'Saving…' : 'Save changes'}</button>
    </div>
  )
}
