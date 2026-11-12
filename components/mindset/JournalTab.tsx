'use client'
import { useState, useEffect } from 'react'
import { cached } from '@/lib/api-cache'
import { format } from 'date-fns'
import Link from 'next/link'
import JournalForm from '@/components/journal/JournalForm'
import TodayEntry from '@/components/journal/TodayEntry'
import { JournalEntry } from '@/types'
import Skeleton from '@/components/shared/Skeleton'
import { localDateISO } from '@/lib/dates'

export default function JournalTab() {
  const [todayEntry, setTodayEntry] = useState<JournalEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    const today = localDateISO()
    cached(`/api/journal?date=${today}`, (data: JournalEntry[] | JournalEntry | null) => {
      if (Array.isArray(data) && data.length > 0) {
        setTodayEntry(data[0])
      } else if (data && !Array.isArray(data) && data.id) {
        setTodayEntry(data)
      }
      setLoading(false)
    })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton />

  // A quick check-in saves only the objective and ratings; the text fields are blank.
  const quick = !!todayEntry &&
    !todayEntry.action_step_1?.trim() && !todayEntry.strength_1?.trim() && !todayEntry.weakness?.trim()

  return (
    <div>
      <h2 className="text-base font-semibold text-fg-1">Daily Objective Journal</h2>
      <p className="text-fg-4 text-sm mb-4">
        {format(new Date(), 'EEEE, MMMM d, yyyy')}
      </p>
      {quick && todayEntry ? (
        <>
          <p className="text-sm text-fg-3 mb-4">Your check-in is saved. Finish the full journal when you are ready.</p>
          <JournalForm existing={todayEntry} onSaved={entry => setTimeout(() => setTodayEntry(entry), 1500)} />
        </>
      ) : todayEntry && editing ? (
        <>
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-sm text-fg-3">Editing today&apos;s entry. Fix any rating you tapped by mistake.</p>
            <button type="button" onClick={() => setEditing(false)} className="btn-ghost shrink-0">Cancel</button>
          </div>
          <JournalForm existing={todayEntry} onSaved={entry => setTimeout(() => { setTodayEntry(entry); setEditing(false) }, 1200)} />
        </>
      ) : todayEntry ? (
        <>
          <TodayEntry entry={todayEntry} />
          <button type="button" onClick={() => setEditing(true)} className="btn-secondary mt-4">
            Edit today&apos;s entry
          </button>
        </>
      ) : (
        <JournalForm onSaved={entry => setTimeout(() => setTodayEntry(entry), 1500)} />
      )}

      <Link
        href="/progress"
        className="inline-block mt-4 text-sm text-cta font-medium hover:underline"
      >
        View past entries →
      </Link>
    </div>
  )
}
