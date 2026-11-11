'use client'
import { useEffect, useState } from 'react'
import { currentWindow, daysUntil, formatClock, gameDayGuide, gameDayPhase, gameDayWindows, parseTime } from '@/lib/game-day'
import { localDateISO } from '@/lib/nutrition'
import { loadNextGame, type UpcomingGame } from '@/lib/team-schedule'

interface Props {
  bodyWeightLb?: number | null
  notify: (msg: string, kind?: 'success' | 'error') => void
}

interface Step {
  key: string
  title: string
  when: string
  eat: string
  drink: string
  details: { heading?: string; items: string[] }[]
}

const prettyDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export default function GameDayView({ bodyWeightLb, notify }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [gameDate, setGameDate] = useState('')
  const [gameTime, setGameTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [teamGame, setTeamGame] = useState<UpcomingGame | null>(null)

  useEffect(() => {
    loadNextGame(localDateISO(new Date())).then(g => {
      setGameDate(g?.date ?? '')
      setGameTime(g?.time ?? '')
      setTeamGame(g?.fromSchedule ? g : null)
      setLoaded(true)
    })
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ next_competition_at: gameDate || null, next_competition_time: gameTime || null }),
      })
      if (res.ok) { setEditing(false); setTeamGame(null); notify('Game saved') }
      else notify('Could not save', 'error')
    } catch {
      notify("Couldn't save. Try again.", 'error')
    } finally {
      setSaving(false)
    }
  }

  const today = localDateISO(now)
  const phase = gameDayPhase(gameDate || null, today)
  const days = daysUntil(gameDate || null, today)
  const upcoming = !!gameDate && days !== null && days >= 0
  const start = parseTime(gameTime || null)

  const night = gameDayGuide('night_before', bodyWeightLb)
  const steps: Step[] = [
    {
      key: 'night',
      title: 'Night before',
      when: 'Dinner + evening',
      eat: night.blocks[0].items[0],
      drink: night.blocks[1].items[0],
      details: night.blocks.map(b => ({ heading: b.heading, items: b.items })),
    },
    ...gameDayWindows(gameTime || null, bodyWeightLb).map(w => ({
      key: w.key, title: w.title, when: w.when, eat: w.eat, drink: w.drink, details: [{ items: [w.tip] }],
    })),
  ]

  let activeIdx = -1
  if (phase === 'night_before') activeIdx = 0
  else if (phase === 'game_day') {
    const win = currentWindow(gameTime || null, now.getHours() * 60 + now.getMinutes())
    activeIdx = win ? steps.findIndex(s => s.key === win) : 1
  }

  let headline = 'Set your next game to get a fueling plan with exact times.'
  if (upcoming) {
    if (phase === 'game_day') headline = start !== null ? `Game day · starts ${formatClock(start)}` : 'Game day'
    else if (phase === 'night_before') headline = 'Tomorrow is game day. Fuel tonight.'
    else headline = `Next game in ${days} day${days === 1 ? '' : 's'}`
  } else if (gameDate) headline = 'Your last game has passed. Set the next one.'

  const showForm = loaded && (editing || !upcoming)

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-fg-1 text-sm">{headline}</p>
            {upcoming && !showForm && (
              <p className="text-xs text-fg-3">
                {prettyDate(gameDate)}{start !== null ? ` · ${formatClock(start)}` : ' · add a start time for exact windows'}
                {teamGame && <>{teamGame.opponent ? ` · vs ${teamGame.opponent}` : ''} · from the {teamGame.teamName} schedule</>}
              </p>
            )}
          </div>
          {upcoming && !showForm && (
            <button type="button" onClick={() => setEditing(true)} className="btn-ghost text-xs px-2 shrink-0">Edit</button>
          )}
        </div>
        {showForm && (
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <div>
              <label htmlFor="gameday-date" className="block text-xs uppercase tracking-wide text-fg-4 mb-1">Game date</label>
              <input id="gameday-date" type="date" value={gameDate} onChange={e => setGameDate(e.target.value)} className="input-field" />
            </div>
            <div>
              <label htmlFor="gameday-time" className="block text-xs uppercase tracking-wide text-fg-4 mb-1">Start time</label>
              <input id="gameday-time" type="time" value={gameTime} onChange={e => setGameTime(e.target.value)} className="input-field" />
            </div>
            <button type="button" onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        )}
      </div>

      <section aria-labelledby="gameday-plan-heading">
        <h3 id="gameday-plan-heading" className="text-sm font-semibold text-fg-1 mb-3">Your fueling timeline</h3>
        <ol className="space-y-2">
          {steps.map((s, i) => {
            const isActive = i === activeIdx
            const isPast = activeIdx > 0 && i < activeIdx
            const open = openKey === s.key
            return (
              <li
                key={s.key}
                aria-current={isActive ? 'step' : undefined}
                className={`card p-4 ${isActive ? 'border-cta/50' : ''} ${isPast ? 'opacity-50' : ''}`}
              >
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <p className={`font-semibold text-sm ${isActive ? 'text-cta' : 'text-fg-1'}`}>
                    <span className="text-fg-4 tabular-nums mr-2">{i + 1}</span>{s.title}
                  </p>
                  <p className="text-xs text-fg-3 tabular-nums shrink-0">{isActive ? 'Now · ' : ''}{s.when}</p>
                </div>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex gap-2"><dt className="w-12 shrink-0 text-xs uppercase tracking-wide text-fg-4 pt-0.5">Eat</dt><dd className="text-fg-2 min-w-0">{s.eat}</dd></div>
                  <div className="flex gap-2"><dt className="w-12 shrink-0 text-xs uppercase tracking-wide text-fg-4 pt-0.5">Drink</dt><dd className="text-fg-2 min-w-0">{s.drink}</dd></div>
                </dl>
                <button type="button" onClick={() => setOpenKey(open ? null : s.key)} aria-expanded={open}
                  className="mt-2 text-xs text-fg-4 hover:text-fg-2 min-h-[32px]">
                  {open ? 'Hide tips ▲' : 'Tips ▼'}
                </button>
                {open && (
                  <div className="space-y-2 pt-2 border-t border-edge-muted">
                    {s.details.map((d, j) => (
                      <div key={j}>
                        {d.heading && <p className="text-xs uppercase tracking-wider text-fg-4 mb-1">{d.heading}</p>}
                        <ul className="space-y-1">
                          {d.items.map((it, k) => <li key={k} className="text-sm text-fg-3">{it}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
