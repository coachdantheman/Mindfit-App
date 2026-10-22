'use client'
import { useState } from 'react'
import { ActivityLevel, GoalResult, GoalType, QuizInput, computeGoalFromQuiz } from '@/lib/nutrition'

interface Props {
  initial?: Partial<QuizInput>
  onSave: (input: QuizInput, result: GoalResult) => Promise<void>
  onCancel?: () => void
}

const GOALS: { key: GoalType; title: string; desc: string }[] = [
  { key: 'gain', title: 'Build muscle', desc: 'Add size and strength with a moderate surplus.' },
  { key: 'maintain', title: 'Maintain', desc: 'Fuel training and recovery at your current weight.' },
  { key: 'lose', title: 'Lean out', desc: 'Drop body fat slowly while keeping strength.' },
]
const ACTIVITY: { key: ActivityLevel; title: string; desc: string }[] = [
  { key: 'light', title: 'Light', desc: 'Off-season or 1–2 easy sessions a week.' },
  { key: 'moderate', title: 'Moderate', desc: 'Practice most days, one sport in season.' },
  { key: 'high', title: 'High', desc: 'Two-a-days, multiple sports, or heavy lifting plus practice.' },
]

export default function GoalQuiz({ initial, onSave, onCancel }: Props) {
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState<GoalType | undefined>(initial?.goal_type)
  const [activity, setActivity] = useState<ActivityLevel | undefined>(initial?.activity_level)
  const [current, setCurrent] = useState(initial?.current_weight_lb ? String(initial.current_weight_lb) : '')
  const [target, setTarget] = useState(initial?.target_weight_lb ? String(initial.target_weight_lb) : '')
  const [saving, setSaving] = useState(false)

  const cur = parseFloat(current)
  const tgt = parseFloat(target)
  const canNext = [!!goal, !!activity, cur >= 50 && cur <= 500, tgt >= 50 && tgt <= 500][step]
  const input: QuizInput | null = goal && activity && canNext && step === 3
    ? { goal_type: goal, activity_level: activity, current_weight_lb: cur, target_weight_lb: tgt }
    : null
  const result = input ? computeGoalFromQuiz(input) : null

  const save = async () => {
    if (!input || !result) return
    setSaving(true)
    try { await onSave(input, result) } finally { setSaving(false) }
  }

  const Card = ({ active, title, desc, onClick }: { active: boolean; title: string; desc: string; onClick: () => void }) => (
    <button type="button" onClick={onClick} className={`w-full text-left rounded-xl border p-4 transition-colors ${active ? 'border-cta/50 bg-cta/10' : 'border-edge hover:border-fg-4/40'}`}>
      <p className={`text-sm font-semibold ${active ? 'text-cta' : 'text-fg-1'}`}>{title}</p>
      <p className="text-xs text-fg-4 mt-0.5">{desc}</p>
    </button>
  )

  return (
    <div className="card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-fg-4 font-mono">Set your goal</p>
          <h3 className="font-semibold text-fg-1 mt-0.5">
            {['What are you training for?', 'How active are you right now?', 'What do you weigh?', 'Where do you want to be?'][step]}
          </h3>
        </div>
        <div className="flex gap-1">{[0, 1, 2, 3].map(i => <span key={i} className={`w-2 h-2 rounded-full ${i <= step ? 'bg-cta' : 'bg-surface-3'}`} />)}</div>
      </div>

      {step === 0 && <div className="space-y-2">{GOALS.map(g => <Card key={g.key} active={goal === g.key} title={g.title} desc={g.desc} onClick={() => setGoal(g.key)} />)}</div>}
      {step === 1 && <div className="space-y-2">{ACTIVITY.map(a => <Card key={a.key} active={activity === a.key} title={a.title} desc={a.desc} onClick={() => setActivity(a.key)} />)}</div>}
      {step === 2 && (
        <div className="flex items-center gap-3">
          <input autoFocus type="number" inputMode="decimal" min="50" max="500" className="input-field text-2xl text-center tabular-nums" placeholder="150" value={current} onChange={e => setCurrent(e.target.value)} />
          <span className="text-fg-3">lb</span>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input autoFocus type="number" inputMode="decimal" min="50" max="500" className="input-field text-2xl text-center tabular-nums" placeholder={current || '150'} value={target} onChange={e => setTarget(e.target.value)} />
            <span className="text-fg-3">lb</span>
          </div>
          {goal === 'maintain' && !target && (
            <button type="button" onClick={() => setTarget(current)} className="text-xs text-cta hover:underline">Same as now</button>
          )}
          {result && (
            <div className="rounded-xl border border-cta/30 bg-cta/5 p-4">
              <p className="text-[11px] uppercase tracking-wider text-fg-4 font-mono">Your plan</p>
              <p className="text-2xl font-bold text-fg-1 tabular-nums mt-1">{result.calories.toLocaleString()} <span className="text-sm font-medium text-fg-3">kcal/day</span></p>
              <p className="text-sm text-fg-2 mt-1 tabular-nums">{result.grams.protein_g}g protein · {result.grams.carbs_g}g carbs · {result.grams.fat_g}g fat</p>
              {result.weeks_to_target != null && result.weeks_to_target > 0 && (
                <p className="text-xs text-fg-4 mt-1">About {result.weeks_to_target} weeks to {tgt} lb at a healthy pace.</p>
              )}
              {result.warnings.map(w => <p key={w} className="text-xs text-amber-400 mt-2">{w}</p>)}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => step === 0 ? onCancel?.() : setStep(s => s - 1)} className="btn-ghost" disabled={step === 0 && !onCancel}>
          {step === 0 ? (onCancel ? 'Cancel' : '') : 'Back'}
        </button>
        {step < 3 ? (
          <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canNext} className="btn-primary">Next</button>
        ) : (
          <button type="button" onClick={save} disabled={!result || saving} className="btn-primary">{saving ? 'Saving…' : 'Save my goal'}</button>
        )}
      </div>
    </div>
  )
}
