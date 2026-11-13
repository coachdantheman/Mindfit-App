'use client'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cached } from '@/lib/api-cache'
import { localDateISO } from '@/lib/dates'
import { companionDocked, onCompanionChange, readSkips, setCompanionDocked, takeTip, todayQuery, type TodayData } from '@/lib/guide'
import { daySeed, greetKey, needFor, planSteps, stepLineKey } from '@/lib/guide-brain'
import { guideLine, type LineKey } from '@/lib/data/guide-lines'
import { markFromGuide, readTrip } from '@/lib/guide-return'
import { useGuide } from '@/lib/use-guide'
import { guideFor } from '@/lib/guide-characters'
import { haptic } from '@/lib/haptics'
import Character from './art/Character'

const TIPS: Record<string, LineKey> = {
  mindset: 'tip.mindset',
  nutrition: 'tip.nutrition',
  exercise: 'tip.exercise',
  sleep: 'tip.sleep',
  progress: 'tip.progress',
  leaderboard: 'tip.leaderboard',
}

const useDocked = () => useSyncExternalStore(onCompanionChange, companionDocked, () => false)

// The athlete's guide on every app page. It stays quiet in the corner: one tap
// and it says the next step, two taps (or "Tuck away") and it moves to the top
// bar until it is called back. On a screen's first two visits it gives one tip.
export default function Companion() {
  const g = useGuide()
  const docked = useDocked()
  const pathname = usePathname()
  const screen = pathname.split('/')[1] ?? ''
  const [open, setOpen] = useState(false)
  const [tip, setTip] = useState<LineKey | null>(null)
  const [data, setData] = useState<TodayData | null>(null)
  const [typing, setTyping] = useState(false)
  // Sits higher while a "Back to..." pill shares the bottom of the screen.
  const [raised, setRaised] = useState(false)
  // A character earned since the last look, announced once.
  const [fresh, setFresh] = useState<string[]>([])
  const tap = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const active = g.eligible && g.show && !docked

  // Out of the way while the athlete is typing.
  useEffect(() => {
    const check = () => {
      const el = document.activeElement
      setTyping(!!el && (el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !/^(checkbox|radio|range|button|submit|hidden)$/.test(el.type))))
    }
    document.addEventListener('focusin', check)
    document.addEventListener('focusout', check)
    // A field removed while focused fires no focusout, so re-check on taps and new screens too.
    document.addEventListener('pointerup', check)
    check()
    return () => { document.removeEventListener('focusin', check); document.removeEventListener('focusout', check); document.removeEventListener('pointerup', check) }
  }, [pathname])

  // A new screen closes the bubble; a screen seen fewer than twice gets its tip.
  useEffect(() => {
    setOpen(false)
    setTip(null)
    clearTimeout(tap.current)
    tap.current = undefined
    let pill = !!readTrip()
    try { pill = pill || !!sessionStorage.getItem('mf-from-gameday') } catch {}
    setRaised(pill)
    if (!active || !TIPS[screen]) return
    const t = setTimeout(() => {
      if (!takeTip(screen)) return
      setTip(TIPS[screen])
      setOpen(true)
    }, 900)
    return () => clearTimeout(t)
  }, [screen, active])

  // The tip's target, when the screen marks one, gets a ring while the tip is up.
  useEffect(() => {
    if (!tip) return
    const el = document.querySelector(`[data-guide="${screen}"]`)
    el?.classList.add('gc-ring')
    return () => el?.classList.remove('gc-ring')
  }, [tip, screen])

  useEffect(() => {
    if (!open || tip) return
    cached(todayQuery(localDateISO()), (d: TodayData | null) => { if (d?.pillars) setData(d) }).catch(() => {})
  }, [open, tip])

  useEffect(() => () => clearTimeout(tap.current), [])

  // Told once: mark it as soon as it shows, so closing the bubble any way does not repeat it.
  useEffect(() => {
    if (!g.fresh.length) return
    setFresh(g.fresh)
    setOpen(true)
    fetch('/api/guide/collection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seen: g.fresh }) }).catch(() => {})
  }, [g.fresh])

  // Now and then, while nothing else is going on, the guide plays the athlete's sport for a moment.
  const [emote, setEmote] = useState(false)
  useEffect(() => {
    if (!g.sport || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let off: ReturnType<typeof setTimeout> | undefined
    const every = setInterval(() => {
      setEmote(true)
      off = setTimeout(() => setEmote(false), 3200)
    }, 45_000)
    return () => { clearInterval(every); clearTimeout(off) }
  }, [g.sport])

  const ackFresh = () => {
    setFresh([])
    setOpen(false)
  }

  if (!active || typing) return null

  const today = localDateISO()
  const hour = new Date().getHours()
  const seed = daySeed(today)
  const voice = g.guide.voice
  const step = data?.journal ? planSteps({ data, hour, gameToday: false, done: [], focus: g.guide.focus, skips: readSkips() })[0] ?? null : null

  let line = ''
  let action: { href: string; label: string; trip: boolean } | null = null
  if (fresh.length) {
    line = `${guideLine(voice, 'unlock.new')} (${fresh.map(k => guideFor(k).name).join(', ')})`
    action = { href: '/settings#guide', label: 'See my guides', trip: false }
  } else if (tip) {
    line = guideLine(voice, tip, { seed })
  } else if (data && !data.journal) {
    line = guideLine(voice, greetKey({ hour, streak: null, gameToday: false }), { name: g.first, seed })
    action = { href: '/guide', label: 'Open my guide', trip: false }
  } else if (data && step) {
    line = guideLine(voice, stepLineKey(step, needFor(data)), { seed })
    action = step.inline ? { href: '/guide', label: step.text, trip: false } : { href: step.href, label: step.text, trip: true }
  } else if (data) {
    line = guideLine(voice, Object.values(data.pillars).every(Boolean) ? 'end.clutch' : 'end.plan', { seed })
    action = { href: '/guide', label: 'Open my guide', trip: false }
  }

  const dock = () => { haptic.tap(); setOpen(false); setTip(null); setFresh([]); setCompanionDocked(true) }

  // One tap talks, two taps tuck it away.
  const onTap = () => {
    if (tap.current) {
      clearTimeout(tap.current)
      tap.current = undefined
      return dock()
    }
    tap.current = setTimeout(() => {
      tap.current = undefined
      haptic.tick()
      setTip(null)
      setOpen(o => !o)
    }, 260)
  }

  const asleep = hour >= 22 || hour < 5

  return (
    <div className={`fixed right-3 z-40 ${raised ? 'bottom-[calc(env(safe-area-inset-bottom)_+_8.75rem)] sm:bottom-20' : 'bottom-[calc(env(safe-area-inset-bottom)_+_5rem)] sm:bottom-6'} flex flex-col items-end gap-2 pointer-events-none`}>
      {open && line && (
        <div role="status" className="mf-rise pointer-events-auto max-w-[270px] rounded-2xl border border-cta/30 bg-surface/95 backdrop-blur p-3.5 shadow-[0_8px_24px_rgb(0_0_0/0.45)]">
          <p className="text-sm leading-snug text-fg-1">{line}</p>
          <div className="mt-2.5 flex items-center justify-between gap-3">
            {tip ? (
              <button type="button" onClick={() => { setOpen(false); setTip(null); setFresh([]) }} className="min-h-[44px] px-4 rounded-full bg-cta text-fg-inverse text-sm font-semibold">Got it</button>
            ) : action ? (
              <Link href={action.href} onClick={() => { if (fresh.length) ackFresh(); if (action.trip && data) markFromGuide(data.pillars); setOpen(false) }}
                className="min-h-[44px] px-4 rounded-full bg-cta text-fg-inverse text-sm font-semibold inline-flex items-center">
                {action.label}
              </Link>
            ) : <span />}
            <button type="button" onClick={dock} className="min-h-[44px] px-2 text-xs text-fg-4 hover:text-fg-2">Tuck away</button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onTap}
        aria-label={`${g.guide.name}, your guide. Tap for your next step, double tap to tuck away.`}
        aria-expanded={open && !!line}
        className="pointer-events-auto touch-manipulation rounded-full p-1 hover:bg-cta/10 transition-colors"
      >
        <Character species={g.guide.key} stage={g.stage} outfit={g.outfit} sport={g.sport} size={56} state={fresh.length ? 'cheer' : asleep ? 'sleep' : tip ? 'point' : emote && !open ? 'emote' : 'idle'} />
      </button>
    </div>
  )
}

// The tucked-away guide in the top bar. One tap brings it back.
export function CompanionChip() {
  const g = useGuide()
  const docked = useDocked()
  if (!g.eligible || !g.show || !docked) return null
  return (
    <button
      type="button"
      onClick={() => { haptic.tap(); setCompanionDocked(false) }}
      aria-label={`Bring back ${g.guide.name}, your guide`}
      title={`Bring back ${g.guide.name}`}
      className="touch-manipulation min-h-[40px] min-w-[40px] grid place-items-center rounded-full hover:bg-cta/10 transition-colors"
    >
      <span className="rounded-full border border-cta/40 p-0.5 flex"><Character species={g.guide.key} stage={g.stage} outfit={g.outfit} size={24} face /></span>
    </button>
  )
}
