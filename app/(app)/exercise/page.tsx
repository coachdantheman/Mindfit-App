'use client'
import { useState, useCallback } from 'react'
import { Workout, WorkoutExercise } from '@/types'
import PreBuiltWorkouts from '@/components/exercise/PreBuiltWorkouts'
import TrackWorkout from '@/components/exercise/TrackWorkout'
import BuildYourPlan from '@/components/exercise/BuildYourPlan'

type Tab = 'build' | 'prebuilt' | 'track'

const TABS: { key: Tab; label: string }[] = [
  { key: 'build', label: 'Build Your Plan' },
  { key: 'prebuilt', label: 'Pre-Built Workouts' },
  { key: 'track', label: 'Track Workouts' },
]

export default function ExercisePage() {
  const [tab, setTab] = useState<Tab>('build')
  const [trackingWorkout, setTrackingWorkout] = useState<{
    exercises: WorkoutExercise[]
    name: string
    categoryName: string
    workoutId?: string
    source: 'prebuilt' | 'custom' | 'coach'
  } | null>(null)

  const handleStartWorkout = useCallback((workout: Workout, categoryName: string) => {
    setTrackingWorkout({
      exercises: workout.exercises,
      name: workout.name,
      categoryName,
      workoutId: workout.id,
      source: 'prebuilt',
    })
    setTab('track')
  }, [])

  const handleTrackDone = useCallback(() => {
    setTrackingWorkout(null)
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Exercise</h1>
        <p className="text-gray-500 text-sm mt-1">Build plans, browse workouts, and track your training.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-900 rounded-xl p-1 border border-white/10 mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-cta/20 text-cta'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'build' && <BuildYourPlan />}
      {tab === 'prebuilt' && <PreBuiltWorkouts onStartWorkout={handleStartWorkout} />}
      {tab === 'track' && (
        <TrackWorkout
          initialWorkout={trackingWorkout || undefined}
          onDone={handleTrackDone}
        />
      )}
    </div>
  )
}
