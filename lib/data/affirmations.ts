// Starter affirmations, grouped by the MPI dimension each one trains.
// Identity first: who I am, then what I do. Athletes tap one to add it and
// can rewrite it in their own words.
import type { MpiKey } from '@/lib/mpi'

export const DEFAULT_AFFIRMATIONS: { dimension: MpiKey; label: string; lines: string[] }[] = [
  { dimension: 'self_identity_clarity', label: 'Identity', lines: [
    'I know who I am before the game starts.',
    'I act from my identity, not my mood.',
  ] },
  { dimension: 'confidence', label: 'Confidence', lines: [
    'I have earned my confidence in practice.',
    'I trust my training when it counts.',
  ] },
  { dimension: 'focus_quality', label: 'Focus', lines: [
    'I am where my feet are.',
    'I win the next play.',
  ] },
  { dimension: 'anxiety_management', label: 'Pressure', lines: [
    'Nerves mean I am ready.',
    'I breathe, I reset, I compete.',
  ] },
  { dimension: 'resilience', label: 'Resilience', lines: [
    'I respond. I do not react.',
    'Mistakes are information. I use them.',
  ] },
  { dimension: 'motivation', label: 'Motivation', lines: [
    'I am someone who shows up.',
    'I do the work when nobody is watching.',
  ] },
  { dimension: 'mental_imagery', label: 'Imagery', lines: [
    'I have already seen myself do this.',
    'I see it, I feel it, then I do it.',
  ] },
  { dimension: 'routine_consistency', label: 'Routine', lines: [
    'My routine makes me ready anywhere.',
    'I prepare the same way every time.',
  ] },
  { dimension: 'team_relationships', label: 'Team', lines: [
    'I make the people around me better.',
    'I am the teammate I would want.',
  ] },
  { dimension: 'vision_clarity', label: 'Vision', lines: [
    'I know what I am building.',
    'Today is one rep toward who I am becoming.',
  ] },
]
