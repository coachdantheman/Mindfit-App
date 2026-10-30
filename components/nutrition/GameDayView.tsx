'use client'
import { useEffect, useState } from 'react'
import { currentWindow, daysUntil, gameDayGuide, gameDayPhase, gameDayWindows, type WindowKey } from '@/lib/game-day'
import { localDateISO } from '@/lib/nutrition'

interface Props {
  bodyWeightLb?: number | null
  notify: (msg: string) => void
}

export default function GameDayView({ bodyWeightLb, notify }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [gameDate, setGameDate] = useState('')
  const [gameTime, setGameTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [showNightBefore, setShowNightBefore] = useState(false)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    fetch('/api/profile').then(r => r.ok ? r.json() : null).then(p => {
      setGameDate(p?.next_competition_at?.slice(0, 10) ?? '')
      setGameTime(p?.next_competition_time?.slice(0, 5) ?? '')
      setLoaded(true)
    })
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ next_competition_at: gameDate || null, next_competition_time: gameTime || null }),
    })
    setSaving(false)
    notify(res.ok ? 'Game saved' : 'Could not save')
  }

  const today = localDateISO(now)
  const phase = gameDayPhase(gameDate || null, today)
  const days = daysUntil(gameDate || null, today)
  const windows = gameDayWindows(gameTime || null, bodyWeightLb)
  const active: WindowKey | null = phase === 'game_day' ? currentWindow(gameTime || null, now.getHours() * 60 + now.getMinutes()) : null
  const nightBefore = gameDayGuide('night_before', bodyWeightLb)
  const nightOpen = phase === 'night_before' || showNightBefore

  let headline = 'Set your next game to see a fueling plan with exact times.'
  if (gameDate) {
    if (phase === 'game_day') headline = gameTime ? `Game day · starts ${windows[2].when.replace(' start', '')}` : 'Game day'
    else if (phase === 'night_before') headline = 'Tomorrow is game day. Fuel tonight.'
    else if (days !== null && days < 0) headline = 'Your last game has passed. Set the next one.'
    else headline = `Next game in ${days} day${days === 1 ? '' : 's'}`
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <div>
          <p className="font-semibold text-fg-1 text-sm">{headline}</p>
          <p className="text-xs text-fg-4">The time of your game sets when to eat. Without it, you get relative windows.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <div>
            <label htmlFor="gameday-date" className="block text-xs uppercase tracking-wide text-fg-4 mb-1">Game date</label>
            <input id="gameday-date" type="date" value={gameDate} onChange={e => setGameDate(e.target.value)} className="input-field" disabled={!loaded} />
          </div>
          <div>
            <label htmlFor="gameday-time" className="block text-xs uppercase tracking-wide text-fg-4 mb-1">Start time</label>
            <input id="gameday-time" type="time" value={gameTime} onChange={e => setGameTime(e.target.value)} className="input-field" disabled={!loaded} />
          </div>
          <button type="button" onClick={save} disabled={!loaded || saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      <section aria-labelledby="gameday-plan-heading">
        <h3 id="gameday-plan-heading" className="text-sm font-semibold text-fg-1 mb-3">Game-day plan</h3>
        <ol className="relative space-y-3">
          {windows.map(w => {
            const isActive = active === w.key
            return (
              <li
                key={w.key}
                aria-current={isActive ? 'step' : undefined}
                className={`card p-4 ${isActive ? 'border-cta/50 shadow-[0_0_0_1px_rgba(196,180,0,0.25)]' : ''}`}
              >
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <p className={`font-semibold text-sm ${isActive ? 'text-cta' : 'text-fg-1'}`}>{w.title}</p>
                  <p className="text-xs text-fg-3 tabular-nums shrink-0">{w.when}{isActive ? ' · now' : ''}</p>
                </div>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex gap-2"><dt className="w-12 shrink-0 text-xs uppercase tracking-wide text-fg-4 pt-0.5">Eat</dt><dd className="text-fg-2">{w.eat}</dd></div>
                  <div className="flex gap-2"><dt className="w-12 shrink-0 text-xs uppercase tracking-wide text-fg-4 pt-0.5">Drink</dt><dd className="text-fg-2">{w.drink}</dd></div>
                  <div className="flex gap-2"><dt className="w-12 shrink-0 text-xs uppercase tracking-wide text-fg-4 pt-0.5">Tip</dt><dd className="text-fg-3">{w.tip}</dd></div>
                </dl>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="card p-4">
        <button
          type="button"
          onClick={() => setShowNightBefore(o => !o)}
          aria-expanded={nightOpen}
          className="w-full flex items-center justify-between text-left min-h-[44px]"
        >
          <span className={`font-semibold text-sm ${phase === 'night_before' ? 'text-cta' : 'text-fg-1'}`}>{nightBefore.title}</span>
          <span className="text-xs text-fg-4">{nightOpen ? 'Hide' : 'Show'}</span>
        </button>
        {nightOpen && (
          <div className="space-y-3 pt-3 mt-2 border-t border-edge-muted">
            <p className="text-xs text-fg-3">{nightBefore.summary}</p>
            {nightBefore.blocks.map(b => (
              <div key={b.heading}>
                <p className="text-xs uppercase tracking-wider text-fg-4 mb-1">{b.heading}</p>
                <ul className="space-y-1">
                  {b.items.map((it, i) => <li key={i} className="text-sm text-fg-2 pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[0.55em] before:w-1.5 before:h-px before:bg-cta">{it}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
