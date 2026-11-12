'use client'
import { useEffect, useState } from 'react'
import { ActivityLevel, GoalResult, GoalType, ProteinLevel, QuizInput, Sex, computeGoalFromQuiz } from '@/lib/nutrition'
import SaveButton, { type SaveState } from '@/components/shared/SaveButton'
import { cmToIn, showHeightCm, showWeight, toLb, useUnits, weightUnit } from '@/lib/units'

interface Props {
  initial?: Partial<QuizInput>
  onSave: (input: QuizInput, result: GoalResult) => Promise<boolean>
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
const PROTEIN: { key: ProteinLevel; title: string; gPerLb: number; tail: string }[] = [
  { key: 'standard', title: 'Standard', gPerLb: 0.8, tail: ' of your target weight' },
  { key: 'high', title: 'Higher', gPerLb: 1, tail: '' },
]
const STEP_TITLES = ['What are you training for?', 'How active are you right now?', 'What do you weigh?', 'Where do you want to be?', 'Make it more accurate (optional)']

export default function GoalQuiz({ initial, onSave, onCancel }: Props) {
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState<GoalType | undefined>(initial?.goal_type)
  const [activity, setActivity] = useState<ActivityLevel | undefined>(initial?.activity_level)
  const u = useUnits()
  // Typed strings start null and fall back to the saved value in the athlete's units,
  // so the prefill follows the unit once it is known.
  const [currentIn, setCurrentIn] = useState<string | null>(null)
  const [targetIn, setTargetIn] = useState<string | null>(null)
  const [protein, setProtein] = useState<ProteinLevel>(initial?.protein_level ?? 'standard')
  const initialHeight = initial?.height_in ? Math.round(initial.height_in) : null
  const [feetIn, setFeetIn] = useState<string | null>(null)
  const [inchesIn, setInchesIn] = useState<string | null>(null)
  const [cmIn, setCmIn] = useState<string | null>(null)
  const current = currentIn ?? (initial?.current_weight_lb ? String(showWeight(initial.current_weight_lb, u)) : '')
  const target = targetIn ?? (initial?.target_weight_lb ? String(showWeight(initial.target_weight_lb, u)) : '')
  const feet = feetIn ?? (initialHeight ? String(Math.floor(initialHeight / 12)) : '')
  const inches = inchesIn ?? (initialHeight ? String(initialHeight % 12) : '')
  const cm = cmIn ?? (initialHeight ? String(showHeightCm(initialHeight)) : '')
  const placeholderWeight = u === 'metric' ? '68' : '150'
  const [age, setAge] = useState(initial?.age ? String(initial.age) : '')
  const [sex, setSex] = useState<Sex | undefined>(initial?.sex ?? undefined)
  const [state, setState] = useState<SaveState>('idle')

  useEffect(() => {
    fetch('/api/profile')
      .then(r => (r.ok ? r.json() : null))
      .then(p => {
        if (!p?.birth_year) return
        const now = new Date()
        let years = now.getFullYear() - p.birth_year
        if (p.birth_month && now.getMonth() + 1 < p.birth_month) years -= 1
        if (years >= 10 && years <= 100) setAge(prev => prev || String(years))
      })
      .catch(() => {})
  }, [])

  const cur = toLb(parseFloat(current), u) ?? NaN
  const tgt = toLb(parseFloat(target), u) ?? NaN
  const weightsOk = cur >= 50 && cur <= 500 && tgt >= 50 && tgt <= 500
  const feetN = parseInt(feet, 10)
  const inchesN = parseInt(inches, 10)
  const heightIn = u === 'metric'
    ? cmToIn(parseFloat(cm))
    : Number.isFinite(feetN) && Number.isFinite(inchesN) ? feetN * 12 + inchesN : null
  const ageN = parseInt(age, 10)
  const bodyFull = heightIn != null && heightIn >= 36 && heightIn <= 96 && Number.isFinite(ageN) && ageN >= 10 && ageN <= 100 && !!sex
  const canNext = [!!goal, !!activity, cur >= 50 && cur <= 500, weightsOk][step] ?? false

  // Height, age and sex count only as a full set; otherwise the quiz sends nulls.
  const buildInput = (withBody: boolean): QuizInput | null => {
    if (!goal || !activity || !weightsOk) return null
    const useBody = withBody && bodyFull
    return {
      goal_type: goal,
      activity_level: activity,
      current_weight_lb: cur,
      target_weight_lb: tgt,
      height_in: useBody ? heightIn : null,
      age: useBody ? ageN : null,
      sex: useBody ? sex ?? null : null,
      protein_level: protein,
    }
  }
  const input = buildInput(true)
  const result = input ? computeGoalFromQuiz(input) : null

  const save = async (withBody: boolean) => {
    const toSave = buildInput(withBody)
    if (!toSave) return
    setState('saving')
    const ok = await onSave(toSave, computeGoalFromQuiz(toSave))
    setState(ok ? 'saved' : 'error')
  }

  const Card = ({ active, title, desc, onClick }: { active: boolean; title: string; desc: string; onClick: () => void }) => (
    <button type="button" onClick={onClick} className={`w-full text-left rounded-xl border p-4 transition-colors ${active ? 'border-cta/50 bg-cta/10' : 'border-edge hover:border-fg-4/40'}`}>
      <p className={`text-sm font-semibold ${active ? 'text-cta' : 'text-fg-1'}`}>{title}</p>
      <p className="text-xs text-fg-4 mt-0.5">{desc}</p>
    </button>
  )

  const preview = result && (
    <div className="rounded-xl border border-cta/30 bg-cta/5 p-4">
      <p className="text-xs uppercase tracking-wider text-fg-4 font-mono">Your plan</p>
      <p className="text-2xl font-bold text-fg-1 tabular-nums mt-1">{result.calories.toLocaleString()} <span className="text-sm font-medium text-fg-3">kcal/day</span></p>
      <p className="text-sm text-fg-2 mt-1 tabular-nums">{result.grams.protein_g}g protein · {result.grams.carbs_g}g carbs · {result.grams.fat_g}g fat</p>
      {result.weeks_to_target != null && result.weeks_to_target > 0 && (
        <p className="text-xs text-fg-4 mt-1">About {result.weeks_to_target} weeks to {showWeight(tgt, u)} {weightUnit(u)} at a healthy pace.</p>
      )}
      {result.warnings.map(w => <p key={w} className="text-xs text-amber-400 mt-2">{w}</p>)}
    </div>
  )

  return (
    <div className="card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-fg-4 font-mono">Set your goal</p>
          <h3 className="font-semibold text-fg-1 mt-0.5">{STEP_TITLES[step]}</h3>
        </div>
        <div className="flex gap-1">{[0, 1, 2, 3, 4].map(i => <span key={i} className={`w-2 h-2 rounded-full ${i <= step ? 'bg-cta' : 'bg-surface-3'}`} />)}</div>
      </div>

      {step === 0 && <div className="space-y-2">{GOALS.map(g => <Card key={g.key} active={goal === g.key} title={g.title} desc={g.desc} onClick={() => setGoal(g.key)} />)}</div>}
      {step === 0 && goal === 'lose' && (
        <p className="text-xs text-fg-3">Growing athletes need fuel to perform and recover. Talk with a parent, doctor or athletic trainer before cutting calories.</p>
      )}
      {step === 1 && <div className="space-y-2">{ACTIVITY.map(a => <Card key={a.key} active={activity === a.key} title={a.title} desc={a.desc} onClick={() => setActivity(a.key)} />)}</div>}
      {step === 2 && (
        <div className="flex items-center gap-3">
          <input autoFocus type="number" inputMode="decimal" min={u === 'metric' ? '23' : '50'} max={u === 'metric' ? '227' : '500'} className="input-field text-2xl text-center tabular-nums" placeholder={placeholderWeight} value={current} onChange={e => setCurrentIn(e.target.value)} />
          <span className="text-fg-3">{weightUnit(u)}</span>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input autoFocus type="number" inputMode="decimal" min={u === 'metric' ? '23' : '50'} max={u === 'metric' ? '227' : '500'} className="input-field text-2xl text-center tabular-nums" placeholder={current || placeholderWeight} value={target} onChange={e => setTargetIn(e.target.value)} />
            <span className="text-fg-3">{weightUnit(u)}</span>
          </div>
          {goal === 'maintain' && !target && (
            <button type="button" onClick={() => setTargetIn(current)} className="text-xs text-cta hover:underline">Same as now</button>
          )}
          <div className="space-y-2">
            <p className="text-sm text-fg-2">Protein target</p>
            {PROTEIN.map(p => <Card key={p.key} active={protein === p.key} title={p.title} desc={`${u === 'metric' ? `${(p.gPerLb * 2.20462).toFixed(1)} g per kg` : `${p.gPerLb} g per lb`}${p.tail}`} onClick={() => setProtein(p.key)} />)}
          </div>
        </div>
      )}
      {step === 4 && (
        <div className="space-y-5">
          <p className="text-xs text-fg-3">Optional. Skip this and your plan still works.</p>
          <div>
            <p className="text-sm text-fg-2 mb-2">Height</p>
            <div className="flex items-center gap-2">
              {u === 'metric' ? (
                <>
                  <input aria-label="Height in centimeters" type="number" inputMode="numeric" min="120" max="240" className="input-field w-32" placeholder="175" value={cm} onChange={e => setCmIn(e.target.value)} />
                  <span className="text-fg-3">cm</span>
                </>
              ) : (
                <>
                  <select aria-label="Feet" className="input-field w-28" value={feet} onChange={e => setFeetIn(e.target.value)}>
                    <option value="">ft</option>
                    {[3, 4, 5, 6, 7, 8].map(f => <option key={f} value={f}>{f} ft</option>)}
                  </select>
                  <select aria-label="Inches" className="input-field w-28" value={inches} onChange={e => setInchesIn(e.target.value)}>
                    <option value="">in</option>
                    {Array.from({ length: 12 }, (_, i) => i).map(i => <option key={i} value={i}>{i} in</option>)}
                  </select>
                </>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="quiz-age" className="text-sm text-fg-2 mb-2 block">Age</label>
            <input id="quiz-age" type="number" inputMode="numeric" min="10" max="100" className="input-field w-32" placeholder="16" value={age} onChange={e => setAge(e.target.value)} />
          </div>
          <div>
            <p className="text-sm text-fg-2 mb-2">Sex</p>
            <div className="grid grid-cols-2 gap-2">
              {(['male', 'female'] as Sex[]).map(s => (
                <button key={s} type="button" onClick={() => setSex(s)} className={`rounded-xl border p-3 text-sm transition-colors ${sex === s ? 'border-cta/50 bg-cta/10 text-cta' : 'border-edge text-fg-1 hover:border-fg-4/40'}`}>
                  {s === 'male' ? 'Male' : 'Female'}
                </button>
              ))}
            </div>
            <p className="text-xs text-fg-4 mt-2">Only used for the calorie math.</p>
          </div>
        </div>
      )}

      {step >= 3 && preview}

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => step === 0 ? onCancel?.() : setStep(s => s - 1)} className="btn-ghost" disabled={step === 0 && !onCancel}>
          {step === 0 ? (onCancel ? 'Cancel' : '') : 'Back'}
        </button>
        {step < 4 ? (
          <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canNext} className="btn-primary">Next</button>
        ) : (
          <div className="flex items-center gap-3">
            {!bodyFull && <button type="button" onClick={() => save(false)} disabled={!result || state === 'saving'} className="btn-ghost text-xs">Skip</button>}
            <SaveButton type="button" onClick={() => save(true)} state={state} idleLabel="Save my goal" disabled={!result} className="!w-auto" />
          </div>
        )}
      </div>
    </div>
  )
}
