'use client'
import { useCallback, useEffect, useState } from 'react'
import PlanBuilder from '@/components/exercise/PlanBuilder'
import AssignPicker, { type Assignees } from '@/components/coach/AssignPicker'
import Skeleton from '@/components/shared/Skeleton'
import { useToast } from '@/components/shared/Toast'
import { toLocalDateString } from '@/lib/programs'
import type { ExerciseLibraryRow, MuscleGroup, TrainingProgramRow } from '@/types/exercise'

interface AssignedAthlete { id: string; full_name: string | null; email: string; start_date: string; done: number; due: number; total: number }
type LibraryPlan = TrainingProgramRow & { athletes: AssignedAthlete[] }

// The coach's plan library: build once, assign to teams or athletes,
// see who is keeping up.
export default function CoachPrograms() {
  const notify = useToast()
  const [plans, setPlans] = useState<LibraryPlan[] | null>(null)
  const [library, setLibrary] = useState<ExerciseLibraryRow[]>([])
  const [building, setBuilding] = useState<{ program: LibraryPlan | null } | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [assignees, setAssignees] = useState<Assignees>({ teamIds: [], athleteIds: [] })
  const [startDate, setStartDate] = useState(() => toLocalDateString(new Date()))
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/coach/programs')
    setPlans(res.ok ? await res.json() : [])
  }, [])

  useEffect(() => {
    load()
    fetch('/api/exercise/library').then(r => (r.ok ? r.json() : [])).then(d => { if (Array.isArray(d)) setLibrary(d) }).catch(() => {})
  }, [load])

  const createExercise = useCallback(async (name: string, muscle_group: MuscleGroup): Promise<ExerciseLibraryRow | null> => {
    const res = await fetch('/api/exercise/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, muscle_group }) })
    if (!res.ok) { notify("Couldn't add that exercise.", 'error'); return null }
    const row = (await res.json()) as ExerciseLibraryRow
    setLibrary(prev => (prev.some(e => e.id === row.id) ? prev : [...prev, row]))
    return row
  }, [notify])

  const duplicate = async (p: LibraryPlan) => {
    const res = await fetch('/api/coach/programs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ duplicate_of: p.id }) })
    if (res.ok) { notify('Plan copied'); load() } else notify('Could not copy the plan', 'error')
  }

  const remove = async (p: LibraryPlan) => {
    if (!confirm(`Delete "${p.title}"? It disappears for the ${p.athletes.length} athlete${p.athletes.length === 1 ? '' : 's'} it's assigned to. Their logged workouts stay.`)) return
    const res = await fetch('/api/coach/programs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id }) })
    if (res.ok) load(); else notify('Could not delete', 'error')
  }

  const assign = async (p: LibraryPlan) => {
    setBusy(true)
    const res = await fetch(`/api/coach/programs/${p.id}/assign`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_ids: assignees.teamIds, athlete_ids: assignees.athleteIds, start_date: startDate }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { notify(data.error || 'Could not assign', 'error'); return }
    notify(`Assigned to ${data.assigned} athlete${data.assigned === 1 ? '' : 's'}`)
    setAssigning(null)
    setAssignees({ teamIds: [], athleteIds: [] })
    load()
  }

  const unassign = async (p: LibraryPlan, a: AssignedAthlete) => {
    if (!confirm(`Remove "${p.title}" from ${a.full_name || a.email}?`)) return
    const res = await fetch(`/api/coach/programs/${p.id}/assign`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ athlete_id: a.id }) }).catch(() => null)
    if (res?.ok) load()
    else notify("Couldn't remove that athlete. Try again.", 'error')
  }

  if (building) {
    return (
      <PlanBuilder
        target="coach"
        program={building.program}
        library={library}
        onCreateExercise={createExercise}
        onSaved={() => { setBuilding(null); load() }}
        onCancel={() => setBuilding(null)}
        notify={notify}
      />
    )
  }

  if (!plans) return <Skeleton />

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-fg-1">Plan library</h3>
          <p className="text-sm text-fg-4">Build a plan once, then assign it to a whole team or single athletes with their own start date.</p>
        </div>
        <button type="button" onClick={() => setBuilding({ program: null })} className="btn-primary shrink-0">New plan</button>
      </div>

      {plans.length === 0 ? (
        <p className="text-sm text-fg-4 py-6 text-center">No plans yet. Generate one from a sport and goals in about a minute.</p>
      ) : (
        <ul className="space-y-3">
          {plans.map(p => {
            const isOpen = open === p.id
            const behind = p.athletes.filter(a => a.due > 0 && a.done < a.due - 1).length
            return (
              <li key={p.id} className="border border-edge rounded-2xl">
                <button type="button" onClick={() => setOpen(isOpen ? null : p.id)} aria-expanded={isOpen} className="w-full flex items-center justify-between gap-3 p-4 text-left">
                  <span className="min-w-0">
                    <span className="block font-semibold text-fg-1 truncate">{p.title}</span>
                    <span className="block text-xs text-fg-4 truncate">
                      {[p.sport, `${p.duration_weeks} weeks`, `${p.athletes.length} assigned`].filter(Boolean).join(' · ')}
                      {behind > 0 && <span className="text-orange-300"> · {behind} behind</span>}
                    </span>
                  </span>
                  <span className="text-fg-4 text-xs shrink-0">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-4 space-y-4 border-t border-edge-muted">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => { setAssigning(assigning === p.id ? null : p.id); setAssignees({ teamIds: [], athleteIds: [] }) }} className="btn-primary text-sm" aria-expanded={assigning === p.id}>Assign</button>
                      <button type="button" onClick={() => setBuilding({ program: p })} className="btn-secondary text-sm">Edit</button>
                      <button type="button" onClick={() => duplicate(p)} className="btn-secondary text-sm">Duplicate</button>
                      <button type="button" onClick={() => remove(p)} className="btn-ghost text-xs text-fg-4 hover:text-red-400">Delete</button>
                    </div>

                    {assigning === p.id && (
                      <div className="card p-4 space-y-3">
                        <AssignPicker value={assignees} onChange={setAssignees} />
                        <div>
                          <label htmlFor={`start-${p.id}`} className="text-xs uppercase tracking-wide text-fg-4 block mb-1">Start date</label>
                          <input id={`start-${p.id}`} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field sm:w-56" />
                        </div>
                        <button type="button" onClick={() => assign(p)} disabled={busy || (assignees.teamIds.length === 0 && assignees.athleteIds.length === 0)} className="btn-primary text-sm">
                          {busy ? 'Assigning…' : 'Assign plan'}
                        </button>
                      </div>
                    )}

                    {p.athletes.length === 0 ? (
                      <p className="text-sm text-fg-4">Not assigned to anyone yet.</p>
                    ) : (
                      <ul className="divide-y divide-edge-muted">
                        {p.athletes.map(a => {
                          const pct = a.due ? Math.round((Math.min(a.done, a.due) / a.due) * 100) : 0
                          return (
                            <li key={a.id} className="py-2.5">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm text-fg-2 truncate min-w-0">{a.full_name || a.email}</span>
                                <span className="flex items-center gap-3 shrink-0">
                                  <span className="text-xs text-fg-3 tabular-nums">{a.due === 0 ? `Starts ${a.start_date}` : `${a.done}/${a.due} done`}</span>
                                  <button type="button" onClick={() => unassign(p, a)} className="text-xs text-fg-4 hover:text-red-400">Remove</button>
                                </span>
                              </div>
                              {a.due > 0 && (
                                <div className="mt-1.5 h-1.5 rounded-full bg-surface-3 overflow-hidden" aria-hidden="true">
                                  <div className="h-full bg-cta rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
