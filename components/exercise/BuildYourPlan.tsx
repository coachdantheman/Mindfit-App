'use client'
import { useState } from 'react'
import { WorkoutExercise } from '@/types'
import { generatePlanTemplate } from '@/lib/workout-templates'

const SPORTS = [
  'Football', 'Basketball', 'Baseball', 'Soccer', 'Hockey',
  'Tennis', 'Track & Field', 'Swimming', 'Volleyball',
  'Lacrosse', 'Wrestling', 'Golf', 'Softball', 'Cross Country',
]

const GOALS = [
  { key: 'strength', label: 'Strength' },
  { key: 'speed', label: 'Speed' },
  { key: 'explosiveness', label: 'Explosiveness' },
  { key: 'endurance', label: 'Endurance' },
  { key: 'flexibility', label: 'Flexibility' },
  { key: 'sport-specific', label: 'Sport-Specific Skills' },
]

interface EditableExercise extends WorkoutExercise {
  _key: string
}

interface EditableWorkout {
  name: string
  description: string
  day_of_week: number
  week_number: number
  exercises: EditableExercise[]
}

interface EditableBlock {
  name: string
  focus: string
  week_start: number
  week_end: number
  workouts: EditableWorkout[]
}

interface EditablePlan {
  title: string
  description: string
  blocks: EditableBlock[]
}

interface Props {
  onPlanSaved?: () => void
  showSuccess?: (msg: string) => void
}

let keyCounter = 0
function nextKey() { return `ex-${++keyCounter}` }

function toEditable(plan: ReturnType<typeof generatePlanTemplate>, durationWeeks: number): EditablePlan {
  return {
    title: plan.title,
    description: plan.description,
    blocks: plan.blocks.map((block, bi) => {
      const weekStart = bi * 4 + 1
      const weekEnd = Math.min((bi + 1) * 4, durationWeeks)
      const workouts: EditableWorkout[] = []
      for (let week = weekStart; week <= weekEnd; week++) {
        const seen = new Set<number>()
        block.workouts
          .filter(w => !seen.has(w.day_of_week) && (seen.add(w.day_of_week), true))
          .map(w => ({
            name: w.name,
            description: w.description,
            day_of_week: w.day_of_week,
            week_number: week,
            exercises: w.exercises.map(ex => ({ ...ex, _key: nextKey() })),
          }))
          .forEach(w => workouts.push(w))
      }
      return { name: block.name, focus: block.focus, week_start: weekStart, week_end: weekEnd, workouts }
    }),
  }
}

const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function BuildYourPlan({ onPlanSaved, showSuccess }: Props) {
  const [sport, setSport] = useState('')
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const [experience, setExperience] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [daysPerWeek, setDaysPerWeek] = useState(4)
  const [durationWeeks, setDurationWeeks] = useState(8)
  const [error, setError] = useState('')

  const [editablePlan, setEditablePlan] = useState<EditablePlan | null>(null)
  const [editingWorkout, setEditingWorkout] = useState<{ bi: number; wi: number } | null>(null)
  const [savingPlan, setSavingPlan] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [enhanceProgress, setEnhanceProgress] = useState(0)

  const toggleGoal = (key: string) => {
    setSelectedGoals(prev =>
      prev.includes(key) ? prev.filter(g => g !== key) : [...prev, key]
    )
  }

  const generateInstant = () => {
    if (!sport.trim() || selectedGoals.length === 0) {
      setError('Please select a sport and at least one goal.')
      return
    }
    setError('')
    const template = generatePlanTemplate(sport, selectedGoals, experience, daysPerWeek, durationWeeks)
    setEditablePlan(toEditable(template, durationWeeks))
    showSuccess?.('Plan generated! Customize and save below.')
  }

  const enhanceWithAI = async () => {
    if (!sport.trim() || selectedGoals.length === 0) {
      setError('Please select a sport and at least one goal.')
      return
    }
    setEnhancing(true)
    setEnhanceProgress(0)
    setError('')

    // Simulate progress while AI works
    let progressDone = false
    const progressInterval = setInterval(() => {
      if (progressDone) return
      setEnhanceProgress(prev => {
        if (prev >= 90) return 90
        return prev + Math.random() * 8 + 2
      })
    }, 800)

    const cleanup = () => {
      progressDone = true
      clearInterval(progressInterval)
      setEnhanceProgress(100)
      setTimeout(() => { setEnhancing(false); setEnhanceProgress(0) }, 400)
    }

    try {
      const res = await fetch('/api/exercise/programs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport,
          goals: selectedGoals,
          experience_level: experience,
          days_per_week: daysPerWeek,
          duration_weeks: durationWeeks,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error || 'AI generation failed. Try "Generate My Plan" instead.')
        cleanup()
        return
      }
      const data = await res.json()
      if (!data.blocks || data.blocks.length === 0) {
        setError('AI returned an incomplete plan. Try "Generate My Plan" instead.')
        cleanup()
        return
      }
      const blocks = data.blocks.map((block: any, bi: number) => {
        const workouts = (block.workouts || []).map((w: any) => ({
          name: w.name || 'Workout',
          description: w.description || '',
          day_of_week: w.day_of_week || 1,
          week_number: w.week_number || 1,
          exercises: (w.exercises || []).map((ex: any) => ({
            name: ex.name || '',
            sets: ex.sets || 3,
            reps: String(ex.reps || '10'),
            notes: ex.notes || '',
            _key: nextKey(),
          })),
        }))
        if (workouts.length === 0 || workouts.every((w: any) => w.exercises.length === 0)) {
          return null
        }
        return {
          name: block.name || `Phase ${bi + 1}`,
          focus: block.focus || '',
          week_start: block.week_start || bi * 4 + 1,
          week_end: block.week_end || Math.min((bi + 1) * 4, durationWeeks),
          workouts,
        }
      }).filter(Boolean)

      if (blocks.length === 0) {
        setError('AI returned an incomplete plan. Try "Generate My Plan" instead.')
        cleanup()
        return
      }
      setEditablePlan({ title: data.title || `${sport} AI Plan`, description: data.description || '', blocks })
      showSuccess?.('AI plan generated! Customize and save below.')
    } catch {
      setError('AI generation failed. Try "Generate My Plan" instead.')
    }
    cleanup()
  }

  const updateExercise = (bi: number, wi: number, ei: number, field: keyof WorkoutExercise, value: any) => {
    setEditablePlan(prev => {
      if (!prev) return prev
      const plan = { ...prev, blocks: prev.blocks.map(b => ({ ...b, workouts: b.workouts.map(w => ({ ...w, exercises: [...w.exercises] })) })) }
      plan.blocks[bi].workouts[wi].exercises[ei] = { ...plan.blocks[bi].workouts[wi].exercises[ei], [field]: value }
      return plan
    })
  }

  const removeExercise = (bi: number, wi: number, ei: number) => {
    setEditablePlan(prev => {
      if (!prev) return prev
      const plan = { ...prev, blocks: prev.blocks.map(b => ({ ...b, workouts: b.workouts.map(w => ({ ...w, exercises: [...w.exercises] })) })) }
      plan.blocks[bi].workouts[wi].exercises.splice(ei, 1)
      return plan
    })
  }

  const addExercise = (bi: number, wi: number) => {
    setEditablePlan(prev => {
      if (!prev) return prev
      const plan = { ...prev, blocks: prev.blocks.map(b => ({ ...b, workouts: b.workouts.map(w => ({ ...w, exercises: [...w.exercises] })) })) }
      plan.blocks[bi].workouts[wi].exercises.push({ name: 'New Exercise', sets: 3, reps: '10', notes: '', _key: nextKey() })
      return plan
    })
  }

  const updateWorkoutField = (bi: number, wi: number, field: 'name' | 'description', value: string) => {
    setEditablePlan(prev => {
      if (!prev) return prev
      const plan = { ...prev, blocks: prev.blocks.map(b => ({ ...b, workouts: [...b.workouts] })) }
      plan.blocks[bi].workouts[wi] = { ...plan.blocks[bi].workouts[wi], [field]: value }
      return plan
    })
  }

  const savePlan = async () => {
    if (!editablePlan) return
    setSavingPlan(true)
    setError('')
    const payload = {
      title: editablePlan.title,
      description: editablePlan.description,
      sport,
      goals: selectedGoals,
      duration_weeks: durationWeeks,
      source: 'self' as const,
      blocks: editablePlan.blocks.map(block => ({
        name: block.name,
        focus: block.focus,
        week_start: block.week_start,
        week_end: block.week_end,
        workouts: block.workouts.map(w => ({
          name: w.name,
          description: w.description,
          day_of_week: w.day_of_week,
          week_number: w.week_number,
          exercises: w.exercises.map(({ _key, ...ex }) => ex),
        })),
      })),
    }

    const res = await fetch('/api/exercise/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      setEditablePlan(null)
      showSuccess?.('Plan saved successfully!')
      onPlanSaved?.()
    } else {
      setError('Failed to save plan. Please try again.')
    }
    setSavingPlan(false)
  }

  // Editable plan preview
  if (editablePlan) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-100">Customize Your Plan</h3>
          <div className="flex gap-2">
            <button onClick={() => setEditablePlan(null)} className="text-xs text-gray-500 hover:text-gray-300">Cancel</button>
            <button onClick={enhanceWithAI} disabled={enhancing} className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50">
              {enhancing ? 'Enhancing...' : 'Enhance with AI'}
            </button>
          </div>
        </div>

        {/* Progress bar when AI is enhancing */}
        {enhancing && (
          <div className="bg-gray-900 rounded-2xl border border-purple-500/30 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-400 animate-pulse" />
              <p className="text-sm font-medium text-purple-300">AI is building your personalized plan...</p>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-purple-400 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${enhanceProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-500">This may take 15-30 seconds</p>
          </div>
        )}

        <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
          <h3 className="font-bold text-gray-100">{editablePlan.title}</h3>
          <p className="text-xs text-gray-500 mt-1">{editablePlan.description}</p>
        </div>

        {/* Save button at top for easy access */}
        <button
          onClick={savePlan}
          disabled={savingPlan || enhancing}
          className="w-full bg-cta hover:bg-brand-600 text-gray-900 font-bold px-4 py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
        >
          {savingPlan ? 'Saving...' : 'Save This Plan'}
        </button>

        {editablePlan.blocks.map((block, bi) => (
          <div key={bi} className="bg-gray-900 rounded-2xl border border-white/10 p-4 space-y-3">
            <div>
              <p className="font-semibold text-gray-100">{block.name}</p>
              <p className="text-xs text-gray-500">
                Weeks {block.week_start}-{block.week_end} · {block.focus}
              </p>
            </div>

            {Array.from(new Set(block.workouts.map(w => w.week_number)))
              .sort((a, b) => a - b)
              .slice(0, 1)
              .map(weekNum => (
                <div key={weekNum}>
                  <p className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-2">
                    Week {weekNum}
                  </p>
                  {block.workouts
                    .filter(w => w.week_number === weekNum)
                    .sort((a, b) => a.day_of_week - b.day_of_week)
                    .map((workout, wi) => {
                      const actualWi = block.workouts.indexOf(workout)
                      const isEditing = editingWorkout?.bi === bi && editingWorkout?.wi === actualWi
                      return (
                        <div key={wi} className="bg-gray-800/50 rounded-xl p-3 mb-2">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              {isEditing ? (
                                <input
                                  value={workout.name}
                                  onChange={e => updateWorkoutField(bi, actualWi, 'name', e.target.value)}
                                  className="bg-gray-700 border border-white/10 rounded px-2 py-1 text-sm text-gray-100 w-full"
                                />
                              ) : (
                                <p className="text-sm font-medium text-gray-200 truncate">
                                  {DAY_NAMES[workout.day_of_week]} — {workout.name}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 truncate">{workout.description}</p>
                            </div>
                            <button
                              onClick={() => setEditingWorkout(isEditing ? null : { bi, wi: actualWi })}
                              className="text-xs text-cta hover:underline ml-2 shrink-0"
                            >
                              {isEditing ? 'Done' : 'Edit'}
                            </button>
                          </div>

                          <div className="space-y-1">
                            {workout.exercises.map((ex, ei) => (
                              <div key={ex._key} className={`rounded bg-gray-700/30 ${isEditing ? 'p-2 space-y-1.5' : 'flex items-center gap-2 p-1.5'}`}>
                                {isEditing ? (
                                  <>
                                    <input
                                      value={ex.name}
                                      onChange={e => updateExercise(bi, actualWi, ei, 'name', e.target.value)}
                                      className="bg-gray-700 border border-white/10 rounded px-2 py-1 text-xs text-gray-100 w-full"
                                    />
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        value={ex.sets}
                                        onChange={e => updateExercise(bi, actualWi, ei, 'sets', parseInt(e.target.value) || 1)}
                                        className="bg-gray-700 border border-white/10 rounded px-1.5 py-1 text-xs text-gray-100 w-14 text-center"
                                        placeholder="Sets"
                                      />
                                      <span className="text-xs text-gray-500">x</span>
                                      <input
                                        value={ex.reps}
                                        onChange={e => updateExercise(bi, actualWi, ei, 'reps', e.target.value)}
                                        className="bg-gray-700 border border-white/10 rounded px-1.5 py-1 text-xs text-gray-100 w-20"
                                        placeholder="Reps"
                                      />
                                      <button
                                        onClick={() => removeExercise(bi, actualWi, ei)}
                                        className="text-red-400 hover:text-red-300 text-xs px-1 shrink-0"
                                      >
                                        x
                                      </button>
                                    </div>
                                    <input
                                      value={ex.notes || ''}
                                      onChange={e => updateExercise(bi, actualWi, ei, 'notes', e.target.value)}
                                      placeholder="Notes"
                                      className="bg-gray-700 border border-white/10 rounded px-2 py-1 text-xs text-gray-100 w-full placeholder:text-gray-600"
                                    />
                                  </>
                                ) : (
                                  <>
                                    <p className="text-xs text-gray-300 flex-1 truncate">{ex.name}</p>
                                    <p className="text-[10px] text-gray-500 shrink-0">
                                      {ex.sets} x {ex.reps}
                                      {ex.notes ? ` · ${ex.notes}` : ''}
                                    </p>
                                  </>
                                )}
                              </div>
                            ))}
                            {isEditing && (
                              <button
                                onClick={() => addExercise(bi, actualWi)}
                                className="text-xs text-cta hover:underline mt-1"
                              >
                                + Add Exercise
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              ))}
            {block.workouts.length > block.workouts.filter(w => w.week_number === block.week_start).length && (
              <p className="text-xs text-gray-500 italic">
                Weeks {block.week_start + 1}-{block.week_end} follow the same structure.
              </p>
            )}
          </div>
        ))}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={savePlan}
          disabled={savingPlan}
          className="w-full bg-cta hover:bg-brand-600 text-gray-900 font-bold px-4 py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
        >
          {savingPlan ? 'Saving...' : 'Save This Plan'}
        </button>
      </div>
    )
  }

  // Builder form
  return (
    <div className="space-y-5">
      <div className="bg-gray-900 rounded-2xl border border-white/10 p-5 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-100 mb-1">Create a Plan</h3>
          <p className="text-xs text-gray-500">Enter your sport and goals to generate a periodized training program. Edit any workout before saving.</p>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Sport</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={SPORTS.includes(sport) ? sport : ''}
              onChange={e => setSport(e.target.value)}
              className="flex-1 bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cta/50"
            >
              <option value="">Select sport...</option>
              {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input
              value={!SPORTS.includes(sport) ? sport : ''}
              onChange={e => setSport(e.target.value)}
              placeholder="Or type your sport"
              className="flex-1 bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cta/50"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-2">Goals</label>
          <div className="flex flex-wrap gap-2">
            {GOALS.map(g => (
              <button
                key={g.key}
                onClick={() => toggleGoal(g.key)}
                className={`px-3 py-2 rounded-full text-xs font-medium border transition-all ${
                  selectedGoals.includes(g.key)
                    ? 'bg-cta/20 text-cta border-cta/30'
                    : 'bg-gray-800 text-gray-400 border-white/10 hover:border-white/20'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-2">Experience Level</label>
          <div className="flex gap-2">
            {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
              <button
                key={level}
                onClick={() => setExperience(level)}
                className={`flex-1 py-2.5 rounded-lg text-xs font-medium border transition-all ${
                  experience === level
                    ? 'bg-cta/20 text-cta border-cta/30'
                    : 'bg-gray-800 text-gray-400 border-white/10 hover:border-white/20'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Days Per Week: {daysPerWeek}</label>
          <input
            type="range"
            min={3}
            max={6}
            value={daysPerWeek}
            onChange={e => setDaysPerWeek(parseInt(e.target.value))}
            className="w-full h-2 rounded-full appearance-none bg-gray-700 accent-cta"
          />
          <div className="flex justify-between text-[10px] text-gray-600 mt-1">
            <span>3</span><span>4</span><span>5</span><span>6</span>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-2">Program Duration</label>
          <div className="flex gap-2">
            {[4, 8, 12].map(w => (
              <button
                key={w}
                onClick={() => setDurationWeeks(w)}
                className={`flex-1 py-2.5 rounded-lg text-xs font-medium border transition-all ${
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

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={generateInstant}
          className="w-full bg-cta hover:bg-brand-600 text-gray-900 font-bold px-4 py-3 rounded-xl text-sm transition-colors"
        >
          Generate My Plan
        </button>

        <button
          onClick={enhanceWithAI}
          disabled={enhancing || !sport.trim() || selectedGoals.length === 0}
          className="w-full bg-purple-900/30 hover:bg-purple-900/50 text-purple-300 font-medium px-4 py-2.5 rounded-xl text-xs transition-colors disabled:opacity-40 border border-purple-500/20"
        >
          {enhancing ? 'Generating with AI...' : 'Or Generate with AI (more detailed)'}
        </button>

        {enhancing && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-400 animate-pulse" />
              <p className="text-sm font-medium text-purple-300">AI is building your personalized plan...</p>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-purple-400 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${enhanceProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-500">This may take 15-30 seconds</p>
          </div>
        )}
      </div>
    </div>
  )
}
