'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import Skeleton from '@/components/shared/Skeleton'

interface Athlete { id: string; email: string; full_name: string | null; primary_sport: string | null; created_at: string; onboarded_at: string | null; entry_count: number }

export default function ParentPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/parent/athletes').then(r => r.ok ? r.json() : []).then(d => { setAthletes(Array.isArray(d) ? d : []); setLoading(false) })
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">My Athletes</h1>
        <p className="page-subtitle">A read-only view of the progress your athlete chose to share with you.</p>
      </div>
      <div className="card p-6">
        {loading ? <Skeleton /> : athletes.length === 0 ? (
          <div className="text-center py-12 text-fg-3">
            <p className="font-medium">No athletes yet</p>
            <p className="text-sm mt-1">Ask your athlete to add your email under Settings → Sharing.</p>
          </div>
        ) : (
          <ul className="divide-y divide-edge-muted">
            {athletes.map(a => (
              <li key={a.id}>
                <Link href={`/parent/athlete/${a.id}`} className="flex items-center justify-between gap-3 py-3 group">
                  <div className="min-w-0">
                    <p className="font-medium text-fg-2 group-hover:text-cta transition-colors truncate">{a.full_name || a.email}</p>
                    <p className="text-xs text-fg-4">
                      {a.primary_sport ? `${a.primary_sport} · ` : ''}Joined {format(parseISO(a.created_at), 'MMM d, yyyy')} · {a.entry_count} journal entries
                    </p>
                  </div>
                  <span className="text-xs text-fg-3 shrink-0">View →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
