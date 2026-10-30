'use client'
import TabBar from '@/components/shared/TabBar'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Workout } from '@/types'
import type { AthleteProfile, ExerciseLibraryRow, MuscleGroup, StartWorkoutInput } from '@/types/exercise'
import MyPlan from '@/components/exercise/MyPlan'
import TrackWorkout from '@/components/exercise/TrackWorkout'
import StrengthStandards from '@/components/exercise/StrengthStandards'
import PreBuiltWorkouts from '@/components/exercise/PreBuiltWorkouts'
import LessonLinks from '@/components/shared/LessonLinks'
import { clearDraft, draftFromWorkout, draftStats, loadDraft, saveDraft, type WorkoutDraft } from '@/lib/workout-draft'

type Tab = 'plan' | 'track' | 'strength' | 'prebuilt'
type ToastKind = 'success' | 'error'

const TABS: { key: Tab; label: string }[] = [
  { key: 'plan', label: 'My Plan' },
  { key: 'track', label: 'Track' },
  { key: 'strength', label: 'Strength' },
  { key: 'prebuilt', label: 'Pre-Built' },
]

export default function ExercisePage() {
  const [tab, setTab] = useState<Tab>('plan')
  const [library, setLibrary] = useState<ExerciseLibraryRow[]>([])
  const [profile, setProfile] = useState<AthleteProfile | null>(null)
  const [suggestedBodyweight, setSuggestedBodyweight] = useState<number | null>(null)
  const [draft, setDraft] = useState<WorkoutDraft | null>(null)
  const [savedDraft, setSavedDraft] = useState<WorkoutDraft | null>(null)
  const [toast, setToast] = useState<{ msg: string; kind: ToastKind } | null>(null)
  const [historyKey, setHistoryKey] = useState(0)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()

  const notify = useCallback((msg: string, kind: ToastKind = 'success') => {
    setToast({ msg, kind })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), kind === 'error' ? 4000 : 2500)
  }, [])

  useEffect(() => {
    fetch('/api/exercise/library').then(r => (r.ok ? r.json() : [])).then(d => { if (Array.isArray(d)) setLibrary(d) }).catch(() => {})
    fetch('/api/exercise/profile').then(r => (r.ok ? r.json() : null)).then(d => {
      if (!d) return
      setProfile(d.profile ?? null)
      setSuggestedBodyweight(d.suggested_bodyweight_lb ?? null)
    }).catch(() => {})
    const saved = loadDraft()
    if (saved) { setSavedDraft(saved); setTab('track') }
  }, [])

  const createExercise = useCallback(async (name: string, muscle_group: MuscleGroup): Promise<ExerciseLibraryRow | null> => {
    const res = await fetch('/api/exercise/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, muscle_group }),
    })
    if (!res.ok) { notify("Couldn't add that exercise.", 'error'); return null }
    const row = (await res.json()) as ExerciseLibraryRow
    setLibrary(prev => (prev.some(e => e.id === row.id) ? prev : [...prev, row]))
    return row
  }, [notify])

  const startSession = useCallback((input: StartWorkoutInput) => {
    const pending = draft ?? savedDraft
    if (pending && draftStats(pending).doneSets > 0 && !confirm(`You have an unfinished workout (${pending.name || 'Workout'}). Replace it?`)) return
    const d = draftFromWorkout(input, library)
    saveDraft(d)
    setSavedDraft(null)
    setDraft(d)
    setTab('track')
  }, [draft, savedDraft, library])

  const handlePrebuilt = useCallback((workout: Workout, categoryName: string) => {
    startSession({ name: workout.name, categoryName, exercises: workout.exercises, source: 'prebuilt', workoutId: workout.id })
  }, [startSession])

  const onDraftChange = useCallback((d: WorkoutDraft | null) => {
    setDraft(d)
    if (d === null) setHistoryKey(k => k + 1)
  }, [])

  const hasDraft = !!(draft || savedDraft)

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Exercise</h1>
        <p className="page-subtitle">Follow your plan, log sets fast, and see where your strength stands.</p>
      </div>

      <TabBar
        label="Exercise sections"
        tabs={TABS.map(t => ({
          ...t,
          badge: t.key === 'track' && hasDraft ? <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cta" role="img" aria-label="Workout in progress" /> : undefined,
        }))}
        active={tab}
        onSelect={setTab}
      />

      {/* Keep-alive tabs — hidden instead of unmounted so form state survives */}
      <div className={tab === 'plan' ? '' : 'hidden'}>
        <MyPlan library={library} onStart={startSession} onCreateExercise={createExercise} notify={notify} refreshKey={0} />
      </div>
      <div className={tab === 'track' ? '' : 'hidden'}>
        <TrackWorkout
          draft={draft}
          savedDraft={savedDraft}
          library={library}
          onDraftChange={onDraftChange}
          onResume={() => { if (savedDraft) { setDraft(savedDraft); setSavedDraft(null) } }}
          onDiscardSaved={() => { clearDraft(); setSavedDraft(null) }}
          onStart={startSession}
          onCreateExercise={createExercise}
          notify={notify}
          refreshKey={historyKey}
        />
      </div>
      <div className={tab === 'strength' ? '' : 'hidden'}>
        <StrengthStandards
          profile={profile}
          suggestedBodyweight={suggestedBodyweight}
          library={library}
          onProfileSaved={setProfile}
          notify={notify}
        />
      </div>
      <div className={tab === 'prebuilt' ? '' : 'hidden'}>
        <PreBuiltWorkouts onStartWorkout={handlePrebuilt} notify={notify} />
      </div>

      {toast && (
        <div
          role="status"
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-[92vw] bg-surface border text-sm px-4 py-2.5 rounded-xl shadow-lg ${
            toast.kind === 'error' ? 'border-red-500/40 text-red-400' : 'border-cta/40 text-fg-1'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <LessonLinks section="exercise" />
    </div>
  )
}
