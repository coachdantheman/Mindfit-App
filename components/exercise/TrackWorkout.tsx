'use client'
import { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { WorkoutExercise, WorkoutLog, ExerciseLog, Workout, CoachWorkout } from '@/types'
import ExerciseSetRow from './ExerciseSetRow'

interface SetData {
  set_number: number
  reps: string
  weight: string
  rpe: string
  notes: string
}

interface TrackingExercise {
  name: string
  sets: SetData[]
}

type WorkoutSource = 'custom' | 'prebuilt' | 'coach'

interface Props {
  initialWorkout?: { exercises: WorkoutExercise[]; name: string; categoryName: string; workoutId?: string; coachWorkoutId?: string; source: WorkoutSource }
  onDone?: () => void
}

export default function TrackWorkout({ initialWorkout, onDone }: Props) {
  const [mode, setMode] = useState<'select' | 'track' | 'history'>('history')
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, ExerciseLog[]>>({})
  const [loading, setLoading] = useState(true)

  // Tracking state
  const [workoutName, setWorkoutName] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [workoutId, setWorkoutId] = useState<string | null>(null)
  const [coachWorkoutId, setCoachWorkoutId] = useState<string | null>(null)
  const [exercises, setExercises] = useState<TrackingExercise[]>([])
  const [duration, setDuration] = useState('')
  const [workoutNotes, setWorkoutNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Coach assigned workouts
  const [coachWorkouts, setCoachWorkouts] = useState<CoachWorkout[]>([])

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/exercise/logs')
    if (res.ok) setLogs(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchHistory()
    fetch('/api/exercise/athlete-assignments')
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setCoachWorkouts(data) })
  }, [fetchHistory])

  useEffect(() => {
    if (initialWorkout) {
      startTracking(
        initialWorkout.exercises,
        initialWorkout.name,
        initialWorkout.categoryName,
        initialWorkout.workoutId || null,
        initialWorkout.coachWorkoutId || null
      )
    }
  }, [initialWorkout])

  const startTracking = (exList: WorkoutExercise[], name: string, catName: string, wId: string | null, cwId: string | null) => {
    setWorkoutName(name)
    setCategoryName(catName)
    setWorkoutId(wId)
    setCoachWorkoutId(cwId)
    setExercises(exList.map(ex => ({
      name: ex.name,
      sets: Array.from({ length: ex.sets || 3 }, (_, i) => ({
        set_number: i + 1,
        reps: ex.reps || '',
        weight: '',
        rpe: '',
        notes: '',
      })),
    })))
    setMode('track')
  }

  const startCustom = () => {
    setWorkoutName('')
    setCategoryName('Custom')
    setWorkoutId(null)
    setCoachWorkoutId(null)
    setExercises([{ name: '', sets: [{ set_number: 1, reps: '', weight: '', rpe: '', notes: '' }] }])
    setMode('track')
  }

  const startCoachWorkout = (cw: CoachWorkout) => {
    startTracking(cw.exercises, cw.name, 'Coach Assigned', null, cw.id)
  }

  const addExercise = () => {
    setExercises(prev => [...prev, { name: '', sets: [{ set_number: 1, reps: '', weight: '', rpe: '', notes: '' }] }])
  }

  const removeExercise = (idx: number) => {
    setExercises(prev => prev.filter((_, i) => i !== idx))
  }

  const addSet = (exIdx: number) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      return {
        ...ex,
        sets: [...ex.sets, { set_number: ex.sets.length + 1, reps: '', weight: '', rpe: '', notes: '' }],
      }
    }))
  }

  const updateSet = (exIdx: number, setIdx: number, data: SetData) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      return { ...ex, sets: ex.sets.map((s, si) => si === setIdx ? data : s) }
    }))
  }

  const removeSet = (exIdx: number, setIdx: number) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      const newSets = ex.sets.filter((_, si) => si !== setIdx).map((s, si) => ({ ...s, set_number: si + 1 }))
      return { ...ex, sets: newSets }
    }))
  }

  const finishWorkout = async () => {
    if (!workoutName.trim()) return
    setSaving(true)

    // Create workout log
    const logRes = await fetch('/api/exercise/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workout_id: workoutId,
        coach_workout_id: coachWorkoutId,
        category_name: categoryName,
        workout_name: workoutName,
        duration_min: duration ? parseInt(duration) : null,
        notes: workoutNotes || null,
      }),
    })

    if (logRes.ok) {
      const logData = await logRes.json()

      // Create exercise logs
      const allSets = exercises.flatMap(ex =>
        ex.sets
          .filter(s => s.reps || s.weight)
          .map(s => ({
            workout_log_id: logData.id,
            exercise_name: ex.name,
            set_number: s.set_number,
            reps: s.reps ? parseInt(s.reps) : null,
            weight: s.weight ? parseFloat(s.weight) : null,
            rpe: s.rpe ? parseInt(s.rpe) : null,
            notes: s.notes || null,
          }))
      )

      if (allSets.length > 0) {
        await fetch('/api/exercise/exercise-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(allSets),
        })
      }

      // Mark coach workout as completed
      if (coachWorkoutId) {
        await fetch('/api/exercise/athlete-assignments', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: coachWorkoutId }),
        })
      }

      setMode('history')
      fetchHistory()
      onDone?.()
    }

    setSaving(false)
  }

  const loadExerciseLogs = async (logId: string) => {
    if (exerciseLogs[logId]) {
      setExpandedLog(expandedLog === logId ? null : logId)
      return
    }
    const res = await fetch(`/api/exercise/exercise-logs?workout_log_id=${logId}`)
    if (res.ok) {
      const data = await res.json()
      setExerciseLogs(prev => ({ ...prev, [logId]: data }))
    }
    setExpandedLog(logId)
  }

  if (mode === 'track') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-100">Tracking Workout</h3>
          <button onClick={() => setMode('history')} className="text-xs text-gray-500 hover:text-gray-300">Cancel</button>
        </div>

        <input
          value={workoutName}
          onChange={e => setWorkoutName(e.target.value)}
          placeholder="Workout name"
          className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cta/50"
        />

        {exercises.map((ex, exIdx) => (
          <div key={exIdx} className="bg-gray-900 rounded-2xl border border-white/10 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                value={ex.name}
                onChange={e => setExercises(prev => prev.map((x, i) => i === exIdx ? { ...x, name: e.target.value } : x))}
                placeholder="Exercise name"
                className="flex-1 bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cta/50"
              />
              {exercises.length > 1 && (
                <button onClick={() => removeExercise(exIdx)} className="text-red-400 hover:text-red-300 text-xs px-2">Remove</button>
              )}
            </div>

            <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wider px-1">
              <span className="w-6 text-center">Set</span>
              <span className="w-16">Reps</span>
              <span className="w-16">Weight</span>
              <span className="w-16">RPE</span>
              <span className="flex-1">Notes</span>
              <span className="w-4" />
            </div>

            {ex.sets.map((set, setIdx) => (
              <ExerciseSetRow
                key={setIdx}
                data={set}
                onChange={data => updateSet(exIdx, setIdx, data)}
                onRemove={() => removeSet(exIdx, setIdx)}
              />
            ))}

            <button
              onClick={() => addSet(exIdx)}
              className="text-xs text-cta hover:underline"
            >
              + Add Set
            </button>
          </div>
        ))}

        <button onClick={addExercise} className="text-sm text-cta font-medium hover:underline">
          + Add Exercise
        </button>

        <div className="flex gap-2">
          <input
            type="number"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            placeholder="Duration (min)"
            className="w-32 bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cta/50"
          />
          <input
            value={workoutNotes}
            onChange={e => setWorkoutNotes(e.target.value)}
            placeholder="Workout notes"
            className="flex-1 bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cta/50"
          />
        </div>

        <button
          onClick={finishWorkout}
          disabled={saving || !workoutName.trim()}
          className="w-full bg-cta hover:bg-brand-600 text-gray-900 font-bold px-4 py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Finish Workout'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Start buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={startCustom}
          className="bg-cta hover:bg-brand-600 text-gray-900 font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          + Custom Workout
        </button>
      </div>

      {/* Coach assigned workouts */}
      {coachWorkouts.length > 0 && (
        <div className="bg-gray-900 rounded-2xl border border-cta/30 p-4">
          <h4 className="text-sm font-semibold text-cta mb-3">From Your Coach</h4>
          <div className="space-y-2">
            {coachWorkouts.map(cw => (
              <div key={cw.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/50">
                <div>
                  <p className="text-sm font-medium text-gray-200">{cw.name}</p>
                  {cw.description && <p className="text-xs text-gray-500">{cw.description}</p>}
                  <p className="text-xs text-gray-500">{cw.exercises.length} exercises{cw.assigned_date ? ` · Due ${cw.assigned_date}` : ''}</p>
                </div>
                <button
                  onClick={() => startCoachWorkout(cw)}
                  className="bg-cta/20 text-cta font-medium px-3 py-1.5 rounded-lg text-xs hover:bg-cta/30"
                >
                  Start
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <h4 className="text-sm font-semibold text-gray-100 mb-3">Workout History</h4>
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No workouts logged yet. Start tracking!</p>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="bg-gray-900 rounded-xl border border-white/10 overflow-hidden">
                <button
                  onClick={() => loadExerciseLogs(log.id)}
                  className="w-full p-3 text-left hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-200">{log.workout_name}</p>
                      <p className="text-xs text-gray-500">
                        {log.category_name}
                        {log.duration_min ? ` · ${log.duration_min} min` : ''}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">{format(parseISO(log.log_date), 'MMM d')}</span>
                  </div>
                  {log.notes && <p className="text-xs text-gray-400 mt-1">{log.notes}</p>}
                </button>

                {expandedLog === log.id && exerciseLogs[log.id] && (
                  <div className="px-3 pb-3 border-t border-white/5">
                    {exerciseLogs[log.id].length === 0 ? (
                      <p className="text-xs text-gray-500 mt-2">No per-set data recorded.</p>
                    ) : (
                      <div className="mt-2 space-y-1">
                        {Object.entries(
                          exerciseLogs[log.id].reduce<Record<string, ExerciseLog[]>>((acc, el) => {
                            (acc[el.exercise_name] = acc[el.exercise_name] || []).push(el)
                            return acc
                          }, {})
                        ).map(([name, sets]) => (
                          <div key={name} className="p-2 rounded-lg bg-gray-800/50">
                            <p className="text-xs font-medium text-gray-300 mb-1">{name}</p>
                            <div className="flex flex-wrap gap-2">
                              {sets.sort((a, b) => a.set_number - b.set_number).map(s => (
                                <span key={s.id} className="text-[10px] text-gray-500 bg-gray-700/50 px-1.5 py-0.5 rounded">
                                  S{s.set_number}: {s.reps ?? '-'}r{s.weight ? ` @ ${s.weight}lbs` : ''}
                                  {s.rpe ? ` RPE ${s.rpe}` : ''}
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
