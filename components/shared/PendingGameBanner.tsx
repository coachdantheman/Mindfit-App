'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// After a pre-game Flow Stack, the next thing the athlete does is log the
// game. Shows until the game is logged, dismissed, or 48 hours pass.
export default function PendingGameBanner({ onOpen }: { onOpen?: (sessionId: string) => void }) {
  const router = useRouter()
  const [pending, setPending] = useState<{ session_id: string } | null>(null)

  useEffect(() => {
    const load = () => {
      fetch('/api/mindset/flow-state/pending-game')
        .then(r => (r.ok ? r.json() : null))
        .then(d => { if (d) setPending(d.session_id ? d : null) })
        .catch(() => {})
    }
    load()
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  if (!pending) return null

  const open = () => {
    if (onOpen) onOpen(pending.session_id)
    else router.push(`/exercise?tab=gameday&session=${pending.session_id}`)
  }
  const dismiss = () => {
    setPending(null)
    fetch('/api/mindset/flow-state/pending-game', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: pending.session_id }),
    }).catch(() => {})
  }

  return (
    <div className="mb-5 rounded-2xl border border-cta/40 bg-cta/10 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-cta">After your Flow Stack</p>
      <p className="font-semibold text-fg-1 mt-1">How did the game go? Log it now.</p>
      <p className="text-sm text-fg-3 mt-0.5">Your flow score links to your pre-game routine so you can see what it does for you.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={open} className="btn-primary !py-2">Log my game</button>
        <button type="button" onClick={dismiss} className="btn-ghost">Not today</button>
      </div>
    </div>
  )
}
