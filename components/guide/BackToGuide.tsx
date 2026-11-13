'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { readTrip } from '@/lib/guide-return'

// Shown on pages opened from a Daily Guide step, so the athlete can get back
// in one tap. Steps back off when the Game Day pill is showing.
export default function BackToGuide() {
  const pathname = usePathname()
  const [show, setShow] = useState(false)

  useEffect(() => {
    let gameDay = false
    try { gameDay = !!sessionStorage.getItem('mf-from-gameday') } catch {}
    setShow(!gameDay && !!readTrip())
  }, [pathname])

  if (!show) return null
  return (
    <Link
      href="/guide"
      className="fixed left-1/2 -translate-x-1/2 z-40 bottom-[calc(env(safe-area-inset-bottom)_+_5.25rem)] sm:bottom-6 flex items-center gap-2 min-h-[44px] rounded-full border border-cta/50 bg-surface/95 backdrop-blur px-5 text-sm font-semibold text-cta shadow-[0_8px_24px_rgb(0_0_0/0.45)] whitespace-nowrap"
    >
      <span aria-hidden>←</span> Back to your guide
    </Link>
  )
}
