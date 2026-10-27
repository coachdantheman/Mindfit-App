'use client'
import { useState, useEffect } from 'react'
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

  useEffect(() => {
    const today = localDateISO()
    fetch(`/api/journal?date=${today}`)
      .then(r => r.json())
      .then(data => {
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

  return (
    <div>
      <p className="text-fg-4 text-sm mb-4">
        {format(new Date(), 'EEEE, MMMM d, yyyy')}
      </p>
      {todayEntry ? (
        <TodayEntry entry={todayEntry} />
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
