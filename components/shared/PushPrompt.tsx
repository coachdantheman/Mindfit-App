'use client'
import { useCallback, useEffect, useState } from 'react'
import DailyQuoteToggle, { type PushStatus } from './DailyQuoteToggle'
import { cached } from '@/lib/api-cache'

const KEY = 'mindfit:push-prompt'
const OLD_KEY = 'mindfit:push-prompt-dismissed'
const DAY = 86_400_000
// Waits after the 1st and 2nd "Not now". After the 3rd, never again.
const WAITS = [3 * DAY, 7 * DAY]

type Snooze = { count: number; nextAt: number | null }

function readSnooze(): Snooze {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw)
      return { count: Number(s.count) || 0, nextAt: typeof s.nextAt === 'number' ? s.nextAt : null }
    }
    if (localStorage.getItem(OLD_KEY) === '1') {
      const migrated: Snooze = { count: 1, nextAt: Date.now() + WAITS[0] }
      localStorage.setItem(KEY, JSON.stringify(migrated))
      localStorage.removeItem(OLD_KEY)
      return migrated
    }
  } catch {}
  return { count: 0, nextAt: null }
}

function isSnoozed(s: Snooze): boolean {
  if (s.count >= WAITS.length + 1) return true
  return s.nextAt != null && Date.now() < s.nextAt
}

// Shown once the athlete has a check-in, until this device has push on or
// the athlete snoozes it, so reminders and coach messages reach the phone.
export default function PushPrompt() {
  const [status, setStatus] = useState<PushStatus>('loading')
  const [snoozed, setSnoozed] = useState(true)
  const [hasCheckin, setHasCheckin] = useState(false)
  const onStatus = useCallback((s: PushStatus) => setStatus(s), [])

  useEffect(() => {
    setSnoozed(isSnoozed(readSnooze()))
    cached<unknown[]>('/api/journal', list => setHasCheckin(Array.isArray(list) && list.length > 0)).catch(() => {})
  }, [])

  if (snoozed || !hasCheckin) return null
  // The toggle stays mounted in the same place whatever the status: swapping
  // it between two parents remounts it, which resets its status and loops.
  const hidden = status === 'loading' || status === 'on' || status === 'unsupported'

  const notNow = () => {
    const count = readSnooze().count + 1
    const next: Snooze = { count, nextAt: count <= WAITS.length ? Date.now() + WAITS[count - 1] : null }
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
    setSnoozed(isSnoozed(next))
  }

  return (
    <div className={hidden ? 'hidden' : 'card p-4 mb-6 border-cta/40'}>
      {!hidden && (
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-semibold text-cta">Turn on reminders</p>
            <p className="text-xs text-fg-3 mt-0.5">Get a game-day Flow Stack reminder and a heads-up before your streak breaks.</p>
          </div>
          <button type="button" onClick={notNow} className="text-xs text-fg-4 hover:text-fg-2 shrink-0">
            Not now
          </button>
        </div>
      )}
      <DailyQuoteToggle onStatus={onStatus} />
    </div>
  )
}
