'use client'
import { useState } from 'react'
import { ProgramWorkout, WorkoutExercise } from '@/types'
import type { TrainingProgramRow } from '@/types/exercise'
import { DAY_NAMES } from '@/lib/programs'

interface Props {
  program: TrainingProgramRow
  currentWeek?: number
  onStartWorkout?: (workout: ProgramWorkout) => void
}

// Every block and week of a plan. The block holding `currentWeek` opens
// by default and that week is highlighted; other weeks collapse.
export default function ProgramView({ program, currentWeek, onStartWorkout }: Props) {
  const initialBlock = program.blocks?.find(b => currentWeek != null && currentWeek >= b.week_start && currentWeek <= b.week_end)?.id
    ?? program.blocks?.[0]?.id ?? null
  const [expandedBlock, setExpandedBlock] = useState<string | null>(initialBlock)
  const [expandedWeek, setExpandedWeek] = useState<number | null>(currentWeek ?? null)
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      {program.blocks?.map(block => (
        <div key={block.id} className="card overflow-hidden">
          <button
            type="button"
            onClick={() => setExpandedBlock(expandedBlock === block.id ? null : block.id)}
            className="w-full p-4 text-left flex items-center justify-between hover:bg-surface-2/50 transition-colors min-h-[44px]"
          >
            <div>
              <p className="font-semibold text-fg-1">{block.name}</p>
              <p className="text-xs text-fg-4">
                Weeks {block.week_start}–{block.week_end}
                {block.focus ? ` · ${block.focus}` : ''}
              </p>
            </div>
            <span className="text-fg-4 text-sm">{expandedBlock === block.id ? '▲' : '▼'}</span>
          </button>

          {expandedBlock === block.id && block.workouts && (
            <div className="px-4 pb-4 border-t border-edge-muted space-y-2 mt-2">
              {Array.from(new Set(block.workouts.map(w => w.week_number)))
                .sort((a, b) => a - b)
                .map(weekNum => {
                  const isCurrent = weekNum === currentWeek
                  const open = expandedWeek === weekNum
                  return (
                    <div key={weekNum}>
                      <button
                        type="button"
                        onClick={() => setExpandedWeek(open ? null : weekNum)}
                        className="w-full flex items-center justify-between mt-3 mb-2 min-h-[36px]"
                      >
                        <span className={`text-xs uppercase tracking-wider font-medium ${isCurrent ? 'text-cta' : 'text-fg-4'}`}>
                          Week {weekNum}{isCurrent ? ' · this week' : ''}
                        </span>
                        <span className="text-fg-4 text-[10px]">{open ? '▲' : '▼'}</span>
                      </button>
                      {open && (
                        <div className="space-y-2">
                          {block.workouts!
                            .filter(w => w.week_number === weekNum)
                            .sort((a, b) => a.day_of_week - b.day_of_week)
                            .map(workout => (
                              <div key={workout.id} className={`rounded-xl overflow-hidden ${isCurrent ? 'bg-cta/5 border border-cta/20' : 'bg-surface-2/50'}`}>
                                <button
                                  type="button"
                                  onClick={() => setExpandedWorkout(expandedWorkout === workout.id ? null : workout.id)}
                                  className="w-full p-3 text-left flex items-center justify-between hover:bg-surface-2 transition-colors min-h-[44px]"
                                >
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-fg-2 truncate">
                                      {DAY_NAMES[workout.day_of_week]} — {workout.name}
                                    </p>
                                    {workout.description && <p className="text-xs text-fg-4 truncate">{workout.description}</p>}
                                  </div>
                                  <span className="text-fg-4 text-xs shrink-0 ml-2">{workout.exercises?.length || 0} exercises</span>
                                </button>

                                {expandedWorkout === workout.id && (
                                  <div className="px-3 pb-3 border-t border-edge-muted space-y-1 mt-1">
                                    {(workout.exercises as WorkoutExercise[]).map((ex, i) => (
                                      <div key={i} className="flex items-center justify-between gap-2 p-1.5 rounded bg-surface-3/30">
                                        <p className="text-xs text-fg-2 truncate">{ex.name}</p>
                                        <p className="text-[11px] text-fg-4 shrink-0">
                                          {ex.sets} × {ex.reps}
                                          {ex.notes ? ` · ${ex.notes}` : ''}
                                        </p>
                                      </div>
                                    ))}
                                    {onStartWorkout && (
                                      <button type="button" onClick={() => onStartWorkout(workout)} className="mt-2 btn-secondary px-3 py-2">
                                        Start this workout
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
