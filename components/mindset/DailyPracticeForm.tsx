'use client'
import { useState, useEffect, ReactNode } from 'react'

interface Props {
  endpoint: string
  title: string
  description: string
  checkboxLabel: string
  notesPlaceholder: string
  extraFields?: (props: { saved: boolean; setSaved: (v: boolean) => void }) => ReactNode
  buildPayload?: () => Record<string, unknown>
  loadExtra?: (data: Record<string, unknown>) => void
}

export default function DailyPracticeForm({
  endpoint, title, description, checkboxLabel, notesPlaceholder,
  extraFields, buildPayload, loadExtra,
}: Props) {
  const [completed, setCompleted] = useState(false)
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    fetch(`${endpoint}?date=${today}`)
      .then(r => r.json())
      .then(data => {
        if (data.length > 0) {
          setCompleted(data[0].completed)
          setDuration(data[0].duration_min?.toString() || '')
          setNotes(data[0].notes || '')
          loadExtra?.(data[0])
          setSaved(true)
        }
        setLoading(false)
      })
  }, [today, endpoint])

  const handleSave = async () => {
    setSaving(true)
    const extra = buildPayload?.() ?? {}
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry_date: today,
        completed,
        duration_min: duration ? parseInt(duration) : null,
        notes: notes || null,
        ...extra,
      }),
    })
    if (res.ok) setSaved(true)
    setSaving(false)
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>

  return (
    <div className="space-y-5">
      <div className="bg-gray-900 rounded-2xl border border-white/10 p-6">
        <h3 className="font-semibold text-gray-100 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-5">{description}</p>

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
            <span className="text-gray-200 font-medium">{checkboxLabel}</span>
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
                className="w-32 input-field"
              />
            </div>
            {extraFields?.({ saved, setSaved })}
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); setSaved(false) }}
              placeholder={notesPlaceholder}
              rows={3}
              className="textarea-field"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="btn-primary"
          >
            {saving ? 'Saving…' : saved ? 'Success ✓' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
