'use client'
import { useState } from 'react'

interface Props {
  onAdded: () => void
}

export default function AddEmailForm({ onAdded }: Props) {
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
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
      setSuccess(`${email} added successfully.`)
      setEmail('')
      setNotes('')
      onAdded()
    }
    setLoading(false)
  }

  return (
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
      {success && <p className="text-green-400 text-sm">{success}</p>}
    </form>
  )
}
