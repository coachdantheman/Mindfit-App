'use client'
import { useEffect, useState } from 'react'
import { cached } from '@/lib/api-cache'

interface CoachRequest {
  id: string
  coach_name: string
  team_name: string | null
  created_at: string
}

export default function CoachRequestsBanner() {
  const [requests, setRequests] = useState<CoachRequest[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    cached('/api/me/coach-requests', (data: typeof requests) => {
      if (!cancelled && Array.isArray(data)) setRequests(data)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (requests.length === 0) return null

  const respond = async (id: string, accept: boolean) => {
    setError('')
    setBusyId(id)
    try {
      const res = await fetch('/api/me/coach-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, accept }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setRequests(prev => prev.filter(r => r.id !== id))
    } catch {
      setError('Could not save that. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div role="region" aria-label="Coach requests" className="bg-surface border-b border-cta/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 space-y-3">
        {requests.map(r => {
          const busy = busyId === r.id
          return (
            <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm text-fg-2">
                  <strong className="font-semibold text-fg-1">{r.coach_name}</strong> wants to connect{r.team_name ? ` and add you to ${r.team_name}` : ''}.
                </p>
                <p className="text-xs text-fg-4 mt-0.5">
                  Your coach would see your journal, check-ins, workouts, nutrition and sleep. You can remove a coach anytime in Settings.
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
