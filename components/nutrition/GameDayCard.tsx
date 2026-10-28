'use client'
import { useEffect, useState } from 'react'
import { daysUntil, gameDayGuide, gameDayPhase, type GameDayGuide } from '@/lib/game-day'

interface Props {
  today: string
  bodyWeightLb?: number | null
}

export default function GameDayCard({ today, bodyWeightLb }: Props) {
  const [gameDate, setGameDate] = useState<string | null | undefined>(undefined)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch('/api/profile').then(r => r.ok ? r.json() : null).then(p => setGameDate(p?.next_competition_at?.slice(0, 10) ?? null))
  }, [])

  const save = async () => {
    if (!draft) return
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ next_competition_at: draft }),
    })
    setSaving(false)
    if (res.ok) { setGameDate(draft); setEditing(false) }
  }

  if (gameDate === undefined) return null

  const phase = gameDayPhase(gameDate, today)
  const days = daysUntil(gameDate, today)
  const editForm = (
    <div className="flex items-center gap-2 pt-1">
      <input type="date" value={draft} min={today} onChange={e => setDraft(e.target.value)} className="input-field flex-1" aria-label="Next game date" />
      <button type="button" onClick={save} disabled={saving || !draft} className="btn-primary shrink-0">{saving ? 'Saving…' : 'Save'}</button>
      {gameDate && <button type="button" onClick={() => setEditing(false)} className="btn-ghost shrink-0">Cancel</button>}
    </div>
  )
  const startEdit = () => { setDraft(gameDate ?? ''); setEditing(true) }

  if (!gameDate || editing) {
    return (
      <div className="card p-4 space-y-2">
        <div>
          <p className="font-semibold text-fg-1 text-sm">When is your next game?</p>
          <p className="text-xs text-fg-4">Set it and your fueling plan shows up here the night before and on game day.</p>
        </div>
        {editForm}
      </div>
    )
  }

  if (phase === 'none') {
    const label = days !== null && days < 0 ? 'Last game has passed' : `Next game in ${days} day${days === 1 ? '' : 's'}`
    return (
      <div className="card p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-fg-2">{label} <button type="button" onClick={startEdit} className="text-xs text-cta ml-1">edit</button></p>
          <button type="button" onClick={() => setOpen(o => !o)} className="text-xs text-fg-4 hover:text-fg-2 min-h-[44px] px-1">
            {open ? 'Hide fueling guide' : 'Game-day fueling guide'}
          </button>
        </div>
        {open && (
          <div className="space-y-4 pt-1 border-t border-edge-muted">
            <Guide guide={gameDayGuide('night_before', bodyWeightLb)} />
            <Guide guide={gameDayGuide('game_day', bodyWeightLb)} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="card p-4 space-y-3 border-cta/40">
      <Guide guide={gameDayGuide(phase, bodyWeightLb)} highlight />
      <button type="button" onClick={startEdit} className="text-xs text-fg-4 hover:text-fg-2">Change game date</button>
    </div>
  )
}

function Guide({ guide, highlight }: { guide: GameDayGuide; highlight?: boolean }) {
  return (
    <div className="space-y-3">
      <div>
        <p className={`font-semibold text-sm ${highlight ? 'text-cta' : 'text-fg-1'}`}>{guide.title}</p>
        <p className="text-xs text-fg-4 mt-0.5">{guide.summary}</p>
      </div>
      {guide.blocks.map(b => (
        <div key={b.heading}>
          <p className="text-[11px] uppercase tracking-wider text-fg-4 mb-1">{b.heading}</p>
          <ul className="space-y-1">
            {b.items.map((it, i) => <li key={i} className="text-sm text-fg-2 pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[0.55em] before:w-1.5 before:h-px before:bg-cta">{it}</li>)}
          </ul>
        </div>
      ))}
    </div>
  )
}
