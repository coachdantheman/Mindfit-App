'use client'
import { useEffect, useId, useState } from 'react'
import SaveButton, { type SaveState } from '@/components/shared/SaveButton'
import { useToast } from '@/components/shared/Toast'
import { CHALLENGE_KINDS, CHALLENGE_LABELS, GOAL_DURATIONS, SEASON_MAX_DAYS, daysInclusive, suggestedTarget, type ChallengeKind, type GoalDuration, type GoalView } from '@/lib/team-challenge'
import { localDateISO } from '@/lib/dates'

const MAX_ACTIVE_GOALS = 3

const KIND_CHIP: Record<ChallengeKind, string> = {
  journal: 'Journal',
  workouts: 'Workouts',
  sleep: 'Sleep',
  meals: 'Meals',
  flow_stacks: 'Flow Stacks',
  gratitude: 'Gratitude',
  habits: 'Habits',
  practices: 'Practices',
  visualization: 'Visualization',
  mpi: 'MPI check-ins',
  custom: 'Custom',
}

const DURATION_CHIP: Record<GoalDuration, string> = { '1w': '1 week', '2w': '2 weeks', '4w': '4 weeks', season: 'Season' }
const DURATIONS = Object.keys(GOAL_DURATIONS) as GoalDuration[]

const tz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return '' } }

const addDays = (n: number) => localDateISO(new Date(Date.now() + n * 86_400_000))

const unitOf = (g: GoalView) => (g.kind === 'custom' ? 'check-ins' : g.label.toLowerCase())

// Team goals the coach pushes to a team. Several can run at once, each for a set duration.
export default function TeamChallenge({ teamId }: { teamId: string }) {
  const notify = useToast()
  const titleId = useId()
  const targetId = useId()
  const [goals, setGoals] = useState<GoalView[]>([])
  const [members, setMembers] = useState(0)
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<ChallengeKind>('journal')
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState<GoalDuration>('1w')
  const [seasonEnd, setSeasonEnd] = useState(() => addDays(GOAL_DURATIONS.season - 1))
  const seasonEndId = useId()
  const [target, setTarget] = useState('')
  const [save, setSave] = useState<SaveState>('idle')

  useEffect(() => {
    fetch(`/api/coach/challenge?team_id=${encodeURIComponent(teamId)}&tz=${encodeURIComponent(tz())}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { members: number; goals: GoalView[] } | null) => {
        if (!d) return
        setMembers(d.members)
        setGoals(d.goals)
      })
      .catch(() => {})
  }, [teamId])

  const suggest = (k: ChallengeKind, d: GoalDuration, end = seasonEnd) =>
    String(suggestedTarget(k, members, d === 'season' ? daysInclusive(localDateISO(), end) : GOAL_DURATIONS[d]))

  const pickKind = (k: ChallengeKind) => {
    setKind(k)
    setTarget(suggest(k, duration))
  }

  const pickDuration = (d: GoalDuration) => {
    setDuration(d)
    setTarget(suggest(kind, d))
  }

  const pickSeasonEnd = (end: string) => {
    setSeasonEnd(end)
    setTarget(suggest(kind, duration, end))
  }

  const openForm = () => {
    setKind('journal')
    setTitle('')
    setDuration('1w')
    setSeasonEnd(addDays(GOAL_DURATIONS.season - 1))
    setTarget(suggest('journal', '1w'))
    setSave('idle')
    setOpen(true)
  }

  const start = async () => {
    const n = Number(target)
    if (!Number.isInteger(n) || n < 1 || n > 100000) { notify('Set a target from 1 to 100,000.', 'error'); return }
    if (kind === 'custom' && title.trim() === '') { notify('Write what the team is working on.', 'error'); return }
    if (duration === 'season' && !seasonEnd) { notify('Pick the season end date.', 'error'); return }
    setSave('saving')
    try {
      const res = await fetch('/api/coach/challenge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: teamId, kind, title: kind === 'custom' ? title.trim() : undefined, duration, target: n, tz: tz(), ends_on: duration === 'season' ? seasonEnd : undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setSave('error'); notify(data.error || 'Could not start the goal', 'error'); return }
      setSave('idle')
      setMembers(data.members ?? members)
      setGoals(prev => [data.goal as GoalView, ...prev])
      setOpen(false)
    } catch {
      setSave('error')
      notify('Could not start the goal', 'error')
    }
  }

  const end = async (id: string) => {
    const res = await fetch(`/api/coach/challenge?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!res.ok) { notify('Could not end the goal', 'error'); return }
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  const full = goals.length >= MAX_ACTIVE_GOALS

  return (
    <div className="border border-edge rounded-2xl p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold text-fg-1 text-sm">Team goals</h4>
        {!open && (
          <button type="button" onClick={openForm} disabled={full} className="btn-secondary text-xs">
            {full ? `${MAX_ACTIVE_GOALS} goals running` : '+ New team goal'}
          </button>
        )}
      </div>

      {goals.length === 0 && !open && (
        <p className="text-xs text-fg-4">No goals running. Set one for the team.</p>
      )}

      {goals.map(g => {
        const pct = g.target > 0 ? Math.min(100, Math.round((g.progress / g.target) * 100)) : 0
        return (
          <div key={g.id} className="border border-edge rounded-xl p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg-1 break-words">{g.label}</p>
                <p className="text-xs text-fg-4 tabular-nums">{g.daysLeft} day{g.daysLeft === 1 ? '' : 's'} left</p>
              </div>
              <button type="button" onClick={() => end(g.id)} className="text-xs text-fg-4 hover:text-red-400 shrink-0">End</button>
            </div>
            <div className="h-2 rounded-full bg-surface-3 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={g.target} aria-valuenow={Math.min(g.progress, g.target)} aria-label={`${g.label} progress`}>
              <div className="h-full bg-cta rounded-full transition-[width]" style={{ width: `${Math.max(g.progress > 0 ? 2 : 0, pct)}%` }} />
            </div>
            <p className="text-xs text-fg-3 tabular-nums">{g.progress} of {g.target} {unitOf(g)}</p>
          </div>
        )
      })}

      {open && (
        <div className="space-y-4 border-t border-edge pt-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-fg-4">Goal</p>
            <div role="group" aria-label="Goal type" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CHALLENGE_KINDS.map(k => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => pickKind(k)}
                  className={kind === k ? 'tab-btn-active' : 'tab-btn'}
                >
                  {KIND_CHIP[k]}
                </button>
              ))}
            </div>
            {kind === 'custom' && (
              <div>
                <label htmlFor={titleId} className="text-xs uppercase tracking-wide text-fg-4 block mb-1">Goal in words</label>
                <input
                  id={titleId}
                  type="text"
                  maxLength={80}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. 10 minutes of film every day"
                  className="input-field"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-fg-4">Duration</p>
            <div role="group" aria-label="Duration" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={duration === d}
                  onClick={() => pickDuration(d)}
                  className={duration === d ? 'tab-btn-active' : 'tab-btn'}
                >
                  {DURATION_CHIP[d]}
                </button>
              ))}
            </div>
            {duration === 'season' && (
              <div className="mt-3">
                <label htmlFor={seasonEndId} className="text-xs uppercase tracking-wide text-fg-4 block mb-1">Season ends</label>
                <input
                  id={seasonEndId}
                  type="date"
                  min={addDays(1)}
                  max={addDays(SEASON_MAX_DAYS)}
                  value={seasonEnd}
                  onChange={e => pickSeasonEnd(e.target.value)}
                  className="input-field"
                />
              </div>
            )}
          </div>

          <div>
            <label htmlFor={targetId} className="text-xs uppercase tracking-wide text-fg-4 block mb-1">
              {kind === 'custom' ? 'Check-ins for the team' : `${CHALLENGE_LABELS[kind]} for the team`}
            </label>
            <input
              id={targetId}
              type="number"
              inputMode="numeric"
              min={1}
              max={100000}
              value={target}
              onChange={e => { setTarget(e.target.value); setSave('idle') }}
              className="input-field"
            />
            <p className="text-xs text-fg-4 mt-1">Suggested: {suggest(kind, duration)} for {members} athlete{members === 1 ? '' : 's'}.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SaveButton state={save} idleLabel="Start goal" onClick={start} type="button" className="sm:w-auto sm:px-5" />
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary text-xs">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
