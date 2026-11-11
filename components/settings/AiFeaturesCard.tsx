'use client'
import { useEffect, useState } from 'react'
import { setCachedAiAllowed } from '@/components/shared/AiConsentSheet'

export default function AiFeaturesCard() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/me/ai-consent')
      .then(r => (r.ok ? r.json() : { allowed: false }))
      .then(j => setAllowed(j.allowed === true))
      .catch(() => setAllowed(false))
  }, [])

  const toggle = async () => {
    if (allowed === null) return
    const next = !allowed
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/me/ai-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allow: next }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error || 'Could not update AI features.'); return }
      setAllowed(next)
      setCachedAiAllowed(next)
    } catch {
      setError('Could not update AI features.')
    } finally {
      setBusy(false)
    }
  }

  const on = allowed === true

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-fg-1 mb-1 text-sm">AI features</h3>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-fg-3">Meal estimates and AI training plans use Claude by Anthropic. Your name and email are never sent.</p>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="AI features"
          disabled={allowed === null || busy}
          onClick={toggle}
          className={`relative shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-40 ${on ? 'bg-cta' : 'bg-surface-3 border border-edge'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-fg-1 shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
        </button>
      </div>
      {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
    </div>
  )
}
