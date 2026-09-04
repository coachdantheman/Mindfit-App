'use client'
import { useState, useEffect } from 'react'
import { WorkoutCategory, Workout, WorkoutExercise, TrainingProgram, ProgramWorkout } from '@/types'
import Skeleton from '@/components/shared/Skeleton'

const CATEGORY_ICONS: Record<string, string> = {
  Speed: '⚡',
  Explosiveness: '💥',
  Strength: '🏋️',
  Flexibility: '🧘',
  Calisthenics: '🤸',
  Balance: '⚖️',
}

interface Props {
  onStartWorkout?: (workout: Workout, categoryName: string) => void
  showSuccess?: (msg: string) => void
}

export default function PreBuiltWorkouts({ onStartWorkout, showSuccess }: Props) {
  const [categories, setCategories] = useState<(WorkoutCategory & { workout_count: number })[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [selectedCategory, setSelectedCategory] = useState<WorkoutCategory | null>(null)
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [logForm, setLogForm] = useState<{ workoutId: string; categoryName: string; workoutName: string } | null>(null)
  const [logDuration, setLogDuration] = useState('')
  const [logNotes, setLogNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Coach programs
  const [coachPrograms, setCoachPrograms] = useState<(TrainingProgram & { label: string; coach_name: string })[]>([])
  const [expandedCoachWorkout, setExpandedCoachWorkout] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/exercise/categories')
      .then(r => r.json())
      .then(data => { setCategories(data); setLoading(false) })
    fetch('/api/exercise/coach-programs')
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setCoachPrograms(data) })
  }, [])

  const openCategory = async (cat: WorkoutCategory) => {
    setSelectedCategory(cat)
    const res = await fetch(`/api/exercise/workouts?categoryId=${cat.id}`)
    setWorkouts(await res.json())
  }

  const logWorkout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!logForm) return
    setSaving(true)
    const res = await fetch('/api/exercise/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workout_id: logForm.workoutId,
        category_name: logForm.categoryName,
        workout_name: logForm.workoutName,
        duration_min: logDuration ? parseInt(logDuration) : null,
        notes: logNotes || null,
      }),
    })
    if (res.ok) {
      setLogForm(null)
      setLogDuration('')
      setLogNotes('')
      showSuccess?.('Workout logged successfully!')
    }
    setSaving(false)
  }

  if (loading) return <Skeleton />

  if (selectedCategory) {
    return (
      <div>
        <button onClick={() => setSelectedCategory(null)} className="text-sm text-brand-500 hover:underline mb-4 inline-block">
          ← All Categories
        </button>
        <h2 className="text-lg font-bold text-fg-1 mb-4">
          {CATEGORY_ICONS[selectedCategory.name] || '💪'} {selectedCategory.name}
        </h2>

        {workouts.length === 0 ? (
          <p className="text-sm text-fg-4 text-center py-8">No workouts in this category yet.</p>
        ) : (
          <div className="space-y-3">
            {workouts.map(w => (
              <div key={w.id} className="card overflow-hidden">
                <button
                  onClick={() => setExpandedWorkout(expandedWorkout === w.id ? null : w.id)}
                  className="w-full p-4 text-left flex items-center justify-between hover:bg-surface-2/50 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-fg-1">{w.name}</p>
                    {w.description && <p className="text-xs text-fg-4 mt-0.5">{w.description}</p>}
                  </div>
                  <span className="text-fg-4 text-sm">{expandedWorkout === w.id ? '▲' : '▼'}</span>
                </button>

                {expandedWorkout === w.id && (
                  <div className="px-4 pb-4 border-t border-edge-muted">
                    {(w.exercises as WorkoutExercise[]).length > 0 && (
                      <div className="space-y-2 mt-3">
                        {(w.exercises as WorkoutExercise[]).map((ex, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-surface-2/50">
                            <p className="text-sm text-fg-2">{ex.name}</p>
                            <p className="text-xs text-fg-4">
                              {ex.sets && ex.reps ? `${ex.sets} × ${ex.reps}` : ''}
                              {ex.notes ? ` · ${ex.notes}` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      {onStartWorkout && (
                        <button
                          onClick={() => onStartWorkout(w, selectedCategory.name)}
                          className="bg-cta hover:bg-brand-600 text-fg-inverse font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
                        >
                          Track This Workout
                        </button>
                      )}
                      {logForm?.workoutId === w.id ? (
                        <form onSubmit={logWorkout} className="flex-1 flex gap-2 items-end">
                          <input type="number" value={logDuration} onChange={e => setLogDuration(e.target.value)} placeholder="Min"
                            className="w-20 bg-surface-2 border border-edge rounded-lg px-2 py-2 text-sm text-fg-1 placeholder:text-fg-4 focus:outline-none focus:ring-2 focus:ring-cta/50" />
                          <input value={logNotes} onChange={e => setLogNotes(e.target.value)} placeholder="Notes"
                            className="flex-1 bg-surface-2 border border-edge rounded-lg px-2 py-2 text-sm text-fg-1 placeholder:text-fg-4 focus:outline-none focus:ring-2 focus:ring-cta/50" />
                          <button type="submit" disabled={saving} className="bg-cta/20 text-cta font-medium px-3 py-2 rounded-xl text-sm hover:bg-cta/30">
                            {saving ? 'Logging...' : 'Log'}
                          </button>
                          <button type="button" onClick={() => setLogForm(null)} className="text-xs text-fg-4 hover:text-fg-2 px-2">Cancel</button>
                        </form>
                      ) : (
                        <button
                          onClick={() => setLogForm({ workoutId: w.id, categoryName: selectedCategory.name, workoutName: w.name })}
                          className="bg-cta/20 text-cta font-medium px-4 py-2 rounded-xl text-sm hover:bg-cta/30 transition-colors"
                        >
                          Quick Log
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Coach Programs */}
      {coachPrograms.length > 0 && coachPrograms.map(cp => (
        <div key={cp.id} className="bg-surface rounded-2xl border border-cta/30 p-4 space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-cta">{cp.label}</h4>
            <p className="text-xs text-fg-4">From {cp.coach_name}</p>
            {cp.description && <p className="text-xs text-fg-3 mt-1">{cp.description}</p>}
          </div>
          {cp.blocks?.map(block => (
            <div key={block.id}>
              <p className="text-xs uppercase tracking-wider text-fg-4 font-medium mb-1.5">{block.name}</p>
              <div className="space-y-1.5">
                {block.workouts?.map((workout: ProgramWorkout) => (
                  <div key={workout.id} className="bg-surface-2/50 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedCoachWorkout(expandedCoachWorkout === workout.id ? null : workout.id)}
                      className="w-full p-3 text-left flex items-center justify-between hover:bg-surface-2 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-fg-2 truncate">{workout.name}</p>
                        {workout.description && <p className="text-xs text-fg-4 truncate">{workout.description}</p>}
                      </div>
                      <span className="text-xs text-fg-4 shrink-0 ml-2">{(workout.exercises as WorkoutExercise[])?.length || 0} exercises</span>
                    </button>
                    {expandedCoachWorkout === workout.id && (
                      <div className="px-3 pb-3 border-t border-edge-muted space-y-1.5 mt-1">
                        {(workout.exercises as WorkoutExercise[]).map((ex, i) => (
                          <div key={i} className="flex items-center justify-between p-1.5 rounded bg-surface-3/30">
                            <p className="text-xs text-fg-2">{ex.name}</p>
                            <p className="text-[10px] text-fg-4">{ex.sets} x {ex.reps}{ex.notes ? ` · ${ex.notes}` : ''}</p>
                          </div>
                        ))}
                        {onStartWorkout && (
                          <button
                            onClick={() => onStartWorkout(
                              { id: workout.id, name: workout.name, description: workout.description || '', category_id: '', exercises: workout.exercises as WorkoutExercise[], sort_order: 0 },
                              cp.label
                            )}
                            className="mt-2 w-full bg-cta/20 text-cta font-medium px-3 py-2 rounded-lg text-xs hover:bg-cta/30 transition-colors"
                          >
                            Track This Workout
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Category grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {categories.length === 0 ? (
          <div className="col-span-full text-center py-12 text-fg-3">
            <p className="font-medium">No workout categories yet</p>
            <p className="text-sm mt-1">Categories will appear here once added to the database.</p>
          </div>
        ) : categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => openCategory(cat)}
            className="card p-5 text-left hover:border-cta/30 transition-colors group"
          >
            <p className="text-2xl mb-2">{CATEGORY_ICONS[cat.name] || '💪'}</p>
            <p className="font-semibold text-fg-1 group-hover:text-cta transition-colors">{cat.name}</p>
            {cat.description && <p className="text-xs text-fg-4 mt-1">{cat.description}</p>}
            <p className="text-xs text-fg-4 mt-2">{cat.workout_count} workouts</p>
          </button>
        ))}
      </div>
    </div>
  )
}
