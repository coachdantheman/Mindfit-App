'use client'
import { useState, useEffect, ReactNode } from 'react'
import Skeleton from '@/components/shared/Skeleton'
import SaveButton, { SaveState } from '@/components/shared/SaveButton'
import { useToast } from '@/components/shared/Toast'
import { clearDraft, draftKey, readDraft, writeDraft } from '@/lib/useDraft'
import { localDateISO } from '@/lib/dates'

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

interface Draft { completed: boolean; duration: string; notes: string }

export default function DailyPracticeForm({
  endpoint, title, description, checkboxLabel, notesPlaceholder,
  extraFields, buildPayload, loadExtra,
}: Props) {
  const notify = useToast()
  const [completed, setCompleted] = useState(false)
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<SaveState>('idle')

  const today = localDateISO()
  const key = draftKey(`practice:${endpoint}`)

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
        } else {
          const draft = readDraft<Draft>(key)
          if (draft) { setCompleted(draft.completed); setDuration(draft.duration); setNotes(draft.notes) }
        }
        setLoading(false)
      })
  }, [today, endpoint, key])

  // Keep an unsaved draft so a tab switch or reload doesn't lose it.
  useEffect(() => {
    if (loading || saved) return
    writeDraft<Draft>(key, { completed, duration, notes })
  }, [completed, duration, notes, loading, saved, key])

  const handleSave = async () => {
    setState('saving')
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
    if (res.ok) {
      setSaved(true)
      setState('saved')
      clearDraft(key)
      notify(`${title} saved`)
    } else {
      setState('error')
      notify('Could not save. Please try again.', 'error')
    }
  }

  if (loading) return <Skeleton />

  const touch = () => { setSaved(false); if (state !== 'saving') setState('idle') }

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h3 className="font-semibold text-fg-1 mb-1">{title}</h3>
        <p className="text-sm text-fg-4 mb-5">{description}</p>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => { setCompleted(!completed); touch() }}
              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                completed ? 'bg-cta border-cta' : 'border-edge hover:border-fg-3'
              }`}
            >
              {completed && (
                <svg className="w-4 h-4 text-fg-inverse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-fg-2 font-medium">{checkboxLabel}</span>
          </label>

          <div className="flex gap-3">
            <div>
              <label className="text-sm text-fg-3 block mb-1">Duration (minutes)</label>
              <input
                type="number"
                min="1"
                max="120"
                value={duration}
                onChange={e => { setDuration(e.target.value); touch() }}
                placeholder="e.g. 10"
                className="w-32 input-field"
              />
            </div>
            {extraFields?.({ saved, setSaved: v => { setSaved(v); if (!v) touch() } })}
          </div>

          <div>
            <label className="text-sm text-fg-3 block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); touch() }}
              placeholder={notesPlaceholder}
              rows={3}
              className="textarea-field"
            />
          </div>

          <SaveButton
            type="button"
            state={state}
            idleLabel={saved ? 'Saved ✓' : 'Save'}
            disabled={saved}
            onClick={handleSave}
            className="sm:w-auto"
          />
        </div>
      </div>
    </div>
  )
}
