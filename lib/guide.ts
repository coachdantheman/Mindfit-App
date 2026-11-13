export interface TodayData {
  journal: {
    objective: string
    rating_motivation: number
    rating_focus: number
    rating_confidence: number
    rating_anxiety: number
    quick: boolean
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
}

export type PillarKey = keyof TodayData['pillars']

export const PILLARS: { key: PillarKey; label: string; href: string }[] = [
  { key: 'mind', label: 'Mind', href: '/mindset?tab=Journal' },
  { key: 'body', label: 'Body', href: '/exercise' },
  { key: 'fuel', label: 'Fuel', href: '/nutrition' },
  { key: 'rest', label: 'Rest', href: '/sleep' },
]

export interface GuideStep { id: string; tag: string; text: string; why: string; href: string }

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
