import type { ObjectiveResult } from '@/types'
import { localDateISO } from '@/lib/dates'

export interface TodayData {
  journal: {
    objective: string
    rating_motivation: number
    rating_focus: number
    rating_confidence: number
    rating_anxiety: number
    quick: boolean
    objective_result: ObjectiveResult | null
  } | null
  sleep: {
    hours_slept: number | null
    sleep_quality: number | null
    bedtime: string | null
    wake_time: string | null
    notes: string | null
  } | null
  pillars: { mind: boolean; body: boolean; fuel: boolean; rest: boolean }
  affirmation: string | null
  focus: { need: string; label: string; action: { text: string; href: string }; from: 'quiz' | 'mpi' } | null
  // Average of the three entries before today; null with no earlier entries.
  recent: { motivation: number; focus: number; confidence: number; anxiety: number } | null
  // Routines finished today (routine_logs).
  routines: { morning: boolean; night: boolean }
}

export type PillarKey = keyof TodayData['pillars']

export const PILLARS: { key: PillarKey; label: string; href: string }[] = [
  { key: 'mind', label: 'Mind', href: '/mindset?tab=Journal' },
  { key: 'body', label: 'Body', href: '/exercise' },
  { key: 'fuel', label: 'Fuel', href: '/nutrition' },
  { key: 'rest', label: 'Rest', href: '/sleep' },
]

// `inline` steps open inside the guide instead of linking out; their href is empty.
export interface GuideStep { id: string; tag: string; text: string; why: string; href: string; inline?: boolean }

function ringStep(key: PillarKey, hour: number): GuideStep {
  const meal = hour < 11 ? 'breakfast' : hour < 16 ? 'lunch' : 'dinner'
  switch (key) {
    case 'mind': return { id: 'mind', tag: 'Mind', text: "Write today's journal entry", why: 'Two minutes on paper. One entry closes your Mind ring.', href: '/mindset?tab=Journal' }
    case 'body': return { id: 'body', tag: 'Body', text: "Log today's training", why: 'Practice, lift or run. Any session closes your Body ring.', href: '/exercise' }
    case 'fuel': return { id: 'fuel', tag: 'Fuel', text: `Log ${meal}`, why: 'Fuel is part of training. One meal closes your Fuel ring.', href: '/nutrition' }
    case 'rest': return { id: 'rest', tag: 'Rest', text: "Log last night's sleep", why: 'Recovery is where the work turns into progress.', href: '/sleep' }
  }
}

const ORDER: Record<'morning' | 'midday' | 'evening', PillarKey[]> = {
  morning: ['rest', 'mind', 'fuel', 'body'],
  midday: ['body', 'fuel', 'mind', 'rest'],
  evening: ['fuel', 'mind', 'body', 'rest'],
}

// Open steps for right now, in time-of-day order. Game day puts the pregame
// routine first; once all four rings close, the daily focus is a bonus rep.
export function guideSteps(data: TodayData, opts: { hour: number; gameToday: boolean; done: string[] }): GuideStep[] {
  const { hour, gameToday, done } = opts
  const slot = hour < 11 ? 'morning' : hour < 17 ? 'midday' : 'evening'
  const steps: GuideStep[] = []
  if (gameToday && !done.includes('pregame')) {
    steps.push({ id: 'pregame', tag: 'Game day', text: 'Run your pregame routine', why: 'Lock in your 5A before you compete.', href: '/exercise?tab=gameday' })
  }
  for (const key of ORDER[slot]) if (!data.pillars[key] && !done.includes(key)) steps.push(ringStep(key, hour))
  const allClosed = Object.values(data.pillars).every(Boolean)
  if (allClosed && data.focus && !done.includes('focus')) {
    steps.push({ id: 'focus', tag: `Bonus · ${data.focus.label}`, text: data.focus.action.text, why: 'All four rings closed. One more rep on your biggest need.', href: data.focus.action.href })
  }
  return steps
}

export function greeting(hour: number): string {
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

export function todayQuery(day: string): string {
  const start = new Date(`${day}T00:00:00`)
  const end = new Date(start.getTime() + 86_400_000)
  return `/api/today?date=${day}&from=${encodeURIComponent(start.toISOString())}&to=${encodeURIComponent(end.toISOString())}`
}

// Set when the guide opens; expires at the athlete's local midnight, so the
// app layout sends them to /guide once per day.
export const GUIDE_DAY_COOKIE = 'mf-guide-day'

export function markGuideSeenToday() {
  const midnight = new Date()
  midnight.setHours(24, 0, 0, 0)
  document.cookie = `${GUIDE_DAY_COOKIE}=1; path=/; expires=${midnight.toUTCString()}; SameSite=Lax`
}

export async function saveGuideChoice(on: boolean): Promise<boolean> {
  try {
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_guidance: on }),
    })
    return res.ok
  } catch {
    return false
  }
}

// Device-only notes for the guide. The mf:draft: prefix means sign-out clears
// them with the other drafts (lib/useDraft.ts).
const NEXT_OBJECTIVE_KEY = 'mf:draft:next-objective'
const SKIPS_KEY = 'mf:draft:guide-skips'

// An objective written ahead of time (the night before, or on day one); it
// prefills the next check-in. `from` is the first day it applies to, so one
// written tonight for tomorrow is not used up by tonight's entry.
export function readNextObjective(today = localDateISO()): string {
  try {
    const saved = JSON.parse(localStorage.getItem(NEXT_OBJECTIVE_KEY) ?? 'null') as { text?: unknown; from?: unknown } | null
    return saved && typeof saved.text === 'string' && typeof saved.from === 'string' && saved.from <= today ? saved.text : ''
  } catch {
    return ''
  }
}

export function saveNextObjective(text: string, from = localDateISO()) {
  const value = text.trim().slice(0, 200)
  try {
    if (value) localStorage.setItem(NEXT_OBJECTIVE_KEY, JSON.stringify({ text: value, from }))
    else if (readNextObjective()) localStorage.removeItem(NEXT_OBJECTIVE_KEY)
  } catch {}
}

// How many times in a row each step was put off.
export function readSkips(): Record<string, number> {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(SKIPS_KEY) ?? '{}')
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    return Object.fromEntries(Object.entries(raw).filter(([, n]) => typeof n === 'number')) as Record<string, number>
  } catch {
    return {}
  }
}

// skipped = the athlete put the step off; otherwise they did it, so the count resets.
export function recordSkip(id: string, skipped: boolean) {
  const skips = readSkips()
  if (skipped) skips[id] = (skips[id] ?? 0) + 1
  else delete skips[id]
  try { localStorage.setItem(SKIPS_KEY, JSON.stringify(skips)) } catch {}
}

// True once each time a guide reaches a new form on this device, so the
// evolution is celebrated one time. A first look at stage 1 is not news.
export function takeEvolution(character: string, stage: number): boolean {
  const key = `mf-guide-stage:${character}`
  try {
    const seen = Number(localStorage.getItem(key)) || 0
    if (stage <= seen) return false
    localStorage.setItem(key, String(stage))
    return stage > 1
  } catch {
    return false
  }
}

// The companion on app pages can be tucked into the top bar. Kept per device.
const DOCKED_KEY = 'mf-companion-docked'
const DOCKED_EVENT = 'mf-companion'

export function companionDocked(): boolean {
  try { return localStorage.getItem(DOCKED_KEY) === '1' } catch { return false }
}

export function setCompanionDocked(docked: boolean) {
  try {
    if (docked) localStorage.setItem(DOCKED_KEY, '1')
    else localStorage.removeItem(DOCKED_KEY)
  } catch {}
  window.dispatchEvent(new Event(DOCKED_EVENT))
}

export function onCompanionChange(listener: () => void): () => void {
  window.addEventListener(DOCKED_EVENT, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(DOCKED_EVENT, listener)
    window.removeEventListener('storage', listener)
  }
}

// A screen's tip shows on the first two visits, then never again.
export function takeTip(screen: string): boolean {
  const key = `mf-guide-tip:${screen}`
  try {
    const seen = Number(localStorage.getItem(key)) || 0
    if (seen >= 2) return false
    localStorage.setItem(key, String(seen + 1))
    return true
  } catch {
    return false
  }
}

// Fired after the athlete picks, switches or hides their guide, so the
// companion on the page updates without a reload.
const GUIDE_EVENT = 'mf-guide-changed'
export function guideChanged() { window.dispatchEvent(new Event(GUIDE_EVENT)) }
export function onGuideChanged(listener: () => void): () => void {
  window.addEventListener(GUIDE_EVENT, listener)
  return () => window.removeEventListener(GUIDE_EVENT, listener)
}
