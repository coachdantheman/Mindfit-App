'use client'
import { useEffect, useState } from 'react'
import PregameStepEditor from '@/components/exercise/PregameStepEditor'
import SaveButton, { type SaveState } from '@/components/shared/SaveButton'
import Skeleton from '@/components/shared/Skeleton'
import { useToast } from '@/components/shared/Toast'
import { DEFAULT_ROUTINE_NAME, DEFAULT_STEPS, type PregameStep } from '@/lib/pregame'

interface Team { id: string; name: string }
interface TeamRoutine { id: string; team_id: string; name: string; steps: PregameStep[] }

const editable = (steps: PregameStep[]) => steps.filter(s => s.kind !== 'triggers')
const JSON_HEADERS = { 'Content-Type': 'application/json' }

// Coach → Pregame. The team routine every athlete on the team starts from.
export default function TeamPregame() {
  const notify = useToast()
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [teamId, setTeamId] = useState('')
  const [routine, setRoutine] = useState<TeamRoutine | null | undefined>(undefined)
  const [name, setName] = useState(DEFAULT_ROUTINE_NAME)
  const [steps, setSteps] = useState<PregameStep[]>(editable(DEFAULT_STEPS))
  const [state, setState] = useState<SaveState>('idle')

  useEffect(() => {
    fetch('/api/coach/teams').then(r => (r.ok ? r.json() : [])).then((t: Team[]) => {
      const list = Array.isArray(t) ? t : []
      setTeams(list)
      if (list.length) setTeamId(id => id || list[0].id)
    }).catch(() => setTeams([]))
  }, [])

  useEffect(() => {
    if (!teamId) return
    setRoutine(undefined)
    setState('idle')
    fetch(`/api/coach/pregame?team_id=${teamId}`)
      .then(r => (r.ok ? r.json() : null))
      .then((r: TeamRoutine | null) => {
        setRoutine(r)
        setName(r?.name ?? DEFAULT_ROUTINE_NAME)
        setSteps(editable(r?.steps ?? DEFAULT_STEPS))
      })
      .catch(() => { setRoutine(null); notify("Couldn't load the team routine.", 'error') })
  }, [teamId, notify])

  if (teams === null) return <Skeleton />
  if (teams.length === 0) return <p className="text-sm text-fg-4">Create a team first (Teams tab), then set its pregame routine here.</p>

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed) { setState('error'); notify('Give the routine a name.', 'error'); return }
    setState('saving')
    try {
      const res = await fetch('/api/coach/pregame', {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify({ team_id: teamId, name: trimmed, steps }),
      })
      const saved = await res.json().catch(() => ({}))
      if (!res.ok) { setState('error'); notify(saved.error || 'Could not save', 'error'); return }
      setRoutine(saved)
      setName(saved.name)
      setSteps(editable(saved.steps))
      setState('saved')
    } catch {
      setState('error')
      notify("Couldn't save. Try again.", 'error')
    }
  }

  const remove = async () => {
    if (!confirm('Remove the team routine? Athletes go back to the MindFit routine.')) return
    try {
      const res = await fetch(`/api/coach/pregame?team_id=${teamId}`, { method: 'DELETE' })
      if (!res.ok) { notify('Could not remove', 'error'); return }
      setRoutine(null)
      setName(DEFAULT_ROUTINE_NAME)
      setSteps(editable(DEFAULT_STEPS))
      notify('Team routine removed')
    } catch {
      notify("Couldn't remove. Try again.", 'error')
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-fg-1">Pregame routine</h3>
        <p className="text-sm text-fg-4">Athletes on this team get this as their default routine. Each athlete sets their own three triggers.</p>
      </div>

      {teams.length > 1 && (
        <div>
          <label htmlFor="pregame-team" className="sr-only">Team</label>
          <select id="pregame-team" value={teamId} onChange={e => setTeamId(e.target.value)} className="input-field sm:w-72">
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}

      {routine === undefined ? <Skeleton /> : (
        <>
          {!routine && <p className="text-sm text-fg-4">Starting from the MindFit routine. Save to make it this team&apos;s.</p>}
          <div>
            <label htmlFor="pregame-name" className="text-sm text-fg-3 block mb-1">Routine name</label>
            <input id="pregame-name" value={name} maxLength={60} onChange={e => { setName(e.target.value); setState('idle') }} className="input-field" />
          </div>
          <PregameStepEditor steps={steps} onChange={next => { setSteps(next); setState('idle') }} />
          <div className="space-y-3">
            <SaveButton type="button" state={state} idleLabel="Save team routine" onClick={save} />
            {routine && (
              <button type="button" onClick={remove} className="w-full text-sm text-fg-4 hover:text-red-400 min-h-[44px]">
                Remove team routine
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
