import type { PillarKey } from '@/lib/guide'
import type { Need } from '@/lib/quiz'

// The guide characters an athlete can choose. Each has a voice (which lines
// it speaks, lib/data/guide-lines.ts) and the rings it puts first in the day.
export type GuideKey = 'sparrow' | 'dog' | 'fish'
export type Voice = 'sky' | 'pack' | 'deep'

export interface GuideCharacter {
  key: GuideKey
  name: string
  voice: Voice
  focus: PillarKey[]
  tagline: string
}

export const STARTERS: GuideCharacter[] = [
  { key: 'sparrow', name: 'Scout', voice: 'sky', focus: ['mind'], tagline: 'Sharp and calm. Keeps your eyes on the one thing that matters.' },
  { key: 'dog', name: 'Ace', voice: 'pack', focus: ['body'], tagline: 'Loyal and all in. Shows up with you for every rep.' },
  { key: 'fish', name: 'Finn', voice: 'deep', focus: ['rest', 'fuel'], tagline: 'Curious and steady. Knows recovery is where you get better.' },
]

export function isGuideKey(v: unknown): v is GuideKey {
  return typeof v === 'string' && STARTERS.some(s => s.key === v)
}

// Athletes who have not chosen yet get the first starter.
export function guideFor(key: unknown): GuideCharacter {
  return STARTERS.find(s => s.key === key) ?? STARTERS[0]
}

const NEED_GUIDE: Record<Need, GuideKey> = {
  confidence: 'sparrow',
  focus: 'sparrow',
  pressure: 'fish',
  recovery: 'fish',
  motivation: 'dog',
}

// The starter that trains the athlete's biggest need (quiz result or lowest MPI score).
export function recommendedGuide(need: Need | null | undefined): GuideKey | null {
  return need ? NEED_GUIDE[need] : null
}
