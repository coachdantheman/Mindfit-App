'use client'
import { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { MemberWithCount } from '@/types'
import TeamsManager from '@/components/coach/TeamsManager'
import CreateWorkout from '@/components/coach/CreateWorkout'
import CreateProgram from '@/components/coach/CreateProgram'
import Link from 'next/link'
import Skeleton from '@/components/shared/Skeleton'
import TabBar from '@/components/shared/TabBar'
import { useToast } from '@/components/shared/Toast'
import { FLAG_LABELS } from '@/components/shared/flag-labels'
import { formatLastSeen, latestOf } from '@/lib/last-seen'
import { saveRoster } from '@/components/shared/roster'
import { FlameIcon } from '@/components/shared/icons'

function lastActive(a: MemberWithCount): string {
  return formatLastSeen(latestOf(a.last_seen_at, a.overview?.last_journal_date, a.overview?.last_flow_at))
}

function exportCSV(athletes: MemberWithCount[]) {
  const header = ['Name', 'Email', 'Joined', 'Last Active', 'Journal Entries', 'Streak', 'MPI', 'Baseline MPI', 'Avg Confidence (3)', 'Avg Anxiety (3)', 'Flags']
  const rows = athletes.map(a => [
    a.full_name ?? '', a.email, a.created_at.split('T')[0], lastActive(a), a.entry_count,
    a.overview?.streak ?? '', a.overview?.latest_mpi ?? '', a.overview?.baseline_mpi ?? '',
    a.overview?.avg_confidence_3 ?? '', a.overview?.avg_anxiety_3 ?? '',
    (a.overview?.flags ?? []).map(f => FLAG_LABELS[f]?.label ?? f).join('; '),
  ])
  const csv = [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `mindfit-athletes-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function AthleteTable({ athletes, onChanged, notify }: { athletes: MemberWithCount[]; onChanged: () => void; notify: (msg: string) => void }) {
  const remove = async (a: MemberWithCount) => {
    if (!confirm(`Remove ${a.full_name || a.email} from your roster? Their account and data stay.`)) return
    const res = await fetch(`/api/coach/athletes/${a.id}`, { method: 'DELETE' })
    notify(res.ok ? 'Removed from your roster' : 'Could not remove')
    if (res.ok) onChanged()
  }
  const resend = async (a: MemberWithCount) => {
    const res = await fetch(`/api/coach/athletes/${a.id}/resend`, { method: 'POST' })
    notify(res.ok ? `Invite sent to ${a.email}` : 'Could not send invite')
  }
  const flagged = athletes.filter(a => (a.overview?.flags?.length ?? 0) > 0)
  const ordered = [
    ...flagged,
    ...athletes.filter(a => (a.overview?.flags?.length ?? 0) === 0),
  ]

  useEffect(() => { saveRoster('/coach', ordered.map(a => a.id)) }, [ordered])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        {flagged.length > 0 ? (
          <p className="text-sm text-orange-300 bg-orange-500/10 rounded-lg px-3 py-1.5">
            {flagged.length} athlete{flagged.length > 1 ? 's need' : ' needs'} attention
          </p>
        ) : (
          <p className="text-sm text-fg-4">All athletes on track.</p>
        )}
        <button
          onClick={() => exportCSV(ordered)}
          className="text-xs font-medium text-fg-3 hover:text-fg-2 border border-edge rounded-lg px-3 py-1.5 transition-colors"
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-xs text-fg-4 uppercase tracking-wider">
              <th className="px-2 py-2 font-semibold">Athlete</th>
              <th className="px-2 py-2 font-semibold">Last active</th>
              <th className="px-2 py-2 font-semibold text-right">Streak</th>
              <th className="px-2 py-2 font-semibold text-right">MPI</th>
              <th className="px-2 py-2 font-semibold">Status</th>
              <th className="px-2 py-2 font-semibold"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {ordered.map(a => (
              <tr key={a.id} className="border-t border-edge-muted hover:bg-surface-2/60 transition-colors">
                <td className="px-2 py-3">
                  <Link href={`/coach/athlete/${a.id}`} className="block group">
                    <p className="font-medium text-fg-2 group-hover:text-cta transition-colors">
                      {a.full_name || a.email}
                    </p>
                    <p className="text-xs text-fg-4">
                      Joined {format(parseISO(a.created_at), 'MMM d, yyyy')} · {a.entry_count} entries
                    </p>
                  </Link>
                </td>
                <td className="px-2 py-3 text-fg-3">{lastActive(a)}</td>
                <td className="px-2 py-3 text-right tabular-nums text-fg-2">
                  {a.overview?.streak ? <span className="inline-flex items-center gap-1"><FlameIcon className="w-3.5 h-3.5 text-cta" />{a.overview.streak}</span> : '—'}
                </td>
                <td className="px-2 py-3 text-right tabular-nums">
                  {a.overview?.latest_mpi != null ? (
                    <span className="font-semibold text-cta">{a.overview.latest_mpi}</span>
                  ) : (
                    <span className="text-fg-4">—</span>
                  )}
                </td>
                <td className="px-2 py-3">
                  <div className="flex flex-wrap gap-1">
                    {a.status === 'invited' ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cta/15 text-cta">Invited</span>
                    ) : (a.overview?.flags ?? []).length === 0 ? (
                      <span className="text-xs text-green-400/80">On track</span>
                    ) : (
                      (a.overview?.flags ?? []).map(f => (
                        <span key={f} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${FLAG_LABELS[f]?.className ?? 'bg-surface-2/60 text-fg-3'}`}>
                          {FLAG_LABELS[f]?.label ?? f}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-2 py-3 text-right whitespace-nowrap">
                  {a.status === 'invited' && (
                    <button type="button" onClick={() => resend(a)} className="text-xs text-fg-3 hover:text-cta mr-3">Resend invite</button>
                  )}
                  <button type="button" onClick={() => remove(a)} className="text-xs text-fg-4 hover:text-red-400" aria-label={`Remove ${a.full_name || a.email}`}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function CoachPage() {
  const [athletes, setAthletes] = useState<MemberWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'athletes' | 'teams' | 'workouts' | 'programs'>('athletes')
  const [teams, setTeams] = useState<{ id: string; name: string; members: { id: string }[] }[]>([])
  const [teamFilter, setTeamFilter] = useState('')
  const notify = useToast()

  const fetchAthletes = useCallback(async () => {
    const [res, teamRes] = await Promise.all([fetch('/api/coach/athletes'), fetch('/api/coach/teams')])
    if (res.ok) setAthletes(await res.json())
    if (teamRes.ok) setTeams(await teamRes.json())
    setLoading(false)
  }, [])

  const filterTeam = teams.find(t => t.id === teamFilter)
  const shown = filterTeam ? athletes.filter(a => filterTeam.members.some(m => m.id === a.id)) : athletes

  useEffect(() => { fetchAthletes() }, [fetchAthletes])

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Coach Dashboard</h1>
        <p className="page-subtitle">Manage and monitor your athletes.</p>
      </div>

      <TabBar
        label="Coach sections"
        tabs={[
          { key: 'athletes' as const, label: 'My Athletes' },
          { key: 'teams' as const, label: 'Teams' },
          { key: 'workouts' as const, label: 'Workouts' },
          { key: 'programs' as const, label: 'Programs' },
        ]}
        active={tab}
        onSelect={setTab}
      />

      <div className="card p-6">
        {tab === 'programs' ? (
          <CreateProgram />
        ) : tab === 'teams' ? (
          <TeamsManager onChanged={fetchAthletes} />
        ) : tab === 'workouts' ? (
          <CreateWorkout />
        ) : loading ? (
          <Skeleton />
        ) : athletes.length === 0 ? (
          <div className="text-center py-12 text-fg-3">
            <p className="font-medium">No athletes yet</p>
            <p className="text-sm mt-1">Create a team and share its code, or add athletes by email.</p>
            <button
              onClick={() => setTab('teams')}
              className="mt-4 bg-cta hover:bg-brand-600 text-fg-inverse font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              Create Your First Team
            </button>
          </div>
        ) : (
          <>
            {teams.length > 0 && (
              <div className="mb-4">
                <label htmlFor="athlete-team-filter" className="sr-only">Filter by team</label>
                <select id="athlete-team-filter" value={teamFilter} onChange={e => setTeamFilter(e.target.value)} className="input-field sm:w-64">
                  <option value="">All athletes ({athletes.length})</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.members.length})</option>)}
                </select>
              </div>
            )}
            <AthleteTable athletes={shown} onChanged={fetchAthletes} notify={notify} />
          </>
        )}
      </div>
    </div>
  )
}
