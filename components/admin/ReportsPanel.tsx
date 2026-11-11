'use client'
import { useCallback, useEffect, useState } from 'react'
import Skeleton from '@/components/shared/Skeleton'

interface Report {
  id: string
  kind: 'leaderboard_name' | 'coach_note'
  snapshot: string | null
  reason: string | null
  created_at: string
}

const KIND_LABEL: Record<Report['kind'], string> = { leaderboard_name: 'Leaderboard name', coach_note: 'Coach note' }

export default function ReportsPanel() {
  const [reports, setReports] = useState<Report[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/reports')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('load failed')))
      .then(setReports)
      .catch(() => setError('Could not load reports.'))
  }, [])

  useEffect(() => { load() }, [load])

  const resolve = async (id: string) => {
    setBusyId(id)
    const res = await fetch('/api/reports', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'resolved' }),
    })
    setBusyId(null)
    if (!res.ok) { setError('Could not mark resolved.'); return }
    setReports(list => (list ?? []).filter(r => r.id !== id))
  }

  if (error) return <p className="text-sm text-red-400">{error}</p>
  if (!reports) return <Skeleton />
  if (reports.length === 0) return <p className="text-sm text-fg-4">No open reports.</p>

  return (
    <ul className="space-y-3">
      {reports.map(r => (
        <li key={r.id} className="border border-edge rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs text-fg-4">
            <span className="font-semibold text-fg-2">{KIND_LABEL[r.kind] ?? r.kind}</span>
            <time dateTime={r.created_at}>{new Date(r.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</time>
          </div>
          <p className="text-sm text-fg-1 whitespace-pre-wrap break-words">{r.snapshot || '(empty)'}</p>
          {r.reason && <p className="text-xs text-fg-3">Reason: {r.reason}</p>}
          <button
            type="button"
            onClick={() => resolve(r.id)}
            disabled={busyId === r.id}
            className="text-xs text-cta hover:text-fg-1 min-h-[44px] px-2 disabled:opacity-50"
          >
            {busyId === r.id ? 'Saving…' : 'Mark resolved'}
          </button>
        </li>
      ))}
    </ul>
  )
}
