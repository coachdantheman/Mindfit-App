'use client'
import { useState, useCallback } from 'react'
import { Workout, WorkoutExercise } from '@/types'
import PreBuiltWorkouts from '@/components/exercise/PreBuiltWorkouts'
import TrackWorkout from '@/components/exercise/TrackWorkout'
import BuildYourPlan from '@/components/exercise/BuildYourPlan'
import PersonalizedPlan from '@/components/exercise/PersonalizedPlan'

type Tab = 'create' | 'plan' | 'prebuilt' | 'track'

const TABS: { key: Tab; label: string }[] = [
  { key: 'create', label: 'Create a Plan' },
  { key: 'plan', label: 'My Plan' },
  { key: 'prebuilt', label: 'Pre-Built' },
  { key: 'track', label: 'Track' },
]

export default function ExercisePage() {
  const [tab, setTab] = useState<Tab>('plan')
  const [planRefreshKey, setPlanRefreshKey] = useState(0)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [trackingWorkout, setTrackingWorkout] = useState<{
    exercises: WorkoutExercise[]
    name: string
    categoryName: string
    workoutId?: string
    programWorkoutId?: string
    source: 'prebuilt' | 'custom' | 'coach'
  } | null>(null)

  const showSuccess = useCallback((msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }, [])

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

  const handlePlanWorkout = useCallback((exercises: WorkoutExercise[], name: string, programWorkoutId: string) => {
    setTrackingWorkout({
      exercises,
      name,
      categoryName: 'My Plan',
      programWorkoutId,
      source: 'custom',
    })
    setTab('track')
  }, [])

  const handleTrackDone = useCallback(() => {
    setTrackingWorkout(null)
  }, [])

  const handlePlanSaved = useCallback(() => {
    setPlanRefreshKey(k => k + 1)
    setTab('plan')
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Exercise</h1>
        <p className="text-gray-500 text-sm mt-1">Build plans, browse workouts, and track your training.</p>
      </div>

      {/* Tab bar — scrollable on mobile */}
      <div className="flex gap-1 bg-gray-900 rounded-xl p-1 border border-white/10 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 min-w-fit px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.key
                ? 'bg-cta/20 text-cta'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Keep-alive tabs — use hidden instead of conditional rendering */}
      <div className={tab === 'create' ? '' : 'hidden'}>
        <BuildYourPlan onPlanSaved={handlePlanSaved} showSuccess={showSuccess} />
      </div>
      <div className={tab === 'plan' ? '' : 'hidden'}>
        <PersonalizedPlan
          onStartWorkout={handlePlanWorkout}
          onGoToCreate={() => setTab('create')}
          refreshKey={planRefreshKey}
        />
      </div>
      <div className={tab === 'prebuilt' ? '' : 'hidden'}>
        <PreBuiltWorkouts onStartWorkout={handleStartWorkout} showSuccess={showSuccess} />
      </div>
      <div className={tab === 'track' ? '' : 'hidden'}>
        <TrackWorkout
          initialWorkout={trackingWorkout || undefined}
          onDone={handleTrackDone}
          showSuccess={showSuccess}
        />
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="fixed bottom-28 sm:bottom-8 left-1/2 -translate-x-1/2 bg-green-900/90 text-green-300 border border-green-500/30 px-5 py-2.5 rounded-xl text-sm font-medium z-50 shadow-lg">
          {successMsg}
        </div>
      )}
    </div>
  )
}
