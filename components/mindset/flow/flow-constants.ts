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
    prompt: 'Box breathing: 4 in · 4 hold · 4 out · 4 hold.',
    subPrompt: 'Follow the square. Four full cycles.',
  },
  {
    code: 'A4',
    title: 'ATTACH',
    label: 'A4 · Attach',
    durationSec: 30,
    prompt: 'Lock your cue word to your physical trigger.',
    subPrompt: 'Pick your cue word and the move that tells your body it is go time.',
  },
  {
    code: 'A5',
    title: 'AUTO-PILOT',
    label: 'A5 · Auto-Pilot',
    durationSec: 30,
    prompt: 'Release the tension. Trust the reps.',
    subPrompt: 'Say it out loud or in a whisper: let it come.',
  },
]

export const TOTAL_SESSION_SEC = FIVE_A_STEPS.reduce((acc, s) => acc + s.durationSec, 0)

// hex values are var() references so light mode can deepen them (globals.css)
// fg: text color that stays readable on the stage color in both themes.
export const STAGE_META: Record<FlowStage, { label: string; hex: string; tw: string; emoji: string; fg: string }> = {
  struggle: { label: 'Struggle', hex: 'var(--flow-struggle)', tw: 'bg-[var(--flow-struggle)]', emoji: '🔥', fg: 'text-white' },
  release:  { label: 'Release',  hex: 'var(--flow-release)',  tw: 'bg-[var(--flow-release)]',  emoji: '🌊', fg: 'text-white' },
  flow:     { label: 'Flow',     hex: 'var(--flow-flow)',     tw: 'bg-cta',                    emoji: '🌟', fg: 'text-fg-inverse' },
  recovery: { label: 'Recovery', hex: 'var(--flow-recovery)', tw: 'bg-[var(--flow-recovery)]', emoji: '🌱', fg: 'text-white' },
}

export const FLOW_STAGES: FlowStage[] = ['struggle', 'release', 'flow', 'recovery']

export const TRIGGERS: { code: FlowTrigger; label: string; hint?: string }[] = [
  { code: 'clear_goals',              label: 'Clear goals' },
  { code: 'immediate_feedback',       label: 'Immediate feedback' },
  { code: 'challenge_skill_balance',  label: 'Challenge–skill balance' },
  { code: 'deep_focus',               label: 'Deep focus / no distractions' },
  { code: 'risk_consequence',         label: 'Risk / consequence' },
  { code: 'novelty_complexity',       label: 'Novelty / complexity' },
  { code: 'deep_embodiment',          label: 'Deep embodiment', hint: 'Did you feel it in your body?' },
]

export const TRIGGER_LABEL: Record<FlowTrigger, string> = Object.fromEntries(
  TRIGGERS.map(t => [t.code, t.label]),
) as Record<FlowTrigger, string>

/**
 * The 4-stage flow cycle: Struggle → Release → Flow → Recovery → Struggle (loop).
 * After Flow, athletes always transition to Recovery — never skip it.
 */
export const STAGE_CYCLE: FlowStage[] = ['struggle', 'release', 'flow', 'recovery']

export function nextStage(current: FlowStage): FlowStage {
  const idx = STAGE_CYCLE.indexOf(current)
  return STAGE_CYCLE[(idx + 1) % STAGE_CYCLE.length]
}
