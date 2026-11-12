'use client'
import { useEffect, useState } from 'react'

interface ParentRequest {
  id: string
  athlete_name: string
  sport: string | null
  created_at: string
}

export default function ParentRequestsBanner({ onAccepted }: { onAccepted?: () => void }) {
  const [requests, setRequests] = useState<ParentRequest[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/parent/requests').then(r => (r.ok ? r.json() : [])).then((data: typeof requests) => {
      if (!cancelled && Array.isArray(data)) setRequests(data)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (requests.length === 0) return null

  const respond = async (id: string, accept: boolean) => {
    setError('')
    setBusyId(id)
    try {
      const res = await fetch('/api/parent/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, accept }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setRequests(prev => prev.filter(r => r.id !== id))
      if (accept) onAccepted?.()
    } catch {
      setError('Could not save that. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div role="region" aria-label="Parent invites" className="bg-surface border-b border-cta/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 space-y-3">
        {requests.map(r => {
          const busy = busyId === r.id
          return (
            <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm text-fg-2">
                  <strong className="font-semibold text-fg-1">{r.athlete_name}</strong>{r.sport ? ` (${r.sport})` : ''} invited you to follow their progress as a parent.
                </p>
                <p className="text-xs text-fg-4 mt-0.5">
                  You will see a read-only view of their training. Nothing is shared until you accept.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => respond(r.id, true)} disabled={busy} className="btn-primary">Accept</button>
                <button type="button" onClick={() => respond(r.id, false)} disabled={busy} className="btn-ghost">Decline</button>
              </div>
            </div>
          )
        })}
        {error && <p role="alert" className="error-box">{error}</p>}
      </div>
    </div>
  )
}
