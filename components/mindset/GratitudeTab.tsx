'use client'
import { useEffect, useMemo, useState } from 'react'
import { cached } from '@/lib/api-cache'
import { format, parseISO, startOfWeek } from 'date-fns'
import SaveButton from '@/components/shared/SaveButton'
import { useToast } from '@/components/shared/Toast'
import { localDateISO } from '@/lib/dates'

interface Entry { id: string; entry_date: string; item_1: string; item_2: string | null; item_3: string | null }

const PROMPTS = [
  'Someone who helped you get better',
  'Something your body let you do today',
  'A moment you want to remember',
]

// Three things a day. Gratitude shifts attention to what's going right,
// which is the state confident athletes compete from.
export default function GratitudeTab() {
  const notify = useToast()
  const today = localDateISO()
  const [items, setItems] = useState(['', '', ''])
  const [entries, setEntries] = useState<Entry[]>([])
  const [savedToday, setSavedToday] = useState(false)
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [week, setWeek] = useState('')

  useEffect(() => {
    cached('/api/mindset/gratitude', (list: Entry[]) => {
      if (!Array.isArray(list)) return
      setEntries(list)
      const t = list.find(e => e.entry_date === today)
      if (t) { setItems([t.item_1, t.item_2 ?? '', t.item_3 ?? '']); setSavedToday(true) }
    })
  }, [today])

  const save = async () => {
    setState('saving')
    const res = await fetch('/api/mindset/gratitude', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_date: today, item_1: items[0], item_2: items[1], item_3: items[2] }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setState('idle'); notify(data.error || 'Could not save', 'error'); return }
    setEntries(prev => [data, ...prev.filter(e => e.entry_date !== today)])
    setSavedToday(true)
    setState('saved')
    notify('Gratitude saved')
  }

  const past = entries.filter(e => e.entry_date !== today)
  const weeks = useMemo(() => {
    const m = new Map<string, Entry[]>()
    for (const e of past) {
      const k = format(startOfWeek(parseISO(e.entry_date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      ;(m.get(k) ?? m.set(k, []).get(k)!).push(e)
    }
    return [...m.entries()]
  }, [past])
  const shownWeek = weeks.find(([k]) => k === week) ?? weeks[0]
  const streak = useMemo(() => {
    const days = new Set(entries.map(e => e.entry_date))
    let n = 0
    const d = parseISO(days.has(today) ? today : localDateISO(new Date(Date.now() - 86_400_000)))
    while (days.has(format(d, 'yyyy-MM-dd'))) { n++; d.setDate(d.getDate() - 1) }
    return n
  }, [entries, today])

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="font-semibold text-fg-1">3 things I&rsquo;m grateful for</h3>
          {streak > 1 && <span className="text-xs text-cta shrink-0">{streak} days in a row</span>}
        </div>
        <p className="text-sm text-fg-4 mb-5">Grateful athletes play loose. Name three specific things from today.</p>
        <div className="space-y-3">
          {items.map((v, i) => (
            <div key={i}>
              <label htmlFor={`gratitude-${i}`} className="text-xs text-fg-4 block mb-1">{i + 1}. {PROMPTS[i]}</label>
              <input id={`gratitude-${i}`} value={v} maxLength={300}
                onChange={e => { setItems(prev => prev.map((x, j) => (j === i ? e.target.value : x))); setState('idle'); setSavedToday(false) }}
                className="input-field" />
            </div>
          ))}
        </div>
        <div className="mt-5">
          <SaveButton type="button" onClick={save} state={state} idleLabel={savedToday ? 'Saved ✓' : 'Save'} disabled={savedToday || !items[0].trim() || state === 'saving'} />
        </div>
      </div>

      {weeks.length > 0 && shownWeek && (
        <div className="card p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h4 className="text-sm font-semibold text-fg-1">Past entries</h4>
            <label htmlFor="gratitude-week" className="sr-only">Week</label>
            <select id="gratitude-week" value={shownWeek[0]} onChange={e => setWeek(e.target.value)} className="input-field w-auto text-sm">
              {weeks.map(([k, list]) => <option key={k} value={k}>Week of {format(parseISO(k), 'MMM d')} ({list.length})</option>)}
            </select>
          </div>
          <ul className="divide-y divide-edge-muted">
            {shownWeek[1].map(e => (
              <li key={e.id} className="py-2.5">
                <p className="text-xs text-fg-4 mb-1">{format(parseISO(e.entry_date), 'EEEE, MMM d')}</p>
                <ul className="text-sm text-fg-2 space-y-0.5">
                  {[e.item_1, e.item_2, e.item_3].filter(Boolean).map((t, i) => <li key={i}>· {t}</li>)}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
