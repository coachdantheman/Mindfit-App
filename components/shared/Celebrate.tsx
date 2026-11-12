'use client'
import { useEffect, useState } from 'react'
import { haptic } from '@/lib/haptics'

// A calm gold ring that blooms once behind its children, with a success
// haptic. Change `fire` to a new truthy value to play it again.
export default function Celebrate({ fire, children, className = '' }: { fire: unknown; children: React.ReactNode; className?: string }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!fire) return
    setOn(true)
    haptic.success()
    const t = setTimeout(() => setOn(false), 1200)
    return () => clearTimeout(t)
  }, [fire])
  return (
    <div className={`relative ${className}`}>
      {on && (
        <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="mf-bloom absolute w-24 h-24 rounded-full border-2 border-cta" />
          <span className="mf-bloom mf-bloom-late absolute w-24 h-24 rounded-full border border-cta/60" />
        </span>
      )}
      {children}
    </div>
  )
}
