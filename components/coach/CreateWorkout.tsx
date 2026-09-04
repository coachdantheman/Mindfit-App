'use client'
import { useState, useEffect } from 'react'
import { MemberWithCount, CoachWorkout } from '@/types'
import Skeleton from '@/components/shared/Skeleton'

interface ExerciseRow {
  name: string
  sets: string
  reps: string
  notes: string
}

export default function CreateWorkout() {
  const [athletes, setAthletes] = useState<MemberWithCount[]>([])
  const [assigned, setAssigned] = useState<(CoachWorkout & { athlete?: { full_name: string | null; email: string } })[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [athleteId, setAthleteId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [assignedDate, setAssignedDate] = useState('')
  const [exercises, setExercises] = useState<ExerciseRow[]>([
    { name: '', sets: '3', reps: '10', notes: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/coach/athletes').then(r => r.json()),
      fetch('/api/coach/workouts').then(r => r.json()),
    ]).then(([aths, wks]) => {
      if (Array.isArray(aths)) setAthletes(aths)
      if (Array.isArray(wks)) setAssigned(wks)
      setLoading(false)
    })
  }, [])

  const addExercise = () => {
    setExercises(prev => [...prev, { name: '', sets: '3', reps: '10', notes: '' }])
  }

  const removeExercise = (idx: number) => {
    setExercises(prev => prev.filter((_, i) => i !== idx))
  }

  const updateExercise = (idx: number, field: keyof ExerciseRow, value: string) => {
    setExercises(prev => prev.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex))
  }

  const moveExercise = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= exercises.length) return
    setExercises(prev => {
      const arr = [...prev]
      ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
      return arr
    })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!athleteId || !name.trim() || exercises.every(ex => !ex.name.trim())) return
    setSaving(true)

    const payload = {
      athlete_id: athleteId,
      name: name.trim(),
      description: description.trim() || null,
      assigned_date: assignedDate || null,
      exercises: exercises
        .filter(ex => ex.name.trim())
        .map(ex => ({
          name: ex.name.trim(),
          sets: parseInt(ex.sets) || 3,
          reps: ex.reps || '10',
          notes: ex.notes.trim(),
        })),
    }

    const res = await fetch('/api/coach/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const data = await res.json()
      setAssigned(prev => [data, ...prev])
      setName('')
      setDescription('')
      setAssignedDate('')
      setExercises([{ name: '', sets: '3', reps: '10', notes: '' }])
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    }
    setSaving(false)
  }

  const deleteWorkout = async (id: string) => {
    await fetch('/api/coach/workouts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setAssigned(prev => prev.filter(w => w.id !== id))
  }

  if (loading) return <Skeleton />

  return (
    <div className="space-y-6">
      {/* Create form */}
      <form onSubmit={submit} className="space-y-4">
        <h3 className="font-semibold text-fg-1">Create & Assign Workout</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-fg-4 block mb-1">Athlete</label>
            <select
              value={athleteId}
              onChange={e => setAthleteId(e.target.value)}
              className="w-full bg-surface-2 border border-edge rounded-lg px-3 py-2 text-sm text-fg-1 focus:outline-none focus:ring-2 focus:ring-cta/50"
            >
              <option value="">Select athlete...</option>
              {athletes.map(a => (
                <option key={a.id} value={a.id}>{a.full_name || a.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-fg-4 block mb-1">Assigned Date (optional)</label>
            <input
              type="date"
              value={assignedDate}
              onChange={e => setAssignedDate(e.target.value)}
              className="w-full bg-surface-2 border border-edge rounded-lg px-3 py-2 text-sm text-fg-1 focus:outline-none focus:ring-2 focus:ring-cta/50"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-fg-4 block mb-1">Workout Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Upper Body Strength"
            className="w-full bg-surface-2 border border-edge rounded-lg px-3 py-2 text-sm text-fg-1 placeholder:text-fg-4 focus:outline-none focus:ring-2 focus:ring-cta/50"
          />
        </div>

        <div>
          <label className="text-xs text-fg-4 block mb-1">Description (optional)</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Brief description of the workout focus"
            className="w-full bg-surface-2 border border-edge rounded-lg px-3 py-2 text-sm text-fg-1 placeholder:text-fg-4 focus:outline-none focus:ring-2 focus:ring-cta/50"
          />
        </div>

        {/* Exercise rows */}
        <div className="space-y-2">
          <label className="text-xs text-fg-4 block">Exercises</label>
          {exercises.map((ex, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-surface-2/50 rounded-lg p-2">
              <div className="flex flex-col gap-0.5">
                <button type="button" onClick={() => moveExercise(idx, -1)} className="text-[10px] text-fg-4 hover:text-fg-2 leading-none">▲</button>
                <button type="button" onClick={() => moveExercise(idx, 1)} className="text-[10px] text-fg-4 hover:text-fg-2 leading-none">▼</button>
              </div>
              <input
                value={ex.name}
                onChange={e => updateExercise(idx, 'name', e.target.value)}
                placeholder="Exercise name"
                className="flex-1 bg-surface-2 border border-edge rounded-lg px-2 py-1.5 text-sm text-fg-1 placeholder:text-fg-4 focus:outline-none focus:ring-2 focus:ring-cta/50"
              />
              <input
                type="number"
                value={ex.sets}
                onChange={e => updateExercise(idx, 'sets', e.target.value)}
                placeholder="Sets"
                className="w-14 bg-surface-2 border border-edge rounded-lg px-2 py-1.5 text-sm text-fg-1 placeholder:text-fg-4 focus:outline-none focus:ring-2 focus:ring-cta/50 text-center"
              />
              <span className="text-fg-4 text-xs">x</span>
              <input
                value={ex.reps}
                onChange={e => updateExercise(idx, 'reps', e.target.value)}
                placeholder="Reps"
                className="w-16 bg-surface-2 border border-edge rounded-lg px-2 py-1.5 text-sm text-fg-1 placeholder:text-fg-4 focus:outline-none focus:ring-2 focus:ring-cta/50 text-center"
              />
              <input
                value={ex.notes}
                onChange={e => updateExercise(idx, 'notes', e.target.value)}
                placeholder="Notes"
                className="flex-1 bg-surface-2 border border-edge rounded-lg px-2 py-1.5 text-sm text-fg-1 placeholder:text-fg-4 focus:outline-none focus:ring-2 focus:ring-cta/50"
              />
              {exercises.length > 1 && (
                <button type="button" onClick={() => removeExercise(idx)} className="text-red-400 hover:text-red-300 text-xs px-1">x</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addExercise} className="text-xs text-cta hover:underline">
            + Add Exercise
          </button>
        </div>

        <button
          type="submit"
          disabled={saving || !athleteId || !name.trim()}
          className="bg-cta hover:bg-brand-600 text-fg-inverse font-semibold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
        >
          {saving ? 'Assigning...' : success ? 'Assigned!' : 'Assign Workout'}
        </button>
      </form>

      {/* Previously assigned workouts */}
      {assigned.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-fg-1 mb-3">Assigned Workouts</h4>
          <div className="space-y-2">
            {assigned.map(w => (
              <div key={w.id} className="p-3 rounded-xl bg-surface-2/50 border border-edge">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-fg-2">{w.name}</p>
                    <p className="text-xs text-fg-4">
                      {(w as any).athlete?.full_name || (w as any).athlete?.email || 'Athlete'}
                      {w.assigned_date ? ` · Due ${w.assigned_date}` : ''}
                      · {w.exercises.length} exercises
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      w.is_completed ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'
                    }`}>
                      {w.is_completed ? 'Completed' : 'Pending'}
                    </span>
                    <button onClick={() => deleteWorkout(w.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
