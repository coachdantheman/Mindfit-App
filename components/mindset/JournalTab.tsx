'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import JournalForm from '@/components/journal/JournalForm'
import TodayEntry from '@/components/journal/TodayEntry'
import { JournalEntry } from '@/types'

export default function JournalTab() {
  const [todayEntry, setTodayEntry] = useState<JournalEntry | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
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

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>

  return (
    <div>
      <p className="text-gray-500 text-sm mb-4">
        {format(new Date(), 'EEEE, MMMM d, yyyy')}
      </p>
      {todayEntry ? (
        <TodayEntry entry={todayEntry} />
      ) : (
        <JournalForm />
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
