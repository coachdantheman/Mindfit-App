'use client'
import { useState, useEffect } from 'react'
import { WorkoutExercise } from '@/types'

interface ProgramExercise extends WorkoutExercise {
  _key: string
}

interface ProgramWorkoutDraft {
  _key: string
  name: string
  day_of_week: number
  exercises: ProgramExercise[]
}

interface ProgramBlockDraft {
  _key: string
  name: string
  focus: string
  workouts: ProgramWorkoutDraft[]
}

interface ExistingProgram {
  id: string
  title: string
  description: string | null
  created_at: string
  athlete_count: number
}

let keyId = 0
function nk() { return `k-${++keyId}` }

const DAY_OPTIONS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

function makeExercise(): ProgramExercise {
  return { name: '', sets: 3, reps: '10', notes: '', _key: nk() }
}

function makeWorkout(): ProgramWorkoutDraft {
  return { _key: nk(), name: '', day_of_week: 1, exercises: [makeExercise(), makeExercise(), makeExercise()] }
}

function makeBlock(idx: number): ProgramBlockDraft {
  return { _key: nk(), name: `Phase ${idx + 1}`, focus: '', workouts: [makeWorkout()] }
}

export default function CreateProgram() {
  const [title, setTitle] = useState('')
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [durationWeeks, setDurationWeeks] = useState(4)
  const [blocks, setBlocks] = useState<ProgramBlockDraft[]>([makeBlock(0)])
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [existingPrograms, setExistingPrograms] = useState<ExistingProgram[]>([])
  const [expandedBlock, setExpandedBlock] = useState<string | null>(blocks[0]._key)

  useEffect(() => { fetchPrograms() }, [])

  const fetchPrograms = async () => {
    const res = await fetch('/api/coach/programs')
    if (res.ok) setExistingPrograms(await res.json())
  }

  const addBlock = () => {
    const newBlock = makeBlock(blocks.length)
    setBlocks(prev => [...prev, newBlock])
    setExpandedBlock(newBlock._key)
  }

  const removeBlock = (idx: number) => {
    setBlocks(prev => prev.filter((_, i) => i !== idx))
  }

  const updateBlock = (idx: number, field: 'name' | 'focus', value: string) => {
    setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b))
  }

  const addWorkout = (blockIdx: number) => {
    setBlocks(prev => prev.map((b, i) =>
      i === blockIdx ? { ...b, workouts: [...b.workouts, makeWorkout()] } : b
    ))
  }

  const removeWorkout = (blockIdx: number, workoutIdx: number) => {
    setBlocks(prev => prev.map((b, i) =>
      i === blockIdx ? { ...b, workouts: b.workouts.filter((_, wi) => wi !== workoutIdx) } : b
    ))
  }

  const updateWorkout = (blockIdx: number, workoutIdx: number, field: 'name' | 'day_of_week', value: any) => {
    setBlocks(prev => prev.map((b, bi) =>
      bi === blockIdx ? {
        ...b,
        workouts: b.workouts.map((w, wi) => wi === workoutIdx ? { ...w, [field]: value } : w)
      } : b
    ))
  }

  const addExercise = (blockIdx: number, workoutIdx: number) => {
    setBlocks(prev => prev.map((b, bi) =>
      bi === blockIdx ? {
        ...b,
        workouts: b.workouts.map((w, wi) =>
          wi === workoutIdx ? { ...w, exercises: [...w.exercises, makeExercise()] } : w
        )
      } : b
    ))
  }

  const removeExercise = (blockIdx: number, workoutIdx: number, exIdx: number) => {
    setBlocks(prev => prev.map((b, bi) =>
      bi === blockIdx ? {
        ...b,
        workouts: b.workouts.map((w, wi) =>
          wi === workoutIdx ? { ...w, exercises: w.exercises.filter((_, ei) => ei !== exIdx) } : w
        )
      } : b
    ))
  }

  const updateExercise = (blockIdx: number, workoutIdx: number, exIdx: number, field: keyof WorkoutExercise, value: any) => {
    setBlocks(prev => prev.map((b, bi) =>
      bi === blockIdx ? {
        ...b,
        workouts: b.workouts.map((w, wi) =>
          wi === workoutIdx ? {
            ...w,
            exercises: w.exercises.map((ex, ei) => ei === exIdx ? { ...ex, [field]: value } : ex)
          } : w
        )
      } : b
    ))
  }

  const submit = async () => {
    if (!title.trim()) { setError('Program title is required.'); return }
    if (blocks.some(b => b.workouts.length === 0)) { setError('Each block needs at least one workout.'); return }
    setError('')
    setSaving(true)

    const payload = {
      title,
      label: label || title,
      description: description || null,
      duration_weeks: durationWeeks,
      blocks: blocks.map((b, bi) => ({
        name: b.name,
        focus: b.focus,
        week_start: bi * Math.ceil(durationWeeks / blocks.length) + 1,
        week_end: Math.min((bi + 1) * Math.ceil(durationWeeks / blocks.length), durationWeeks),
        workouts: b.workouts.map((w, wi) => ({
          name: w.name || `Day ${wi + 1}`,
          day_of_week: w.day_of_week,
          week_number: 1,
          description: '',
          exercises: w.exercises.filter(ex => ex.name.trim()).map(({ _key, ...ex }) => ex),
        })),
      })),
    }

    const res = await fetch('/api/coach/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      setSuccess('Program created and pushed to all athletes!')
      setTitle('')
      setLabel('')
      setDescription('')
      setBlocks([makeBlock(0)])
      fetchPrograms()
      setTimeout(() => setSuccess(''), 4000)
    } else {
      setError('Failed to create program. Please try again.')
    }
    setSaving(false)
  }

  const deleteProgram = async (id: string) => {
    await fetch('/api/coach/programs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    fetchPrograms()
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-gray-100 mb-1">Create Training Program</h3>
        <p className="text-sm text-gray-500">Build a program and push it to all your athletes.</p>
      </div>

      {success && (
        <div className="bg-green-900/30 border border-green-500/30 text-green-300 text-sm px-4 py-2.5 rounded-xl">
          {success}
        </div>
      )}

      {/* Program metadata */}
      <div className="space-y-3">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Program title *"
          className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cta/50"
        />
        <input
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Label for athletes (default: title)"
          className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cta/50"
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cta/50 resize-none"
        />
        <div>
          <label className="text-xs text-gray-500 block mb-1">Duration</label>
          <div className="flex gap-2">
            {[4, 8, 12].map(w => (
              <button
                key={w}
                onClick={() => setDurationWeeks(w)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                  durationWeeks === w
                    ? 'bg-cta/20 text-cta border-cta/30'
                    : 'bg-gray-800 text-gray-400 border-white/10 hover:border-white/20'
                }`}
              >
                {w} Weeks
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Blocks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-100">Program Blocks</h4>
          <button onClick={addBlock} className="text-xs text-cta hover:underline">+ Add Block</button>
        </div>

        {blocks.map((block, bi) => (
          <div key={block._key} className="bg-gray-800/50 rounded-xl border border-white/10 overflow-hidden">
            <button
              onClick={() => setExpandedBlock(expandedBlock === block._key ? null : block._key)}
              className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-800 transition-colors"
            >
              <span className="text-sm font-medium text-gray-200">{block.name || `Block ${bi + 1}`}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{block.workouts.length} workouts</span>
                <span className="text-gray-500 text-xs">{expandedBlock === block._key ? '▲' : '▼'}</span>
              </div>
            </button>

            {expandedBlock === block._key && (
              <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                  <input
                    value={block.name}
                    onChange={e => updateBlock(bi, 'name', e.target.value)}
                    placeholder="Block name"
                    className="flex-1 bg-gray-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500"
                  />
                  <input
                    value={block.focus}
                    onChange={e => updateBlock(bi, 'focus', e.target.value)}
                    placeholder="Focus (e.g., Strength, Speed)"
                    className="flex-1 bg-gray-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500"
                  />
                </div>

                {/* Workouts within block */}
                {block.workouts.map((workout, wi) => (
                  <div key={workout._key} className="bg-gray-900/50 rounded-lg p-3 space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        value={workout.name}
                        onChange={e => updateWorkout(bi, wi, 'name', e.target.value)}
                        placeholder="Workout name"
                        className="flex-1 bg-gray-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500"
                      />
                      <select
                        value={workout.day_of_week}
                        onChange={e => updateWorkout(bi, wi, 'day_of_week', parseInt(e.target.value))}
                        className="bg-gray-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100"
                      >
                        {DAY_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                      {block.workouts.length > 1 && (
                        <button onClick={() => removeWorkout(bi, wi)} className="text-red-400 hover:text-red-300 text-xs px-2 shrink-0">Remove</button>
                      )}
                    </div>

                    {/* Exercises */}
                    {workout.exercises.map((ex, ei) => (
                      <div key={ex._key} className="rounded bg-gray-700/30 p-2 space-y-1.5">
                        <input
                          value={ex.name}
                          onChange={e => updateExercise(bi, wi, ei, 'name', e.target.value)}
                          placeholder="Exercise name"
                          className="w-full bg-gray-700 border border-white/10 rounded px-2 py-1.5 text-xs text-gray-100 placeholder:text-gray-500"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={ex.sets}
                            onChange={e => updateExercise(bi, wi, ei, 'sets', parseInt(e.target.value) || 1)}
                            className="bg-gray-700 border border-white/10 rounded px-2 py-1.5 text-xs text-gray-100 w-14 text-center"
                            placeholder="Sets"
                          />
                          <span className="text-xs text-gray-500">x</span>
                          <input
                            value={ex.reps}
                            onChange={e => updateExercise(bi, wi, ei, 'reps', e.target.value)}
                            className="bg-gray-700 border border-white/10 rounded px-2 py-1.5 text-xs text-gray-100 w-20"
                            placeholder="Reps"
                          />
                          <input
                            value={ex.notes}
                            onChange={e => updateExercise(bi, wi, ei, 'notes', e.target.value)}
                            placeholder="Notes"
                            className="flex-1 min-w-0 bg-gray-700 border border-white/10 rounded px-2 py-1.5 text-xs text-gray-100 placeholder:text-gray-500"
                          />
                          <button onClick={() => removeExercise(bi, wi, ei)} className="text-red-400 text-xs shrink-0">x</button>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => addExercise(bi, wi)} className="text-xs text-cta hover:underline">+ Add Exercise</button>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-1">
                  <button onClick={() => addWorkout(bi)} className="text-xs text-cta hover:underline">+ Add Workout</button>
                  {blocks.length > 1 && (
                    <button onClick={() => removeBlock(bi)} className="text-xs text-red-400 hover:text-red-300">Remove Block</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={submit}
        disabled={saving}
        className="w-full bg-cta hover:bg-brand-600 text-gray-900 font-bold px-4 py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
      >
        {saving ? 'Creating...' : 'Push to All Athletes'}
      </button>

      {/* Existing programs */}
      {existingPrograms.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-100 mb-3">Your Programs</h4>
          <div className="space-y-2">
            {existingPrograms.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50 border border-white/10">
                <div>
                  <p className="text-sm font-medium text-gray-200">{p.title}</p>
                  <p className="text-xs text-gray-500">
                    {p.athlete_count} athletes · {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button onClick={() => deleteProgram(p.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
