'use client'
import { useCallback, useEffect, useState } from 'react'
import DailyQuoteToggle, { type PushStatus } from './DailyQuoteToggle'

const KEY = 'mindfit:push-prompt-dismissed'

// Shown until this device has push on (or the athlete dismisses it), so
// reminders and coach messages actually reach the phone.
export default function PushPrompt() {
  const [status, setStatus] = useState<PushStatus>('loading')
  const [dismissed, setDismissed] = useState(true)
  const onStatus = useCallback((s: PushStatus) => setStatus(s), [])

  useEffect(() => {
    try { setDismissed(localStorage.getItem(KEY) === '1') } catch { setDismissed(false) }
  }, [])

  if (dismissed) return null
  if (status === 'loading' || status === 'on' || status === 'unsupported') {
    // Keep the toggle mounted (hidden) so it can report its status.
    return <div className="hidden"><DailyQuoteToggle onStatus={onStatus} /></div>
  }

  return (
    <div className="card p-4 mb-6 border-cta/40">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-sm font-semibold text-cta">Turn on reminders</p>
        <button
          type="button"
          onClick={() => { setDismissed(true); try { localStorage.setItem(KEY, '1') } catch {} }}
          className="text-xs text-fg-4 hover:text-fg-2"
        >
          Not now
        </button>
      </div>
      <DailyQuoteToggle onStatus={onStatus} />
    </div>
  )
}
