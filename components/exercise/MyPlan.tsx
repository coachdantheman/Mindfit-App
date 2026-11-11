'use client'
import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import type { ProgramWorkout, WorkoutExercise } from '@/types'
import type { CoachProgramRow, ExerciseLibraryRow, MuscleGroup, StartWorkoutInput, TrainingProgramRow, WorkoutSource } from '@/types/exercise'
import ProgramView from './ProgramView'
import PlanBuilder from './PlanBuilder'
import Skeleton from '@/components/shared/Skeleton'
import { currentWeek, DAY_NAMES, isoDayOfWeek, nextWorkout, parseLocalDate, todaysWorkout, workoutsForWeek } from '@/lib/programs'
import { DumbbellIcon } from '@/components/shared/icons'
import { loadMySchedule, type MyEvent } from '@/lib/team-schedule'
import { trainingDayKind } from '@/lib/schedule'
import { formatClock, parseTime } from '@/lib/game-day'
import { toLocalDateString } from '@/lib/programs'
import { cachedAll } from '@/lib/api-cache'

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
  const [schedule, setSchedule] = useState<MyEvent[]>([])

  useEffect(() => { loadMySchedule().then(setSchedule) }, [])
  const gameDates = schedule.filter(e => e.kind === 'game').map(e => e.event_date)

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

  useEffect(() => {
    setLoading(true)
    cachedAll(['/api/exercise/programs?active=true', '/api/exercise/coach-programs'], ([own, coach]: [TrainingProgramRow[], CoachProgramRow[]]) => {
      setProgram(Array.isArray(own) && own.length > 0 ? own[0] : null)
      setCoachPrograms(Array.isArray(coach) ? coach : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [refreshKey])

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
      <div className="space-y-4">
      <TeamScheduleCard events={schedule} />
      <div className="text-center py-16">
        <DumbbellIcon className="w-10 h-10 mx-auto mb-3 text-fg-4" />
        <p className="font-medium text-fg-2">No plan yet</p>
        <p className="text-sm text-fg-4 mt-1 mb-4">Generate one from your sport and goals, or build your own week.</p>
        <button type="button" onClick={() => setBuilding(true)} className="btn-primary px-6">Create a plan</button>
      </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <TeamScheduleCard events={schedule} />
      {program && (
        <ThisWeekCard
          gameDates={gameDates}
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
          gameDates={gameDates}
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

function ThisWeekCard({ program, title, subtitle, accent, onStart, actions, gameDates }: {
  program: TrainingProgramRow
  gameDates: string[]
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
  const dayKind = trainingDayKind(toLocalDateString(today), gameDates)

  return (
    <div className={`card p-4 space-y-3 ${accent ? 'border-cta/30' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-xs uppercase tracking-wider font-semibold ${accent ? 'text-cta' : 'text-fg-4'}`}>
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

      {todays && dayKind ? (
        <div className="rounded-xl bg-surface-2/60 border border-edge p-3 space-y-2">
          <p className="text-xs uppercase tracking-wider text-cta font-semibold">{dayKind === 'game' ? 'Game day' : 'Game tomorrow'}</p>
          <p className="text-sm text-fg-2">
            {dayKind === 'game'
              ? 'Skip today’s lift. A 10-minute warm-up and activation is plenty — the game is the workout.'
              : 'Keep today light: mobility and a few fast, crisp reps. Nothing heavy, so your legs are fresh tomorrow.'}
          </p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-fg-4 truncate">Planned: {todays.name}</p>
            <button type="button" onClick={() => onStart(todays)} className="btn-ghost text-xs shrink-0">Start anyway</button>
          </div>
        </div>
      ) : todays ? (
        <div className="rounded-xl bg-cta/10 border border-cta/30 p-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-cta font-semibold">Today</p>
            <p className="text-sm font-semibold text-fg-1 truncate">{todays.name}</p>
            <p className="text-xs text-fg-4">{(todays.exercises as WorkoutExercise[]).length} exercises</p>
          </div>
          <button type="button" onClick={() => onStart(todays)} className="btn-primary shrink-0">Start</button>
        </div>
      ) : next && status !== 'complete' ? (
        <div className="rounded-xl bg-surface-2/60 p-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-fg-4 font-semibold">
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

const eventDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const eventTime = (t: string | null) => { const m = parseTime(t); return m === null ? '' : ` · ${formatClock(m)}` }
const eventTitle = (e: MyEvent) => e.kind === 'game'
  ? `${e.home_away === 'away' ? '@ ' : e.home_away === 'home' ? 'vs ' : ''}${e.opponent ?? 'Game'}`
  : 'Practice'

// The athlete's team games and practices, next game first.
function TeamScheduleCard({ events }: { events: MyEvent[] }) {
  const [open, setOpen] = useState(false)
  const today = toLocalDateString(new Date())
  const upcoming = events.filter(e => e.event_date >= today)
  if (upcoming.length === 0) return null
  const game = upcoming.find(e => e.kind === 'game')
  const rest = upcoming.slice(0, 20)
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wider text-fg-4 font-semibold">Team schedule</p>
      {game ? (
        <p className="text-sm text-fg-1 mt-1">
          <span className="font-semibold">Next game: {eventTitle(game)}</span>
          <span className="text-fg-3"> · {game.event_date === today ? 'Today' : eventDate(game.event_date)}{eventTime(game.start_time)}</span>
        </p>
      ) : (
        <p className="text-sm text-fg-3 mt-1">No games on the schedule yet.</p>
      )}
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="mt-2 text-xs text-fg-4 hover:text-fg-2 min-h-[32px]">
        {open ? 'Hide schedule ▲' : `Upcoming (${upcoming.length}) ▼`}
      </button>
      {open && (
        <ul className="divide-y divide-edge-muted mt-1">
          {rest.map(e => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className={`truncate ${e.kind === 'game' ? 'text-fg-1 font-medium' : 'text-fg-3'}`}>{eventTitle(e)}</span>
              <span className="text-xs text-fg-4 shrink-0">{eventDate(e.event_date)}{eventTime(e.start_time)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
