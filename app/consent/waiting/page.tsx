'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface RequestInfo { status?: string | null; parentEmail?: string | null }

export default function ConsentWaitingPage() {
  const router = useRouter()
  const [loaded, setLoaded] = useState(false)
  const [parentEmail, setParentEmail] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [notYet, setNotYet] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const signOut = async () => {
    await createClient().auth.signOut()
    router.push('/')
    router.refresh()
  }

  const load = async (): Promise<RequestInfo> => {
    const res = await fetch('/api/consent/request')
    const data: RequestInfo = await res.json().catch(() => ({}))
    if (data.status === 'deleted') {
      setDeleted(true)
      await createClient().auth.signOut()
    } else if (data.status && data.status !== 'pending') {
      router.push('/mindset')
      router.refresh()
    } else {
      setParentEmail(data.parentEmail ?? null)
    }
    return data
  }

  useEffect(() => {
    load().catch(() => {}).finally(() => setLoaded(true))
  }, [])

  const send = async (address: string) => {
    setSending(true); setError(''); setNotYet(false)
    const res = await fetch('/api/consent/request', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentEmail: address }),
    })
    const data = await res.json().catch(() => ({}))
    setSending(false)
    if (!res.ok) { setError(data.error ?? 'Could not send. Try again.'); return }
    setParentEmail(data.parentEmail ?? address)
    setEditing(false)
    setDraft('')
  }

  const checkApproved = async () => {
    setError(''); setNotYet(false)
    const data = await load()
    if (data.status === 'pending') setNotYet(true)
  }

  if (!loaded) return <p className="text-center text-sm text-fg-4">Loading…</p>

  if (deleted) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="bg-surface rounded-2xl border border-edge p-8">
          <h1 className="text-2xl font-bold text-fg-1 mb-3">This account was deleted</h1>
          <p className="text-fg-3 text-sm leading-relaxed">This account was deleted because no parent responded in time. You can sign up again later.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-surface rounded-2xl border border-edge p-8 space-y-6">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-fg-1">Ask a parent to say yes</h1>
          <p className="text-fg-3 text-sm leading-relaxed">
            Because you&rsquo;re under 13, a parent or guardian needs to give permission before you can use MindFit.
            Enter their email and we&rsquo;ll send them a short note explaining the app.
          </p>
        </div>

        {!parentEmail || editing ? (
          <form onSubmit={e => { e.preventDefault(); send(draft.trim()) }} className="space-y-4">
            <div>
              <label htmlFor="parent-email" className="block text-sm font-medium text-fg-2 mb-2">Parent or guardian email</label>
              <input
                id="parent-email"
                type="email"
                required
                autoComplete="off"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <button type="submit" disabled={sending || !draft.trim()} className="btn-primary w-full">
              {sending ? 'Sending…' : 'Send to my parent'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-fg-2">We emailed {parentEmail}. Ask them to check their inbox and spam folder.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <button type="button" onClick={() => send(parentEmail)} disabled={sending} className="btn-secondary">Resend</button>
              <button type="button" onClick={() => setEditing(true)} className="btn-secondary">Use a different email</button>
              <button type="button" onClick={checkApproved} className="btn-primary">I&rsquo;ve been approved</button>
            </div>
            {notYet && <p className="text-sm text-fg-3">Not yet. Ask your parent to open the email and choose an option.</p>}
          </div>
        )}

        {error && <p className="text-sm text-red-400" role="alert">{error}</p>}

        <div className="border-t border-edge pt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-fg-4 leading-relaxed">If no parent responds within 14 days, this account is deleted and you can sign up again later.</p>
          <button type="button" onClick={signOut} className="btn-ghost shrink-0">Sign out</button>
        </div>
      </div>
    </div>
  )
}
