'use client'
import { useState, useEffect } from 'react'

const TYPES = ['Guided', 'Breathing', 'Body Scan', 'Mindfulness', 'Other']

export default function MeditationForm() {
  const [completed, setCompleted] = useState(false)
  const [duration, setDuration] = useState('')
  const [type, setType] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    fetch(`/api/mindset/meditation?date=${today}`)
      .then(r => r.json())
      .then(data => {
        if (data.length > 0) {
          setCompleted(data[0].completed)
          setDuration(data[0].duration_min?.toString() || '')
          setType(data[0].meditation_type || '')
          setNotes(data[0].notes || '')
          setSaved(true)
        }
        setLoading(false)
      })
  }, [today])

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/mindset/meditation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry_date: today,
        completed,
        duration_min: duration ? parseInt(duration) : null,
        meditation_type: type || null,
        notes: notes || null,
      }),
    })
    if (res.ok) setSaved(true)
    setSaving(false)
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>

  return (
    <div className="space-y-5">
      <div className="bg-gray-900 rounded-2xl border border-white/10 p-6">
        <h3 className="font-semibold text-gray-100 mb-1">Daily Meditation</h3>
        <p className="text-sm text-gray-500 mb-5">Train your mind like you train your body. Even 5 minutes makes a difference.</p>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => { setCompleted(!completed); setSaved(false) }}
              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                completed ? 'bg-cta border-cta' : 'border-gray-600 hover:border-gray-400'
              }`}
            >
              {completed && (
                <svg className="w-4 h-4 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-gray-200 font-medium">I meditated today</span>
          </label>

          <div className="flex gap-3">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Duration (minutes)</label>
              <input
                type="number"
                min="1"
                max="120"
                value={duration}
                onChange={e => { setDuration(e.target.value); setSaved(false) }}
                placeholder="e.g. 10"
                className="w-32 bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cta/50"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Type</label>
              <select
                value={type}
                onChange={e => { setType(e.target.value); setSaved(false) }}
                className="bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cta/50"
              >
                <option value="">Select type</option>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); setSaved(false) }}
              placeholder="How was your session? What did you focus on?"
              rows={3}
              className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cta/50 resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="bg-cta hover:bg-brand-600 text-gray-900 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : saved ? 'Success ✓' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
