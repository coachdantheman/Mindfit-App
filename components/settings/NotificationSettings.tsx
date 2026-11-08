'use client'
import { useEffect, useState } from 'react'
import Skeleton from '@/components/shared/Skeleton'

interface Prefs {
  push_daily_quote: boolean
  push_reminders: boolean
  push_progress: boolean
  push_coach: boolean
  email_progress: boolean
  email_weekly: boolean
  email_coach: boolean
  reminder_hour: number
  timezone: string
}

type BoolKey = Exclude<keyof Prefs, 'reminder_hour' | 'timezone'>

const PUSH: { key: BoolKey; label: string }[] = [
  { key: 'push_daily_quote', label: 'Daily quote' },
  { key: 'push_reminders', label: 'Reminders & streaks' },
  { key: 'push_progress', label: 'Level-ups & PRs' },
  { key: 'push_coach', label: 'Coach messages' },
]

const EMAIL: { key: BoolKey; label: string }[] = [
  { key: 'email_progress', label: 'Level-ups' },
  { key: 'email_weekly', label: 'Weekly recap' },
  { key: 'email_coach', label: 'Coach updates' },
]

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6)

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/notifications/prefs')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (!cancelled && data) setPrefs(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const save = async (update: Partial<Prefs>) => {
    if (!prefs) return
    const before = Object.fromEntries(Object.keys(update).map(k => [k, prefs[k as keyof Prefs]])) as Partial<Prefs>
    setPrefs({ ...prefs, ...update })
    setError(null)
    const res = await fetch('/api/notifications/prefs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    }).catch(() => null)
    if (!res || !res.ok) {
      setPrefs(p => (p ? { ...p, ...before } : p))
      setError('Could not save that change. Try again.')
    }
  }

  const renderSwitches = (rows: { key: BoolKey; label: string }[]) => (
    <div className="divide-y divide-edge-muted">
      {rows.map(({ key, label }) => {
        const on = !!prefs?.[key]
        return (
          <div key={key} className="flex items-center justify-between gap-3 py-3">
            <span id={`notif-${key}-label`} className="text-sm text-fg-2">{label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-labelledby={`notif-${key}-label`}
              disabled={!prefs}
              onClick={() => save({ [key]: !on } as Partial<Prefs>)}
              className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${on ? 'bg-cta' : 'bg-surface-3'} disabled:opacity-50`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-page shadow transition-transform ${on ? 'left-1 translate-x-5' : 'left-1'}`} />
            </button>
          </div>
        )
      })}
    </div>
  )

  if (!prefs) return <Skeleton rows={3} />

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-xs uppercase tracking-wide text-fg-4 mb-1">Push</h4>
        {renderSwitches(PUSH)}
      </div>

      <div>
        <h4 className="text-xs uppercase tracking-wide text-fg-4 mb-1">Email</h4>
        {renderSwitches(EMAIL)}
      </div>

      <div>
        <h4 className="text-xs uppercase tracking-wide text-fg-4 mb-1">Daily reminder time</h4>
        <label htmlFor="notif-reminder-hour" className="sr-only">Daily reminder time</label>
        <select
          id="notif-reminder-hour"
          value={prefs.reminder_hour}
          onChange={e => save({ reminder_hour: Number(e.target.value) })}
          className="input-field sm:w-48"
        >
          {HOURS.map(h => <option key={h} value={h}>{hourLabel(h)}</option>)}
        </select>
        <p className="text-xs text-fg-4 mt-2">Only if you haven&apos;t logged anything yet that day.</p>
      </div>

      {error && <p role="status" className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
