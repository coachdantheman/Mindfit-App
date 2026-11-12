'use client'
import { useEffect, useState } from 'react'

const KEY = 'mf-invite-parent-dismissed'

// Shown to athletes with no parent linked or invited. One email, one tap.
export default function InviteParentCard() {
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    try { if (localStorage.getItem(KEY)) return } catch {}
    Promise.all([
      fetch('/api/profile').then(r => (r.ok ? r.json() : null)),
      fetch('/api/me/links').then(r => (r.ok ? r.json() : null)),
    ]).then(([profile, links]) => {
      if (profile?.role !== 'member' || !links) return
      const birthYear = Number(profile.birth_year)
      if (birthYear && new Date().getFullYear() - birthYear < 13) return
      if ((links.parents?.length ?? 0) + (links.pendingParents?.length ?? 0) === 0) setShow(true)
    }).catch(() => {})
  }, [])

  const dismiss = () => {
    setShow(false)
    try { localStorage.setItem(KEY, '1') } catch {}
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const res = await fetch('/api/me/links', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'parent', email }),
    }).catch(() => null)
    const data = res ? await res.json().catch(() => ({})) : {}
    setBusy(false)
    if (!res?.ok) { setMsg({ ok: false, text: data.error || 'Could not send. Try again.' }); return }
    setMsg({ ok: true, text: 'Invite sent. Your parent gets an email linked to your account.' })
    setTimeout(dismiss, 2500)
  }

  if (!show) return null
  return (
    <div className="card p-5 mb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cta">Bring your parent in</p>
          <p className="font-semibold text-fg-1 mt-1">Invite a parent to follow your progress</p>
          <p className="text-sm text-fg-3 mt-0.5">They see a read-only view of your training. Weigh-ins and photos stay private.</p>
        </div>
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="btn-ghost px-2 shrink-0">✕</button>
      </div>
      <form onSubmit={send} className="flex gap-2 mt-3">
        <label htmlFor="invite-parent-email" className="sr-only">Parent email</label>
        <input id="invite-parent-email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
          placeholder="parent@example.com" className="input-field flex-1" />
        <button type="submit" disabled={busy || !email} className="btn-primary shrink-0">{busy ? 'Sending…' : 'Invite'}</button>
      </form>
      {msg && <p role="status" className={`text-sm mt-2 ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>}
    </div>
  )
}
