'use client'
import { format } from 'date-fns'
import { DAY_NAMES, parseLocalDate, type DayTemplate, type PlanBlockInput } from '@/lib/programs'
import type { PlanSetup } from './PlanSetupForm'

interface Props {
  setup: PlanSetup
  blocks: PlanBlockInput[]
  templates: DayTemplate[][]
  isEdit: boolean
  saving: boolean
  error?: string
  onSave: () => void
}

export default function PlanReview({ setup, blocks, templates, isEdit, saving, error, onSave }: Props) {
  const start = setup.startDate ? parseLocalDate(setup.startDate) : null
  const end = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + setup.durationWeeks * 7 - 1) : null
  const trainingDays = new Set(templates.flat().filter(d => d.exercises.length > 0).map(d => d.day_of_week)).size

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h3 className="font-bold text-fg-1">{setup.title || 'My plan'}</h3>
        {setup.description && <p className="text-xs text-fg-4 mt-1">{setup.description}</p>}
        <div className="flex flex-wrap gap-2 mt-3">
          {setup.sport && <span className="text-[11px] bg-cta/20 text-cta px-2 py-0.5 rounded-full">{setup.sport}</span>}
          <span className="text-[11px] bg-surface-2 text-fg-3 px-2 py-0.5 rounded-full">{setup.durationWeeks} weeks</span>
          <span className="text-[11px] bg-surface-2 text-fg-3 px-2 py-0.5 rounded-full">{trainingDays} days / week</span>
          {start && end && (
            <span className="text-[11px] bg-surface-2 text-fg-3 px-2 py-0.5 rounded-full">
              {format(start, 'MMM d')} – {format(end, 'MMM d, yyyy')}
            </span>
          )}
        </div>
      </div>

      {blocks.map((b, i) => (
        <div key={i} className="card p-4 space-y-2">
          <div>
            <p className="font-semibold text-fg-1">{b.name}</p>
            <p className="text-xs text-fg-4">Weeks {b.week_start}–{b.week_end}{b.focus ? ` · ${b.focus}` : ''}</p>
          </div>
          {(templates[i] ?? []).filter(d => d.exercises.length > 0).length === 0 ? (
            <p className="text-xs text-amber-400">No training days in this block yet.</p>
          ) : (
            <div className="space-y-1">
              {(templates[i] ?? []).filter(d => d.exercises.length > 0).map(d => (
                <div key={d.day_of_week} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-2/50">
                  <p className="text-sm text-fg-2 truncate"><span className="text-fg-4">{DAY_NAMES[d.day_of_week]}</span> · {d.name || 'Workout'}</p>
                  <p className="text-xs text-fg-4 shrink-0">{d.exercises.length} exercises</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {isEdit && (
        <p className="text-[11px] text-fg-4">
          Saving replaces the schedule. Workouts you already logged keep their name and date in history but are no longer linked to a plan day.
        </p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button type="button" onClick={onSave} disabled={saving} className="btn-primary w-full py-3">
        {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save plan'}
      </button>
    </div>
  )
}
