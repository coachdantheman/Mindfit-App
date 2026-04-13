'use client'
import { useState, useEffect } from 'react'
import { TrainingProgram } from '@/types'
import ProgramView from './ProgramView'

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

export default function BuildYourPlan() {
  const [activeProgram, setActiveProgram] = useState<TrainingProgram | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)

  // Builder form
  const [sport, setSport] = useState('')
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const [experience, setExperience] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [daysPerWeek, setDaysPerWeek] = useState(4)
  const [durationWeeks, setDurationWeeks] = useState(8)
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const [savingPlan, setSavingPlan] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchActiveProgram()
  }, [])

  const fetchActiveProgram = async () => {
    setLoading(true)
    const res = await fetch('/api/exercise/programs?active=true')
    if (res.ok) {
      const data = await res.json()
      setActiveProgram(data.length > 0 ? data[0] : null)
    }
    setLoading(false)
  }

  const toggleGoal = (key: string) => {
    setSelectedGoals(prev =>
      prev.includes(key) ? prev.filter(g => g !== key) : [...prev, key]
    )
  }

  const generate = async () => {
    if (!sport.trim() || selectedGoals.length === 0) {
      setError('Please select a sport and at least one goal.')
      return
    }
    setError('')
    setGenerating(true)
    setPreview(null)

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

    if (res.ok) {
      const data = await res.json()
      setPreview(data)
    } else {
      const err = await res.json()
      setError(err.error || 'Failed to generate. Please try again.')
    }
    setGenerating(false)
  }

  const savePlan = async () => {
    if (!preview) return
    setSavingPlan(true)

    const res = await fetch('/api/exercise/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...preview,
        sport,
        goals: selectedGoals,
        duration_weeks: durationWeeks,
        source: 'ai',
      }),
    })

    if (res.ok) {
      setPreview(null)
      setShowBuilder(false)
      await fetchActiveProgram()
    }
    setSavingPlan(false)
  }

  const deleteProgram = async () => {
    if (!activeProgram) return
    await fetch('/api/exercise/programs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activeProgram.id }),
    })
    setActiveProgram(null)
  }

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>

  // Show preview if generated
  if (preview) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-100">Preview Your Plan</h3>
          <div className="flex gap-2">
            <button onClick={() => setPreview(null)} className="text-xs text-gray-500 hover:text-gray-300">Cancel</button>
            <button onClick={generate} className="text-xs text-cta hover:underline">Regenerate</button>
          </div>
        </div>

        {/* Render preview as pseudo-program */}
        <div className="space-y-3">
          <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
            <h3 className="font-bold text-gray-100">{preview.title}</h3>
            {preview.description && <p className="text-xs text-gray-500 mt-1">{preview.description}</p>}
          </div>

          {preview.blocks?.map((block: any, bi: number) => (
            <div key={bi} className="bg-gray-900 rounded-2xl border border-white/10 p-4 space-y-3">
              <div>
                <p className="font-semibold text-gray-100">{block.name}</p>
                <p className="text-xs text-gray-500">
                  Weeks {block.week_start}-{block.week_end}
                  {block.focus ? ` · ${block.focus}` : ''}
                </p>
              </div>
              {block.workouts?.slice(0, 6).map((w: any, wi: number) => (
                <div key={wi} className="bg-gray-800/50 rounded-xl p-3">
                  <p className="text-sm font-medium text-gray-200">{w.name}</p>
                  <p className="text-xs text-gray-500">
                    Day {w.day_of_week} · Week {w.week_number} · {w.exercises?.length || 0} exercises
                  </p>
                </div>
              ))}
              {(block.workouts?.length || 0) > 6 && (
                <p className="text-xs text-gray-500">+ {block.workouts.length - 6} more workouts...</p>
              )}
            </div>
          ))}
        </div>

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

  // Show active program
  if (activeProgram && !showBuilder) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-100">Your Active Plan</h3>
          <button
            onClick={() => setShowBuilder(true)}
            className="text-xs text-cta hover:underline"
          >
            Build New Plan
          </button>
        </div>
        <ProgramView
          program={activeProgram}
          onDelete={deleteProgram}
        />
      </div>
    )
  }

  // Show builder form
  return (
    <div className="space-y-5">
      {activeProgram && (
        <button onClick={() => setShowBuilder(false)} className="text-xs text-gray-500 hover:text-gray-300">
          ← Back to Active Plan
        </button>
      )}

      <div className="bg-gray-900 rounded-2xl border border-white/10 p-5 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-100 mb-1">Build Your Plan</h3>
          <p className="text-xs text-gray-500">AI will create a personalized, periodized training program based on your sport and goals.</p>
        </div>

        {/* Sport */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Sport</label>
          <div className="flex gap-2">
            <select
              value={SPORTS.includes(sport) ? sport : ''}
              onChange={e => setSport(e.target.value)}
              className="flex-1 bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cta/50"
            >
              <option value="">Select sport...</option>
              {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input
              value={!SPORTS.includes(sport) ? sport : ''}
              onChange={e => setSport(e.target.value)}
              placeholder="Or type your sport"
              className="flex-1 bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cta/50"
            />
          </div>
        </div>

        {/* Goals */}
        <div>
          <label className="text-xs text-gray-500 block mb-2">Goals</label>
          <div className="flex flex-wrap gap-2">
            {GOALS.map(g => (
              <button
                key={g.key}
                onClick={() => toggleGoal(g.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
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

        {/* Experience */}
        <div>
          <label className="text-xs text-gray-500 block mb-2">Experience Level</label>
          <div className="flex gap-2">
            {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
              <button
                key={level}
                onClick={() => setExperience(level)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
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

        {/* Days per week */}
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

        {/* Duration */}
        <div>
          <label className="text-xs text-gray-500 block mb-2">Program Duration</label>
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

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={generate}
          disabled={generating}
          className="w-full bg-cta hover:bg-brand-600 text-gray-900 font-bold px-4 py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
        >
          {generating ? 'Generating Your Plan...' : 'Generate My Plan'}
        </button>

        {generating && (
          <p className="text-xs text-gray-500 text-center">
            Building your personalized training program with periodization, sport-specific exercises, and progressive overload...
          </p>
        )}
      </div>
    </div>
  )
}
