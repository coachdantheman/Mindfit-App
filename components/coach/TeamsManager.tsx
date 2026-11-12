'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Skeleton from '@/components/shared/Skeleton'
import BulkClaimForm from '@/components/coach/BulkClaimForm'
import TeamChallenge from '@/components/coach/TeamChallenge'
import { useToast } from '@/components/shared/Toast'
import { ENCOURAGEMENT, type EncouragementKey } from '@/lib/notify-copy'

type Target = { athlete_id: string } | { team_id: string }

// Preset encouragement: opens an inline list, sends one message to an athlete or a whole team.
export function EncourageControl({ target, label, className, disabled = false }: { target: Target; label: string; className: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  const send = async (message: EncouragementKey) => {
    setOpen(false)
    setBusy(true)
    setStatus(null)
    const res = await fetch('/api/coach/encourage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...target, message }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setStatus({ ok: false, msg: data.error || 'Could not send.' })
      setTimeout(() => setStatus(null), 4000)
      return
    }
    const msg = 'team_id' in target ? `Sent to ${data.sent} of ${data.of}` : data.sent > 0 ? 'Sent' : 'Already sent today'
    setStatus({ ok: true, msg })
    setTimeout(() => setStatus(null), 3000)
  }

  return (
    <div className="inline-flex flex-col items-end gap-1 align-top">
      <button type="button" className={className} disabled={busy || disabled} aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {busy ? 'Sending…' : label}
      </button>
      {open && (
        <div className="flex flex-col gap-0.5 border border-edge rounded-xl p-1 w-64 max-w-full text-left whitespace-normal">
          {(Object.entries(ENCOURAGEMENT) as [EncouragementKey, string][]).map(([key, text]) => (
            <button key={key} type="button" onClick={() => send(key)} className="text-xs text-fg-2 hover:text-cta hover:bg-surface-2/60 rounded-lg px-2 py-1.5 text-left">
              {text}
            </button>
          ))}
        </div>
      )}
      {status && <span role="status" className={`text-xs ${status.ok ? 'text-cta' : 'text-red-400'}`}>{status.msg}</span>}
    </div>
  )
}

interface Member { id: string; full_name: string | null; email: string }
interface Team {
  id: string; coach_id: string; coach_name: string | null; name: string; sport: string | null; join_code: string
  members: Member[]
}
interface Person extends Member { role: string }

const label = (p: Member) => p.full_name || p.email

// Coaches manage their own teams. Admins see every team and can create one
// for any coach or move athletes onto a coach's team.
export default function TeamsManager({ isAdmin = false, athleteHref = (id: string) => `/coach/athlete/${id}`, onChanged }: {
  isAdmin?: boolean
  athleteHref?: (id: string) => string
  onChanged?: () => void
}) {
  const notify = useToast()
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [coaches, setCoaches] = useState<Member[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [adding, setAdding] = useState<{ teamId: string; mode: 'roster' | 'email' } | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')
  const [sport, setSport] = useState('')
  const [coachId, setCoachId] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const [t, a] = await Promise.all([fetch('/api/coach/teams'), fetch('/api/coach/athletes')])
    const list: Team[] = t.ok ? await t.json() : []
    setTeams(list)
    if (a.ok) setPeople(((await a.json()) as Person[]).filter(p => p.role === 'member' || p.role === 'coach'))
    setOpen(o => o ?? (list.length === 1 ? list[0].id : null))
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/admin/coaches').then(r => r.ok ? r.json() : []).then(setCoaches)
  }, [isAdmin])

  const changed = () => { load(); onChanged?.() }

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const res = await fetch('/api/coach/teams', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sport: sport || null, ...(isAdmin && coachId ? { coach_id: coachId } : {}) }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { notify(data.error || 'Could not create team', 'error'); return }
    setName(''); setSport('')
    setOpen(data.id)
    notify(`${data.name} created · code ${data.join_code}`)
    changed()
  }

  const inviteLink = (code: string) => `${window.location.origin}/join/${code}`
  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); notify(`${what} copied`) } catch { notify(text) }
  }

  const newCode = async (t: Team) => {
    if (!confirm(`Make a new code for ${t.name}? The old code and link stop working. Athletes already on the team stay.`)) return
    const res = await fetch(`/api/coach/teams/${t.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ new_code: true }) })
    if (res.ok) load(); else notify('Could not make a new code', 'error')
  }

  const removeTeam = async (t: Team) => {
    if (!confirm(`Delete ${t.name}? Athletes stay on your roster, they just aren't grouped as this team.`)) return
    const res = await fetch(`/api/coach/teams/${t.id}`, { method: 'DELETE' })
    if (res.ok) changed(); else notify('Could not delete team', 'error')
  }

  const removeMember = async (t: Team, m: Member) => {
    if (!confirm(`Take ${label(m)} off ${t.name}? If they aren't on another of your teams, you stop seeing their progress.`)) return
    const res = await fetch(`/api/coach/teams/${t.id}/members`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ athlete_id: m.id }) })
    if (res.ok) changed(); else notify('Could not remove', 'error')
  }

  const addPicked = async (t: Team) => {
    setBusy(true)
    const res = await fetch(`/api/coach/teams/${t.id}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ athlete_ids: [...picked] }) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { notify(data.error || 'Could not add', 'error'); return }
    notify(`${data.added} added to ${t.name}`)
    setPicked(new Set()); setAdding(null)
    changed()
  }

  if (!teams) return <Skeleton />

  return (
    <div className="space-y-5">
      <form onSubmit={create} className="space-y-2">
        <h3 className="font-semibold text-fg-1">Create a team</h3>
        <p className="text-sm text-fg-4">Athletes join with a 6-character code or a link you text to the group. They show up here and in My Athletes right away.</p>
        <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
          <div>
            <label htmlFor="team-name" className="sr-only">Team name</label>
            <input id="team-name" value={name} onChange={e => setName(e.target.value)} maxLength={80} required placeholder="Lincoln Varsity Soccer" className="input-field" />
          </div>
          <div>
            <label htmlFor="team-sport" className="sr-only">Sport</label>
            <input id="team-sport" value={sport} onChange={e => setSport(e.target.value)} maxLength={40} placeholder="Sport (optional)" className="input-field" />
          </div>
          <button type="submit" disabled={busy || !name.trim() || (isAdmin && !coachId)} className="btn-primary">Create</button>
        </div>
        {isAdmin && (
          <div>
            <label htmlFor="team-coach" className="text-xs uppercase tracking-wide text-fg-4 block mb-1">Coach</label>
            <select id="team-coach" value={coachId} onChange={e => setCoachId(e.target.value)} className="input-field">
              <option value="">Pick a coach…</option>
              {coaches.map(c => <option key={c.id} value={c.id}>{label(c)}</option>)}
            </select>
          </div>
        )}
      </form>

      {teams.length === 0 ? (
        <p className="text-sm text-fg-4">No teams yet.</p>
      ) : (
        <ul className="space-y-3">
          {teams.map(t => {
            const isOpen = open === t.id
            const onTeam = new Set(t.members.map(m => m.id))
            const candidates = people.filter(p => !onTeam.has(p.id) && p.id !== t.coach_id)
            return (
              <li key={t.id} className="border border-edge rounded-2xl">
                <button type="button" onClick={() => setOpen(isOpen ? null : t.id)} aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left">
                  <span className="min-w-0">
                    <span className="block font-semibold text-fg-1 truncate">{t.name}</span>
                    <span className="block text-xs text-fg-4 truncate">
                      {t.members.length} athlete{t.members.length === 1 ? '' : 's'}{t.sport ? ` · ${t.sport}` : ''}{isAdmin && t.coach_name ? ` · Coach ${t.coach_name}` : ''}
                    </span>
                  </span>
                  <span className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-sm tracking-widest text-cta">{t.join_code}</span>
                    <span className="text-fg-4 text-xs">{isOpen ? '▲' : '▼'}</span>
                  </span>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-4 border-t border-edge-muted pt-4">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => copy(inviteLink(t.join_code), 'Invite link')} className="btn-primary text-sm">Copy invite link</button>
                      <button type="button" onClick={() => copy(t.join_code, 'Code')} className="btn-secondary text-sm">Copy code</button>
                      <button type="button" onClick={() => newCode(t)} className="btn-ghost text-xs text-fg-4">New code</button>
                      <EncourageControl target={{ team_id: t.id }} label="Encourage team" className="btn-secondary text-sm" disabled={t.members.length === 0} />
                      <button type="button" onClick={() => removeTeam(t)} className="btn-ghost text-xs text-fg-4 hover:text-red-400">Delete team</button>
                    </div>

                    <TeamChallenge teamId={t.id} />

                    {t.members.length === 0 ? (
                      <p className="text-sm text-fg-4">Nobody on this team yet. Share the link or add athletes below.</p>
                    ) : (
                      <ul className="divide-y divide-edge-muted">
                        {t.members.map(m => (
                          <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                            <Link href={athleteHref(m.id)} className="min-w-0 group">
                              <span className="block text-sm text-fg-2 group-hover:text-cta truncate">{label(m)}</span>
                              {m.full_name && <span className="block text-xs text-fg-4 truncate">{m.email}</span>}
                            </Link>
                            <button type="button" onClick={() => removeMember(t, m)} className="text-xs text-fg-4 hover:text-red-400 shrink-0">Remove</button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => { setPicked(new Set()); setAdding(adding?.teamId === t.id && adding.mode === 'roster' ? null : { teamId: t.id, mode: 'roster' }) }}
                        className="btn-secondary text-sm" aria-expanded={adding?.teamId === t.id && adding.mode === 'roster'}>
                        {isAdmin ? 'Add existing athletes' : 'Add from my athletes'}
                      </button>
                      <button type="button" onClick={() => setAdding(adding?.teamId === t.id && adding.mode === 'email' ? null : { teamId: t.id, mode: 'email' })}
                        className="btn-secondary text-sm" aria-expanded={adding?.teamId === t.id && adding.mode === 'email'}>
                        Add by email
                      </button>
                    </div>

                    {adding?.teamId === t.id && adding.mode === 'roster' && (
                      candidates.length === 0 ? (
                        <p className="text-sm text-fg-4">Everyone {isAdmin ? '' : 'on your roster '}is already on this team.</p>
                      ) : (
                        <div className="space-y-2">
                          <ul className="max-h-64 overflow-y-auto divide-y divide-edge-muted border border-edge-muted rounded-xl px-3">
                            {candidates.map(p => (
                              <li key={p.id}>
                                <label className="flex items-center gap-3 py-2 text-sm cursor-pointer min-w-0">
                                  <input type="checkbox" checked={picked.has(p.id)} onChange={() => setPicked(prev => {
                                    const next = new Set(prev); if (next.has(p.id)) next.delete(p.id); else next.add(p.id); return next
                                  })} />
                                  <span className="text-fg-2 truncate">{label(p)}</span>
                                </label>
                              </li>
                            ))}
                          </ul>
                          <button type="button" disabled={busy || picked.size === 0} onClick={() => addPicked(t)} className="btn-primary text-sm">
                            Add {picked.size || ''} to {t.name}
                          </button>
                        </div>
                      )
                    )}
                    {adding?.teamId === t.id && adding.mode === 'email' && (
                      <BulkClaimForm onDone={changed} extraBody={{ team_id: t.id }}
                        copy={{ done: n => `${n} added to ${t.name}` }} />
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
