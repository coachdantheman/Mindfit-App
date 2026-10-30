'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function DeleteAccountCard() {
  const router = useRouter()
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const del = async () => {
    setBusy(true)
    setError('')
    const res = await fetch('/api/account', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setError(data.error || 'Could not delete your account.'); setBusy(false); return }
    await createClient().auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="card p-5 border-red-400/30">
      <h3 className="font-semibold text-fg-1 mb-1 text-sm">Your data</h3>
      <p className="text-sm text-fg-4 mb-4">
        Download a copy of everything MindFit stores about you, or delete your account and all of it permanently.
      </p>
      <a href="/api/account/export" download className="btn-secondary inline-block mb-5">Export my data (JSON)</a>

      <div>
        <label htmlFor="delete-confirm" className="block text-xs uppercase tracking-wide text-fg-4 mb-1">
          Type DELETE to confirm
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="delete-confirm"
            type="text"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            autoComplete="off"
            className="input-field"
            aria-describedby="delete-help"
          />
          <button
            type="button"
            onClick={del}
            disabled={busy || confirm !== 'DELETE'}
            className="w-full sm:w-auto sm:shrink-0 text-red-400 hover:text-red-300 text-sm font-medium transition-colors border border-red-400/40 hover:border-red-400/70 px-4 py-2 rounded-xl disabled:opacity-50"
          >
            {busy ? 'Deleting…' : 'Delete my account'}
          </button>
        </div>
        <p id="delete-help" className="text-xs text-fg-4 mt-2">This removes your journal, training, nutrition, photos and sign-in. It cannot be undone.</p>
        {error && <p role="alert" className="text-sm text-red-400 mt-2">{error}</p>}
      </div>
    </div>
  )
}
