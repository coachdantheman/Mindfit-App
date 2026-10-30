'use client'
import type { DraftSet } from '@/lib/workout-draft'
import type { ExerciseMeasure } from '@/types/exercise'

interface Props {
  set: DraftSet
  measure: ExerciseMeasure
  lastWeight?: number | null
  onChange: (next: DraftSet) => void
  onRemove?: () => void
}

const FIELD = 'w-full bg-surface-2 border border-edge rounded-lg px-2 py-2 text-sm text-fg-1 text-center tabular-nums placeholder:text-fg-4 focus:ring-2 focus:ring-cta/50 disabled:opacity-60'

// Which columns a set shows, by how the exercise is measured. Seconds ride
// in `reps`, inches ride in `weight`, so the payload shape never changes.
export function setFields(measure: ExerciseMeasure): { reps?: string; weight?: string } {
  switch (measure) {
    case 'reps': return { reps: 'reps', weight: '+lb' }
    case 'time_sec': return { reps: 'sec' }
    case 'distance_in': return { weight: 'in' }
    default: return { reps: 'reps', weight: 'lb' }
  }
}

function leadingNumber(s: string | null): string {
  const m = (s ?? '').match(/\d+(\.\d+)?/)
  return m ? m[0] : ''
}

export default function SetRow({ set, measure, lastWeight, onChange, onRemove }: Props) {
  const fields = setFields(measure)
  const toggleDone = () => {
    if (set.done) { onChange({ ...set, done: false }); return }
    // Tapping ✓ on an empty row confirms the plan target as performed.
    const reps = set.reps || (fields.reps ? leadingNumber(set.targetReps) : set.reps)
    const weight = set.weight || (fields.weight && lastWeight ? String(lastWeight) : set.weight)
    onChange({ ...set, reps, weight, done: true })
  }

  return (
    <div className={`flex items-center gap-2 ${set.done ? 'opacity-80' : ''}`}>
      <span className="w-6 text-center text-xs text-fg-4 tabular-nums shrink-0">{set.setNumber}</span>
      {fields.reps ? (
        <input
          type="number"
          inputMode="numeric"
          value={set.reps}
          onChange={e => onChange({ ...set, reps: e.target.value })}
          placeholder={set.targetReps || fields.reps}
          aria-label={`Set ${set.setNumber} ${fields.reps}`}
          className={FIELD}
          disabled={set.done}
        />
      ) : <span className="flex-1" />}
      {fields.weight ? (
        <input
          type="number"
          inputMode="decimal"
          step="0.5"
          value={set.weight}
          onChange={e => onChange({ ...set, weight: e.target.value })}
          placeholder={lastWeight ? String(lastWeight) : fields.weight}
          aria-label={`Set ${set.setNumber} ${fields.weight}`}
          className={FIELD}
          disabled={set.done}
        />
      ) : <span className="flex-1" />}
      <button
        type="button"
        onClick={toggleDone}
        aria-pressed={set.done}
        aria-label={set.done ? 'Mark set not done' : 'Mark set done'}
        className={`w-11 h-11 shrink-0 rounded-xl border text-base font-bold transition-colors ${
          set.done ? 'bg-cta text-fg-inverse border-cta' : 'bg-surface-2 text-fg-3 border-edge hover:border-cta/50'
        }`}
      >
        ✓
      </button>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remove set" className="w-8 h-11 shrink-0 text-fg-4 hover:text-red-400 text-sm">✕</button>
      )}
    </div>
  )
}
