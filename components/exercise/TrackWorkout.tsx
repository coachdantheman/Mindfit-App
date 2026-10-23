'use client'
import { useCallback, useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import type { CoachWorkout } from '@/types'
import type { ExerciseLibraryRow, ExerciseLogRow, MuscleGroup, StartWorkoutInput, WorkoutLogRow } from '@/types/exercise'
import ActiveWorkout from './ActiveWorkout'
import FinishSummary, { type FinishResult } from './FinishSummary'
import Skeleton from '@/components/shared/Skeleton'
import { clearDraft, draftStats, draftToSessionPayload, saveDraft, type WorkoutDraft } from '@/lib/workout-draft'
import type { DetectedPr } from '@/lib/strength'

interface Props {
  draft: WorkoutDraft | null            // the open workout
  savedDraft: WorkoutDraft | null       // an unfinished workout found on this device
  library: ExerciseLibraryRow[]
  onDraftChange: (d: WorkoutDraft | null) => void
  onResume: () => void
  onDiscardSaved: () => void
  onStart: (input: StartWorkoutInput) => void
  onCreateExercise: (name: string, muscle_group: MuscleGroup) => Promise<ExerciseLibraryRow | null>
  notify: (msg: string, kind?: 'success' | 'error') => void
  refreshKey: number
}

export default function TrackWorkout({ draft, savedDraft, library, onDraftChange, onResume, onDiscardSaved, onStart, onCreateExercise, notify, refreshKey }: Props) {
  const [logs, setLogs] = useState<WorkoutLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [coachWorkouts, setCoachWorkouts] = useState<CoachWorkout[]>([])
  const [saving, setSaving] = useState(false)
  const [finished, setFinished] = useState<FinishResult | null>(null)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/exercise/logs?include=sets')
    if (res.ok) setLogs(await res.json())
    setLoading(false)
  }, [])

  const fetchCoach = useCallback(() => {
    fetch('/api/exercise/athlete-assignments')
      .then(r => (r.ok ? r.json() : []))
      .then(data => { if (Array.isArray(data)) setCoachWorkouts(data) })
      .catch(() => {})
  }, [])

  useEffect(() => { fetchHistory(); fetchCoach() }, [fetchHistory, fetchCoach, refreshKey])

  // Autosave every change to this device.
  useEffect(() => { if (draft) saveDraft(draft) }, [draft])

  const finish = async () => {
    if (!draft) return
    const stats = draftStats(draft)
    if (stats.doneSets === 0 && !confirm('No sets are marked ✓. Save this workout with no sets?')) return
    if (!draft.name.trim()) { notify('Give the workout a name first.', 'error'); return }
    setSaving(true)
    try {
      const payload = draftToSessionPayload(draft)
      const res = await fetch('/api/exercise/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        notify(err.error || "Couldn't save the workout. Your sets are still here.", 'error')
        return
      }
      const data = (await res.json()) as { id: string; prs: DetectedPr[] }
      clearDraft()
      onDraftChange(null)
      setFinished({
        name: payload.log.workout_name,
        doneSets: stats.doneSets,
        volume: stats.volume,
        durationMin: payload.log.duration_min,
        exercises: payload.exercises.length,
        prs: data.prs ?? [],
      })
      notify(data.prs?.length ? `Workout saved · ${data.prs.length} PR${data.prs.length > 1 ? 's' : ''}!` : 'Workout saved')
      fetchHistory()
      fetchCoach()
    } catch {
      notify("Couldn't reach the server. Your sets are still here.", 'error')
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    clearDraft()
    onDraftChange(null)
  }

  if (draft) {
    return (
      <ActiveWorkout
        draft={draft}
        library={library}
        saving={saving}
        onChange={onDraftChange}
        onFinish={finish}
        onCancel={cancel}
        onCreateExercise={onCreateExercise}
      />
    )
  }

  return (
    <div className="space-y-4">
      {finished && <FinishSummary result={finished} onClose={() => setFinished(null)} />}

      {savedDraft && (
        <div className="card p-4 border-cta/40 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg-1 truncate">Unfinished: {savedDraft.name || 'Workout'}</p>
            <p className="text-xs text-fg-4">
              {draftStats(savedDraft).doneSets} sets logged · started {format(parseISO(savedDraft.startedAt), 'MMM d, h:mm a')}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            <button type="button" onClick={onDiscardSaved} className="btn-ghost">Discard</button>
            <button type="button" onClick={onResume} className="btn-primary">Resume</button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => onStart({ name: '', categoryName: 'Custom', exercises: [], source: 'custom' })}
        className="btn-primary w-full"
      >
        + Start a custom workout
      </button>

      {coachWorkouts.length > 0 && (
        <div className="bg-surface rounded-2xl border border-cta/30 p-4">
          <h4 className="text-sm font-semibold text-cta mb-3">From your coach</h4>
          <div className="space-y-2">
            {coachWorkouts.map(cw => (
              <div key={cw.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-2/50">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg-2 truncate">{cw.name}</p>
                  {cw.description && <p className="text-xs text-fg-4 truncate">{cw.description}</p>}
                  <p className="text-xs text-fg-4">{cw.exercises.length} exercises{cw.assigned_date ? ` · Due ${cw.assigned_date}` : ''}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onStart({ name: cw.name, categoryName: 'Coach Assigned', exercises: cw.exercises, source: 'coach_workout', coachWorkoutId: cw.id })}
                  className="btn-secondary shrink-0 px-3 py-2"
                >
                  Start
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-fg-1 mb-3">Workout history</h4>
        {loading ? (
          <Skeleton />
        ) : logs.length === 0 ? (
          <p className="text-sm text-fg-4 text-center py-8">No workouts logged yet. Start one above or from My Plan.</p>
        ) : (
          <div className="space-y-2">
            {logs.map(log => {
              const sets = log.exercise_logs ?? []
              const open = expanded === log.id
              return (
                <div key={log.id} className="bg-surface rounded-xl border border-edge overflow-hidden">
                  <button type="button" onClick={() => setExpanded(open ? null : log.id)} className="w-full p-3 text-left hover:bg-surface-2/50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-fg-2 truncate">{log.workout_name}</p>
                        <p className="text-xs text-fg-4">
                          {log.category_name}
                          {log.duration_min ? ` · ${log.duration_min} min` : ''}
                          {sets.length ? ` · ${sets.length} sets` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-fg-4 shrink-0">{format(parseISO(log.log_date), 'MMM d')}</span>
                    </div>
                    {log.notes && <p className="text-xs text-fg-3 mt-1">{log.notes}</p>}
                  </button>
                  {open && (
                    <div className="px-3 pb-3 border-t border-edge-muted">
                      {sets.length === 0 ? (
                        <p className="text-xs text-fg-4 mt-2">No per-set data recorded.</p>
                      ) : (
                        <div className="mt-2 space-y-1">
                          {groupSets(sets).map(([name, rows]) => (
                            <div key={name} className="p-2 rounded-lg bg-surface-2/50">
                              <p className="text-xs font-medium text-fg-2 mb-1">{name}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {rows.map(s => (
                                  <span key={s.id} className="text-[11px] text-fg-4 bg-surface-3/50 px-1.5 py-0.5 rounded tabular-nums">
                                    {s.reps ?? '—'}{s.weight ? ` × ${Number(s.weight)}` : ''}{s.rpe ? ` @${s.rpe}` : ''}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function groupSets(sets: ExerciseLogRow[]): [string, ExerciseLogRow[]][] {
  const map = new Map<string, ExerciseLogRow[]>()
  for (const s of sets) {
    const g = map.get(s.exercise_name)
    if (g) g.push(s)
    else map.set(s.exercise_name, [s])
  }
  return [...map.entries()].map(([n, rows]) => [n, rows.sort((a, b) => a.set_number - b.set_number)])
}
