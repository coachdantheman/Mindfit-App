'use client'
import { useState, useEffect } from 'react'
import { WorkoutCategory, Workout, WorkoutExercise } from '@/types'
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
  notify?: (msg: string, kind?: 'success' | 'error') => void
}

export default function PreBuiltWorkouts({ onStartWorkout, notify }: Props) {
  const [categories, setCategories] = useState<(WorkoutCategory & { workout_count: number })[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [selectedCategory, setSelectedCategory] = useState<WorkoutCategory | null>(null)
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [logForm, setLogForm] = useState<{ workoutId: string; categoryName: string; workoutName: string } | null>(null)
  const [logDuration, setLogDuration] = useState('')
  const [logNotes, setLogNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/exercise/categories')
      .then(r => r.json())
      .then(data => { setCategories(data); setLoading(false) })
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
        source: 'prebuilt',
      }),
    })
    if (res.ok) {
      setLogForm(null)
      setLogDuration('')
      setLogNotes('')
      notify?.('Workout logged')
    } else {
      notify?.("Couldn't log the workout.", 'error')
    }
    setSaving(false)
  }

  if (loading) return <Skeleton />

  if (selectedCategory) {
    return (
      <div>
        <button type="button" onClick={() => setSelectedCategory(null)} className="text-sm text-cta hover:underline mb-4 inline-block min-h-[44px]">
          ← All categories
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
                  type="button"
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
                          <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-2/50">
                            <p className="text-sm text-fg-2">{ex.name}</p>
                            <p className="text-xs text-fg-4 shrink-0">
                              {ex.sets && ex.reps ? `${ex.sets} × ${ex.reps}` : ''}
                              {ex.notes ? ` · ${ex.notes}` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-4">
                      {onStartWorkout && (
                        <button type="button" onClick={() => onStartWorkout(w, selectedCategory.name)} className="btn-primary">
                          Track this
                        </button>
                      )}
                      {logForm?.workoutId === w.id ? (
                        <form onSubmit={logWorkout} className="flex-1 flex gap-2 items-end min-w-0">
                          <input type="number" value={logDuration} onChange={e => setLogDuration(e.target.value)} placeholder="Min"
                            className="w-20 bg-surface-2 border border-edge rounded-lg px-2 py-2 text-sm text-fg-1 placeholder:text-fg-4 focus:outline-none focus:ring-2 focus:ring-cta/50" />
                          <input value={logNotes} onChange={e => setLogNotes(e.target.value)} placeholder="Notes"
                            className="flex-1 min-w-0 bg-surface-2 border border-edge rounded-lg px-2 py-2 text-sm text-fg-1 placeholder:text-fg-4 focus:outline-none focus:ring-2 focus:ring-cta/50" />
                          <button type="submit" disabled={saving} className="btn-secondary px-3 py-2">
                            {saving ? '…' : 'Log'}
                          </button>
                          <button type="button" onClick={() => setLogForm(null)} className="btn-ghost px-2">Cancel</button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setLogForm({ workoutId: w.id, categoryName: selectedCategory.name, workoutName: w.name })}
                          className="btn-secondary"
                        >
                          Quick log
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
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {categories.length === 0 ? (
        <div className="col-span-full text-center py-12 text-fg-3">
          <p className="font-medium">No workout categories yet</p>
          <p className="text-sm mt-1">Categories will appear here once added to the database.</p>
        </div>
      ) : categories.map(cat => (
        <button
          key={cat.id}
          type="button"
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
  )
}
