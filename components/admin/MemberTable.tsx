'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { MemberWithCount } from '@/types'
import Skeleton from '@/components/shared/Skeleton'
import { FLAG_LABELS } from '@/components/shared/flag-labels'
import { formatLastSeen, latestOf } from '@/lib/last-seen'
import { saveRoster } from '@/components/shared/roster'

function lastUsed(a: MemberWithCount): string {
  return formatLastSeen(latestOf(a.last_seen_at, a.overview?.last_journal_date, a.overview?.last_flow_at))
}

function StatusChips({ a }: { a: MemberWithCount }) {
  if (a.status === 'invited') {
    return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cta/15 text-cta whitespace-nowrap">Invited</span>
  }
  const flags = a.overview?.flags ?? []
  if (flags.length === 0) return <span className="text-xs text-green-400/80 whitespace-nowrap">On track</span>
  return (
    <div className="flex flex-wrap gap-1 justify-end sm:justify-start">
      {flags.map(f => (
        <span key={f} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${FLAG_LABELS[f]?.className ?? 'bg-surface-2/60 text-fg-3'}`}>
          {FLAG_LABELS[f]?.label ?? f}
        </span>
      ))}
    </div>
  )
}

export default function MemberTable() {
  const [rows, setRows] = useState<MemberWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/coach/athletes')
    if (res.ok) setRows(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const athletes = rows.filter(r => r.role === 'member')
  const parents = rows.filter(r => r.role === 'parent')

  useEffect(() => { if (athletes.length) saveRoster('/admin', athletes.map(a => a.id)) }, [athletes])

  const remove = async (m: MemberWithCount) => {
    if (!confirm(`Delete ${m.email} and ALL their data? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/members/${m.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setNotice(data.error || 'Delete failed'); return }
    setRows(prev => prev.filter(x => x.id !== m.id))
    setNotice(`Deleted ${m.email}`)
  }

  const resend = async (m: MemberWithCount) => {
    const res = await fetch(`/api/coach/athletes/${m.id}/resend`, { method: 'POST' })
    setNotice(res.ok ? `Invite sent to ${m.email}` : 'Could not send invite')
  }

  if (loading) return <Skeleton />

  const Actions = ({ m }: { m: MemberWithCount }) => (
    <div className="flex items-center gap-3 whitespace-nowrap">
      {m.status === 'invited' && (
        <button type="button" onClick={() => resend(m)} className="text-xs text-fg-3 hover:text-cta">Resend invite</button>
      )}
      <button type="button" onClick={() => remove(m)} className="text-xs text-fg-4 hover:text-red-400" aria-label={`Delete ${m.email}`}>Delete</button>
    </div>
  )

  const attention = athletes.filter(a => (a.overview?.flags?.length ?? 0) > 0 && a.status !== 'invited').length

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <p className="text-sm text-fg-4">
          {athletes.length} athlete{athletes.length === 1 ? '' : 's'}
          {attention > 0 && <span className="text-orange-300"> · {attention} need{attention === 1 ? 's' : ''} attention</span>}
        </p>
        {notice && <p role="status" className="text-xs text-fg-3">{notice}</p>}
      </div>

      {athletes.length === 0 ? (
        <p className="text-sm text-fg-4">No athletes yet. Invite some from the App invite tab.</p>
      ) : (
        <>
          {/* Phones: stacked list */}
          <ul className="sm:hidden divide-y divide-edge-muted">
            {athletes.map(a => (
              <li key={a.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link href={`/admin/athlete/${a.id}`} className="block font-medium text-fg-2 hover:text-cta truncate">
                    {a.full_name || a.email}
                  </Link>
                  {a.full_name && <p className="text-xs text-fg-4 truncate">{a.email}</p>}
                  <p className="text-xs text-fg-4 mt-0.5">Last used {lastUsed(a)} · {a.entry_count} entries{a.overview?.latest_mpi != null ? ` · MPI ${a.overview.latest_mpi}` : ''}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <StatusChips a={a} />
                  <Actions m={a} />
                </div>
              </li>
            ))}
          </ul>

          {/* Tablet and up: table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-fg-4 border-b border-edge">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Last used</th>
                  <th className="pb-2 font-medium text-right">Entries</th>
                  <th className="pb-2 font-medium text-right">MPI</th>
                  <th className="pb-2 font-medium pl-4">Status</th>
                  <th className="pb-2 font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge-muted">
                {athletes.map(a => (
                  <tr key={a.id} className="hover:bg-surface-2/40 transition-colors">
                    <td className="py-2.5 pr-4 max-w-[260px]">
                      <Link href={`/admin/athlete/${a.id}`} className="block group">
                        <p className="font-medium text-fg-2 group-hover:text-cta transition-colors truncate">{a.full_name || a.email}</p>
                        {a.full_name && <p className="text-xs text-fg-4 truncate">{a.email}</p>}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 text-fg-3 whitespace-nowrap">{lastUsed(a)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums font-semibold text-cta">{a.entry_count}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {a.overview?.latest_mpi != null ? <span className="font-semibold text-cta">{a.overview.latest_mpi}</span> : <span className="text-fg-4">—</span>}
                    </td>
                    <td className="py-2.5 pl-4 pr-4"><StatusChips a={a} /></td>
                    <td className="py-2.5 text-right"><Actions m={a} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {parents.length > 0 && (
        <div className="mt-8">
          <h4 className="text-xs uppercase tracking-wide text-fg-4 mb-2">Parents ({parents.length})</h4>
          <ul className="divide-y divide-edge-muted">
            {parents.map(p => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-fg-2 truncate">{p.full_name || p.email}</p>
                  {p.full_name && <p className="text-xs text-fg-4 truncate">{p.email}</p>}
                  <p className="text-xs text-fg-4">Last used {lastUsed(p)}</p>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-surface-3/60 text-fg-3">parent</span>
                  <button type="button" onClick={() => remove(p)} className="text-xs text-fg-4 hover:text-red-400" aria-label={`Delete ${p.email}`}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
