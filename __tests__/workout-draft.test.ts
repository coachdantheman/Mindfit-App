import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DRAFT_KEY, DRAFT_VERSION, draftFromWorkout, draftToSessionPayload, parseDraft, draftStats, exerciseFromLibrary,
} from '../lib/workout-draft'
import type { ExerciseLibraryRow } from '../types/exercise'

const library: ExerciseLibraryRow[] = [
  { id: 'lib-bench', user_id: null, slug: 'bench-press', name: 'Bench Press', aliases: ['Barbell Bench Press'], muscle_group: 'chest', equipment: 'barbell', measure: 'weight_reps', standard_key: 'bench', source: 'curated' },
  { id: 'lib-pullup', user_id: null, slug: 'pull-ups', name: 'Pull-Ups', aliases: ['Pull Ups'], muscle_group: 'back', equipment: 'bodyweight', measure: 'reps', standard_key: 'pullup', source: 'curated' },
]

const start = new Date(2026, 9, 20, 16, 0, 0)

function draft() {
  return draftFromWorkout({
    name: 'Upper Body Push',
    categoryName: 'My Plan',
    source: 'program',
    programWorkoutId: 'pw-1',
    exercises: [
      { name: 'Barbell Bench Press', sets: 3, reps: '8-10', notes: 'control' },
      { name: 'Pull Ups', sets: 2, reps: '6', notes: '' },
      { name: 'Mystery Move', sets: 1, reps: '30 sec', notes: '' },
    ],
  }, library, start)
}

test('draftFromWorkout — links library rows, plan reps become targets only', () => {
  const d = draft()
  assert.equal(d.version, DRAFT_VERSION)
  assert.equal(d.startedAt, start.toISOString())
  assert.equal(d.programWorkoutId, 'pw-1')
  assert.equal(d.workoutId, null)
  assert.equal(d.exercises.length, 3)
  assert.equal(d.exercises[0].exerciseId, 'lib-bench')
  assert.equal(d.exercises[0].name, 'Bench Press')
  assert.equal(d.exercises[0].measure, 'weight_reps')
  assert.equal(d.exercises[0].isBodyweight, false)
  assert.equal(d.exercises[0].sets.length, 3)
  assert.equal(d.exercises[0].sets[0].targetReps, '8-10')
  assert.equal(d.exercises[0].sets[0].reps, '')
  assert.equal(d.exercises[0].sets[0].done, false)
  assert.equal(d.exercises[1].exerciseId, 'lib-pullup')
  assert.equal(d.exercises[1].isBodyweight, true)
  assert.equal(d.exercises[2].exerciseId, null)
  assert.equal(d.exercises[2].name, 'Mystery Move')
  assert.equal(d.exercises[2].sets[0].targetReps, '30 sec')
})

test('draftToSessionPayload — target reps are never saved as done; filtering + renumbering', () => {
  const d = draft()
  // Nothing marked done → nothing saved.
  const empty = draftToSessionPayload(d, new Date(start.getTime() + 45 * 60000))
  assert.deepEqual(empty.exercises, [])
  assert.equal(empty.log.duration_min, 45)
  assert.equal(empty.log.workout_name, 'Upper Body Push')
  assert.equal(empty.log.source, 'program')
  assert.equal(empty.log.program_workout_id, 'pw-1')
  assert.equal(empty.log.log_date, '2026-10-20')
  assert.equal(empty.log.started_at, start.toISOString())

  // Done with no numbers → dropped. Done with weight only → kept.
  d.exercises[0].sets[0].done = true
  d.exercises[0].sets[1] = { ...d.exercises[0].sets[1], done: true, reps: '8', weight: '135', rpe: '7' }
  d.exercises[0].sets[2] = { ...d.exercises[0].sets[2], done: true, weight: '135' }
  d.exercises[1].sets[0] = { ...d.exercises[1].sets[0], done: true, reps: '6' }
  d.exercises[1].sets[1] = { ...d.exercises[1].sets[1], done: false, reps: '6' }
  d.notes = '  felt good '
  const p = draftToSessionPayload(d, new Date(start.getTime() + 10 * 60000))
  assert.equal(p.exercises.length, 2)
  assert.deepEqual(p.exercises[0].sets, [
    { set_number: 1, reps: 8, weight: 135, rpe: 7, notes: null },
    { set_number: 2, reps: null, weight: 135, rpe: null, notes: null },
  ])
  assert.equal(p.exercises[0].exercise_id, 'lib-bench')
  assert.equal(p.exercises[1].exercise_name, 'Pull-Ups')
  assert.equal(p.exercises[1].is_bodyweight, true)
  assert.deepEqual(p.exercises[1].sets, [{ set_number: 1, reps: 6, weight: null, rpe: null, notes: null }])
  assert.equal(p.log.notes, 'felt good')
  assert.equal(JSON.stringify(p).includes('8-10'), false, 'plan target never reaches the payload')
})

test('parseDraft — version guard and garbage tolerance', () => {
  const d = draft()
  assert.equal(parseDraft(JSON.stringify(d))?.name, 'Upper Body Push')
  assert.equal(parseDraft(null), null)
  assert.equal(parseDraft('not json'), null)
  assert.equal(parseDraft(JSON.stringify({ ...d, version: 0 })), null)
  assert.equal(parseDraft(JSON.stringify({ ...d, version: 2 })), null)
  assert.equal(parseDraft(JSON.stringify({ ...d, exercises: 'nope' })), null)
  assert.equal(parseDraft(JSON.stringify({ version: 1 })), null)
  assert.equal(DRAFT_KEY, 'mindfit.workout-draft.v1')
})

test('draftStats / exerciseFromLibrary', () => {
  const d = draft()
  d.exercises[0].sets[0] = { ...d.exercises[0].sets[0], done: true, reps: '10', weight: '100' }
  d.exercises[0].sets[1] = { ...d.exercises[0].sets[1], done: true, reps: '5', weight: '200' }
  const s = draftStats(d)
  assert.equal(s.doneSets, 2)
  assert.equal(s.totalSets, 6)
  assert.equal(s.volume, 2000)
  const ex = exerciseFromLibrary(library[1], 4)
  assert.equal(ex.sets.length, 4)
  assert.equal(ex.isBodyweight, true)
  assert.equal(ex.exerciseId, 'lib-pullup')
})
