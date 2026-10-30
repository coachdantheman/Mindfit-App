'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import ExerciseCard, { type LastSets } from './ExerciseCard'
import ExercisePicker from './ExercisePicker'
import RestTimer from './RestTimer'
import LiftProgress from './LiftProgress'
import { draftStats, exerciseFromLibrary, type DraftExercise, type WorkoutDraft } from '@/lib/workout-draft'
import type { ExerciseLibraryRow, MuscleGroup } from '@/types/exercise'

interface Props {
  draft: WorkoutDraft
  library: ExerciseLibraryRow[]
  saving: boolean
  onChange: (next: WorkoutDraft) => void
  onFinish: () => void
  onCancel: () => void
  onCreateExercise: (name: string, muscle_group: MuscleGroup) => Promise<ExerciseLibraryRow | null>
}

function useElapsed(startedAt: string): string {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const sec = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

export default function ActiveWorkout({ draft, library, saving, onChange, onFinish, onCancel, onCreateExercise }: Props) {
  const elapsed = useElapsed(draft.startedAt)
  const [picker, setPicker] = useState(false)
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null)
  const [last, setLast] = useState<Record<string, LastSets>>({})
  const [progressFor, setProgressFor] = useState<DraftExercise | null>(null)
  const stats = draftStats(draft)

  const ids = useMemo(() => draft.exercises.map(e => e.exerciseId).filter((v): v is string => !!v), [draft.exercises])
  const names = useMemo(() => draft.exercises.filter(e => !e.exerciseId && e.name.trim()).map(e => e.name.trim()), [draft.exercises])
  const idsKey = ids.join(',')
  const namesKey = names.join(',')

  useEffect(() => {
    if (!idsKey && !namesKey) return
    const missingIds = ids.filter(i => !(i in last))
    const missingNames = names.filter(n => !(n in last))
    if (missingIds.length === 0 && missingNames.length === 0) return
    const qs = new URLSearchParams()
    if (missingIds.length) qs.set('exercise_ids', missingIds.join(','))
    if (missingNames.length) qs.set('names', missingNames.join(','))
    fetch(`/api/exercise/last-sets?${qs}`)
      .then(r => (r.ok ? r.json() : {}))
      .then((data: Record<string, LastSets>) => {
        setLast(prev => {
          const next = { ...prev, ...data }
          for (const k of [...missingIds, ...missingNames]) if (!(k in next)) next[k] = { date: '', workout_log_id: null, sets: [] }
          return next
        })
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, namesKey])

  const updateExercise = (idx: number, next: DraftExercise) =>
    onChange({ ...draft, exercises: draft.exercises.map((e, i) => (i === idx ? next : e)) })
  const removeExercise = (idx: number) => {
    if (draft.exercises[idx].sets.some(s => s.done) && !confirm(`Remove ${draft.exercises[idx].name} and its logged sets?`)) return
    onChange({ ...draft, exercises: draft.exercises.filter((_, i) => i !== idx) })
  }
  const addFromLibrary = (row: ExerciseLibraryRow) => {
    onChange({ ...draft, exercises: [...draft.exercises, exerciseFromLibrary(row)] })
    setPicker(false)
  }
  const onSetDone = useCallback(() => setRestEndsAt(Date.now() + 90_000), [])

  const cancel = () => {
    if (stats.doneSets > 0 && !confirm('Discard this workout? Logged sets will be lost.')) return
    onCancel()
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <input
            value={draft.name}
            onChange={e => onChange({ ...draft, name: e.target.value })}
            placeholder="Workout name"
            aria-label="Workout name"
            className="w-full bg-transparent font-bold text-fg-1 text-lg placeholder:text-fg-4"
          />
          <p className="text-xs text-fg-4 tabular-nums">{draft.categoryName} · {elapsed} · {stats.doneSets}/{stats.totalSets} sets</p>
        </div>
        <button type="button" onClick={cancel} className="btn-ghost shrink-0">Cancel</button>
      </div>

      {draft.exercises.length === 0 && (
        <p className="text-sm text-fg-4 text-center py-6">Add your first exercise to start logging.</p>
      )}

      {draft.exercises.map((ex, i) => (
        <ExerciseCard
          key={ex.key}
          exercise={ex}
          last={last[ex.exerciseId ?? ex.name.trim()] ?? null}
          onChange={next => updateExercise(i, next)}
          onRemove={() => removeExercise(i)}
          onSetDone={onSetDone}
          onViewProgress={() => setProgressFor(ex)}
        />
      ))}

      <button type="button" onClick={() => setPicker(true)} className="btn-secondary w-full">+ Add exercise</button>

      <input
        value={draft.notes}
        onChange={e => onChange({ ...draft, notes: e.target.value })}
        placeholder="Workout notes (optional)"
        className="input-field"
      />

      <button type="button" onClick={onFinish} disabled={saving} className="btn-primary w-full py-3">
        {saving ? 'Saving…' : stats.doneSets === 0 ? 'Finish (no sets logged)' : `Finish workout · ${stats.doneSets} sets`}
      </button>
      <p className="text-[11px] text-fg-4 text-center pb-16">Saved on this device as you go. Only sets marked ✓ are logged.</p>

      <RestTimer endsAt={restEndsAt} onChange={setRestEndsAt} />

      {picker && (
        <ExercisePicker library={library} onPick={addFromLibrary} onCreate={onCreateExercise} onClose={() => setPicker(false)} />
      )}
      {progressFor && (
        <LiftProgress exerciseId={progressFor.exerciseId} name={progressFor.name} onClose={() => setProgressFor(null)} />
      )}
    </div>
  )
}
