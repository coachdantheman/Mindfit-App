'use client'
import { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { MemberWithCount } from '@/types'
import AddEmailForm from '@/components/admin/AddEmailForm'
import CreateWorkout from '@/components/coach/CreateWorkout'
import CreateProgram from '@/components/coach/CreateProgram'
import Link from 'next/link'
import Skeleton from '@/components/shared/Skeleton'

const FLAG_LABELS: Record<string, { label: string; className: string }> = {
  inactive_7d: { label: 'Inactive 7d', className: 'bg-red-500/10 text-red-400' },
  low_confidence: { label: 'Low confidence', className: 'bg-orange-500/10 text-orange-400' },
  high_anxiety: { label: 'High anxiety', className: 'bg-orange-500/10 text-orange-400' },
  mpi_drop: { label: 'MPI dropping', className: 'bg-red-500/10 text-red-400' },
}

function lastActive(a: MemberWithCount): string {
  const dates = [a.overview?.last_journal_date, a.overview?.last_flow_at].filter(Boolean) as string[]
  if (dates.length === 0) return '—'
  const latest = dates.map(d => new Date(d).getTime()).sort((x, y) => y - x)[0]
  const days = Math.floor((Date.now() - latest) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function exportCSV(athletes: MemberWithCount[]) {
  const header = ['Name', 'Email', 'Joined', 'Journal Entries', 'Streak', 'MPI', 'Baseline MPI', 'Avg Confidence (3)', 'Avg Anxiety (3)', 'Flags']
  const rows = athletes.map(a => [
    a.full_name ?? '', a.email, a.created_at.split('T')[0], a.entry_count,
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

function AthleteTable({ athletes }: { athletes: MemberWithCount[] }) {
  const flagged = athletes.filter(a => (a.overview?.flags?.length ?? 0) > 0)
  const ordered = [
    ...flagged,
    ...athletes.filter(a => (a.overview?.flags?.length ?? 0) === 0),
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
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
                  {a.overview?.streak ? `🔥 ${a.overview.streak}` : '—'}
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
                    {(a.overview?.flags ?? []).length === 0 ? (
                      <span className="text-xs text-green-400/80">On track</span>
                    ) : (
                      (a.overview?.flags ?? []).map(f => (
                        <span key={f} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${FLAG_LABELS[f]?.className ?? 'bg-surface-2/60 text-fg-3'}`}>
                          {FLAG_LABELS[f]?.label ?? f}
                        </span>
                      ))
                    )}
                  </div>
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
  const [tab, setTab] = useState<'athletes' | 'add' | 'workouts' | 'programs'>('athletes')

  const fetchAthletes = useCallback(async () => {
    const res = await fetch('/api/coach/athletes')
    if (res.ok) setAthletes(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchAthletes() }, [fetchAthletes])

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Coach Dashboard</h1>
        <p className="page-subtitle">Manage and monitor your athletes.</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {([
          { key: 'athletes' as const, label: 'My Athletes' },
          { key: 'add' as const, label: 'Add Athlete' },
          { key: 'workouts' as const, label: 'Workouts' },
          { key: 'programs' as const, label: 'Programs' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={tab === t.key ? 'tab-btn-active' : 'tab-btn'}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card p-6">
        {tab === 'programs' ? (
          <CreateProgram />
        ) : tab === 'add' ? (
          <div>
            <h3 className="font-semibold text-fg-1 mb-1">Add New Athlete</h3>
            <p className="text-sm text-fg-4 mb-3">Enter their email to grant app access. They'll be linked to you automatically when they sign up.</p>
            <AddEmailForm onAdded={() => { fetchAthletes(); setTab('athletes') }} />
          </div>
        ) : tab === 'workouts' ? (
          <CreateWorkout />
        ) : loading ? (
          <Skeleton />
        ) : athletes.length === 0 ? (
          <div className="text-center py-12 text-fg-3">
            <p className="font-medium">No athletes yet</p>
            <p className="text-sm mt-1">Add athlete emails to get started.</p>
            <button
              onClick={() => setTab('add')}
              className="mt-4 bg-cta hover:bg-brand-600 text-fg-inverse font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              Add Your First Athlete
            </button>
          </div>
        ) : (
          <AthleteTable athletes={athletes} />
        )}
      </div>
    </div>
  )
}
