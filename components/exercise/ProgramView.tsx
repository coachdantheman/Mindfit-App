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
      <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-gray-100">{program.title}</h3>
            {program.description && <p className="text-xs text-gray-500 mt-1">{program.description}</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              {program.sport && (
                <span className="text-[10px] bg-cta/20 text-cta px-2 py-0.5 rounded-full">{program.sport}</span>
              )}
              {program.goals?.map(g => (
                <span key={g} className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{g}</span>
              ))}
              <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{program.duration_weeks} weeks</span>
            </div>
          </div>
          {onDelete && (
            <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-300">Delete</button>
          )}
        </div>
      </div>

      {/* Blocks */}
      {program.blocks?.map(block => (
        <div key={block.id} className="bg-gray-900 rounded-2xl border border-white/10 overflow-hidden">
          <button
            onClick={() => setExpandedBlock(expandedBlock === block.id ? null : block.id)}
            className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-800/50 transition-colors"
          >
            <div>
              <p className="font-semibold text-gray-100">{block.name}</p>
              <p className="text-xs text-gray-500">
                Weeks {block.week_start}-{block.week_end}
                {block.focus ? ` · ${block.focus}` : ''}
              </p>
            </div>
            <span className="text-gray-500 text-sm">{expandedBlock === block.id ? '▲' : '▼'}</span>
          </button>

          {expandedBlock === block.id && block.workouts && (
            <div className="px-4 pb-4 border-t border-white/5 space-y-2 mt-2">
              {/* Group by week */}
              {Array.from(new Set(block.workouts.map(w => w.week_number)))
                .sort((a, b) => a - b)
                .map(weekNum => (
                  <div key={weekNum}>
                    <p className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-2 mt-3">
                      Week {weekNum}
                    </p>
                    <div className="space-y-2">
                      {block.workouts!
                        .filter(w => w.week_number === weekNum)
                        .sort((a, b) => a.day_of_week - b.day_of_week)
                        .map(workout => (
                          <div key={workout.id} className="bg-gray-800/50 rounded-xl overflow-hidden">
                            <button
                              onClick={() => setExpandedWorkout(expandedWorkout === workout.id ? null : workout.id)}
                              className="w-full p-3 text-left flex items-center justify-between hover:bg-gray-800 transition-colors"
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-200">
                                  {DAY_NAMES[workout.day_of_week]} — {workout.name}
                                </p>
                                {workout.description && (
                                  <p className="text-xs text-gray-500">{workout.description}</p>
                                )}
                              </div>
                              <span className="text-gray-600 text-xs">{workout.exercises?.length || 0} exercises</span>
                            </button>

                            {expandedWorkout === workout.id && (
                              <div className="px-3 pb-3 border-t border-white/5 space-y-1 mt-1">
                                {(workout.exercises as WorkoutExercise[]).map((ex, i) => (
                                  <div key={i} className="flex items-center justify-between p-1.5 rounded bg-gray-700/30">
                                    <p className="text-xs text-gray-300">{ex.name}</p>
                                    <p className="text-[10px] text-gray-500">
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
