'use client'
import { useState } from 'react'

interface Props {
  onAdded: () => void
}

const SIGNUP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://mindfit.academy') + '/signup'

export default function AddEmailForm({ onAdded }: Props) {
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [addedEmail, setAddedEmail] = useState('')
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setAddedEmail('')
    setLoading(true)
    const res = await fetch('/api/admin/whitelist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, notes }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to add email.')
    } else {
      setAddedEmail(email)
      setEmail('')
      setNotes('')
      onAdded()
    }
    setLoading(false)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(SIGNUP_URL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="member@example.com"
            className="flex-1 bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cta/50 text-gray-100 placeholder:text-gray-500"
          />
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-40 bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cta/50 hidden sm:block text-gray-100 placeholder:text-gray-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-cta hover:bg-brand-600 text-gray-900 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {loading ? 'Adding…' : 'Add Email'}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </form>

      {addedEmail && (
        <div className="bg-cta/10 border border-cta/20 rounded-xl p-4 space-y-3">
          <p className="text-sm text-gray-200">
            <span className="text-cta font-semibold">{addedEmail}</span> added. Share the signup link:
          </p>
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
            <span className="text-xs text-gray-400 flex-1 truncate">{SIGNUP_URL}</span>
            <button
              onClick={copyLink}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                copied ? 'bg-green-500/20 text-green-400' : 'bg-cta/20 text-cta hover:bg-cta/30'
              }`}
            >
              {copied ? 'Copied ✓' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
