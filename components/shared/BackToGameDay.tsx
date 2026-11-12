'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const KEY = 'mf-from-gameday'
const TTL_MS = 3 * 60 * 60 * 1000

export function markFromGameDay() {
  try { sessionStorage.setItem(KEY, String(Date.now())) } catch {}
}

// Shown on pages opened from an Exercise → Game Day step, so the athlete can
// get back to their pregame routine in one tap.
export default function BackToGameDay() {
  const pathname = usePathname()
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      const at = Number(sessionStorage.getItem(KEY) || 0)
      if (pathname.startsWith('/exercise') || !at || Date.now() - at > TTL_MS) {
        sessionStorage.removeItem(KEY)
        setShow(false)
      } else {
        setShow(true)
      }
    } catch { setShow(false) }
  }, [pathname])

  if (!show) return null
  return (
    <Link
      href="/exercise?tab=gameday"
      className="fixed left-1/2 -translate-x-1/2 z-40 bottom-[calc(env(safe-area-inset-bottom)_+_5.25rem)] sm:bottom-6 flex items-center gap-2 min-h-[44px] rounded-full border border-cta/50 bg-surface/95 backdrop-blur px-5 text-sm font-semibold text-cta shadow-[0_8px_24px_rgb(0_0_0/0.45)] whitespace-nowrap"
    >
      <span aria-hidden>←</span> Back to Game Day routine
    </Link>
  )
}
