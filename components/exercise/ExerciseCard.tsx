'use client'
import { useState } from 'react'
import SetRow, { setFields } from './SetRow'
import { format, parseISO } from 'date-fns'
import { emptySet, type DraftExercise, type DraftSet } from '@/lib/workout-draft'

export interface LastSets {
  date: string
  workout_log_id: string | null
  sets: { set_number: number; reps: number | null; weight: number | null; rpe: number | null }[]
  best?: number
  bestSet?: { weight: number; reps: number; date: string } | null
}

interface Props {
  exercise: DraftExercise
  last?: LastSets | null
  onChange: (next: DraftExercise) => void
  onRemove: () => void
  onSetDone: () => void
  onViewProgress: () => void
}

function summarizeLast(last: LastSets, measure: DraftExercise['measure']): string {
  const f = setFields(measure)
  const sets = last.sets
  if (sets.length === 0) return ''
  const reps = sets.map(s => s.reps ?? 0)
  const weights = sets.map(s => s.weight ?? 0)
  const sameReps = reps.every(r => r === reps[0])
  const sameW = weights.every(w => w === weights[0])
  const repsPart = f.reps ? (sameReps ? `${sets.length}×${reps[0]}` : `${sets.length}× ${reps.join('/')}`) : `${sets.length} sets`
  const wPart = f.weight && weights.some(w => w > 0) ? ` @ ${sameW ? weights[0] : weights.join('/')} ${f.weight === 'in' ? 'in' : 'lb'}` : ''
  return `${repsPart}${wPart}`
}

export default function ExerciseCard({ exercise, last, onChange, onRemove, onSetDone, onViewProgress }: Props) {
  const [more, setMore] = useState(false)
  const fields = setFields(exercise.measure)

  const updateSet = (idx: number, next: DraftSet) => {
    const wasDone = exercise.sets[idx].done
    onChange({ ...exercise, sets: exercise.sets.map((s, i) => (i === idx ? next : s)) })
    if (!wasDone && next.done) onSetDone()
  }
  const addSet = () => {
    const prev = exercise.sets[exercise.sets.length - 1]
    onChange({ ...exercise, sets: [...exercise.sets, { ...emptySet(exercise.sets.length + 1, prev?.targetReps ?? null), weight: prev?.weight ?? '' }] })
  }
  const removeSet = (idx: number) => {
    if (exercise.sets.length === 1) return
    onChange({ ...exercise, sets: exercise.sets.filter((_, i) => i !== idx).map((s, i) => ({ ...s, setNumber: i + 1 })) })
  }
  const copyLast = () => {
    if (!last || last.sets.length === 0) return
    onChange({
      ...exercise,
      sets: exercise.sets.map((s, i) => {
        const src = last.sets[Math.min(i, last.sets.length - 1)]
        if (s.done) return s
        return { ...s, weight: src.weight != null && fields.weight ? String(src.weight) : s.weight }
      }),
    })
  }

  const lastLine = last && last.sets.length > 0 ? summarizeLast(last, exercise.measure) : null
  const bestSet = last?.bestSet ?? null
  const bestDate = bestSet?.date ? ` (${format(parseISO(bestSet.date), 'MMM d')})` : ''
  const bestLine =
    exercise.measure === 'weight_reps' && bestSet && bestSet.weight > 0
      ? `${bestSet.weight} lb × ${bestSet.reps}${bestDate}${last?.best ? ` · est. 1RM ${last.best} lb` : ''}`
      : exercise.measure === 'reps' && bestSet && bestSet.reps > 0
        ? `${bestSet.reps} reps${bestDate}`
        : last?.best
          ? `${last.best}${exercise.measure === 'distance_in' ? ' in' : ''}`
          : null
  const beatingBest = !!bestSet && exercise.sets.some(s => {
    if (!s.done) return false
    const w = Number(s.weight) || 0
    const r = Number(s.reps) || 0
    if (exercise.measure === 'weight_reps') return w > bestSet.weight || (w === bestSet.weight && r > bestSet.reps)
    if (exercise.measure === 'reps') return r > bestSet.reps
    return false
  })
  const lastWeightFor = (i: number) => (last?.sets.length ? last.sets[Math.min(i, last.sets.length - 1)].weight : null)

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <button type="button" onClick={onViewProgress} className="text-left">
            <p className="font-semibold text-fg-1 truncate">{exercise.name}</p>
          </button>
          {lastLine ? (
            <button type="button" onClick={copyLast} className="text-xs text-fg-4 hover:text-fg-2 text-left">
              Last time: <span className="text-fg-2 tabular-nums">{lastLine}</span>
              {fields.weight && <span className="text-cta"> · tap to copy</span>}
            </button>
          ) : (
            <p className="text-xs text-fg-4">First time logging this</p>
          )}
          {bestLine ? (
            <p className="text-[11px] text-fg-4">
              Best: <span className="text-fg-2 tabular-nums">{bestLine}</span>
              {beatingBest && <span className="text-cta font-medium"> · New best ↑</span>}
            </p>
          ) : null}
        </div>
        <button type="button" onClick={onRemove} aria-label="Remove exercise" className="btn-ghost px-2 -mr-2 shrink-0">✕</button>
      </div>

      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-fg-4">
        <span className="w-6 text-center">Set</span>
        <span className="flex-1 text-center">{fields.reps ?? ''}</span>
        <span className="flex-1 text-center">{fields.weight ?? ''}</span>
        <span className="w-11 text-center">Done</span>
      </div>

      <div className="space-y-2">
        {exercise.sets.map((s, i) => (
          <SetRow
            key={i}
            set={s}
            measure={exercise.measure}
            lastWeight={lastWeightFor(i)}
            onChange={next => updateSet(i, next)}
            onRemove={exercise.sets.length > 1 ? () => removeSet(i) : undefined}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={addSet} className="text-sm text-cta font-medium min-h-[44px] px-1">+ Add set</button>
        <button type="button" onClick={() => setMore(m => !m)} className="text-xs text-fg-4 hover:text-fg-2 min-h-[44px] px-1">
          {more ? 'Less' : 'More'}
        </button>
      </div>

      {more && (
        <div className="space-y-2 pt-1 border-t border-edge-muted">
          <div>
            <p className="text-[11px] text-fg-4 mb-1">RPE per set (1–10)</p>
            <div className="flex flex-wrap gap-1.5">
              {exercise.sets.map((s, i) => (
                <select key={i} value={s.rpe} onChange={e => updateSet(i, { ...s, rpe: e.target.value })}
                  aria-label={`Set ${s.setNumber} RPE`}
                  className="bg-surface-2 border border-edge rounded-lg px-1.5 py-1.5 text-xs text-fg-1 min-h-[40px]">
                  <option value="">S{s.setNumber}</option>
                  {[6, 7, 8, 9, 10].map(n => <option key={n} value={n}>S{s.setNumber} · {n}</option>)}
                </select>
              ))}
            </div>
          </div>
          <input
            value={exercise.notes}
            onChange={e => onChange({ ...exercise, notes: e.target.value })}
            placeholder="Notes for this exercise"
            className="input-field"
          />
          <button type="button" onClick={onViewProgress} className="text-xs text-cta font-medium">View progress →</button>
        </div>
      )}
    </div>
  )
}
