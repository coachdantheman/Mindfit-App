'use client'
import { useState, useEffect } from 'react'
import { Affirmation } from '@/types'

export default function AffirmationsList() {
  const [affirmations, setAffirmations] = useState<Affirmation[]>([])
  const [newText, setNewText] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    fetch('/api/mindset/affirmations')
      .then(r => r.json())
      .then(data => { setAffirmations(data); setLoading(false) })
  }, [])

  const addAffirmation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newText.trim()) return
    setAdding(true)
    const res = await fetch('/api/mindset/affirmations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newText }),
    })
    if (res.ok) {
      const data = await res.json()
      setAffirmations(prev => [...prev, data])
      setNewText('')
    }
    setAdding(false)
  }

  const saveEdit = async (id: string) => {
    if (!editText.trim()) return
    await fetch('/api/mindset/affirmations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, text: editText }),
    })
    setAffirmations(prev => prev.map(a => a.id === id ? { ...a, text: editText } : a))
    setEditingId(null)
  }

  const removeAffirmation = async (id: string) => {
    await fetch('/api/mindset/affirmations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setAffirmations(prev => prev.filter(a => a.id !== id))
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>

  return (
    <div className="space-y-5">
      <div className="bg-gray-900 rounded-2xl border border-white/10 p-6">
        <h3 className="font-semibold text-gray-100 mb-1">Self-Affirmations</h3>
        <p className="text-sm text-gray-500 mb-5">What you tell yourself shapes who you become. Write it. Believe it. Become it.</p>

        {affirmations.length > 0 && (
          <div className="space-y-2 mb-5">
            {affirmations.map((a, i) => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-800/50 border border-white/5 group">
                <span className="text-cta font-bold text-sm mt-0.5">{i + 1}.</span>
                {editingId === a.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit(a.id)}
                      className="flex-1 bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cta/50"
                      autoFocus
                    />
                    <button onClick={() => saveEdit(a.id)} className="text-xs text-cta font-medium">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-500">Cancel</button>
                  </div>
                ) : (
                  <>
                    <p className="flex-1 text-sm text-gray-200 italic">&ldquo;{a.text}&rdquo;</p>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingId(a.id); setEditText(a.text) }}
                        className="text-xs text-gray-500 hover:text-gray-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeAffirmation(a.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={addAffirmation} className="flex gap-2">
          <input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder="I am confident under pressure…"
            className="flex-1 bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cta/50"
          />
          <button
            type="submit"
            disabled={adding || !newText.trim()}
            className="bg-cta hover:bg-brand-600 text-gray-900 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {adding ? 'Adding…' : 'Add'}
          </button>
        </form>
      </div>
    </div>
  )
}
