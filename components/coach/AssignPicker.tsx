'use client'
import { useEffect, useState } from 'react'

export interface Assignees { teamIds: string[]; athleteIds: string[] }

interface Team { id: string; name: string; members: { id: string }[] }
interface Athlete { id: string; full_name: string | null; email: string; role: string }

// Pick whole teams and/or single athletes. Team picks cover everyone on
// that team now; single picks add anyone else.
export default function AssignPicker({ value, onChange }: { value: Assignees; onChange: (v: Assignees) => void }) {
  const [teams, setTeams] = useState<Team[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [showAthletes, setShowAthletes] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch('/api/coach/teams').then(r => r.ok ? r.json() : []).then(setTeams)
    fetch('/api/coach/athletes').then(r => r.ok ? r.json() : []).then((a: Athlete[]) => setAthletes(a.filter(x => x.role === 'member' || x.role === 'coach')))
  }, [])

  const coveredByTeams = new Set(teams.filter(t => value.teamIds.includes(t.id)).flatMap(t => t.members.map(m => m.id)))
  const total = new Set([...coveredByTeams, ...value.athleteIds]).size
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id])
  const shown = athletes.filter(a => !query || (a.full_name ?? a.email).toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="space-y-3">
      {teams.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-fg-4 mb-1">Whole team</p>
          <div className="flex flex-wrap gap-2">
            {teams.map(t => {
              const on = value.teamIds.includes(t.id)
              return (
                <button key={t.id} type="button" aria-pressed={on}
                  onClick={() => onChange({ ...value, teamIds: toggle(value.teamIds, t.id) })}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${on ? 'bg-cta text-fg-inverse border-cta font-semibold' : 'border-edge text-fg-3'}`}>
                  {t.name} · {t.members.length}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="border border-edge-muted rounded-xl">
        <button type="button" onClick={() => setShowAthletes(s => !s)} aria-expanded={showAthletes}
          className="w-full flex items-center justify-between px-3 py-2.5 text-left">
          <span className="text-sm text-fg-2">Individual athletes{value.athleteIds.length ? ` (${value.athleteIds.length})` : ''}</span>
          <span className="text-fg-4 text-xs">{showAthletes ? '▲' : '▼'}</span>
        </button>
        {showAthletes && (
          <div className="px-3 pb-3 space-y-2">
            {athletes.length > 8 && (
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search athletes" className="input-field" aria-label="Search athletes" />
            )}
            <ul className="max-h-56 overflow-y-auto divide-y divide-edge-muted">
              {shown.map(a => (
                <li key={a.id}>
                  <label className="flex items-center gap-3 py-2 text-sm cursor-pointer min-w-0">
                    <input type="checkbox"
                      checked={coveredByTeams.has(a.id) || value.athleteIds.includes(a.id)}
                      disabled={coveredByTeams.has(a.id)}
                      onChange={() => onChange({ ...value, athleteIds: toggle(value.athleteIds, a.id) })} />
                    <span className="text-fg-2 truncate">{a.full_name || a.email}</span>
                    {coveredByTeams.has(a.id) && <span className="text-xs text-fg-4 shrink-0">via team</span>}
                  </label>
                </li>
              ))}
              {shown.length === 0 && <li className="py-2 text-sm text-fg-4">No athletes yet.</li>}
            </ul>
          </div>
        )}
      </div>
      <p className="text-xs text-fg-4">{total === 0 ? 'Nobody picked yet.' : `${total} athlete${total === 1 ? '' : 's'} will get this.`}</p>
    </div>
  )
}
