import type { PillarKey } from '@/lib/guide'
import type { Need } from '@/lib/quiz'

// The guide characters an athlete can choose. Each has a voice (which lines
// it speaks, lib/data/guide-lines.ts) and the rings it puts first in the day.
export type StarterKey = 'sparrow' | 'dog' | 'fish'
export type UnlockKey = 'fox' | 'lion' | 'phoenix' | 'owl' | 'bull' | 'raccoon' | 'sloth' | 'tiger' | 'stag' | 'ram' | 'chameleon' | 'beaver' | 'dragon'
export type GuideKey = StarterKey | UnlockKey
export type Voice = 'sky' | 'pack' | 'deep' | 'dragon'

export interface GuideCharacter {
  key: GuideKey
  name: string
  voice: Voice
  focus: PillarKey[]
  tagline: string
  // What the character is at each stage.
  forms: [string, string, string]
  // How an unlockable character is earned, in the athlete's words.
  earn?: string
}

export const STARTERS: GuideCharacter[] = [
  { key: 'sparrow', name: 'Scout', voice: 'sky', focus: ['mind'], tagline: 'Sharp and calm. Keeps your eyes on the one thing that matters.', forms: ['Sparrow', 'Falcon', 'Eagle'] },
  { key: 'dog', name: 'Ace', voice: 'pack', focus: ['body'], tagline: 'Loyal and all in. Shows up with you for every rep.', forms: ['Pup', 'Wolf', 'Bear'] },
  { key: 'fish', name: 'Finn', voice: 'deep', focus: ['rest', 'fuel'], tagline: 'Curious and steady. Knows recovery is where you get better.', forms: ['Fish', 'Dolphin', 'Shark'] },
]

const one = (name: string): [string, string, string] => [name, name, name]

// Earned characters. Each borrows one of the three voices and has a single form.
export const UNLOCKS: GuideCharacter[] = [
  { key: 'fox', name: 'Fox', voice: 'sky', focus: ['mind'], tagline: 'Quick and clever. Reads the play before it happens.', forms: one('Fox'), earn: 'Reach Captain League' },
  { key: 'lion', name: 'Lion', voice: 'pack', focus: ['body'], tagline: 'Leads from the front and brings the team along.', forms: one('Lion'), earn: 'Reach All-American League' },
  { key: 'phoenix', name: 'Phoenix', voice: 'deep', focus: ['mind', 'rest'], tagline: 'Comes back stronger every time.', forms: one('Phoenix'), earn: 'Reach Legend League' },
  { key: 'owl', name: 'Owl', voice: 'deep', focus: ['mind'], tagline: 'Still, patient, and always paying attention.', forms: one('Owl'), earn: 'Earn the Monk title for a month' },
  { key: 'bull', name: 'Bull', voice: 'pack', focus: ['body'], tagline: 'Lives in the weight room and loves the work.', forms: one('Bull'), earn: 'Earn the Gym Rat title for a month' },
  { key: 'raccoon', name: 'Raccoon', voice: 'deep', focus: ['fuel'], tagline: 'Never misses a meal and knows what is in it.', forms: one('Raccoon'), earn: 'Earn the Chef title for a month' },
  { key: 'sloth', name: 'Sloth', voice: 'deep', focus: ['rest'], tagline: 'Takes recovery as seriously as training.', forms: one('Sloth'), earn: 'Earn the Recharger title for a month' },
  { key: 'tiger', name: 'Tiger', voice: 'sky', focus: ['mind', 'body'], tagline: 'Calm, cunning, and at its best on game day.', forms: one('Tiger'), earn: 'Close all four rings on 10 days' },
  { key: 'stag', name: 'Stag', voice: 'sky', focus: ['mind'], tagline: 'Carries itself like it already belongs.', forms: one('Stag'), earn: 'Reach Legend level in a month' },
  { key: 'ram', name: 'Ram', voice: 'pack', focus: ['body'], tagline: 'Puts its head down and moves the bar.', forms: one('Ram'), earn: 'Move up a strength tier' },
  { key: 'chameleon', name: 'Chameleon', voice: 'deep', focus: ['mind'], tagline: 'Proof that you can change.', forms: one('Chameleon'), earn: 'Raise your MPI 10 points from your baseline' },
  { key: 'beaver', name: 'Beaver', voice: 'pack', focus: ['mind'], tagline: 'Builds a little every single day.', forms: one('Beaver'), earn: 'Write 30 journal entries' },
  // Awarded by the monthly job, never by the rules in lib/guide-unlocks.ts.
  { key: 'dragon', name: 'Dragon', voice: 'dragon', focus: [], tagline: 'Old, calm, and only here for the one who finished a month on top.', forms: one('Dragon'), earn: 'Finish a month as the #1 athlete on The Board' },
]

export const ALL_GUIDES: GuideCharacter[] = [...STARTERS, ...UNLOCKS]

export function isGuideKey(v: unknown): v is GuideKey {
  return typeof v === 'string' && ALL_GUIDES.some(s => s.key === v)
}

export function isStarter(v: unknown): v is StarterKey {
  return typeof v === 'string' && STARTERS.some(s => s.key === v)
}

// Athletes who have not chosen yet get the first starter.
export function guideFor(key: unknown): GuideCharacter {
  return ALL_GUIDES.find(s => s.key === key) ?? STARTERS[0]
}

const NEED_GUIDE: Record<Need, StarterKey> = {
  confidence: 'sparrow',
  focus: 'sparrow',
  pressure: 'fish',
  recovery: 'fish',
  motivation: 'dog',
}

// The starter that trains the athlete's biggest need (quiz result or lowest MPI score).
export function recommendedGuide(need: Need | null | undefined): StarterKey | null {
  return need ? NEED_GUIDE[need] : null
}

// A guide grows when the athlete's best streak first reaches these lengths,
// and never shrinks back.
export const EVOLVE_AT = [7, 30] as const
export type Stage = 1 | 2 | 3

// What shows for an athlete on The Board and in leagues.
export interface GuideIcon { species: GuideKey; stage: Stage }

export function stageFor(bestStreak: number | null | undefined): Stage {
  const best = bestStreak ?? 0
  return best >= EVOLVE_AT[1] ? 3 : best >= EVOLVE_AT[0] ? 2 : 1
}

// The form a starter shows: the athlete's pick among the forms they have
// reached, else the newest one. A pick never shows a form not yet reached.
export function shownStage(bestStreak: number | null | undefined, picked: unknown): Stage {
  const reached = stageFor(bestStreak)
  return picked === 1 || picked === 2 || picked === 3 ? (Math.min(picked, reached) as Stage) : reached
}

// What a locked character asks for. The two starters an athlete did not pick
// come at the first Clutch Day and a 14-day best streak, in list order.
export function earnText(key: GuideKey, myStarter: StarterKey | undefined): string {
  const c = guideFor(key)
  if (c.earn) return c.earn
  const others = STARTERS.map(s => s.key).filter(k => k !== myStarter)
  return key === others[0] ? 'Close all four rings in one day' : 'Reach a 14-day best streak'
}
