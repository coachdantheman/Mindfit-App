'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { cached } from '@/lib/api-cache'
import { localDateISO } from '@/lib/dates'
import { readinessScore } from '@/lib/readiness'
import { todayQuery, type TodayData } from '@/lib/guide'

// Slim link back into the Daily Guide. Athletes only: coaches and parents have no rings.
export default function GuideBar() {
  const [member, setMember] = useState(false)
  const [data, setData] = useState<TodayData | null>(null)

  useEffect(() => {
    cached('/api/profile', (p: { role?: string } | null) => setMember(['member', 'admin'].includes(p?.role ?? 'member'))).catch(() => {})
    cached(todayQuery(localDateISO()), (d: TodayData | null) => { if (d?.pillars) setData(d) }).catch(() => {})
  }, [])

  if (!member) return null
  const score = data?.journal ? readinessScore(data.journal) : null
  const closed = data ? Object.values(data.pillars).filter(Boolean).length : 0

  return (
    <Link href="/guide" data-guide="mindset" className="card mb-6 flex items-center gap-4 px-4 min-h-[60px] hover:border-cta/40 transition-colors" aria-label="Open today's guide">
      <span className="relative w-10 h-10 shrink-0 grid place-items-center rounded-full border-2 border-cta/70 text-sm font-bold text-fg-1 tabular-nums">
        {score ?? '-'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] uppercase tracking-[0.18em] text-cta font-semibold">Today&apos;s guide</span>
        <span className="block text-sm text-fg-2 truncate">
          {!data ? 'Your plan for today' : !data.journal ? 'Start with your check-in' : closed === 4 ? 'Clutch Day. All four rings closed.' : `${closed} of 4 rings closed. See your next step.`}
        </span>
      </span>
      <span className="text-fg-4 shrink-0" aria-hidden>›</span>
    </Link>
  )
}
