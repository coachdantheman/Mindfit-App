'use client'
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import Skeleton from '@/components/shared/Skeleton'
import { toLocalDateString } from '@/lib/programs'
import { cached } from '@/lib/api-cache'

type Category = 'private_coach' | 'mindfit' | 'extra_training' | 'other_sport'
type Source = 'coach' | 'athlete' | 'none'

interface Ev {
  id: string
  tier?: 'primary' | 'secondary'
  kind: string
  category?: Category | null
  title?: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  opponent?: string | null
  location?: string | null
  notes?: string | null
  from: 'coach' | 'athlete'
  team_name?: string
}

interface Payload { source: Source; primary: Ev[]; secondary: Ev[]; hiddenOwn: number }

interface Draft {
  id: string | null
  tier: 'primary' | 'extra'
  kind: 'game' | 'practice'
  category: Category
  title: string
  event_date: string
  start_time: string
  end_time: string
  opponent: string
  location: string
  notes: string
}

const CATEGORY_LABEL: Record<Category, string> = {
  private_coach: 'Private coach',
  mindfit: 'MindFit session',
  extra_training: 'Extra training',
  other_sport: 'Other sport',
}
const KIND_LABEL: Record<string, string> = { game: 'Game', practice: 'Practice', session: 'Session', training: 'Training' }
const SHORT_DAYS = 7
const FULL_DAYS = 30

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return toLocalDateString(d)
}
const prettyDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const clock = (t: string | null) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}
const timeRange = (e: Ev) => (e.start_time ? (e.end_time ? `${clock(e.start_time)}–${clock(e.end_time)}` : clock(e.start_time)) : 'Time TBD')
const badge = (e: Ev) => (e.tier === 'secondary' ? CATEGORY_LABEL[e.category as Category] ?? 'Extra' : KIND_LABEL[e.kind] ?? e.kind)

const emptyDraft = (today: string, tier: Draft['tier']): Draft => ({
  id: null, tier, kind: 'game', category: 'private_coach', title: '', event_date: today,
  start_time: '', end_time: '', opponent: '', location: '', notes: '',
})

function groupByDate(list: Ev[]): [string, Ev[]][] {
  const sorted = [...list].sort((a, b) => a.event_date.localeCompare(b.event_date) || (a.start_time ?? '').localeCompare(b.start_time ?? ''))
  const m = new Map<string, Ev[]>()
  for (const e of sorted) m.set(e.event_date, [...(m.get(e.event_date) ?? []), e])
  return [...m.entries()]
}

function Field({ id, label, className = '', children }: { id: string; label: string; className?: string; children: ReactNode }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="text-xs uppercase tracking-wide text-fg-4 block mb-1">{label}</label>
      {children}
    </div>
  )
}

export default function ScheduleTab() {
  const [today] = useState(() => toLocalDateString(new Date()))
  const [data, setData] = useState<Payload | null>(null)
  const [failed, setFailed] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/me/events').catch(() => null)
    if (!res?.ok) { setFailed(true); return }
    setData(await res.json())
    setFailed(false)
  }, [])
  useEffect(() => {
    cached('/api/me/events', (d: Payload) => {
      if (!Array.isArray(d?.primary)) { setFailed(true); return }
      setData(d)
      setFailed(false)
    }).catch(() => setFailed(true))
  }, [])

  const set = (patch: Partial<Draft>) => setDraft(d => (d ? { ...d, ...patch } : d))

  const openNew = (tier: Draft['tier']) => { setError(''); setDraft(emptyDraft(today, tier)) }
  const openEdit = (e: Ev) => {
    setError('')
    setDraft({
      id: e.id,
      tier: e.tier === 'secondary' ? 'extra' : 'primary',
      kind: e.kind === 'practice' ? 'practice' : 'game',
      category: e.category ?? 'private_coach',
      title: e.title ?? '',
      event_date: e.event_date,
      start_time: e.start_time ?? '',
      end_time: e.end_time ?? '',
      opponent: e.opponent ?? '',
      location: e.location ?? '',
      notes: e.notes ?? '',
    })
  }

  const save = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!draft) return
    const primary = draft.tier === 'primary'
    const kind = primary || draft.category === 'other_sport'
      ? draft.kind
      : draft.category === 'extra_training' ? 'training' : 'session'
    const body = {
      tier: primary ? 'primary' : 'secondary',
      kind,
      category: primary ? null : draft.category,
      title: draft.title || null,
      event_date: draft.event_date,
      start_time: draft.start_time || null,
      end_time: draft.end_time || null,
      opponent: kind === 'game' ? draft.opponent || null : null,
      location: draft.location || null,
      notes: draft.notes || null,
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch(draft.id ? `/api/me/events?id=${draft.id}` : '/api/me/events', {
        method: draft.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) { setError(out.error || 'Could not save.'); return }
      setDraft(null)
      load()
    } catch {
      setError('Could not save. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (e: Ev) => {
    if (!confirm('Delete this event?')) return
    const res = await fetch(`/api/me/events?id=${e.id}`, { method: 'DELETE' }).catch(() => null)
    if (res?.ok) load()
    else setError('Could not delete that event.')
  }

  if (!data) return failed ? <p className="text-sm text-fg-4">Couldn&rsquo;t load your schedule. Try again later.</p> : <Skeleton />

  const coachActive = data.source === 'coach'
  const shortEnd = addDays(today, SHORT_DAYS - 1)
  const fullEnd = addDays(today, FULL_DAYS - 1)
  const windowEnd = showAll ? fullEnd : shortEnd
  const inWindow = (list: Ev[]) => list.filter(e => e.event_date >= today && e.event_date <= windowEnd)
  const hasMore = [...data.primary, ...data.secondary].some(e => e.event_date > shortEnd && e.event_date <= fullEnd)
  const primary = inWindow(data.primary)
  const extra = inWindow(data.secondary)
  const isGame = !!draft && (draft.tier === 'primary' || draft.category === 'other_sport') && draft.kind === 'game'

  const renderList = (list: Ev[], empty: string) => {
    if (list.length === 0) return <p className="text-sm text-fg-4">{empty}</p>
    return (
      <div className="space-y-3">
        {groupByDate(list).map(([date, items]) => (
          <div key={date}>
            <p className="text-xs uppercase tracking-wide text-fg-4 mb-1">{prettyDate(date)}</p>
            <ul className="divide-y divide-edge-muted">
              {items.map(e => {
                const head = e.title || (e.opponent ? `vs ${e.opponent}` : badge(e))
                const sub = [e.title && e.opponent ? `vs ${e.opponent}` : null, e.location, e.from === 'coach' ? e.team_name : null]
                  .filter(Boolean).join(' · ')
                return (
                  <li key={`${e.from}-${e.id}`} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full ${e.tier === 'secondary' ? 'border border-edge text-fg-3' : 'bg-cta text-fg-inverse font-semibold'}`}>
                          {badge(e)}
                        </span>
                        <span className="text-xs text-fg-4">{timeRange(e)}</span>
                      </div>
                      <p className="text-sm font-medium text-fg-1 truncate">{head}</p>
                      {sub && <p className="text-xs text-fg-4 truncate">{sub}</p>}
                    </div>
                    {e.from === 'athlete' && (
                      <div className="flex items-center gap-3 shrink-0">
                        <button type="button" onClick={() => openEdit(e)} className="text-xs text-fg-3 hover:text-fg-1">Edit</button>
                        <button type="button" onClick={() => remove(e)} className="text-xs text-fg-4 hover:text-red-400">Delete</button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && !draft && <p role="alert" className="text-sm text-red-400">{error}</p>}

      {draft && (
        <form onSubmit={save} className="card p-4 space-y-4" aria-label={draft.id ? 'Edit event' : 'Add event'}>
          <p className="font-semibold text-fg-1">{draft.id ? 'Edit event' : 'Add event'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field id="ev-tier" label="Type">
              <select id="ev-tier" value={draft.tier} onChange={e => set({ tier: e.target.value as Draft['tier'] })} className="input-field w-full min-w-0">
                <option value="primary" disabled={coachActive}>Primary (team schedule)</option>
                <option value="extra">Extra session</option>
              </select>
            </Field>
            {draft.tier === 'primary' ? (
              <Field id="ev-kind" label="Event">
                <select id="ev-kind" value={draft.kind} onChange={e => set({ kind: e.target.value as Draft['kind'] })} className="input-field w-full min-w-0">
                  <option value="game">Game</option>
                  <option value="practice">Practice</option>
                </select>
              </Field>
            ) : (
              <Field id="ev-cat" label="Category">
                <select id="ev-cat" value={draft.category} onChange={e => set({ category: e.target.value as Category })} className="input-field w-full min-w-0">
                  {(Object.keys(CATEGORY_LABEL) as Category[]).map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                </select>
              </Field>
            )}
            {draft.tier === 'extra' && draft.category === 'other_sport' && (
              <Field id="ev-kind" label="Event">
                <select id="ev-kind" value={draft.kind} onChange={e => set({ kind: e.target.value as Draft['kind'] })} className="input-field w-full min-w-0">
                  <option value="game">Game</option>
                  <option value="practice">Practice</option>
                </select>
              </Field>
            )}
            <Field id="ev-title" label="Title">
              <input id="ev-title" value={draft.title} maxLength={80} onChange={e => set({ title: e.target.value })} className="input-field w-full min-w-0" />
            </Field>
            <Field id="ev-date" label="Date">
              <input id="ev-date" type="date" required value={draft.event_date} onChange={e => set({ event_date: e.target.value })} className="input-field w-full min-w-0" />
            </Field>
            <Field id="ev-start" label="Start time">
              <input id="ev-start" type="time" value={draft.start_time} onChange={e => set({ start_time: e.target.value })} className="input-field w-full min-w-0" />
            </Field>
            <Field id="ev-end" label="End time (optional)">
              <input id="ev-end" type="time" value={draft.end_time} onChange={e => set({ end_time: e.target.value })} className="input-field w-full min-w-0" />
            </Field>
            {isGame && (
              <Field id="ev-opp" label="Opponent">
                <input id="ev-opp" value={draft.opponent} maxLength={80} onChange={e => set({ opponent: e.target.value })} className="input-field w-full min-w-0" />
              </Field>
            )}
            <Field id="ev-loc" label="Location" className="sm:col-span-2">
              <input id="ev-loc" value={draft.location} maxLength={120} onChange={e => set({ location: e.target.value })} className="input-field w-full min-w-0" />
            </Field>
            <Field id="ev-notes" label="Notes" className="sm:col-span-2">
              <textarea id="ev-notes" value={draft.notes} maxLength={300} rows={3} onChange={e => set({ notes: e.target.value })} className="textarea-field w-full min-w-0" />
            </Field>
          </div>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <div className="flex flex-col sm:flex-row gap-2">
            <button type="submit" disabled={busy || !draft.event_date} className="btn-primary text-sm w-full sm:w-auto">
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => { setDraft(null); setError('') }} className="btn-secondary text-sm w-full sm:w-auto">Cancel</button>
          </div>
        </form>
      )}

      <section className="space-y-3" aria-labelledby="primary-heading">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0">
            <h3 id="primary-heading" className="font-semibold text-fg-1">Primary schedule</h3>
            <p className="text-xs text-fg-4">{coachActive ? 'From your coach' : 'Your games and practices'}</p>
          </div>
          {!coachActive && (
            <button type="button" onClick={() => openNew('primary')} className="btn-secondary text-sm w-full sm:w-auto">Add game or practice</button>
          )}
        </div>
        {data.hiddenOwn > 0 && (
          <p className="text-xs text-fg-3">
            Your coach posted your team schedule, so it replaced the {data.hiddenOwn} event{data.hiddenOwn === 1 ? '' : 's'} you added.
          </p>
        )}
        <div className="card p-4">
          {renderList(primary, coachActive ? 'Nothing from your coach in this window.' : 'No games or practices in this window. Your coach can post the team schedule, or add your own here.')}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="extra-heading">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0">
            <h3 id="extra-heading" className="font-semibold text-fg-1">Extra sessions</h3>
            <p className="text-xs text-fg-4">Private sessions, MindFit coaching, extra training and other sports. These can&rsquo;t overlap your primary schedule.</p>
          </div>
          <button type="button" onClick={() => openNew('extra')} className="btn-secondary text-sm w-full sm:w-auto">Add extra session</button>
        </div>
        <div className="card p-4">
          {renderList(extra, 'No extra sessions in this window.')}
        </div>
      </section>

      {(hasMore || showAll) && (
        <button type="button" onClick={() => setShowAll(s => !s)} className="btn-ghost text-sm w-full sm:w-auto">
          {showAll ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}
