'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { cached } from '@/lib/api-cache'
import { isAdult } from '@/lib/age'
import { isNativeApp } from '@/lib/platform'
import { lowMetric, offerDue, OFFER_KEY, type LowMetric, type Ratings } from '@/lib/low-score'

const COPY: Record<LowMetric, { tip: string; href: string; link: string }> = {
  motivation: {
    tip: 'Motivation is on the low side today. You don’t have to feel like it to act like the athlete you are. Start with the smallest step.',
    href: '/mindset?tab=Goals',
    link: 'Look at your goals',
  },
  focus: {
    tip: 'Focus is on the low side today. That’s a reading, not a verdict. Narrow it down: one target, one rep at a time.',
    href: '/mindset?tab=Visualization',
    link: 'Try a short visualization',
  },
  confidence: {
    tip: 'Confidence is on the low side today. Confidence follows evidence. Name one thing you did well this week and build from there.',
    href: '/mindset?tab=Affirmations',
    link: 'Read your identity statements',
  },
}

type Profile = { role?: string | null; birth_year?: number | null; birth_month?: number | null }

// Shown under the ratings when motivation, focus or confidence is 3 or lower.
// `links` is off inside the check-in, where leaving would drop unsaved answers.
export default function LowScoreNote({ ratings, links = true }: { ratings: Ratings; links?: boolean }) {
  const metric = lowMetric(ratings)
  const [offer, setOffer] = useState(false)
  const decided = useRef(false)

  // The coaching line is web only (the iPhone app has no outside links), shows
  // at most once a week, and is for adults only, the same rule as the contact
  // sync in lib/ghl.ts: athletes under 18 get the tip alone.
  useEffect(() => {
    if (!metric || decided.current) return
    decided.current = true
    if (isNativeApp()) return
    let last = 0
    try { last = Number(localStorage.getItem(OFFER_KEY)) || 0 } catch {}
    if (!offerDue(last, Date.now())) return
    cached<Profile | null>('/api/profile', p => {
      if (!p?.role || (p.role === 'member' && !isAdult(p))) return
      // If the date cannot be saved, skip the line rather than risk repeating it.
      try { localStorage.setItem(OFFER_KEY, String(Date.now())) } catch { return }
      setOffer(true)
    }).catch(() => {})
  }, [metric])

  if (!metric) return null
  const copy = COPY[metric]
  return (
    <div className="text-xs text-fg-3 bg-surface-2 rounded-lg px-3 py-2 space-y-1.5">
      <p>{copy.tip}</p>
      {links && <Link href={copy.href} className="inline-flex items-center min-h-[44px] text-cta hover:underline">{copy.link} →</Link>}
      {offer && (
        <p className="web-only">
          Seeing this often? This is what MindFit coaching trains.{' '}
          <a href="https://www.skool.com/mindfit" target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[44px] text-cta hover:underline">See MindFit coaching →</a>
        </p>
      )}
    </div>
  )
}
