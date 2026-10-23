'use client'

export const SPORTS = [
  'Football', 'Basketball', 'Baseball', 'Soccer', 'Hockey',
  'Tennis', 'Track & Field', 'Swimming', 'Volleyball',
  'Lacrosse', 'Wrestling', 'Golf', 'Softball', 'Cross Country',
]

export const GOALS = [
  { key: 'strength', label: 'Strength' },
  { key: 'speed', label: 'Speed' },
  { key: 'explosiveness', label: 'Explosiveness' },
  { key: 'endurance', label: 'Endurance' },
  { key: 'flexibility', label: 'Flexibility' },
  { key: 'sport-specific', label: 'Sport-Specific Skills' },
]

export type BuilderMode = 'generate' | 'ai' | 'scratch' | 'edit'

export interface PlanSetup {
  title: string
  description: string
  sport: string
  goals: string[]
  experience: 'beginner' | 'intermediate' | 'advanced'
  daysPerWeek: number
  durationWeeks: number
  startDate: string
}

interface Props {
  mode: BuilderMode
  setup: PlanSetup
  onChange: (next: PlanSetup) => void
  error?: string
}

const chip = (on: boolean) =>
  `px-3 min-h-[44px] rounded-full text-xs font-medium border transition-all ${on ? 'bg-cta/20 text-cta border-cta/30' : 'bg-surface-2 text-fg-3 border-edge hover:border-fg-4'}`

export default function PlanSetupForm({ mode, setup, onChange, error }: Props) {
  const set = <K extends keyof PlanSetup>(k: K, v: PlanSetup[K]) => onChange({ ...setup, [k]: v })
  const needsSportGoals = mode === 'generate' || mode === 'ai'
  const showTitle = mode === 'scratch' || mode === 'edit'

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
        <label className="text-xs text-fg-4 block mb-1">Sport{needsSportGoals ? '' : ' (optional)'}</label>
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
            <label className="text-xs text-fg-4 block mb-1">Days per week: {setup.daysPerWeek}</label>
            <input type="range" min={3} max={6} value={setup.daysPerWeek} onChange={e => set('daysPerWeek', parseInt(e.target.value))} className="w-full h-2 rounded-full appearance-none bg-surface-3 accent-cta" />
            <div className="flex justify-between text-[10px] text-fg-4 mt-1"><span>3</span><span>4</span><span>5</span><span>6</span></div>
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

      <div>
        <label className="text-xs text-fg-4 block mb-1" htmlFor="ps-start">Start date</label>
        <input id="ps-start" type="date" value={setup.startDate} onChange={e => set('startDate', e.target.value)} className="input-field" />
        <p className="text-[11px] text-fg-4 mt-1">Week 1 is the Monday–Sunday week containing this date.</p>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
