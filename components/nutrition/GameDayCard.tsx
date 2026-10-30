'use client'
import { useEffect, useState } from 'react'
import { currentWindow, daysUntil, gameDayPhase, gameDayWindows } from '@/lib/game-day'

interface Props {
  today: string
  onOpenGameDay: () => void
}

// One-line banner on the Today view. The full plan lives on the Game Day tab.
export default function GameDayCard({ today, onOpenGameDay }: Props) {
  const [profile, setProfile] = useState<{ date: string | null; time: string | null } | undefined>(undefined)

  useEffect(() => {
    fetch('/api/profile').then(r => r.ok ? r.json() : null).then(p => setProfile({
      date: p?.next_competition_at?.slice(0, 10) ?? null,
      time: p?.next_competition_time?.slice(0, 5) ?? null,
    }))
  }, [])

  if (profile === undefined) return null

  const phase = gameDayPhase(profile.date, today)
  const days = daysUntil(profile.date, today)

  let text: string
  let cta = 'Open plan'
  let highlight = false
  if (!profile.date || (days !== null && days < 0)) {
    text = 'When is your next game?'
    cta = 'Set it'
  } else if (phase === 'game_day') {
    highlight = true
    const now = new Date()
    const key = currentWindow(profile.time, now.getHours() * 60 + now.getMinutes())
    const win = gameDayWindows(profile.time).find(w => w.key === key)
    text = win ? `Game day · ${win.title.toLowerCase()} ${win.when}` : 'Game day · follow your fueling plan'
  } else if (phase === 'night_before') {
    highlight = true
    text = 'Tomorrow is game day · fuel tonight'
  } else {
    text = `Next game in ${days} day${days === 1 ? '' : 's'}`
  }

  return (
    <button
      type="button"
      onClick={onOpenGameDay}
      className={`card w-full p-3 flex items-center justify-between gap-3 text-left min-h-[44px] hover:bg-surface-2/50 transition-colors ${highlight ? 'border-cta/40' : ''}`}
    >
      <span className={`text-sm ${highlight ? 'text-cta font-semibold' : 'text-fg-2'}`}>{text}</span>
      <span className="text-xs text-fg-3 shrink-0">{cta} →</span>
    </button>
  )
}
