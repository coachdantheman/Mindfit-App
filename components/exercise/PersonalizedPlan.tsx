'use client'
import { useState, useEffect } from 'react'
import { TrainingProgram, ProgramWorkout, WorkoutExercise } from '@/types'
import ProgramView from './ProgramView'

interface Props {
  onStartWorkout: (exercises: WorkoutExercise[], name: string, programWorkoutId: string) => void
  onGoToCreate: () => void
  refreshKey: number
}

export default function PersonalizedPlan({ onStartWorkout, onGoToCreate, refreshKey }: Props) {
  const [program, setProgram] = useState<TrainingProgram | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/exercise/programs?active=true')
      .then(async r => {
        if (r.ok) {
          const data = await r.json()
          setProgram(data.length > 0 ? data[0] : null)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [refreshKey])

  const deleteProgram = async () => {
    if (!program) return
    await fetch('/api/exercise/programs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: program.id }),
    })
    setProgram(null)
  }

  const handleStartWorkout = (workout: ProgramWorkout) => {
    onStartWorkout(workout.exercises as WorkoutExercise[], workout.name, workout.id)
  }

  if (loading) return <p className="text-sm text-gray-500">Loading your plan...</p>

  if (!program) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">🏋️</div>
        <p className="font-medium text-gray-300">No plan yet</p>
        <p className="text-sm text-gray-500 mt-1 mb-4">Create a personalized training program to get started.</p>
        <button
          onClick={onGoToCreate}
          className="bg-cta hover:bg-brand-600 text-gray-900 font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
        >
          Create a Plan
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-100">Your Active Plan</h3>
        <button
          onClick={onGoToCreate}
          className="text-xs text-cta hover:underline"
        >
          Create New Plan
        </button>
      </div>
      <ProgramView
        program={program}
        onStartWorkout={handleStartWorkout}
        onDelete={deleteProgram}
      />
    </div>
  )
}
