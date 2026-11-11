'use client'
import { format } from 'date-fns'
import { DAY_NAMES, parseLocalDate, type DayTemplate, type PlanBlockInput } from '@/lib/programs'
import { weekdayNote, type WeekdayLoad } from '@/lib/schedule'
import type { PlanSetup } from './PlanSetupForm'
import SaveButton from '@/components/shared/SaveButton'
import { SortableList, SortableRow } from './Sortable'

interface Props {
  setup: PlanSetup
  blocks: PlanBlockInput[]
  templates: DayTemplate[][]
  isEdit: boolean
  saving: boolean
  error?: string
  onSave: () => void
  load?: WeekdayLoad[]
  onMoveDay: (blockIndex: number, fromDay: number, toDay: number) => void
}

const WEEK = [1, 2, 3, 4, 5, 6, 7]

export default function PlanReview({ setup, blocks, templates, isEdit, saving, error, onSave, load, onMoveDay }: Props) {
  const start = setup.startDate ? parseLocalDate(setup.startDate) : null
  const end = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + setup.durationWeeks * 7 - 1) : null
  const trainingDays = new Set(templates.flat().filter(d => d.exercises.length > 0).map(d => d.day_of_week)).size

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h3 className="font-bold text-fg-1">{setup.title || 'My plan'}</h3>
        {setup.description && <p className="text-xs text-fg-4 mt-1">{setup.description}</p>}
        <div className="flex flex-wrap gap-2 mt-3">
          {setup.sport && <span className="text-xs bg-cta/20 text-cta px-2 py-0.5 rounded-full">{setup.sport}</span>}
          <span className="text-xs bg-surface-2 text-fg-3 px-2 py-0.5 rounded-full">{setup.durationWeeks} weeks</span>
          <span className="text-xs bg-surface-2 text-fg-3 px-2 py-0.5 rounded-full">{trainingDays} days / week</span>
          {start && end && (
            <span className="text-xs bg-surface-2 text-fg-3 px-2 py-0.5 rounded-full">
              {format(start, 'MMM d')} – {format(end, 'MMM d, yyyy')}
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-fg-4">Drag a day to move it.</p>

      {blocks.map((b, i) => {
        const days = templates[i] ?? []
        return (
          <div key={i} className="card p-4 space-y-2">
            <div>
              <p className="font-semibold text-fg-1">{b.name}</p>
              <p className="text-xs text-fg-4">Weeks {b.week_start}–{b.week_end}{b.focus ? ` · ${b.focus}` : ''}</p>
            </div>
            {days.filter(d => d.exercises.length > 0).length === 0 && (
              <p className="text-xs text-amber-400">No training days in this block yet.</p>
            )}
            <SortableList items={WEEK} ids={WEEK.map(d => `${i}-${d}`)} onReorder={(_, from, to) => onMoveDay(i, from + 1, to + 1)}>
              <div className="space-y-1">
                {WEEK.map(day => {
                  const d = days.find(x => x.day_of_week === day && x.exercises.length > 0)
                  const note = load ? weekdayNote(load, day) : null
                  return (
                    <SortableRow key={day} id={`${i}-${day}`} className="flex items-center gap-2 py-1 pr-2.5 rounded-lg bg-surface-2/50">
                      {handle => (<>
                        {handle}
                        <span className="w-9 shrink-0 text-xs text-fg-4">{DAY_NAMES[day]}</span>
                        {d ? (
                          <p className="flex-1 min-w-0 text-sm text-fg-2 truncate">{d.name || 'Workout'}</p>
                        ) : (
                          <p className="flex-1 min-w-0 text-sm text-fg-4">Rest</p>
                        )}
                        {d && note === 'game' ? (
                          <span className="shrink-0 text-[10px] text-amber-400">Game day</span>
                        ) : note ? (
                          <span className="shrink-0 text-[10px] text-fg-4">{note === 'game' ? 'Game' : note === 'pre_game' ? 'Pre-game' : 'Practice'}</span>
                        ) : null}
                        {d && <span className="shrink-0 text-xs text-fg-4">{d.exercises.length} exercises</span>}
                      </>)}
                    </SortableRow>
                  )
                })}
              </div>
            </SortableList>
          </div>
        )
      })}

      {isEdit && (
        <p className="text-xs text-fg-4">
          Saving replaces the schedule. Workouts you already logged keep their name and date in history but are no longer linked to a plan day.
        </p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <SaveButton
        type="button"
        onClick={onSave}
        state={saving ? 'saving' : error ? 'error' : 'idle'}
        idleLabel={isEdit ? 'Save changes' : 'Save plan'}
      />
    </div>
  )
}
