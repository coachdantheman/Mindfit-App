'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { format, parseISO, startOfWeek } from 'date-fns'
import { JournalEntry } from '@/types'

// Entries grouped Monday–Sunday; only the chosen week renders (newest by default).
export default function EntryList({ entries, linked = true }: { entries: JournalEntry[]; linked?: boolean }) {
  const weeks = useMemo(() => {
    const map = new Map<string, JournalEntry[]>()
    for (const e of entries) {
      const key = format(startOfWeek(parseISO(e.entry_date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      map.set(key, [...(map.get(key) ?? []), e])
    }
    return [...map.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, list]) => ({ key, entries: list.sort((a, b) => b.entry_date.localeCompare(a.entry_date)) }))
  }, [entries])
  const [picked, setPicked] = useState('')
  const week = weeks.find(w => w.key === picked) ?? weeks[0]

  if (!week) return null

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-semibold text-fg-1">Past Entries</h3>
        <select
          aria-label="Week"
          value={week.key}
          onChange={e => setPicked(e.target.value)}
          className="bg-surface-2 border border-edge rounded-lg px-2.5 py-1.5 text-xs text-fg-2 focus:ring-2 focus:ring-cta/50"
        >
          {weeks.map((w, i) => (
            <option key={w.key} value={w.key}>
              {i === 0 ? 'This week' : `Week of ${format(parseISO(w.key), 'MMM d')}`} · {w.entries.length}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        {week.entries.map(e => {
          const body = (
            <>
              <div className="min-w-0">
                <p className={`text-sm font-medium text-fg-2 ${linked ? 'group-hover:text-cta transition-colors' : ''}`}>
                  {format(parseISO(e.entry_date), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-xs text-fg-4 mt-0.5 truncate max-w-xs">{e.objective}</p>
              </div>
              <div className="flex gap-2 shrink-0 ml-4">
                <span className="text-xs text-blue-400 font-medium bg-blue-500/10 px-2 py-1 rounded-full">M:{e.rating_motivation}</span>
                <span className="text-xs text-purple-400 font-medium bg-purple-500/10 px-2 py-1 rounded-full">F:{e.rating_focus}</span>
                <span className="text-xs text-green-400 font-medium bg-green-500/10 px-2 py-1 rounded-full">C:{e.rating_confidence}</span>
                <span title="Anxiety, lower is better" aria-label={`Anxiety ${e.rating_anxiety}, lower is better`} className="text-xs text-orange-400 font-medium bg-orange-500/10 px-2 py-1 rounded-full">A:{e.rating_anxiety}</span>
              </div>
            </>
          )
          const cls = 'flex items-center justify-between p-3 rounded-xl'
          return linked ? (
            <Link key={e.id} href={`/journal/${e.id}`} className={`${cls} hover:bg-surface-2 transition-colors group`}>{body}</Link>
          ) : (
            <div key={e.id} className={`${cls} bg-surface-2/50 border border-edge-muted`}>{body}</div>
          )
        })}
      </div>
    </div>
  )
}
