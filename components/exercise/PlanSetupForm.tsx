'use client'
import { PLAN_GOALS, PLAN_SPORTS, sportOptional } from '@/lib/workout-templates'
import { DAY_NAMES } from '@/lib/programs'
import { weekdayNote, type WeekdayLoad } from '@/lib/schedule'

export const SPORTS = PLAN_SPORTS
export const GOALS = PLAN_GOALS

export type BuilderMode = 'generate' | 'ai' | 'scratch' | 'edit'

export interface PlanSetup {
  title: string
  description: string
  sport: string
  goals: string[]
  experience: 'beginner' | 'intermediate' | 'advanced'
  trainDays: number[]
  daysPerWeek: number
  durationWeeks: number
  startDate: string
}

interface Props {
  mode: BuilderMode
  setup: PlanSetup
  onChange: (next: PlanSetup) => void
  error?: string
  hideStartDate?: boolean
  load?: WeekdayLoad[]
}

const chip = (on: boolean) =>
  `px-3 min-h-[44px] rounded-full text-xs font-medium border transition-colors ${on ? 'bg-cta/20 text-cta border-cta/30' : 'bg-surface-2 text-fg-3 border-edge hover:border-fg-4'}`

const NOTE_LABEL = { game: 'Game', pre_game: 'Pre-game', practice: 'Practice' } as const

export default function PlanSetupForm({ mode, setup, onChange, error, hideStartDate, load }: Props) {
  const set = <K extends keyof PlanSetup>(k: K, v: PlanSetup[K]) => onChange({ ...setup, [k]: v })
  const needsSportGoals = mode === 'generate' || mode === 'ai'
  const sportRequired = needsSportGoals && !sportOptional(setup.goals)
  const showTitle = mode === 'scratch' || mode === 'edit'
  const hasSchedule = !!load?.some(l => l.games || l.practices)

  const toggleDay = (d: number) => {
    const on = setup.trainDays.includes(d)
    if (on && setup.trainDays.length <= 2) return
    if (!on && setup.trainDays.length >= 6) return
    const next = on ? setup.trainDays.filter(x => x !== d) : [...setup.trainDays, d].sort((a, b) => a - b)
    onChange({ ...setup, trainDays: next, daysPerWeek: next.length })
  }

  return (
    <div className="card p-5 space-y-5">
      {showTitle && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-fg-4 block mb-1" htmlFor="ps-title">Plan name</label>
            <input id="ps-title" value={setup.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Offseason strength" className="input-field" />
          </div>
          <div>
            <label className="text-xs text-fg-4 block mb-1" htmlFor="ps-desc">Description (optional)</label>
            <input id="ps-desc" value={setup.description} onChange={e => set('description', e.target.value)} placeholder="What this block is for" className="input-field" />
          </div>
        </div>
      )}

      <div>
        <label className="text-xs text-fg-4 block mb-1">Sport{sportRequired ? '' : ' (optional)'}</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={SPORTS.includes(setup.sport) ? setup.sport : ''}
            onChange={e => set('sport', e.target.value)}
            className="input-field flex-1"
          >
            <option value="">Select sport…</option>
            {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            value={!SPORTS.includes(setup.sport) ? setup.sport : ''}
            onChange={e => set('sport', e.target.value)}
            placeholder="Or type your sport"
            className="input-field flex-1"
          />
        </div>
      </div>

      {needsSportGoals && (
        <>
          <div>
            <label className="text-xs text-fg-4 block mb-2">Goals</label>
            <div className="flex flex-wrap gap-2">
              {GOALS.map(g => (
                <button key={g.key} type="button" onClick={() => set('goals', setup.goals.includes(g.key) ? setup.goals.filter(x => x !== g.key) : [...setup.goals, g.key])} className={chip(setup.goals.includes(g.key))}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-fg-4 block mb-2">Experience</label>
            <div className="flex gap-2">
              {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
                <button key={level} type="button" onClick={() => set('experience', level)} className={`flex-1 ${chip(setup.experience === level)} rounded-lg`}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-fg-4 block mb-2">Which days can you train?</label>
            <div className="grid grid-cols-7 gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map(d => {
                const on = setup.trainDays.includes(d)
                const note = load ? weekdayNote(load, d) : null
                return (
                  <div key={d} className="flex flex-col items-center gap-1">
                    <button type="button" onClick={() => toggleDay(d)} aria-pressed={on} className={`${chip(on)} w-full px-0`}>
                      {DAY_NAMES[d]}
                    </button>
                    <span className="h-3 text-[10px] leading-3 text-fg-4">{note ? NOTE_LABEL[note] : ''}</span>
                  </div>
                )
              })}
            </div>
            {hasSchedule && <p className="text-xs text-fg-4 mt-2">Picked around your schedule. Change any day.</p>}
          </div>
        </>
      )}

      <div>
        <label className="text-xs text-fg-4 block mb-2">Duration</label>
        <div className="flex gap-2">
          {[4, 8, 12].map(w => (
            <button key={w} type="button" onClick={() => set('durationWeeks', w)} className={`flex-1 ${chip(setup.durationWeeks === w)} rounded-lg`}>
              {w} weeks
            </button>
          ))}
          <input
            type="number" min={1} max={52} inputMode="numeric"
            value={[4, 8, 12].includes(setup.durationWeeks) ? '' : setup.durationWeeks}
            onChange={e => set('durationWeeks', Math.max(1, Math.min(52, parseInt(e.target.value) || 1)))}
            placeholder="Other"
            aria-label="Custom duration in weeks"
            className="input-field w-20 text-center"
          />
        </div>
      </div>

      {!hideStartDate && <div>
        <label className="text-xs text-fg-4 block mb-1" htmlFor="ps-start">Start date</label>
        <input id="ps-start" type="date" value={setup.startDate} onChange={e => set('startDate', e.target.value)} className="input-field" />
        <p className="text-xs text-fg-4 mt-1">Week 1 is the Monday–Sunday week containing this date.</p>
      </div>}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
