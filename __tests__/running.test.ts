import test from 'node:test'
import assert from 'node:assert/strict'
import { defaultUnit, distanceTimeSeries, formatPace, formatTime, lowsFromSeries, paceSec, parseTime } from '../lib/running'
import { draftFromWorkout, draftToSessionPayload } from '../lib/workout-draft'
import type { ExerciseLibraryRow } from '../types/exercise'

test('parseTime handles seconds, m:ss and h:mm:ss', () => {
  assert.equal(parseTime('4.62'), 4.62)
  assert.equal(parseTime('5:30'), 330)
  assert.equal(parseTime('1:02:10.5'), 3730.5)
  assert.equal(parseTime(' 12 '), 12)
  assert.equal(parseTime(''), null)
  assert.equal(parseTime('abc'), null)
  assert.equal(parseTime('1:'), null)
  assert.equal(parseTime('1:2:3:4'), null)
})

test('formatTime mirrors parseTime', () => {
  assert.equal(formatTime(4.62), '4.62')
  assert.equal(formatTime(330), '5:30')
  assert.equal(formatTime(3730.5), '1:02:11')
  assert.equal(formatTime(null), '')
})

test('pace formats per unit', () => {
  assert.equal(formatPace(paceSec(3, 1476), 'mi'), '8:12 /mi')
  assert.equal(paceSec(0, 100), null)
})

test('defaultUnit picks yards for sprints, miles for runs, meters for erg', () => {
  assert.equal(defaultUnit('sprint', 'Sprint'), 'yd')
  assert.equal(defaultUnit('shuttle-run', 'Shuttle Run'), 'yd')
  assert.equal(defaultUnit('easy-run', 'Easy Run'), 'mi')
  assert.equal(defaultUnit('rowing-machine', 'Rowing Machine'), 'm')
  assert.equal(defaultUnit(null, '40-Yard Dash'), 'yd')
})

test('distanceTimeSeries: sprints → fastest split at the modal distance', () => {
  const s = distanceTimeSeries([
    { workout_log_id: 'a', distance: 40, distance_unit: 'yd', duration_sec: 4.9, created_at: '2026-10-01T10:00:00Z' },
    { workout_log_id: 'a', distance: 40, distance_unit: 'yd', duration_sec: 4.7, created_at: '2026-10-01T10:00:00Z' },
    { workout_log_id: 'a', distance: 20, distance_unit: 'yd', duration_sec: 2.9, created_at: '2026-10-01T10:00:00Z' },
    { workout_log_id: 'b', distance: 40, distance_unit: 'yd', duration_sec: 4.62, created_at: '2026-10-08T10:00:00Z' },
  ])
  assert.ok(s)
  assert.equal(s!.metric, 'split')
  assert.equal(s!.refDistance, 40)
  assert.deepEqual(s!.series.map(p => p.value), [4.7, 4.62])
  assert.equal(lowsFromSeries(s!.series).length, 2)
})

test('distanceTimeSeries: runs → pace per session', () => {
  const s = distanceTimeSeries([
    { workout_log_id: 'a', distance: 3, distance_unit: 'mi', duration_sec: 1476, created_at: '2026-10-01T10:00:00Z' },
    { workout_log_id: 'b', distance: 2, distance_unit: 'mi', duration_sec: 900, created_at: '2026-10-03T10:00:00Z' },
    { workout_log_id: 'b', distance: 1, distance_unit: 'mi', duration_sec: 500, created_at: '2026-10-03T10:00:00Z' },
  ])
  assert.equal(s!.metric, 'pace')
  assert.deepEqual(s!.series.map(p => p.value), [492, 467])
  assert.equal(distanceTimeSeries([]), null)
})

test('draftToSessionPayload sends distance/time for runs and skips reps/weight', () => {
  const library: ExerciseLibraryRow[] = [{
    id: 'lib-1', user_id: null, slug: 'sprint', name: 'Sprint', aliases: ['40-Yard Dash'], muscle_group: 'conditioning',
    equipment: 'none', measure: 'distance_time', standard_key: null, source: 'curated',
  }]
  const draft = draftFromWorkout({ name: 'Sprints', categoryName: 'Conditioning', exercises: [{ name: 'Sprint', sets: 2, reps: '40', notes: '' }], source: 'custom' }, library)
  assert.equal(draft.exercises[0].unit, 'yd')
  draft.exercises[0].sets[0] = { ...draft.exercises[0].sets[0], distance: '40', time: '4.62', rest: '90', done: true }
  draft.exercises[0].sets[1] = { ...draft.exercises[0].sets[1], distance: '40', time: '', done: true }
  const payload = draftToSessionPayload(draft)
  assert.equal(payload.exercises[0].sets.length, 2)
  assert.deepEqual(payload.exercises[0].sets[0], {
    set_number: 1, reps: null, weight: null, rpe: null, notes: null,
    distance: 40, distance_unit: 'yd', duration_sec: 4.62, rest_sec: 90,
  })
  assert.equal(payload.exercises[0].sets[1].duration_sec, null)
})
