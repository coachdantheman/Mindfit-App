'use client'
import { useState } from 'react'
import { TrainingProgram, ProgramBlock, ProgramWorkout, WorkoutExercise } from '@/types'

const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Props {
  program: TrainingProgram
  onStartWorkout?: (workout: ProgramWorkout) => void
  onDelete?: () => void
}

export default function ProgramView({ program, onStartWorkout, onDelete }: Props) {
  const [expandedBlock, setExpandedBlock] = useState<string | null>(
    program.blocks?.[0]?.id || null
  )
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-fg-1">{program.title}</h3>
            {program.description && <p className="text-xs text-fg-4 mt-1">{program.description}</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              {program.sport && (
                <span className="text-[10px] bg-cta/20 text-cta px-2 py-0.5 rounded-full">{program.sport}</span>
              )}
              {program.goals?.map(g => (
                <span key={g} className="text-[10px] bg-surface-2 text-fg-3 px-2 py-0.5 rounded-full">{g}</span>
              ))}
              <span className="text-[10px] bg-surface-2 text-fg-3 px-2 py-0.5 rounded-full">{program.duration_weeks} weeks</span>
            </div>
          </div>
          {onDelete && (
            <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-300">Delete</button>
          )}
        </div>
      </div>

      {/* Blocks */}
      {program.blocks?.map(block => (
        <div key={block.id} className="card overflow-hidden">
          <button
            onClick={() => setExpandedBlock(expandedBlock === block.id ? null : block.id)}
            className="w-full p-4 text-left flex items-center justify-between hover:bg-surface-2/50 transition-colors"
          >
            <div>
              <p className="font-semibold text-fg-1">{block.name}</p>
              <p className="text-xs text-fg-4">
                Weeks {block.week_start}-{block.week_end}
                {block.focus ? ` · ${block.focus}` : ''}
              </p>
            </div>
            <span className="text-fg-4 text-sm">{expandedBlock === block.id ? '▲' : '▼'}</span>
          </button>

          {expandedBlock === block.id && block.workouts && (
            <div className="px-4 pb-4 border-t border-edge-muted space-y-2 mt-2">
              {/* Group by week */}
              {Array.from(new Set(block.workouts.map(w => w.week_number)))
                .sort((a, b) => a - b)
                .map(weekNum => (
                  <div key={weekNum}>
                    <p className="text-xs uppercase tracking-wider text-fg-4 font-medium mb-2 mt-3">
                      Week {weekNum}
                    </p>
                    <div className="space-y-2">
                      {block.workouts!
                        .filter(w => w.week_number === weekNum)
                        .sort((a, b) => a.day_of_week - b.day_of_week)
                        .map(workout => (
                          <div key={workout.id} className="bg-surface-2/50 rounded-xl overflow-hidden">
                            <button
                              onClick={() => setExpandedWorkout(expandedWorkout === workout.id ? null : workout.id)}
                              className="w-full p-3 text-left flex items-center justify-between hover:bg-surface-2 transition-colors"
                            >
                              <div>
                                <p className="text-sm font-medium text-fg-2">
                                  {DAY_NAMES[workout.day_of_week]} — {workout.name}
                                </p>
                                {workout.description && (
                                  <p className="text-xs text-fg-4">{workout.description}</p>
                                )}
                              </div>
                              <span className="text-fg-4 text-xs">{workout.exercises?.length || 0} exercises</span>
                            </button>

                            {expandedWorkout === workout.id && (
                              <div className="px-3 pb-3 border-t border-edge-muted space-y-1 mt-1">
                                {(workout.exercises as WorkoutExercise[]).map((ex, i) => (
                                  <div key={i} className="flex items-center justify-between p-1.5 rounded bg-surface-3/30">
                                    <p className="text-xs text-fg-2">{ex.name}</p>
                                    <p className="text-[10px] text-fg-4">
                                      {ex.sets} × {ex.reps}
                                      {ex.notes ? ` · ${ex.notes}` : ''}
                                    </p>
                                  </div>
                                ))}
                                {onStartWorkout && (
                                  <button
                                    onClick={() => onStartWorkout(workout)}
                                    className="mt-2 bg-cta/20 text-cta font-medium px-3 py-1.5 rounded-lg text-xs hover:bg-cta/30 transition-colors"
                                  >
                                    Start This Workout
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
