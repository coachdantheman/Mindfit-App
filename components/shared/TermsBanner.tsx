'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// Existing accounts that pre-date the consent checkbox accept once here.
// The database (profiles.terms_accepted_at) is the only source of truth:
// shown when it is null, hidden the instant "I agree" is tapped, and put
// back with an error if the save fails.
export default function TermsBanner() {
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const accepted = useRef(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/profile').then(r => r.ok ? r.json() : null).then(p => {
      if (cancelled || !p?.id || accepted.current) return
      if (!p.terms_accepted_at) setShow(true)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (!show) return null

  const accept = async () => {
    accepted.current = true
    setError('')
    setBusy(true)
    setShow(false)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms_accepted_at: true }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch {
      accepted.current = false
      setShow(true)
      setError('Could not save your acceptance. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div role="region" aria-label="Terms update" className="bg-surface border-b border-cta/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <p className="text-sm text-fg-2">
            We&rsquo;ve published our{' '}
            <Link href="/terms" className="text-cta hover:underline">Terms</Link> and{' '}
            <Link href="/privacy" className="text-cta hover:underline">Privacy Policy</Link>. Please review and accept to keep using MindFit.
          </p>
          {error && <p role="alert" className="error-box mt-2">{error}</p>}
        </div>
        <button type="button" onClick={accept} disabled={busy} className="btn-primary shrink-0">{busy ? 'Saving…' : 'I agree'}</button>
      </div>
    </div>
  )
}
