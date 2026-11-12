'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const DEFAULT_BEDTIME = '22:30'
const TOTAL_SEC = 30 * 60
const RING_R = 110
const RING_C = 2 * Math.PI * RING_R

// Ordered longest-first. A cue holds until its mark is reached.
const CUES = [
  { at: 1800, text: 'Screens off. Phone on the charger, out of reach.' },
  { at: 1200, text: 'Dim the lights. Lay out what you need for tomorrow.' },
  { at: 600, text: 'Think of three things that went well today.' },
  { at: 300, text: 'Slow breathing: 4 seconds in, 6 seconds out.' },
]

function clockLabel(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${h % 12 || 12}:${String(min).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function cueFor(remaining: number): string {
  if (remaining <= 0) return 'Lights out. Recovery starts now.'
  return CUES.filter(c => remaining <= c.at).pop()?.text ?? CUES[0].text
}

export default function WindDown() {
  const [bedtime, setBedtime] = useState(DEFAULT_BEDTIME)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(DEFAULT_BEDTIME)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [open, setOpen] = useState(false)
  const [startedAt, setStartedAt] = useState(0)
  const [now, setNow] = useState(0)

  useEffect(() => {
    fetch('/api/profile')
      .then(r => (r.ok ? r.json() : null))
      .then(p => {
        const v = typeof p?.default_bedtime === 'string' ? p.default_bedtime.slice(0, 5) : ''
        if (/^\d{2}:\d{2}$/.test(v)) setBedtime(v)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [open])

  const saveBedtime = async () => {
    if (!draft) return
    setSaving(true)
    setSaveError(false)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_bedtime: draft }),
      })
      if (!res.ok) throw new Error('save failed')
      setBedtime(draft)
      setEditing(false)
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  const start = () => {
    const t = Date.now()
    setStartedAt(t)
    setNow(t)
    setOpen(true)
  }

  const [h, m] = bedtime.split(':').map(Number)
  const windDownAt = clockLabel(h * 60 + m - 30)
  const remaining = open ? Math.max(0, TOTAL_SEC - Math.floor((now - startedAt) / 1000)) : TOTAL_SEC
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-fg-1 mb-1">Wind-down</h3>
      <p className="text-sm text-fg-4 mb-5">Start your wind-down at {windDownAt}</p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-fg-3">Bedtime</span>
        {editing ? (
          <>
            <label htmlFor="wind-down-bedtime" className="sr-only">Bedtime</label>
            <input
              id="wind-down-bedtime"
              type="time"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="bg-surface-2 border border-edge rounded-xl px-4 py-2.5 text-sm text-fg-1 focus:ring-2 focus:ring-cta/50"
            />
            <button
              type="button"
              onClick={saveBedtime}
              disabled={saving || !draft}
              className="text-sm text-cta hover:underline disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        ) : (
          <>
            <span className="text-sm text-fg-1 tabular-nums">{clockLabel(h * 60 + m)}</span>
            <button
              type="button"
              onClick={() => { setDraft(bedtime); setSaveError(false); setEditing(true) }}
              className="text-sm text-cta hover:underline"
            >
              Edit
            </button>
          </>
        )}
        {saveError && <span className="text-xs text-red-400">Could not save. Try again.</span>}
      </div>
      <button
        type="button"
        onClick={start}
        className="mt-5 w-full sm:w-auto bg-cta hover:bg-brand-600 text-fg-inverse font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
      >
        Start 30-minute wind-down
      </button>

      {open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="30-minute wind-down"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 text-center"
          style={{ background: '#0A0F1A', color: '#E8E6DC' }}
        >
          <div className="relative w-[240px] h-[240px]">
            <svg viewBox="0 0 240 240" className="w-full h-full -rotate-90" aria-hidden="true">
              <circle cx="120" cy="120" r={RING_R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
              <circle
                cx="120"
                cy="120"
                r={RING_R}
                fill="none"
                stroke="#C4B400"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - remaining / TOTAL_SEC)}
                style={{ transition: 'stroke-dashoffset 0.25s linear' }}
              />
            </svg>
            <p className="absolute inset-0 flex items-center justify-center text-5xl font-thin tabular-nums">{mm}:{ss}</p>
          </div>
          <p className="mt-10 max-w-sm text-lg min-h-[3.5rem]" aria-live="polite">{cueFor(remaining)}</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-10 text-sm min-h-[44px] px-4"
            style={{ color: '#8A8F9C' }}
          >
            End
          </button>
        </div>,
        document.body,
      )}
    </div>
  )
}
