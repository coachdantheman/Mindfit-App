'use client'
import { useCallback, useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import type { CoachWorkout } from '@/types'
import type { CustomWorkoutRow, ExerciseLibraryRow, ExerciseLogRow, MuscleGroup, StartWorkoutInput, WorkoutLogRow } from '@/types/exercise'
import ActiveWorkout from './ActiveWorkout'
import FinishSummary, { type FinishResult } from './FinishSummary'
import Skeleton from '@/components/shared/Skeleton'
import BottomSheet from '@/components/shared/BottomSheet'
import { clearDraft, draftStats, draftToSessionPayload, saveDraft, type WorkoutDraft } from '@/lib/workout-draft'
import type { DetectedPr, SessionTier } from '@/lib/strength'
import { formatTime } from '@/lib/running'
import { cached, cachedAll } from '@/lib/api-cache'

const ex = (name: string, sets: number, reps = '') => ({ name, sets, reps, notes: '' })

// Each type opens a workout already set up for how that training is logged.
// Exercise names match the library so the right inputs show (weight and
// reps, distance and time, or a timed hold). Everything can be changed.
const WORKOUT_TYPES: { label: string; sub: string; start: Omit<StartWorkoutInput, 'source'> }[] = [
  { label: 'Strength training', sub: 'Lifts logged by weight and reps', start: { name: '', categoryName: 'Strength', exercises: [] } },
  { label: 'Speed', sub: 'Sprints logged by distance and time', start: { name: 'Sprint session', categoryName: 'Speed', exercises: [ex('Sprint', 6, '40')] } },
  { label: 'Endurance', sub: 'Runs logged by distance, time and pace', start: { name: 'Run', categoryName: 'Endurance', exercises: [ex('Easy Run', 1)] } },
  { label: 'Flexibility', sub: 'Stretches and mobility, timed holds or reps', start: { name: 'Mobility session', categoryName: 'Flexibility', exercises: [ex("World's Greatest Stretch", 2, '5'), ex('Hip Flexor Stretch', 2), ex('Hamstring Stretch', 2), ex('Pigeon Pose', 2)] } },
  { label: 'Balance', sub: 'Single-leg holds and reaches', start: { name: 'Balance session', categoryName: 'Balance', exercises: [ex('Single-Leg Stand', 3), ex('Star Excursion', 3, '5')] } },
]

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
  onAddBodyweight: () => void
}

export default function TrackWorkout({ draft, savedDraft, library, onDraftChange, onResume, onDiscardSaved, onStart, onCreateExercise, notify, refreshKey, onAddBodyweight }: Props) {
  const [logs, setLogs] = useState<WorkoutLogRow[]>([])
  const [saved, setSaved] = useState<CustomWorkoutRow[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [coachWorkouts, setCoachWorkouts] = useState<CoachWorkout[]>([])
  const [saving, setSaving] = useState(false)
  const [finished, setFinished] = useState<FinishResult | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    const [res, mine] = await Promise.all([
      fetch('/api/exercise/logs?include=sets'),
      fetch('/api/exercise/custom-workouts').catch(() => null),
    ])
    if (res.ok) setLogs(await res.json())
    if (mine?.ok) {
      const data = await mine.json()
      if (Array.isArray(data)) setSaved(sortSaved(data))
    }
    setLoading(false)
  }, [])

  const fetchCoach = useCallback(() => {
    fetch('/api/exercise/athlete-assignments')
      .then(r => (r.ok ? r.json() : []))
      .then(data => { if (Array.isArray(data)) setCoachWorkouts(data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    cachedAll(['/api/exercise/logs?include=sets', '/api/exercise/custom-workouts'], ([history, mine]: [WorkoutLogRow[], CustomWorkoutRow[]]) => {
      if (Array.isArray(history)) setLogs(history)
      if (Array.isArray(mine)) setSaved(sortSaved(mine))
      setLoading(false)
    }).catch(() => setLoading(false))
    cached('/api/exercise/athlete-assignments', (data: CoachWorkout[]) => { if (Array.isArray(data)) setCoachWorkouts(data) }).catch(() => {})
  }, [refreshKey])

  // Autosave every change to this device.
  useEffect(() => { if (draft) saveDraft(draft) }, [draft])

  const finish = async () => {
    if (!draft || saving) return
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
      const data = (await res.json()) as { id: string; prs: DetectedPr[]; tiers?: SessionTier[]; needsProfile?: boolean; savedToMyWorkouts?: boolean }
      clearDraft()
      onDraftChange(null)
      setFinished({
        name: payload.log.workout_name,
        doneSets: stats.doneSets,
        volume: stats.volume,
        durationMin: payload.log.duration_min,
        exercises: payload.exercises.length,
        prs: data.prs ?? [],
        tiers: data.tiers ?? [],
        needsProfile: !!data.needsProfile,
      })
      const ups = (data.tiers ?? []).filter(t => t.tierUp).length
      notify(ups ? `Workout saved · Tier up!` : data.prs?.length ? `Workout saved · ${data.prs.length} PR${data.prs.length > 1 ? 's' : ''}!` : 'Workout saved')
      if (stats.doneSets > 0 && data.savedToMyWorkouts === false) notify("Workout logged, but it didn't save to My Workouts. Finish it once more to save it.", 'error')
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

  const repeat = (log: WorkoutLogRow) => {
    const groups = groupSets(log.exercise_logs ?? [])
    onStart({
      name: log.workout_name,
      categoryName: log.category_name,
      source: log.source ?? 'custom',
      workoutId: log.workout_id,
      programWorkoutId: log.program_workout_id,
      // A repeat is a new session, so it never re-completes the coach's assignment.
      coachWorkoutId: null,
      exercises: groups.map(([name, rows]) => ({ name, sets: rows.length, reps: '', notes: '' })),
      // Runs and sprints carry last time's distance as the placeholder instead of reps.
      prefill: groups.map(([name, rows]) => ({ name, reps: rows.map(r => (r.distance != null ? String(Number(r.distance)) : r.reps != null ? String(r.reps) : null)) })),
    })
  }

  const togglePin = async (w: CustomWorkoutRow) => {
    const pinned = !w.pinned_at
    const before = saved
    setSaved(sortSaved(saved.map(x => (x.id === w.id ? { ...x, pinned_at: pinned ? new Date().toISOString() : null } : x))))
    const res = await fetch('/api/exercise/custom-workouts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: w.id, pinned }),
    }).catch(() => null)
    if (!res?.ok) {
      setSaved(before)
      notify("Couldn't update the pin. Try again.", 'error')
    }
  }

  const removeSaved = async (w: CustomWorkoutRow) => {
    setConfirmDelete(null)
    const before = saved
    setSaved(saved.filter(x => x.id !== w.id))
    const res = await fetch(`/api/exercise/custom-workouts?id=${encodeURIComponent(w.id)}`, { method: 'DELETE' }).catch(() => null)
    if (!res?.ok) {
      setSaved(before)
      notify("Couldn't delete that workout. Try again.", 'error')
      return
    }
    notify(`Deleted ${w.name}`)
  }

  const doAgain = (w: CustomWorkoutRow) => {
    onStart({
      name: w.name,
      categoryName: w.category,
      source: 'custom',
      exercises: w.exercises.map(e => ({ name: e.exercise_name, sets: e.sets.length, reps: '', notes: '' })),
      prefill: w.exercises.map(e => ({
        name: e.exercise_name,
        reps: e.sets.map(r => (r.distance != null ? String(Number(r.distance)) : r.reps != null ? String(r.reps) : null)),
      })),
    })
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
      {finished && <FinishSummary result={finished} onClose={() => setFinished(null)} onAddBodyweight={() => { setFinished(null); onAddBodyweight() }} />}

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

      <button type="button" onClick={() => setPicking(true)} className="btn-primary w-full">
        + Start a custom workout
      </button>
      {picking && (
        <BottomSheet title="What type of workout?" onClose={() => setPicking(false)}>
          <div className="space-y-2">
            {WORKOUT_TYPES.map(t => (
              <button
                key={t.label}
                type="button"
                onClick={() => { setPicking(false); onStart({ ...t.start, source: 'custom' }) }}
                className="card p-4 w-full text-left hover:border-cta/30 transition-colors"
              >
                <p className="font-semibold text-fg-1">{t.label}</p>
                <p className="text-xs text-fg-4 mt-0.5">{t.sub}</p>
              </button>
            ))}
          </div>
        </BottomSheet>
      )}

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

      {saved.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-fg-1 mb-3">My Workouts</h4>
          <div className="space-y-2">
            {saved.map(w => (
              <div key={w.id} className={`flex items-center justify-between gap-2 bg-surface rounded-xl border p-3 ${w.pinned_at ? 'border-cta/40' : 'border-edge'}`}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg-2 truncate">{w.name}</p>
                  <p className="text-xs text-fg-4 truncate">
                    {w.exercises.length} ex · {w.times_done}× · {format(parseISO(w.last_done_at), 'MMM d')}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => togglePin(w)}
                    aria-pressed={!!w.pinned_at}
                    aria-label={w.pinned_at ? `Unpin ${w.name}` : `Pin ${w.name}`}
                    title={w.pinned_at ? 'Unpin' : 'Pin to top'}
                    className={`w-11 h-11 flex items-center justify-center rounded-lg transition-colors ${w.pinned_at ? 'text-cta' : 'text-fg-4 hover:text-fg-2'}`}
                  >
                    <PinIcon filled={!!w.pinned_at} />
                  </button>
                  {confirmDelete === w.id ? (
                    <>
                      <button type="button" onClick={() => removeSaved(w)} className="btn-secondary px-3 py-2 !text-[var(--danger)]">Delete</button>
                      <button type="button" onClick={() => setConfirmDelete(null)} className="btn-ghost px-3 py-2">Keep</button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(w.id)}
                        aria-label={`Delete ${w.name}`}
                        title="Delete"
                        className="w-11 h-11 flex items-center justify-center rounded-lg text-fg-4 hover:text-fg-2 transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" /></svg>
                      </button>
                      <button type="button" onClick={() => doAgain(w)} className="btn-secondary px-3 py-2">Do again</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => setHistoryOpen(o => !o)}
          aria-expanded={historyOpen}
          className="w-full flex items-center justify-between gap-2 min-h-[44px] text-left"
        >
          <span className="text-sm font-semibold text-fg-1">
            Workout history{logs.length ? <span className="text-fg-4 font-normal"> · {logs.length}</span> : null}
          </span>
          <span className={`text-fg-4 text-xs transition-transform ${historyOpen ? 'rotate-180' : ''}`} aria-hidden>▼</span>
        </button>
        {!loading && logs.length === 0 ? (
          <p className="text-sm text-fg-4 text-center py-8">No workouts logged yet. Start one above or from My Plan.</p>
        ) : !historyOpen ? null : loading ? (
          <Skeleton />
        ) : (
          <div className="space-y-2 mt-2">
            {logs.map(log => {
              const sets = log.exercise_logs ?? []
              const open = expanded === log.id
              return (
                <div key={log.id} className="bg-surface rounded-xl border border-edge overflow-hidden">
                  <button type="button" onClick={() => setExpanded(open ? null : log.id)} aria-expanded={open} className="w-full p-3 text-left hover:bg-surface-2/50 transition-colors">
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
                      {sets.length > 0 && (
                        <button type="button" onClick={() => repeat(log)} className="btn-secondary w-full mt-3">
                          Do workout again
                        </button>
                      )}
                      {sets.length === 0 ? (
                        <p className="text-xs text-fg-4 mt-2">No per-set data recorded.</p>
                      ) : (
                        <div className="mt-2 space-y-1">
                          {groupSets(sets).map(([name, rows]) => (
                            <div key={name} className="p-2 rounded-lg bg-surface-2/50">
                              <p className="text-xs font-medium text-fg-2 mb-1">{name}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {rows.map(s => (
                                  <span key={s.id} className="text-xs text-fg-4 bg-surface-3/50 px-1.5 py-0.5 rounded tabular-nums">
                                    {s.distance != null || s.duration_sec != null
                                      ? `${s.distance != null ? `${Number(s.distance)} ${s.distance_unit ?? ''}` : ''}${s.duration_sec != null ? `${s.distance != null ? ' · ' : ''}${formatTime(Number(s.duration_sec))}${Number(s.duration_sec) < 60 ? 's' : ''}` : ''}`
                                      : `${s.reps ?? '—'}${s.weight ? ` × ${Number(s.weight)}` : ''}`}{s.rpe ? ` @${s.rpe}` : ''}
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

function sortSaved(rows: CustomWorkoutRow[]): CustomWorkoutRow[] {
  return [...rows].sort((a, b) =>
    (b.pinned_at ?? '').localeCompare(a.pinned_at ?? '') || b.last_done_at.localeCompare(a.last_done_at))
}

function PinIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" aria-hidden>
      <path d="M9 3h6l-1 6 4 4H6l4-4-1-6Z" />
      <path d="M12 13v8" fill="none" strokeLinecap="round" />
    </svg>
  )
}
