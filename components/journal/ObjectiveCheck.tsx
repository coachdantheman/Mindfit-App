'use client'
import { useEffect, useState } from 'react'
import type { JournalEntry, ObjectiveResult } from '@/types'
import { useToast } from '@/components/shared/Toast'
import { haptic } from '@/lib/haptics'

const OPTIONS: { value: ObjectiveResult; label: string; line: string }[] = [
  { value: 'yes', label: 'Yes', line: 'You did what you said you would. That is who you are.' },
  { value: 'partly', label: 'Partly', line: 'Progress counts. Decide what finishes it tomorrow.' },
  { value: 'no', label: 'Not today', line: 'Not today, and that is information. Set one you can win tomorrow.' },
]

// The end-of-day check on today's objective. Saves on tap; the answer can be changed.
// `quiet` leaves the reply to the guide character when it is on screen.
export default function ObjectiveCheck({ entry, onChange, quiet = false }: {
  entry: Pick<JournalEntry, 'entry_date' | 'objective' | 'objective_result'>
  onChange?: (result: ObjectiveResult) => void
  quiet?: boolean
}) {
  const notify = useToast()
  const [result, setResult] = useState<ObjectiveResult | null>(entry.objective_result ?? null)
  // A fresher copy of the entry can arrive later (cached, then live), or the
  // practice log can answer for the athlete, so follow the entry.
  useEffect(() => { setResult(entry.objective_result ?? null) }, [entry.objective_result])
  const evening = new Date().getHours() >= 17

  const choose = async (next: ObjectiveResult) => {
    if (next === result) return
    const prev = result
    setResult(next)
    haptic.tap()
    try {
      const res = await fetch('/api/journal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_date: entry.entry_date, objective_result: next }),
      })
      if (!res.ok) throw new Error()
      onChange?.(next)
    } catch {
      setResult(prev)
      notify('That did not save. Try again.', 'error')
    }
  }

  return (
    <div className={`card p-5 space-y-3 ${evening && !result ? 'border-cta/50' : ''}`}>
      <div>
        <p className="text-xs font-semibold text-fg-4 uppercase tracking-wide mb-1">Today&apos;s objective</p>
        <p className="text-fg-1 break-words">{entry.objective}</p>
      </div>
      <p id="objective-check-label" className="text-sm text-fg-3">{evening ? 'Did you get it done?' : 'Check it off when it’s done.'}</p>
      <div role="group" aria-labelledby="objective-check-label" className="grid grid-cols-3 gap-2">
        {OPTIONS.map(o => (
          <button
            key={o.value}
            type="button"
            aria-pressed={result === o.value}
            onClick={() => choose(o.value)}
            className={`min-h-[44px] rounded-xl text-sm font-medium transition-colors ${
              result === o.value ? 'bg-cta text-fg-inverse' : 'bg-surface-2 text-fg-2 hover:text-fg-1'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {result && !quiet && <p className="text-sm text-fg-3">{OPTIONS.find(o => o.value === result)!.line}</p>}
    </div>
  )
}
