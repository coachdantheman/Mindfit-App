import { FiveAStep, FlowStage, FlowTrigger } from '@/types'

export interface StepConfig {
  code: FiveAStep
  title: string
  label: string
  durationSec: number
  prompt: string
  subPrompt?: string
}

// Order is LOAD-BEARING. Never rename or reorder.
export const FIVE_A_STEPS: StepConfig[] = [
  {
    code: 'A1',
    title: 'ANCHOR',
    label: 'A1 · Anchor',
    durationSec: 60,
    prompt: 'State your identity statement.',
    subPrompt: '“I am ____.” Breathe in slow, breathe out slower.',
  },
  {
    code: 'A2',
    title: 'AIM',
    label: 'A2 · Aim',
    durationSec: 90,
    prompt: 'One specific goal for this session.',
    subPrompt: 'Visualize it complete. See it. Feel it. Hear it.',
  },
  {
    code: 'A3',
    title: 'ACTIVATE',
    label: 'A3 · Activate',
    durationSec: 60,
    prompt: 'Box breathing — 4 in · 4 hold · 4 out · 4 hold.',
    subPrompt: 'Follow the square. Four full cycles.',
  },
  {
    code: 'A4',
    title: 'ATTACH',
    label: 'A4 · Attach',
    durationSec: 30,
    prompt: 'Lock your cue word to your external target.',
    subPrompt: 'Pick your cue. Choose what your eyes will lock to.',
  },
  {
    code: 'A5',
    title: 'AUTO-PILOT',
    label: 'A5 · Auto-Pilot',
    durationSec: 30,
    prompt: 'Run your routine.',
    subPrompt: 'Let it come.',
  },
]

export const TOTAL_SESSION_SEC = FIVE_A_STEPS.reduce((acc, s) => acc + s.durationSec, 0)

export const STAGE_META: Record<FlowStage, { label: string; hex: string; tw: string; emoji: string }> = {
  struggle: { label: 'Struggle', hex: '#CB3A3A', tw: 'bg-[#CB3A3A]', emoji: '🔥' },
  release:  { label: 'Release',  hex: '#6A4C93', tw: 'bg-[#6A4C93]', emoji: '🌊' },
  flow:     { label: 'Flow',     hex: '#C4B400', tw: 'bg-cta',       emoji: '🌟' },
  recovery: { label: 'Recovery', hex: '#3A8A6B', tw: 'bg-[#3A8A6B]', emoji: '🌱' },
}

export const FLOW_STAGES: FlowStage[] = ['struggle', 'release', 'flow', 'recovery']

export const TRIGGERS: { code: FlowTrigger; label: string }[] = [
  { code: 'clear_goals',              label: 'Clear goals' },
  { code: 'immediate_feedback',       label: 'Immediate feedback' },
  { code: 'challenge_skill_balance',  label: 'Challenge–skill balance' },
  { code: 'deep_focus',               label: 'Deep focus / no distractions' },
  { code: 'risk_consequence',         label: 'Risk / consequence' },
  { code: 'novelty_complexity',       label: 'Novelty / complexity' },
  { code: 'music_rhythm',             label: 'Music / rhythm' },
]

export const TRIGGER_LABEL: Record<FlowTrigger, string> = Object.fromEntries(
  TRIGGERS.map(t => [t.code, t.label]),
) as Record<FlowTrigger, string>
