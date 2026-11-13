import { guideSteps, type GuideStep, type PillarKey, type TodayData } from '@/lib/guide'
import type { LineKey } from '@/lib/data/guide-lines'

// The Daily Guide's decisions, as pure functions: which flow opens, what the
// athlete needs most right now, the order of the steps, and which line the
// guide character says.

export type Slot = 'morning' | 'midday' | 'evening'
export const slotFor = (hour: number): Slot => (hour < 12 ? 'morning' : hour < 17 ? 'midday' : 'evening')

export type Flow = 'day-one' | 'morning' | 'check-in' | 'evening' | 'steps'

export interface FlowInput {
  hour: number
  hasJournal: boolean
  // The athlete finished setup today and has not seen the day-one welcome.
  dayOne: boolean
  // Today's objective is not checked off yet, and was not put off.
  checkOpen: boolean
  // The night routine is not done yet, and was not put off.
  nightOpen: boolean
}

// Mornings start with sleep and the routine, and the ratings come after it.
// Later in the day it is the short check-in. Evenings close the day.
export function flowFor(i: FlowInput): Flow {
  if (!i.hasJournal) return i.dayOne ? 'day-one' : slotFor(i.hour) === 'morning' ? 'morning' : 'check-in'
  if (slotFor(i.hour) === 'evening' && (i.checkOpen || i.nightOpen)) return 'evening'
  return 'steps'
}

export type Ratings = { motivation: number; focus: number; confidence: number; anxiety: number }
export type Need = 'calm' | 'focus' | 'confidence' | 'motivation'

// The same lines a coach's roster flags at: anxiety 7+, or a rating of 4 or lower.
export const NEED_ANXIETY = 7
export const NEED_LOW = 4

// What the athlete needs most: today's ratings when they exist, otherwise the
// average of their last three entries.
export function needFrom(today: Ratings | null, recent: Ratings | null): Need | null {
  const r = today ?? recent
  if (!r) return null
  if (r.anxiety >= NEED_ANXIETY) return 'calm'
  const order = ['motivation', 'focus', 'confidence'] as const
  const lowest = order.reduce((a, b) => (r[b] < r[a] ? b : a))
  return r[lowest] <= NEED_LOW ? lowest : null
}

const NEED_STEPS: Record<Need, GuideStep> = {
  calm: { id: 'need', tag: 'For right now', text: 'Slow your breathing', why: 'Four seconds in, six out, for about a minute. A longer exhale helps your body settle.', href: '/mindset?tab=Routine' },
  focus: { id: 'need', tag: 'For right now', text: 'Run a short visualization', why: 'See the next rep go right. It gives your attention one target.', href: '/mindset?tab=Visualization' },
  confidence: { id: 'need', tag: 'For right now', text: 'Read your identity statements', why: 'Confidence follows evidence. Start with who you already are.', href: '/mindset?tab=Affirmations' },
  motivation: { id: 'need', tag: 'For right now', text: 'Look at your goal', why: 'Reconnect with why you started, then pick the smallest step.', href: '/mindset?tab=Goals' },
}

const CHECK_STEP: GuideStep = { id: 'check', tag: 'Today', text: "Check off today's objective", why: 'One tap. An honest answer makes tomorrow sharper.', href: '', inline: true }
const NIGHT_STEP: GuideStep = { id: 'night', tag: 'Tonight', text: 'Run your night routine', why: 'Five short steps to close the day so your mind can recover.', href: '', inline: true }

// A step put off this many times in a row moves to the back of the line.
export const SKIP_LIMIT = 3

export interface PlanInput {
  data: TodayData
  hour: number
  gameToday: boolean
  done: string[]
  // The rings the athlete's guide character puts first.
  focus: PillarKey[]
  skips: Record<string, number>
}

function todayRatings(data: TodayData): Ratings | null {
  const j = data.journal
  return j ? { motivation: j.rating_motivation, focus: j.rating_focus, confidence: j.rating_confidence, anxiety: j.rating_anxiety } : null
}

export function needFor(data: TodayData): Need | null {
  return needFrom(todayRatings(data), data.recent)
}

// The open steps in the order this athlete should see them: pregame on game
// day, the objective check in the evening, what they need most, then the open
// rings (their guide's rings first, steps they keep putting off last), the
// night routine, and the bonus rep once all four rings are closed.
export function planSteps(i: PlanInput): GuideStep[] {
  const base = guideSteps(i.data, { hour: i.hour, gameToday: i.gameToday, done: i.done })
  const pregame = base.filter(s => s.id === 'pregame')
  const bonus = base.filter(s => s.id === 'focus')
  const weight = (s: GuideStep) => ((i.skips[s.id] ?? 0) >= SKIP_LIMIT ? 2 : 0) + (i.focus.includes(s.id as PillarKey) ? 0 : 1)
  const rings = base
    .filter(s => s.id !== 'pregame' && s.id !== 'focus')
    .map((s, n) => ({ s, n }))
    .sort((a, b) => weight(a.s) - weight(b.s) || a.n - b.n)
    .map(x => x.s)

  const evening = slotFor(i.hour) === 'evening'
  const check = evening && i.data.journal && i.data.journal.objective_result == null && !i.done.includes('check') ? [CHECK_STEP] : []
  const night = evening && !i.data.routines.night && !i.done.includes('night') ? [NIGHT_STEP] : []
  const need = needFor(i.data)
  const needStep = need && !i.done.includes('need') ? [NEED_STEPS[need]] : []

  return [...pregame, ...check, ...needStep, ...rings, ...night, ...bonus]
}

// The line the character says next to a step card.
export function stepLineKey(step: GuideStep, need: Need | null): LineKey {
  switch (step.id) {
    case 'pregame': return 'step.pregame'
    case 'focus': return 'step.bonus'
    case 'check': return 'evening.check'
    case 'night': return 'night.start'
    case 'need': return `need.${need ?? 'focus'}`
    case 'body': return 'step.body'
    case 'fuel': return 'step.fuel'
    case 'rest': return 'step.rest'
    default: return 'step.mind'
  }
}

// streak is null until it has loaded. A streak of 0 on the first open of the
// day means yesterday was missed, so the guide welcomes them back without
// mentioning it.
export function greetKey(i: { hour: number; streak: number | null; gameToday: boolean }): LineKey {
  if (i.gameToday) return 'greet.gameday'
  if (i.streak != null && i.streak >= 3) return 'greet.streak'
  if (i.streak === 0) return 'greet.back'
  return `greet.${slotFor(i.hour)}`
}

export function sleepKey(hours: number, touched: boolean): LineKey {
  if (!touched) return 'sleep.ask'
  return hours < 6.5 ? 'sleep.short' : hours >= 8 ? 'sleep.good' : 'sleep.ask'
}

export function revealKey(score: number): LineKey {
  return score >= 75 ? 'reveal.high' : score >= 50 ? 'reveal.mid' : 'reveal.low'
}

// Day of the year, so a line with two versions changes from day to day
// without changing between renders.
export function daySeed(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86_400_000)
}
