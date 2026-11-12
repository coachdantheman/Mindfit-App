'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNowStrict, parseISO } from 'date-fns'
import Skeleton from '@/components/shared/Skeleton'
import ParentRequestsBanner from '@/components/shared/ParentRequestsBanner'

interface Athlete {
  id: string
  email: string
  full_name: string | null
  primary_sport: string | null
  created_at: string
  last_seen_at: string | null
  entry_count: number
  streak: number
  month_points: number
  active_days_week: number
}

export default function ParentPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    fetch('/api/parent/athletes')
      .then(r => (r.ok ? r.json() : []))
      .then(d => { setAthletes(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">My Athletes</h1>
        <p className="page-subtitle">A read-only view of the progress your athlete chose to share with you.</p>
      </div>

      <div className="mb-6 -mx-4 sm:mx-0 sm:rounded-2xl overflow-hidden">
        <ParentRequestsBanner onAccepted={load} />
      </div>

      {loading ? <div className="card p-6"><Skeleton /></div> : athletes.length === 0 ? (
        <div className="card p-6 text-center py-12 text-fg-3">
          <p className="font-medium">No athletes yet</p>
          <p className="text-sm mt-1">Ask your athlete to invite you from Settings, under My people.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {athletes.map(a => (
            <Link key={a.id} href={`/parent/athlete/${a.id}`} className="card p-5 block group">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-fg-1 group-hover:text-cta transition-colors truncate">{a.full_name || a.email}</p>
                  <p className="text-xs text-fg-4 mt-0.5">
                    {a.primary_sport ? `${a.primary_sport} · ` : ''}
                    {a.last_seen_at ? `Active ${formatDistanceToNowStrict(parseISO(a.last_seen_at), { addSuffix: true })}` : 'Not active yet'}
                  </p>
                </div>
                <span className="text-xs text-cta shrink-0">View progress →</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <Stat label="Day streak" value={a.streak} flame={a.streak > 0} />
                <Stat label="Active this week" value={`${a.active_days_week}/7`} />
                <Stat label="Points this month" value={a.month_points} />
              </div>
              <p className="text-xs text-fg-4 mt-3">{a.entry_count} journal entr{a.entry_count === 1 ? 'y' : 'ies'} so far</p>
            </Link>
          ))}
        </div>
      )}

      <div className="card p-5 mt-6">
        <p className="font-semibold text-fg-1">How to support without pressure</p>
        <ul className="text-sm text-fg-3 mt-2 space-y-1.5 list-disc pl-5">
          <li>Praise the work they put in, not just the result.</li>
          <li>Ask what they learned, not only whether they won.</li>
          <li>Let the app be their space. Notice the consistency and say you are proud of it.</li>
        </ul>
      </div>
    </div>
  )
}

function Stat({ label, value, flame = false }: { label: string; value: number | string; flame?: boolean }) {
  return (
    <div className="rounded-xl bg-surface-2/60 border border-edge-muted px-3 py-2.5 text-center">
      <p className="text-lg font-semibold text-fg-1 tabular-nums">{flame && <span aria-hidden>🔥 </span>}{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-fg-4 mt-0.5">{label}</p>
    </div>
  )
}
