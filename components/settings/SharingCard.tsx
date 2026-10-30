'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { UserRole } from '@/types'

interface Person { linkId: string; id: string; full_name: string | null; email: string }
interface Links { coaches: Person[]; parents: Person[]; pendingParents: { linkId: string; email: string }[]; athletes: Person[] }

export default function SharingCard({ role }: { role: UserRole }) {
  const [links, setLinks] = useState<Links | null>(null)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  const load = () => fetch('/api/me/links').then(r => r.ok ? r.json() : null).then(setLinks)
  useEffect(() => { load() }, [])

  const share = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    const res = await fetch('/api/me/links', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'parent', email }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setStatus({ ok: false, msg: data.error || 'Could not share.' }); return }
    setStatus({ ok: true, msg: data.outcome === 'invited' ? 'Invite sent. They get access when they create an account.' : 'Shared.' })
    setEmail('')
    load()
  }

  const revoke = async (kind: 'coach' | 'parent' | 'pending_parent', id: string, label: string) => {
    if (!confirm(`Stop sharing your progress with ${label}?`)) return
    await fetch('/api/me/links', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, id }) })
    load()
  }

  if (role === 'parent') {
    return (
      <div className="card p-5">
        <h3 className="font-semibold text-fg-1 mb-1 text-sm">Sharing</h3>
        <p className="text-sm text-fg-4 mb-3">You follow {links?.athletes.length ?? 0} athlete{links?.athletes.length === 1 ? '' : 's'}.</p>
        <Link href="/parent" className="btn-secondary inline-block">View my athletes</Link>
      </div>
    )
  }

  const name = (p: Person) => p.full_name || p.email

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-fg-1 mb-1 text-sm">Sharing</h3>
      <p className="text-sm text-fg-4 mb-4">Who can see your progress. You can remove anyone at any time.</p>

      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-fg-4 mb-1">Coaches</p>
          {!links ? <p className="text-sm text-fg-4">Loading…</p> : links.coaches.length === 0 ? (
            <p className="text-sm text-fg-3">No coach linked.</p>
          ) : (
            <ul className="divide-y divide-edge-muted">
              {links.coaches.map(c => (
                <li key={c.linkId} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-fg-2 truncate">{name(c)}</span>
                  <button type="button" onClick={() => revoke('coach', c.linkId, name(c))} className="text-xs text-fg-4 hover:text-red-400">Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-fg-4 mb-1">Parents</p>
          {links && (links.parents.length > 0 || links.pendingParents.length > 0) && (
            <ul className="divide-y divide-edge-muted mb-3">
              {links.parents.map(p => (
                <li key={p.linkId} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-fg-2 truncate">{name(p)}</span>
                  <button type="button" onClick={() => revoke('parent', p.linkId, name(p))} className="text-xs text-fg-4 hover:text-red-400">Remove</button>
                </li>
              ))}
              {links.pendingParents.map(p => (
                <li key={p.linkId} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-fg-3 truncate">{p.email} <span className="text-xs text-fg-4">· invited</span></span>
                  <button type="button" onClick={() => revoke('pending_parent', p.linkId, p.email)} className="text-xs text-fg-4 hover:text-red-400">Cancel</button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={share} className="flex gap-2">
            <div className="flex-1">
              <label htmlFor="share-parent-email" className="sr-only">Parent&rsquo;s email</label>
              <input
                id="share-parent-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="parent@example.com"
                className="input-field"
              />
            </div>
            <button type="submit" disabled={busy || !email} className="btn-primary shrink-0">{busy ? 'Sharing…' : 'Share'}</button>
          </form>
          {status && <p role="status" className={`text-sm mt-2 ${status.ok ? 'text-green-400' : 'text-red-400'}`}>{status.msg}</p>}
          <p className="text-xs text-fg-4 mt-2">A parent sees your journal, training, nutrition and sleep. Weigh-ins and progress photos stay private.</p>
        </div>
      </div>
    </div>
  )
}
