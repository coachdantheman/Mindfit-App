'use client'
import { useMemo, useState } from 'react'
import type { ClaimResult, ClaimStatus } from '@/types'
import { extractEmails } from '@/lib/links'

interface Props {
  onDone: () => void
}

const STATUS_LABEL: Record<ClaimStatus, { label: string; className: string }> = {
  created: { label: 'Account created', className: 'bg-cta/15 text-cta' },
  linked: { label: 'Linked', className: 'bg-green-500/10 text-green-400' },
  already_linked: { label: 'Already yours', className: 'bg-surface-3/60 text-fg-3' },
  invalid: { label: 'Skipped', className: 'bg-orange-500/10 text-orange-400' },
  error: { label: 'Failed', className: 'bg-red-500/10 text-red-400' },
}

export default function BulkClaimForm({ onDone }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<ClaimResult[] | null>(null)

  const count = useMemo(() => extractEmails(text).length, [text])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResults(null)
    setLoading(true)
    const res = await fetch('/api/coach/athletes/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Could not add athletes.'); return }
    setResults(data.results)
    setText('')
    onDone()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="bulk-athletes" className="block text-xs uppercase tracking-wide text-fg-4 mb-1">Athlete emails</label>
          <textarea
            id="bulk-athletes"
            value={text}
            onChange={e => setText(e.target.value)}
            rows={6}
            placeholder={'One per line, comma-separated, or paste a roster CSV.\nJordan Lee, jordan@example.com\nsam@example.com'}
            className="textarea-field"
            aria-describedby="bulk-athletes-help"
          />
          <p id="bulk-athletes-help" className="text-xs text-fg-4 mt-1">
            {count === 0 ? 'Names next to emails are used for the athlete’s profile.' : `${count} email${count === 1 ? '' : 's'} detected · max 200 per batch`}
          </p>
        </div>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={loading || count === 0} className="btn-primary">
          {loading ? 'Adding…' : `Add ${count || ''} athlete${count === 1 ? '' : 's'}`}
        </button>
      </form>

      {results && (
        <div className="card p-4" role="status">
          <p className="text-sm font-semibold text-fg-1 mb-2">
            {results.filter(r => r.status === 'created' || r.status === 'linked').length} added to your roster
          </p>
          <ul className="divide-y divide-edge-muted">
            {results.map(r => (
              <li key={r.email} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-fg-2 truncate">{r.email}{r.message ? <span className="text-fg-4 text-xs"> · {r.message}</span> : null}</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_LABEL[r.status].className}`}>
                  {STATUS_LABEL[r.status].label}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-fg-4 mt-3">
            New accounts get an email from you. They sign in with that address and set a password on first visit.
          </p>
        </div>
      )}
    </div>
  )
}
