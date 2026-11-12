'use client'
import { useEffect, useId, useState } from 'react'
import SaveButton, { type SaveState } from '@/components/shared/SaveButton'
import { useToast } from '@/components/shared/Toast'
import { CHALLENGE_KINDS, CHALLENGE_LABELS, suggestedTarget, type ChallengeKind } from '@/lib/team-challenge'

interface Challenge { kind: ChallengeKind; target: number; label: string; progress: number; daysLeft: number }
interface Loaded { members: number; challenge: Challenge | null }

const KIND_CHIP: Record<ChallengeKind, string> = {
  journal: 'Journal',
  workouts: 'Workouts',
  sleep: 'Sleep',
  meals: 'Meals',
}

// One weekly goal for a team: athletes' combined logs, shown as a progress bar.
export default function TeamChallenge({ teamId }: { teamId: string }) {
  const notify = useToast()
  const inputId = useId()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [kind, setKind] = useState<ChallengeKind>('journal')
  const [target, setTarget] = useState('')
  const [save, setSave] = useState<SaveState>('idle')

  const apply = (next: Loaded) => {
    setLoaded(next)
    const k = next.challenge?.kind ?? 'journal'
    setKind(k)
    setTarget(String(next.challenge?.target ?? suggestedTarget(k, next.members)))
  }

  useEffect(() => {
    let tz = ''
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone } catch {}
    fetch(`/api/coach/challenge?team_id=${encodeURIComponent(teamId)}&tz=${encodeURIComponent(tz)}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: Loaded | null) => { if (d) apply(d) })
      .catch(() => {})
  }, [teamId])

  const pickKind = (k: ChallengeKind) => {
    setKind(k)
    if (loaded) setTarget(String(suggestedTarget(k, loaded.members)))
  }

  const tz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return '' } }

  const saveGoal = async () => {
    const n = Number(target)
    if (!Number.isInteger(n) || n < 1 || n > 100000) { notify('Set a target from 1 to 100,000.', 'error'); return }
    setSave('saving')
    try {
      const res = await fetch('/api/coach/challenge', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: teamId, kind, target: n, tz: tz() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setSave('error'); notify(data.error || 'Could not save the goal', 'error'); return }
      setSave('saved')
      setLoaded(prev => ({ members: data.members ?? prev?.members ?? 0, challenge: data.challenge ?? null }))
    } catch {
      setSave('error')
      notify('Could not save the goal', 'error')
    }
  }

  const remove = async () => {
    const res = await fetch(`/api/coach/challenge?team_id=${encodeURIComponent(teamId)}&tz=${encodeURIComponent(tz())}`, { method: 'DELETE' })
    if (!res.ok) { notify('Could not remove the goal', 'error'); return }
    const members = loaded?.members ?? 0
    setLoaded({ members, challenge: null })
    setKind('journal')
    setTarget(String(suggestedTarget('journal', members)))
    setSave('idle')
  }

  const challenge = loaded?.challenge ?? null
  const pct = challenge ? Math.min(100, Math.round((challenge.progress / challenge.target) * 100)) : 0

  return (
    <div className="border border-edge rounded-2xl p-4 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-semibold text-fg-1 text-sm">This week&apos;s team goal</h4>
        {challenge && <span className="text-xs text-fg-4 tabular-nums">{challenge.daysLeft} day{challenge.daysLeft === 1 ? '' : 's'} left</span>}
      </div>

      {challenge && (
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-surface-3 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={challenge.target} aria-valuenow={Math.min(challenge.progress, challenge.target)} aria-label="Team goal progress">
            <div className="h-full bg-cta rounded-full transition-[width]" style={{ width: `${Math.max(challenge.progress > 0 ? 2 : 0, pct)}%` }} />
          </div>
          <p className="text-xs text-fg-3 tabular-nums">{challenge.progress} of {challenge.target} {CHALLENGE_LABELS[challenge.kind].toLowerCase()}</p>
        </div>
      )}

      <div role="group" aria-label="Goal type" className="flex flex-wrap gap-2">
        {CHALLENGE_KINDS.map(k => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => pickKind(k)}
            className={`text-xs font-medium rounded-full border px-3 py-1.5 transition-colors ${
              kind === k ? 'border-cta/50 bg-cta/10 text-cta' : 'border-edge text-fg-3 hover:text-fg-1'
            }`}
          >
            {KIND_CHIP[k]}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label htmlFor={inputId} className="text-xs uppercase tracking-wide text-fg-4 block mb-1">{CHALLENGE_LABELS[kind]} for the team</label>
          <input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={1}
            max={100000}
            value={target}
            onChange={e => { setTarget(e.target.value); setSave('idle') }}
            className="input-field"
          />
          {loaded && <p className="text-xs text-fg-4 mt-1">Suggested: {suggestedTarget(kind, loaded.members)} for {loaded.members} athlete{loaded.members === 1 ? '' : 's'}.</p>}
        </div>
        <SaveButton state={save} idleLabel={challenge ? 'Update goal' : 'Set goal'} onClick={saveGoal} type="button" className="sm:w-auto sm:px-5" />
      </div>

      {challenge && (
        <button type="button" onClick={remove} className="text-xs text-fg-4 hover:text-red-400">Remove goal</button>
      )}
    </div>
  )
}
