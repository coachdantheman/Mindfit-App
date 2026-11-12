'use client'
import { SortableList, SortableRow } from './Sortable'
import { countdownLabel, MAX_STEPS, STEP_INFO, type PregameStep, type StepKind } from '@/lib/pregame'

const KIND_CHOICES = (Object.keys(STEP_INFO) as StepKind[]).filter(k => k !== 'triggers')
const clamp = (n: number) => Math.max(0, Math.min(480, n))
const round5 = (n: number) => Math.round(n / 5) * 5

interface Props {
  steps: PregameStep[]
  onChange: (next: PregameStep[]) => void
}

// Step list for a routine, without the triggers step (always last, added by the server).
// Used by the athlete's routine editor and the coach's team routine.
export default function PregameStepEditor({ steps, onChange }: Props) {
  const ids = steps.map(s => s.id)

  // Visual order is earliest-first (largest minutes_before at the top). A dragged step
  // takes a time between its new neighbours so the saved order matches the screen.
  const reorder = (next: PregameStep[], _from: number, to: number) => {
    const above = next[to - 1]?.minutes_before
    const below = next[to + 1]?.minutes_before
    const mins = above != null && below != null ? round5((above + below) / 2)
      : above != null ? round5(above - 60)
      : below != null ? round5(below + 60)
      : next[to].minutes_before
    onChange(next.map((s, i) => (i === to ? { ...s, minutes_before: clamp(mins) } : s)))
  }

  const update = (i: number, patch: Partial<PregameStep>) =>
    onChange(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  const add = (kind: StepKind) => {
    const step: PregameStep = {
      id: crypto.randomUUID(),
      kind,
      title: kind === 'custom' ? '' : STEP_INFO[kind].label,
      minutes_before: 30,
    }
    onChange([...steps, step].sort((a, b) => b.minutes_before - a.minutes_before))
  }

  const full = steps.length >= MAX_STEPS - 1

  return (
    <div className="space-y-3">
      <SortableList items={steps} ids={ids} onReorder={reorder}>
        <div className="space-y-2">
          {steps.map((s, i) => (
            <SortableRow key={s.id} id={s.id} className="bg-surface-2/50 rounded-xl p-2.5 space-y-2">
              {handle => (<>
                <div className="flex items-center gap-2">
                  {handle}
                  <input
                    value={s.title}
                    maxLength={60}
                    onChange={e => update(i, { title: e.target.value })}
                    placeholder={STEP_INFO[s.kind].label}
                    aria-label="Step name"
                    className="flex-1 min-w-0 bg-transparent text-sm text-fg-1 font-medium placeholder:text-fg-4"
                  />
                  <button type="button" onClick={() => onChange(steps.filter((_, j) => j !== i))} aria-label="Remove step" className="btn-ghost px-2">✕</button>
                </div>
                <div className="flex items-center gap-2 pl-9">
                  <button type="button" onClick={() => update(i, { minutes_before: clamp(s.minutes_before - 5) })} disabled={s.minutes_before <= 0}
                    aria-label="Earlier" className="w-9 h-9 rounded-lg border border-edge text-fg-2 text-base disabled:opacity-40">−</button>
                  <span className="min-w-[7.5rem] text-center text-xs text-fg-2 tabular-nums">{countdownLabel(s.minutes_before)}</span>
                  <button type="button" onClick={() => update(i, { minutes_before: clamp(s.minutes_before + 5) })} disabled={s.minutes_before >= 480}
                    aria-label="Later" className="w-9 h-9 rounded-lg border border-edge text-fg-2 text-base disabled:opacity-40">+</button>
                </div>
              </>)}
            </SortableRow>
          ))}
        </div>
      </SortableList>

      <div className="flex items-center justify-between gap-2 rounded-xl border border-edge-muted px-3 py-2.5">
        <span className="text-sm text-fg-3">{STEP_INFO.triggers.label}</span>
        <span className="text-xs text-fg-4">Always last · {countdownLabel(0)}</span>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-fg-4">Add a step</p>
        <div className="flex flex-wrap gap-1.5">
          {KIND_CHOICES.map(k => (
            <button key={k} type="button" onClick={() => add(k)} disabled={full}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-edge text-fg-3 hover:text-fg-2 disabled:opacity-40">
              + {STEP_INFO[k].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
