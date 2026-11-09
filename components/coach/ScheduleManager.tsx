'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Skeleton from '@/components/shared/Skeleton'
import { useToast } from '@/components/shared/Toast'
import { expandRecurring, type ScheduleEvent } from '@/lib/schedule'
import { formatClock, parseTime } from '@/lib/game-day'
import { DAY_NAMES, toLocalDateString } from '@/lib/programs'

interface Team { id: string; name: string }
type Saved = ScheduleEvent & { id: string }
type Panel = 'import' | 'practice' | 'game' | null

const prettyDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const clock = (t: string | null) => { const m = parseTime(t); return m === null ? '' : formatClock(m) }
const monthKey = (iso: string) => iso.slice(0, 7)
const monthLabel = (ym: string) => new Date(`${ym}-15T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
const emptyGame = (): ScheduleEvent => ({ kind: 'game', event_date: '', start_time: null, opponent: null, location: null, home_away: null, notes: null })

function readFile(file: File): Promise<{ media_type: string; data: string }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve({ media_type: file.type, data: String(r.result).split(',')[1] ?? '' })
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

export default function ScheduleManager() {
  const notify = useToast()
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [teamId, setTeamId] = useState('')
  const [events, setEvents] = useState<Saved[] | null>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [busy, setBusy] = useState(false)
  const [openMonth, setOpenMonth] = useState<string | null>(null)

  // Import
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [review, setReview] = useState<ScheduleEvent[] | null>(null)
  // Recurring practices
  const [days, setDays] = useState<number[]>([1, 2, 3, 4])
  const [practiceTime, setPracticeTime] = useState('15:30')
  const [from, setFrom] = useState(() => toLocalDateString(new Date()))
  const [to, setTo] = useState('')
  // One game
  const [game, setGame] = useState<ScheduleEvent>(emptyGame)

  useEffect(() => {
    fetch('/api/coach/teams').then(r => r.ok ? r.json() : []).then((t: Team[]) => {
      setTeams(t)
      if (t.length) setTeamId(id => id || t[0].id)
    })
  }, [])

  const load = useCallback(async () => {
    if (!teamId) return
    setEvents(null)
    const res = await fetch(`/api/coach/schedule?team_id=${teamId}`)
    setEvents(res.ok ? await res.json() : [])
  }, [teamId])
  useEffect(() => { load() }, [load])

  const today = toLocalDateString(new Date())
  const upcoming = useMemo(() => (events ?? []).filter(e => e.event_date >= today), [events, today])
  const byMonth = useMemo(() => {
    const m = new Map<string, Saved[]>()
    for (const e of upcoming) (m.get(monthKey(e.event_date)) ?? m.set(monthKey(e.event_date), []).get(monthKey(e.event_date))!).push(e)
    return [...m.entries()]
  }, [upcoming])
  useEffect(() => { if (byMonth.length && !openMonth) setOpenMonth(byMonth[0][0]) }, [byMonth, openMonth])

  const save = async (list: ScheduleEvent[]) => {
    setBusy(true)
    const res = await fetch('/api/coach/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ team_id: teamId, events: list }) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { notify(data.error || 'Could not save', 'error'); return false }
    notify(`${data.saved} added to the schedule`)
    load()
    return true
  }

  const parse = async () => {
    setBusy(true)
    setReview(null)
    try {
      const payload: Record<string, unknown> = { text, today }
      if (file) {
        if (file.size > 4 * 1024 * 1024) { notify('Keep the file under 4 MB.', 'error'); return }
        payload.file = await readFile(file)
      }
      const res = await fetch('/api/coach/schedule/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { notify(data.error || 'Could not read that schedule', 'error'); return }
      setReview(data.events)
    } finally {
      setBusy(false)
    }
  }

  const addPractices = async () => {
    const gameDates = new Set((events ?? []).filter(e => e.kind === 'game').map(e => e.event_date))
    const rows = expandRecurring({ days, start_time: practiceTime || null, from, to }, gameDates)
    if (rows.length === 0) { notify('Pick days and an end date after the start.', 'error'); return }
    if (await save(rows)) setPanel(null)
  }

  const remove = async (ids: string[], what: string) => {
    if (!confirm(`Delete ${what}?`)) return
    const res = await fetch('/api/coach/schedule', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ team_id: teamId, ids }) })
    if (res.ok) load(); else notify('Could not delete', 'error')
  }

  const editReview = (i: number, patch: Partial<ScheduleEvent>) =>
    setReview(r => r?.map((e, j) => (j === i ? { ...e, ...patch } : e)) ?? null)

  if (!teams) return <Skeleton />
  if (teams.length === 0) return <p className="text-sm text-fg-4">Create a team first (Teams tab), then add its games and practices here.</p>

  const panelBtn = (p: Exclude<Panel, null>, label: string) => (
    <button type="button" onClick={() => setPanel(panel === p ? null : p)} aria-expanded={panel === p}
      className={panel === p ? 'btn-primary text-sm' : 'btn-secondary text-sm'}>{label}</button>
  )

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-fg-1">Season schedule</h3>
        <p className="text-sm text-fg-4">Athletes see their games and practices. Assigned plans switch to light activation on game days and the day before.</p>
      </div>

      {teams.length > 1 && (
        <div>
          <label htmlFor="schedule-team" className="sr-only">Team</label>
          <select id="schedule-team" value={teamId} onChange={e => { setTeamId(e.target.value); setOpenMonth(null) }} className="input-field sm:w-72">
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {panelBtn('import', 'Upload schedule')}
        {panelBtn('practice', 'Recurring practices')}
        {panelBtn('game', 'Add a game')}
      </div>

      {panel === 'import' && (
        <div className="card p-4 space-y-3">
          <p className="text-sm text-fg-3">Paste the schedule from the athletic site or a spreadsheet, or upload a screenshot or PDF. You review everything before it saves.</p>
          <label htmlFor="schedule-text" className="sr-only">Schedule text</label>
          <textarea id="schedule-text" value={text} onChange={e => setText(e.target.value)} rows={5} className="textarea-field"
            placeholder={'Fri 11/13  vs Central  7:00 PM\nTue 11/17  @ North  6:00 PM'} />
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn-secondary text-sm cursor-pointer">
              {file ? 'Change file' : 'Choose file'}
              <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="sr-only"
                onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </label>
            {file && <span className="text-xs text-fg-3 truncate max-w-[12rem]">{file.name}</span>}
            <button type="button" onClick={parse} disabled={busy || (!text.trim() && !file)} className="btn-primary text-sm">
              {busy ? 'Reading…' : 'Read schedule'}
            </button>
          </div>

          {review && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-fg-1">Found {review.length}. Check them, then save.</p>
              <ul className="space-y-2 max-h-96 overflow-y-auto">
                {review.map((e, i) => (
                  <li key={i} className="grid grid-cols-1 sm:grid-cols-[6rem_9rem_7rem_1fr_6rem_auto] gap-2 items-center bg-surface-2/50 rounded-xl p-2">
                    <select aria-label="Kind" value={e.kind} onChange={ev => editReview(i, { kind: ev.target.value as ScheduleEvent['kind'] })} className="input-field min-w-0 w-full text-sm">
                      <option value="game">Game</option><option value="practice">Practice</option>
                    </select>
                    <input aria-label="Date" type="date" value={e.event_date} onChange={ev => editReview(i, { event_date: ev.target.value })} className="input-field min-w-0 w-full text-sm" />
                    <input aria-label="Start time" type="time" value={e.start_time ?? ''} onChange={ev => editReview(i, { start_time: ev.target.value || null })} className="input-field min-w-0 w-full text-sm" />
                    <input aria-label="Opponent" value={e.opponent ?? ''} onChange={ev => editReview(i, { opponent: ev.target.value || null })} placeholder="Opponent" className="input-field min-w-0 w-full text-sm" disabled={e.kind === 'practice'} />
                    <select aria-label="Home or away" value={e.home_away ?? ''} onChange={ev => editReview(i, { home_away: (ev.target.value || null) as ScheduleEvent['home_away'] })} className="input-field min-w-0 w-full text-sm" disabled={e.kind === 'practice'}>
                      <option value="">—</option><option value="home">Home</option><option value="away">Away</option><option value="neutral">Neutral</option>
                    </select>
                    <button type="button" onClick={() => setReview(r => r?.filter((_, j) => j !== i) ?? null)} className="btn-ghost text-xs text-fg-4" aria-label="Remove row">✕</button>
                  </li>
                ))}
              </ul>
              <button type="button" disabled={busy || review.length === 0} onClick={async () => { if (await save(review)) { setReview(null); setText(''); setFile(null); setPanel(null) } }} className="btn-primary text-sm">
                Save {review.length} to the schedule
              </button>
            </div>
          )}
        </div>
      )}

      {panel === 'practice' && (
        <div className="card p-4 space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-fg-4 mb-1">Days</p>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map(d => {
                const on = days.includes(d)
                return (
                  <button key={d} type="button" aria-pressed={on} onClick={() => setDays(ds => on ? ds.filter(x => x !== d) : [...ds, d])}
                    className={`w-12 py-1.5 rounded-full text-sm border ${on ? 'bg-cta text-fg-inverse border-cta font-semibold' : 'border-edge text-fg-3'}`}>
                    {DAY_NAMES[d]}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div><label htmlFor="pr-time" className="text-xs uppercase tracking-wide text-fg-4 block mb-1">Time</label>
              <input id="pr-time" type="time" value={practiceTime} onChange={e => setPracticeTime(e.target.value)} className="input-field" /></div>
            <div><label htmlFor="pr-from" className="text-xs uppercase tracking-wide text-fg-4 block mb-1">From</label>
              <input id="pr-from" type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-field" /></div>
            <div><label htmlFor="pr-to" className="text-xs uppercase tracking-wide text-fg-4 block mb-1">Until</label>
              <input id="pr-to" type="date" value={to} onChange={e => setTo(e.target.value)} className="input-field" /></div>
          </div>
          <p className="text-xs text-fg-4">Game days are skipped automatically.</p>
          <button type="button" onClick={addPractices} disabled={busy || !to || days.length === 0} className="btn-primary text-sm">Add practices</button>
        </div>
      )}

      {panel === 'game' && (
        <form className="card p-4 space-y-3" onSubmit={async e => { e.preventDefault(); if (await save([game])) { setGame(emptyGame()); setPanel(null) } }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div><label htmlFor="g-date" className="text-xs uppercase tracking-wide text-fg-4 block mb-1">Date</label>
              <input id="g-date" type="date" required value={game.event_date} onChange={e => setGame(g => ({ ...g, event_date: e.target.value }))} className="input-field" /></div>
            <div><label htmlFor="g-time" className="text-xs uppercase tracking-wide text-fg-4 block mb-1">Start time</label>
              <input id="g-time" type="time" value={game.start_time ?? ''} onChange={e => setGame(g => ({ ...g, start_time: e.target.value || null }))} className="input-field" /></div>
            <div><label htmlFor="g-opp" className="text-xs uppercase tracking-wide text-fg-4 block mb-1">Opponent</label>
              <input id="g-opp" value={game.opponent ?? ''} onChange={e => setGame(g => ({ ...g, opponent: e.target.value || null }))} className="input-field" /></div>
            <div><label htmlFor="g-ha" className="text-xs uppercase tracking-wide text-fg-4 block mb-1">Home or away</label>
              <select id="g-ha" value={game.home_away ?? ''} onChange={e => setGame(g => ({ ...g, home_away: (e.target.value || null) as ScheduleEvent['home_away'] }))} className="input-field">
                <option value="">—</option><option value="home">Home</option><option value="away">Away</option><option value="neutral">Neutral</option>
              </select></div>
          </div>
          <button type="submit" disabled={busy || !game.event_date} className="btn-primary text-sm">Add game</button>
        </form>
      )}

      {events === null ? <Skeleton /> : upcoming.length === 0 ? (
        <p className="text-sm text-fg-4">Nothing scheduled yet.</p>
      ) : (
        <ul className="space-y-2">
          {byMonth.map(([ym, list]) => {
            const isOpen = openMonth === ym
            const games = list.filter(e => e.kind === 'game').length
            return (
              <li key={ym} className="border border-edge rounded-2xl">
                <button type="button" onClick={() => setOpenMonth(isOpen ? null : ym)} aria-expanded={isOpen} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
                  <span className="text-sm font-semibold text-fg-1">{monthLabel(ym)}</span>
                  <span className="text-xs text-fg-4">{games} game{games === 1 ? '' : 's'} · {list.length - games} practice{list.length - games === 1 ? '' : 's'} {isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <ul className="divide-y divide-edge-muted px-4 pb-2">
                    {list.map(e => (
                      <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                        <span className="min-w-0">
                          <span className={`block text-sm truncate ${e.kind === 'game' ? 'text-fg-1 font-medium' : 'text-fg-3'}`}>
                            {e.kind === 'game' ? `${e.home_away === 'away' ? '@ ' : e.home_away === 'home' ? 'vs ' : ''}${e.opponent ?? 'Game'}` : 'Practice'}
                          </span>
                          <span className="block text-xs text-fg-4">{prettyDate(e.event_date)}{e.start_time ? ` · ${clock(e.start_time)}` : ''}{e.notes ? ` · ${e.notes}` : ''}</span>
                        </span>
                        <button type="button" onClick={() => remove([e.id], 'this event')} className="text-xs text-fg-4 hover:text-red-400 shrink-0">Delete</button>
                      </li>
                    ))}
                    {list.some(e => e.kind === 'practice') && (
                      <li className="py-2">
                        <button type="button" onClick={() => remove(list.filter(e => e.kind === 'practice').map(e => e.id), `all ${list.length - games} practices in ${monthLabel(ym)}`)} className="text-xs text-fg-4 hover:text-red-400">
                          Delete this month&rsquo;s practices
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
