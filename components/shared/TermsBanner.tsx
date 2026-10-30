'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

// Existing accounts that pre-date the consent checkbox accept once here.
export default function TermsBanner() {
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    try { if (sessionStorage.getItem('mf_terms_ok') === '1') return } catch {}
    fetch('/api/profile').then(r => r.ok ? r.json() : null).then(p => {
      if (!p) return
      if (p.terms_accepted_at) { try { sessionStorage.setItem('mf_terms_ok', '1') } catch {} }
      else setShow(true)
    })
  }, [])

  if (!show) return null

  const accept = async () => {
    setBusy(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ terms_accepted_at: true }),
    })
    if (res.ok) { try { sessionStorage.setItem('mf_terms_ok', '1') } catch {}; setShow(false) }
    setBusy(false)
  }

  return (
    <div role="region" aria-label="Terms update" className="bg-surface border-b border-cta/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-fg-2 flex-1">
          We&rsquo;ve published our{' '}
          <Link href="/terms" className="text-cta hover:underline">Terms</Link> and{' '}
          <Link href="/privacy" className="text-cta hover:underline">Privacy Policy</Link>. Please review and accept to keep using MindFit.
        </p>
        <button type="button" onClick={accept} disabled={busy} className="btn-primary shrink-0">{busy ? 'Saving…' : 'I agree'}</button>
      </div>
    </div>
  )
}
