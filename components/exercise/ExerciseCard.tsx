'use client'
import { useState } from 'react'
import SetRow, { setFields } from './SetRow'
import { format, parseISO } from 'date-fns'
import { emptySet, type DraftExercise, type DraftSet } from '@/lib/workout-draft'
import { DISTANCE_UNITS, formatPace, formatTime, isPaceUnit, paceSec, parseTime } from '@/lib/running'
import type { DistanceUnit } from '@/types/exercise'

export interface LastSets {
  date: string
  workout_log_id: string | null
  sets: { set_number: number; reps: number | null; weight: number | null; rpe: number | null; distance?: number | null; distance_unit?: DistanceUnit | null; duration_sec?: number | null }[]
  best?: number
  bestSet?: { weight: number; reps: number; date: string } | null
  bestSplit?: { distance: number; unit: DistanceUnit; sec: number; date: string } | null
}

interface Props {
  exercise: DraftExercise
  last?: LastSets | null
  onChange: (next: DraftExercise) => void
  onRemove: () => void
  onSetDone: (restSec?: number | null) => void
  onViewProgress: () => void
}

function summarizeLast(last: LastSets, exercise: DraftExercise): string {
  const f = setFields(exercise.measure, exercise.unit)
  const sets = last.sets
  if (sets.length === 0) return ''
  if (exercise.measure === 'distance_time') {
    const dists = sets.map(s => s.distance ?? 0)
    const unit = sets.find(s => s.distance_unit)?.distance_unit ?? exercise.unit ?? 'yd'
    const sameD = dists.every(d => d === dists[0])
    const times = sets.map(s => s.duration_sec).filter((t): t is number => t != null && t > 0)
    const distPart = sameD ? `${sets.length} × ${dists[0]} ${unit}` : `${sets.length} × ${dists.join('/')} ${unit}`
    if (times.length === 0) return distPart
    if (isPaceUnit(unit)) {
      const totalD = dists.reduce((a, b) => a + b, 0)
      const totalT = sets.reduce((a, s) => a + (s.duration_sec ?? 0), 0)
      return `${distPart} · ${formatPace(paceSec(totalD, totalT), unit)}`
    }
    return `${distPart} · best ${formatTime(Math.min(...times))}s`
  }
  const reps = sets.map(s => s.reps ?? 0)
  const weights = sets.map(s => s.weight ?? 0)
  const sameReps = reps.every(r => r === reps[0])
  const sameW = weights.every(w => w === weights[0])
  const repsPart = f.reps ? (sameReps ? `${sets.length}×${reps[0]}` : `${sets.length}× ${reps.join('/')}`) : `${sets.length} sets`
  const wPart = f.weight && weights.some(w => w > 0) ? ` @ ${sameW ? weights[0] : weights.join('/')} ${f.weight === 'in' ? 'in' : 'lb'}` : ''
  return `${repsPart}${wPart}`
}

// Running total for the sets checked so far: pace for runs, fastest split for sprints.
function liveLine(exercise: DraftExercise): string | null {
  if (exercise.measure !== 'distance_time' || !exercise.unit) return null
  const done = exercise.sets.filter(s => s.done)
  const pairs = done.map(s => ({ d: parseFloat(s.distance), t: parseTime(s.time) })).filter(p => p.d > 0 && p.t != null && p.t > 0)
  if (pairs.length === 0) return null
  if (isPaceUnit(exercise.unit)) {
    const totalD = pairs.reduce((a, p) => a + p.d, 0)
    const totalT = pairs.reduce((a, p) => a + (p.t as number), 0)
    return `${totalD % 1 ? totalD.toFixed(2) : totalD} ${exercise.unit} in ${formatTime(totalT)} · ${formatPace(paceSec(totalD, totalT), exercise.unit)}`
  }
  const best = Math.min(...pairs.map(p => p.t as number))
  return `Fastest ${formatTime(best)}s · ${pairs.length} rep${pairs.length === 1 ? '' : 's'}`
}

export default function ExerciseCard({ exercise, last, onChange, onRemove, onSetDone, onViewProgress }: Props) {
  const [more, setMore] = useState(false)
  const fields = setFields(exercise.measure, exercise.unit)
  const timed = exercise.measure === 'distance_time'

  const updateSet = (idx: number, next: DraftSet) => {
    const wasDone = exercise.sets[idx].done
    onChange({ ...exercise, sets: exercise.sets.map((s, i) => (i === idx ? next : s)) })
    if (!wasDone && next.done) {
      const rest = timed ? parseInt(next.rest, 10) : NaN
      onSetDone(Number.isFinite(rest) && rest > 0 ? rest : null)
    }
  }
  const addSet = () => {
    const prev = exercise.sets[exercise.sets.length - 1]
    onChange({ ...exercise, sets: [...exercise.sets, { ...emptySet(exercise.sets.length + 1, prev?.targetReps ?? null), weight: prev?.weight ?? '', distance: prev?.distance ?? '', rest: prev?.rest ?? '' }] })
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
        if (timed) return { ...s, distance: src.distance != null ? String(src.distance) : s.distance }
        return { ...s, weight: src.weight != null && fields.weight ? String(src.weight) : s.weight }
      }),
    })
  }
  const setUnit = (unit: DistanceUnit) => onChange({ ...exercise, unit })

  const lastLine = last && last.sets.length > 0 ? summarizeLast(last, exercise) : null
  const bestSet = last?.bestSet ?? null
  const bestDate = bestSet?.date ? ` (${format(parseISO(bestSet.date), 'MMM d')})` : ''
  const split = last?.bestSplit ?? null
  const bestLine = timed
    ? split
      ? `${split.distance} ${split.unit} in ${formatTime(split.sec)}s${split.date ? ` (${format(parseISO(split.date), 'MMM d')})` : ''}`
      : null
    : exercise.measure === 'weight_reps' && bestSet && bestSet.weight > 0
      ? `${bestSet.weight} lb × ${bestSet.reps}${bestDate}${last?.best ? ` · est. 1RM ${last.best} lb` : ''}`
      : exercise.measure === 'reps' && bestSet && bestSet.reps > 0
        ? `${bestSet.reps} reps${bestDate}`
        : last?.best
          ? `${last.best}${exercise.measure === 'distance_in' ? ' in' : ''}`
          : null
  const beatingBest = exercise.sets.some(s => {
    if (!s.done) return false
    if (timed) {
      if (!split || split.unit !== exercise.unit) return false
      const t = parseTime(s.time)
      return parseFloat(s.distance) === split.distance && t != null && t > 0 && t < split.sec
    }
    if (!bestSet) return false
    const w = Number(s.weight) || 0
    const r = Number(s.reps) || 0
    if (exercise.measure === 'weight_reps') return w > bestSet.weight || (w === bestSet.weight && r > bestSet.reps)
    if (exercise.measure === 'reps') return r > bestSet.reps
    return false
  })
  const lastWeightFor = (i: number) => (last?.sets.length ? last.sets[Math.min(i, last.sets.length - 1)].weight : null)
  const lastDistanceFor = (i: number) => (last?.sets.length ? last.sets[Math.min(i, last.sets.length - 1)].distance ?? null : null)
  const live = liveLine(exercise)

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
              {(fields.weight || timed) && <span className="text-cta"> · tap to copy</span>}
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

      {timed && (
        <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Distance unit">
          {DISTANCE_UNITS.map(u => (
            <button
              key={u}
              type="button"
              role="radio"
              aria-checked={exercise.unit === u}
              onClick={() => setUnit(u)}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-medium border transition-colors ${
                exercise.unit === u ? 'bg-cta/15 text-cta border-cta/40' : 'border-edge text-fg-4 hover:text-fg-2'
              }`}
            >
              {u}
            </button>
          ))}
          {live && <span className="ml-auto text-[11px] text-fg-3 tabular-nums text-right">{live}</span>}
        </div>
      )}

      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-fg-4">
        <span className="w-6 text-center">Set</span>
        <span className="flex-1 text-center">{fields.distance ?? fields.reps ?? ''}</span>
        <span className="flex-1 text-center">{fields.time ?? fields.weight ?? ''}</span>
        <span className="w-11 text-center">Done</span>
      </div>

      <div className="space-y-2">
        {exercise.sets.map((s, i) => (
          <SetRow
            key={i}
            set={s}
            measure={exercise.measure}
            unit={exercise.unit}
            lastWeight={lastWeightFor(i)}
            lastDistance={lastDistanceFor(i)}
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
          {timed && (
            <div>
              <p className="text-[11px] text-fg-4 mb-1">Rest after each rep (sec) — starts the rest timer</p>
              <div className="flex flex-wrap gap-1.5">
                {exercise.sets.map((s, i) => (
                  <input key={i} type="number" inputMode="numeric" min="0" value={s.rest}
                    onChange={e => updateSet(i, { ...s, rest: e.target.value })}
                    placeholder={`S${s.setNumber}`}
                    aria-label={`Set ${s.setNumber} rest seconds`}
                    className="w-16 bg-surface-2 border border-edge rounded-lg px-1.5 py-1.5 text-xs text-fg-1 text-center tabular-nums min-h-[40px] placeholder:text-fg-4" />
                ))}
              </div>
            </div>
          )}
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
