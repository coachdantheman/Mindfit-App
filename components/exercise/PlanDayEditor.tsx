'use client'
import { useState } from 'react'
import ExercisePicker from './ExercisePicker'
import { DAY_NAMES, DAY_NAMES_LONG, type DayTemplate, type PlanBlockInput } from '@/lib/programs'
import type { WorkoutExercise } from '@/types'
import type { ExerciseLibraryRow, MuscleGroup } from '@/types/exercise'

interface Props {
  blocks: PlanBlockInput[]
  templates: DayTemplate[][]          // one week template per block
  onChange: (next: DayTemplate[][]) => void
  library: ExerciseLibraryRow[]
  onCreateExercise: (name: string, muscle_group: MuscleGroup) => Promise<ExerciseLibraryRow | null>
}

const NUM = 'w-12 bg-surface-2 border border-edge rounded-lg px-1 py-2 text-sm text-fg-1 text-center tabular-nums focus:ring-2 focus:ring-cta/50'

// Per-day template for one block: pick a day, name it, add exercises with
// sets × reps targets. Every week of the block gets the same template.
export default function PlanDayEditor({ blocks, templates, onChange, library, onCreateExercise }: Props) {
  const [bi, setBi] = useState(0)
  const [day, setDay] = useState(() => templates[0]?.[0]?.day_of_week ?? 1)
  const [picker, setPicker] = useState(false)

  const days = templates[bi] ?? []
  const current = days.find(d => d.day_of_week === day) ?? null

  const setDays = (next: DayTemplate[]) => onChange(templates.map((t, i) => (i === bi ? next : t)))
  const upsertDay = (patch: Partial<DayTemplate>) => {
    const existing = current ?? { day_of_week: day, name: '', description: '', exercises: [] }
    const next = { ...existing, ...patch }
    setDays(current ? days.map(d => (d.day_of_week === day ? next : d)) : [...days, next].sort((a, b) => a.day_of_week - b.day_of_week))
  }
  const updateExercise = (ei: number, patch: Partial<WorkoutExercise>) => {
    if (!current) return
    upsertDay({ exercises: current.exercises.map((ex, i) => (i === ei ? { ...ex, ...patch } : ex)) })
  }
  const removeExercise = (ei: number) => {
    if (!current) return
    upsertDay({ exercises: current.exercises.filter((_, i) => i !== ei) })
  }
  const addExercise = (row: ExerciseLibraryRow) => {
    const reps = row.measure === 'time_sec' ? '30 sec' : row.measure === 'distance_in' ? '5' : row.measure === 'reps' ? '10' : '8-10'
    upsertDay({ name: current?.name || defaultName(row), exercises: [...(current?.exercises ?? []), { name: row.name, sets: 3, reps, notes: '' }] })
    setPicker(false)
  }
  const clearDay = () => setDays(days.filter(d => d.day_of_week !== day))

  return (
    <div className="space-y-4">
      {blocks.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {blocks.map((b, i) => (
            <button key={i} type="button" onClick={() => { setBi(i); setDay(templates[i]?.[0]?.day_of_week ?? 1) }} className={`shrink-0 ${bi === i ? 'tab-btn-active' : 'tab-btn'}`}>
              {b.name} <span className="opacity-70">· wk {b.week_start}–{b.week_end}</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-7 gap-1">
        {[1, 2, 3, 4, 5, 6, 7].map(d => {
          const has = days.some(x => x.day_of_week === d && x.exercises.length > 0)
          const on = day === d
          return (
            <button key={d} type="button" onClick={() => setDay(d)}
              className={`min-h-[52px] rounded-xl border text-xs font-medium flex flex-col items-center justify-center gap-1 ${on ? 'bg-cta/20 text-cta border-cta/30' : 'bg-surface-2 text-fg-3 border-edge'}`}>
              {DAY_NAMES[d]}
              <span className={`w-1.5 h-1.5 rounded-full ${has ? 'bg-cta' : 'bg-transparent'}`} />
            </button>
          )
        })}
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-fg-1">{DAY_NAMES_LONG[day]}</p>
          {current && current.exercises.length > 0 && (
            <button type="button" onClick={clearDay} className="text-xs text-fg-4 hover:text-red-400 min-h-[44px]">Make rest day</button>
          )}
        </div>

        {!current || current.exercises.length === 0 ? (
          <p className="text-sm text-fg-4">Rest day. Add an exercise to make it a training day.</p>
        ) : (
          <>
            <input
              value={current.name}
              onChange={e => upsertDay({ name: e.target.value })}
              placeholder="Workout name (e.g. Lower body)"
              aria-label="Workout name"
              className="input-field"
            />
            <div className="space-y-2">
              {current.exercises.map((ex, ei) => (
                <div key={ei} className="bg-surface-2/50 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <input value={ex.name} onChange={e => updateExercise(ei, { name: e.target.value })} aria-label="Exercise name"
                      className="flex-1 min-w-0 bg-transparent text-sm text-fg-1 font-medium" />
                    <button type="button" onClick={() => removeExercise(ei)} aria-label="Remove exercise" className="btn-ghost px-2">✕</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stepper value={ex.sets} onChange={v => updateExercise(ei, { sets: v })} label="sets" />
                    <span className="text-xs text-fg-4">×</span>
                    <input value={ex.reps} onChange={e => updateExercise(ei, { reps: e.target.value })} placeholder="reps"
                      aria-label="Rep target" className={`${NUM} w-20`} />
                    <input value={ex.notes ?? ''} onChange={e => updateExercise(ei, { notes: e.target.value })} placeholder="Notes"
                      aria-label="Notes" className="flex-1 min-w-0 bg-surface-2 border border-edge rounded-lg px-2 py-2 text-xs text-fg-1 placeholder:text-fg-4 focus:ring-2 focus:ring-cta/50" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <button type="button" onClick={() => setPicker(true)} className="btn-secondary w-full">+ Add exercise</button>
      </div>

      {picker && (
        <ExercisePicker library={library} onPick={addExercise} onCreate={onCreateExercise} onClose={() => setPicker(false)} title={`Add to ${DAY_NAMES_LONG[day]}`} />
      )}
    </div>
  )
}

function defaultName(row: ExerciseLibraryRow): string {
  switch (row.muscle_group) {
    case 'legs': case 'glutes': return 'Lower body'
    case 'chest': case 'shoulders': case 'arms': return 'Upper body push'
    case 'back': return 'Upper body pull'
    case 'conditioning': return 'Conditioning'
    case 'mobility': return 'Mobility'
    default: return 'Workout'
  }
}

function Stepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-1" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} className="w-9 h-9 rounded-lg border border-edge text-fg-2 text-base" aria-label={`Fewer ${label}`}>−</button>
      <span className="w-6 text-center text-sm text-fg-1 tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(20, value + 1))} className="w-9 h-9 rounded-lg border border-edge text-fg-2 text-base" aria-label={`More ${label}`}>+</button>
    </div>
  )
}
