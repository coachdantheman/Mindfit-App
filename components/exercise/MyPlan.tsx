'use client'
import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import type { ProgramWorkout, WorkoutExercise } from '@/types'
import type { CoachProgramRow, ExerciseLibraryRow, MuscleGroup, StartWorkoutInput, TrainingProgramRow, WorkoutSource } from '@/types/exercise'
import ProgramView from './ProgramView'
import PlanBuilder from './PlanBuilder'
import Skeleton from '@/components/shared/Skeleton'
import { currentWeek, DAY_NAMES, isoDayOfWeek, nextWorkout, parseLocalDate, todaysWorkout, workoutsForWeek } from '@/lib/programs'

interface Props {
  library: ExerciseLibraryRow[]
  onStart: (input: StartWorkoutInput) => void
  onCreateExercise: (name: string, muscle_group: MuscleGroup) => Promise<ExerciseLibraryRow | null>
  notify: (msg: string, kind?: 'success' | 'error') => void
  refreshKey: number
}

export default function MyPlan({ library, onStart, onCreateExercise, notify, refreshKey }: Props) {
  const [program, setProgram] = useState<TrainingProgramRow | null>(null)
  const [coachPrograms, setCoachPrograms] = useState<CoachProgramRow[]>([])
  const [loading, setLoading] = useState(true)
  const [building, setBuilding] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [own, coach] = await Promise.all([
      fetch('/api/exercise/programs?active=true').then(r => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/exercise/coach-programs').then(r => (r.ok ? r.json() : [])).catch(() => []),
    ])
    setProgram(Array.isArray(own) && own.length > 0 ? own[0] : null)
    setCoachPrograms(Array.isArray(coach) ? coach : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  const startFrom = (w: ProgramWorkout, categoryName: string, source: WorkoutSource) =>
    onStart({ name: w.name, categoryName, exercises: w.exercises as WorkoutExercise[], source, programWorkoutId: w.id })

  const deleteProgram = async () => {
    if (!program || !confirm(`Delete "${program.title}"? Logged workouts stay in your history.`)) return
    const res = await fetch('/api/exercise/programs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: program.id }) })
    if (res.ok) { setProgram(null); notify('Plan deleted') } else notify("Couldn't delete the plan.", 'error')
  }

  if (building) {
    return (
      <PlanBuilder
        program={program}
        library={library}
        onCreateExercise={onCreateExercise}
        onSaved={() => { setBuilding(false); load() }}
        onCancel={() => setBuilding(false)}
        notify={notify}
      />
    )
  }

  if (loading) return <Skeleton />

  if (!program && coachPrograms.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">🏋️</div>
        <p className="font-medium text-fg-2">No plan yet</p>
        <p className="text-sm text-fg-4 mt-1 mb-4">Generate one from your sport and goals, or build your own week.</p>
        <button type="button" onClick={() => setBuilding(true)} className="btn-primary px-6">Create a plan</button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {program && (
        <ThisWeekCard
          program={program}
          title={program.title}
          subtitle={[program.sport, `${program.duration_weeks} weeks`].filter(Boolean).join(' · ')}
          onStart={w => startFrom(w, 'My Plan', 'program')}
          actions={(
            <div className="flex gap-1">
              <button type="button" onClick={() => setBuilding(true)} className="btn-ghost">Edit</button>
              <button type="button" onClick={deleteProgram} className="btn-ghost text-red-400">Delete</button>
            </div>
          )}
        />
      )}

      {coachPrograms.map(cp => (
        <ThisWeekCard
          key={cp.id}
          program={cp}
          title={cp.label}
          subtitle={`From ${cp.coach_name}`}
          accent
          onStart={w => startFrom(w, cp.label, 'coach_program')}
        />
      ))}

      {program && (
        <div>
          <button type="button" onClick={() => setShowAll(s => !s)} className="w-full flex items-center justify-between min-h-[44px] px-1">
            <span className="text-sm font-semibold text-fg-1">All weeks</span>
            <span className="text-xs text-fg-4">{showAll ? '▲' : '▼'}</span>
          </button>
          {showAll && (
            <div className="mt-2">
              <ProgramView program={program} currentWeek={currentWeek(program.start_date, program.duration_weeks).week} onStartWorkout={w => startFrom(w, 'My Plan', 'program')} />
            </div>
          )}
        </div>
      )}

      {coachPrograms.map(cp => (
        <CoachAllWeeks key={`all-${cp.id}`} program={cp} onStart={w => startFrom(w, cp.label, 'coach_program')} />
      ))}

      <button type="button" onClick={() => setBuilding(true)} className="btn-secondary w-full">
        {program ? 'New plan' : 'Create my own plan'}
      </button>
    </div>
  )
}

function ThisWeekCard({ program, title, subtitle, accent, onStart, actions }: {
  program: TrainingProgramRow
  title: string
  subtitle?: string
  accent?: boolean
  onStart: (w: ProgramWorkout) => void
  actions?: React.ReactNode
}) {
  const today = new Date()
  const { week, status } = currentWeek(program.start_date, program.duration_weeks, today)
  const todays = todaysWorkout(program, today)
  const next = nextWorkout(program, today)
  const weekWorkouts = workoutsForWeek(program, week)
  const dow = isoDayOfWeek(today)
  const start = program.start_date ? parseLocalDate(program.start_date) : null

  return (
    <div className={`card p-4 space-y-3 ${accent ? 'border-cta/30' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-[11px] uppercase tracking-wider font-semibold ${accent ? 'text-cta' : 'text-fg-4'}`}>
            {status === 'upcoming' && start ? `Starts ${format(start, 'MMM d')}` : status === 'complete' ? 'Plan complete' : `Week ${week} of ${program.duration_weeks}`}
          </p>
          <h3 className="font-bold text-fg-1 truncate">{title}</h3>
          {subtitle && <p className="text-xs text-fg-4">{subtitle}</p>}
        </div>
        {actions}
      </div>

      {status === 'active' && weekWorkouts.length === 0 && (
        <p className="text-sm text-fg-4">No workouts scheduled this week.</p>
      )}

      {todays ? (
        <div className="rounded-xl bg-cta/10 border border-cta/30 p-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-cta font-semibold">Today</p>
            <p className="text-sm font-semibold text-fg-1 truncate">{todays.name}</p>
            <p className="text-xs text-fg-4">{(todays.exercises as WorkoutExercise[]).length} exercises</p>
          </div>
          <button type="button" onClick={() => onStart(todays)} className="btn-primary shrink-0">Start</button>
        </div>
      ) : next && status !== 'complete' ? (
        <div className="rounded-xl bg-surface-2/60 p-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-fg-4 font-semibold">
              {status === 'active' ? 'Rest day · next up' : 'First up'}
            </p>
            <p className="text-sm font-semibold text-fg-1 truncate">{DAY_NAMES[next.workout.day_of_week]} — {next.workout.name}</p>
            <p className="text-xs text-fg-4">{(next.workout.exercises as WorkoutExercise[]).length} exercises{next.week !== week ? ` · week ${next.week}` : ''}</p>
          </div>
          <button type="button" onClick={() => onStart(next.workout)} className="btn-secondary shrink-0">Start early</button>
        </div>
      ) : null}

      {status === 'active' && weekWorkouts.length > 0 && (
        <div className="space-y-1">
          {weekWorkouts.map(w => {
            const past = w.day_of_week < dow
            const isToday = w.day_of_week === dow
            return (
              <div key={w.id} className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg ${isToday ? 'bg-cta/5' : ''}`}>
                <p className={`text-sm truncate ${past ? 'text-fg-4' : 'text-fg-2'}`}>
                  <span className="inline-block w-9 text-fg-4">{DAY_NAMES[w.day_of_week]}</span>{w.name}
                </p>
                {!isToday && (
                  <button type="button" onClick={() => onStart(w)} className="text-xs text-cta font-medium min-h-[36px] px-2 shrink-0">Start</button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CoachAllWeeks({ program, onStart }: { program: CoachProgramRow; onStart: (w: ProgramWorkout) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between min-h-[44px] px-1">
        <span className="text-sm font-semibold text-fg-1">All weeks · {program.label}</span>
        <span className="text-xs text-fg-4">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="mt-2">
          <ProgramView program={program} currentWeek={currentWeek(program.start_date, program.duration_weeks).week} onStartWorkout={onStart} />
        </div>
      )}
    </div>
  )
}
