import type { FiveAStep } from '@/types'

// Tap-to-use examples for the 5-A Flow Stack. Athletes can still write their own.
export const IDENTITY_EXAMPLES = [
  'I am a competitor who wants the ball.',
  'I am calm under pressure.',
  'I am prepared. I have done the work.',
  'I am relentless from the first whistle to the last.',
  'I am the teammate everyone can count on.',
  'I am fearless in big moments.',
  'I am built for this.',
  'I am confident in my training.',
  'I am locked in and present.',
  'I am a leader on and off the field.',
]

export const CUE_WORD_EXAMPLES = [
  'Lock in', 'Smooth', 'Attack', 'Next play', 'Breathe', 'Trust it',
  'Explode', 'Calm', 'Compete', 'Here', 'Free', 'Let it fly',
]

export const PHYSICAL_TRIGGER_EXAMPLES = [
  'Pound my chest',
  'Touch my nose',
  'Pull on my jersey',
  'Clap twice',
  'Tap my helmet or hat',
  'Slap my thigh',
  'Adjust my wristband',
  'Deep breath through the nose',
]

// Breath pace for the gold ring on each step (A3 uses the box instead).
export const BREATH_PATTERN: Partial<Record<FiveAStep, { inSec: number; outSec: number }>> = {
  A1: { inSec: 4, outSec: 6 },
  A2: { inSec: 4, outSec: 6 },
  A4: { inSec: 4, outSec: 4 },
  A5: { inSec: 3, outSec: 5 },
}
