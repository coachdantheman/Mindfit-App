// Pregame routines: steps on a countdown to game time. Pure helpers,
// unit-tested. The default routine and its research notes live here.

export type StepKind = 'meal' | 'snack' | 'music' | 'warmup' | 'visualization' | 'flow_stack' | 'breath' | 'triggers' | 'custom'

export interface PregameStep {
  id: string
  kind: StepKind
  title: string
  minutes_before: number   // 0 = right at game time
}

export interface PregameTriggers {
  cue_word: string | null
  external_trigger: string | null
  physical_trigger: string | null
}

// What each kind of step does, where it opens in the app, and why it is
// in the routine. `source` is the study or position stand behind `why`.
export const STEP_INFO: Record<StepKind, { label: string; how: string; href?: string; why?: string; source?: string }> = {
  meal: {
    label: 'Pregame meal',
    how: 'A carb-based meal with some protein, 3 to 4 hours out. Familiar foods only.',
    href: '/nutrition?tab=gameday',
    why: 'Carbohydrate eaten 1 to 4 hours before competing tops up the fuel your muscles and brain run on.',
    source: 'Thomas, Erdman & Burke, 2016. ACSM, Academy of Nutrition and Dietetics, and Dietitians of Canada joint position.',
  },
  snack: {
    label: 'Top-up snack and water',
    how: 'A small, easy carb snack and water about an hour out.',
    href: '/nutrition?tab=gameday',
    why: 'Starting hydrated and topped up helps you hold your pace and decisions late in the game.',
    source: 'Thomas, Erdman & Burke, 2016. Joint position on nutrition and athletic performance.',
  },
  music: {
    label: 'Music',
    how: 'Play the list that puts you at the right energy: hype to raise it, focus to settle it.',
    href: '/mindset?tab=Music',
    why: 'Music before and during effort improves mood and makes hard work feel easier.',
    source: 'Terry, Karageorghis et al., 2020. Psychological Bulletin meta-analysis.',
  },
  warmup: {
    label: 'Physical warm-up',
    how: 'Your team or personal warm-up. Build from easy movement to game speed.',
    why: 'A proper warm-up improved performance in about 4 of every 5 measures studied.',
    source: 'Fradkin, Zazryn & Smoliga, 2010. Journal of Strength and Conditioning Research meta-analysis.',
  },
  visualization: {
    label: 'Visualization',
    how: 'Three to five minutes. See, feel and hear yourself doing your job well.',
    href: '/mindset?tab=Visualization',
    why: 'Mental imagery improves motor performance, and works best alongside physical practice.',
    source: 'Simonsmeier et al., 2021. International Review of Sport and Exercise Psychology meta-analysis.',
  },
  flow_stack: {
    label: 'Flow Stack',
    how: 'Run your five steps: Anchor, Aim, Activate, Attach, Auto-Pilot.',
    href: '/mindset/flow-state/session',
    why: 'Athletes who use a consistent pre-performance routine perform better, in practice and under pressure.',
    source: 'Rupprecht, Tran & Gröpel, 2021. International Review of Sport and Exercise Psychology meta-analysis.',
  },
  breath: {
    label: 'Breathing reset',
    how: 'Five slow breaths. In through the nose for 4, out for 6.',
    why: 'Slow, paced breathing raises heart rate variability, a sign your body\'s calming system is switched on.',
    source: 'Laborde et al., 2022. Neuroscience & Biobehavioral Reviews meta-analysis.',
  },
  triggers: {
    label: 'My three triggers',
    how: 'External trigger, physical trigger, cue word. Then go play.',
    why: 'Short cue words improve performance, most of all on precise skills.',
    source: 'Hatzigeorgiadis et al., 2011. Perspectives on Psychological Science meta-analysis.',
  },
  custom: { label: 'My own step', how: '' },
}

const step = (kind: StepKind, minutes_before: number): PregameStep => ({ id: kind, kind, title: STEP_INFO[kind].label, minutes_before })

export const DEFAULT_ROUTINE_NAME = 'MindFit routine'
export const DEFAULT_STEPS: PregameStep[] = [
  step('meal', 210), step('snack', 60), step('music', 60), step('warmup', 45),
  step('visualization', 30), step('flow_stack', 10), step('breath', 5), step('triggers', 0),
]

export const CUE_WORD_EXAMPLES = ['Smooth', 'Attack', 'Next play', 'Locked in', 'Calm', 'Explode']
export const EXTERNAL_TRIGGER_EXAMPLES = ['Lacing my left shoe first', 'Stepping over the line', 'The anthem', 'Putting in my mouthguard', 'Touching the goalpost', 'The first whistle']
export const PHYSICAL_TRIGGER_EXAMPLES = ['One long exhale', 'Clap twice', 'Tap my chest', 'Snap my wrist tape', 'Bounce on my toes', 'Shake out my hands']

const KINDS = Object.keys(STEP_INFO) as StepKind[]
export const MAX_STEPS = 15

// Accepts loose input from a form; drops unusable rows. Always ends with
// the triggers step, since every routine finishes on the three triggers.
export function cleanSteps(raw: unknown): PregameStep[] {
  const rows = Array.isArray(raw) ? raw : []
  const seen = new Set<string>(['triggers'])
  const out: PregameStep[] = []
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue
    const kind = KINDS.find(k => k === (r as any).kind)
    if (!kind || kind === 'triggers') continue
    const title = (typeof (r as any).title === 'string' ? (r as any).title.trim().slice(0, 60) : '') || STEP_INFO[kind].label
    const mins = Number((r as any).minutes_before)
    let id = typeof (r as any).id === 'string' && (r as any).id ? (r as any).id.slice(0, 40) : kind
    while (seen.has(id)) id = `${id}-${out.length}`
    seen.add(id)
    out.push({ id, kind, title, minutes_before: Number.isFinite(mins) ? Math.max(0, Math.min(480, Math.round(mins))) : 0 })
    if (out.length === MAX_STEPS - 1) break
  }
  out.sort((a, b) => b.minutes_before - a.minutes_before)
  out.push(step('triggers', 0))
  return out
}

export function cleanTrigger(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  return v.trim().slice(0, max) || null
}

export function triggersSet(t: PregameTriggers | null | undefined): boolean {
  return !!(t?.cue_word && t.external_trigger && t.physical_trigger)
}

// "6:15 PM" for a step, given the game's HH:MM start. Null with no start
// time or when the step would fall on the previous day.
export function stepClock(gameTime: string | null | undefined, minutesBefore: number): string | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(gameTime ?? '')
  if (!m) return null
  const at = Number(m[1]) * 60 + Number(m[2]) - minutesBefore
  if (at < 0) return null
  const h = Math.floor(at / 60)
  return `${h % 12 === 0 ? 12 : h % 12}:${String(at % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

export function countdownLabel(minutesBefore: number): string {
  if (minutesBefore <= 0) return 'Game time'
  if (minutesBefore < 60) return `${minutesBefore} min before`
  const h = minutesBefore / 60
  return `${Number.isInteger(h) ? h : h.toFixed(1)} hr before`
}

// Done ids that are not in the routine any more are ignored.
export function runProgress(steps: PregameStep[], done: string[]): { done: number; total: number; pct: number; complete: boolean } {
  const ids = new Set(steps.map(s => s.id))
  const n = new Set(done.filter(d => ids.has(d))).size
  const total = steps.length
  return { done: n, total, pct: total ? Math.round((n / total) * 100) : 0, complete: total > 0 && n === total }
}

// Which routine an athlete runs: their own default, else their newest own
// routine, else the team's, else the built-in one.
export function activeRoutine<T extends { is_default: boolean }>(own: T[], team: T | null): T | null {
  return own.find(r => r.is_default) ?? own[0] ?? team ?? null
}
