import test from 'node:test'
import assert from 'node:assert/strict'
import {
  currentWeek, isoDayOfWeek, workoutsForWeek, todaysWorkout, nextWorkout,
  buildFromScratch, expandAiBlocks, expandTemplate, dayTemplatesFromProgram, applyTemplateToBlocks,
} from '../lib/programs'
import { generatePlanTemplate } from '../lib/workout-templates'
import type { ProgramWorkout } from '../types'

function pw(week: number, dow: number, name = `W${week}D${dow}`): ProgramWorkout {
  return { id: `${week}-${dow}`, block_id: 'b', program_id: 'p', day_of_week: dow, week_number: week, name, description: null, exercises: [{ name: 'Back Squat', sets: 3, reps: '5', notes: '' }], sort_order: 0 }
}

const program = {
  duration_weeks: 4,
  start_date: '2026-10-07', // a Wednesday → week 1 is Mon Oct 5 – Sun Oct 11
  blocks: [{ id: 'b', program_id: 'p', name: 'Plan', week_start: 1, week_end: 4, focus: null, sort_order: 0,
    workouts: [pw(1, 1), pw(1, 3), pw(1, 5), pw(2, 1), pw(2, 3), pw(2, 5), pw(3, 1), pw(4, 5)] }],
}

test('isoDayOfWeek — Monday 1 … Sunday 7', () => {
  assert.equal(isoDayOfWeek(new Date(2026, 9, 5)), 1)
  assert.equal(isoDayOfWeek(new Date(2026, 9, 11)), 7)
})

test('currentWeek — week 1 is the Mon–Sun week containing start_date', () => {
  assert.deepEqual(currentWeek('2026-10-07', 4, new Date(2026, 9, 5)), { week: 1, status: 'active' })
  assert.deepEqual(currentWeek('2026-10-07', 4, new Date(2026, 9, 11)), { week: 1, status: 'active' })
  assert.deepEqual(currentWeek('2026-10-07', 4, new Date(2026, 9, 12)), { week: 2, status: 'active' })
  assert.deepEqual(currentWeek('2026-10-07', 4, new Date(2026, 9, 1)), { week: 1, status: 'upcoming' })
  assert.deepEqual(currentWeek('2026-10-07', 4, new Date(2026, 10, 2)), { week: 4, status: 'complete' })
  assert.deepEqual(currentWeek('2026-10-07', 4, new Date(2026, 9, 31)), { week: 4, status: 'active' })
  assert.deepEqual(currentWeek(null, 8), { week: 1, status: 'active' })
})

test('workoutsForWeek / todaysWorkout / nextWorkout', () => {
  assert.deepEqual(workoutsForWeek(program, 2).map(w => w.day_of_week), [1, 3, 5])
  assert.equal(todaysWorkout(program, new Date(2026, 9, 7))?.name, 'W1D3')
  assert.equal(todaysWorkout(program, new Date(2026, 9, 8)), null)
  assert.equal(todaysWorkout(program, new Date(2026, 9, 1)), null)
  assert.equal(nextWorkout(program, new Date(2026, 9, 7))?.workout.name, 'W1D5')
  assert.equal(nextWorkout(program, new Date(2026, 9, 10))?.workout.name, 'W2D1')
  assert.equal(nextWorkout(program, new Date(2026, 9, 10))?.week, 2)
  assert.equal(nextWorkout(program, new Date(2026, 9, 20))?.workout.name, 'W4D5')
  assert.equal(nextWorkout(program, new Date(2026, 9, 31)), null)
  assert.equal(nextWorkout(program, new Date(2026, 9, 1))?.workout.name, 'W1D1')
})

test('buildFromScratch — one block, template cloned to every week, POST shape', () => {
  const p = buildFromScratch({
    title: ' Offseason ', duration_weeks: 6, start_date: '2026-11-02', sport: 'Football', goals: ['strength'],
    days: [
      { day_of_week: 3, name: 'Lower', description: '', exercises: [{ name: 'Back Squat', sets: 4, reps: '5', notes: '' }] },
      { day_of_week: 1, name: 'Upper', description: 'push', exercises: [{ name: 'Bench Press', sets: 3, reps: '8', notes: '' }] },
      { day_of_week: 5, name: 'Empty', description: '', exercises: [] },
    ],
  })
  assert.equal(p.title, 'Offseason')
  assert.equal(p.source, 'self')
  assert.equal(p.start_date, '2026-11-02')
  assert.equal(p.duration_weeks, 6)
  assert.equal(p.blocks.length, 1)
  assert.equal(p.blocks[0].week_start, 1)
  assert.equal(p.blocks[0].week_end, 6)
  assert.equal(p.blocks[0].workouts.length, 12)
  assert.deepEqual(p.blocks[0].workouts.slice(0, 2).map(w => [w.week_number, w.day_of_week, w.name]), [[1, 1, 'Upper'], [1, 3, 'Lower']])
  assert.equal(p.blocks[0].workouts[11].week_number, 6)
  p.blocks[0].workouts[0].exercises[0].sets = 99
  assert.equal(p.blocks[0].workouts[2].exercises[0].sets, 3, 'weeks are independent copies')
  assert.deepEqual(Object.keys(p.blocks[0].workouts[0]).sort(), ['day_of_week', 'description', 'exercises', 'name', 'week_number'])
})

test('expandAiBlocks — one week per block expanded to the block range, bad input tolerated', () => {
  const blocks = expandAiBlocks({
    blocks: [
      { name: 'Base', week_start: 1, week_end: 4, workouts: [
        { day_of_week: 1, name: 'A', exercises: [{ name: 'Squat', sets: 3, reps: 5 }] },
        { day_of_week: 3, name: 'B', exercises: [{ name: 'Bench', sets: 4 }] },
      ] },
      { name: 'Nothing', workouts: [{ day_of_week: 1, name: 'Empty', exercises: [] }] },
      { workouts: [{ exercises: [{ name: 'Clean' }] }] },
    ],
  }, 12)
  assert.equal(blocks.length, 2)
  assert.equal(blocks[0].workouts.length, 8)
  assert.equal(blocks[0].workouts[7].week_number, 4)
  assert.equal(blocks[0].workouts[1].exercises[0].reps, '10')
  assert.equal(blocks[0].workouts[0].exercises[0].reps, '5')
  assert.equal(blocks[1].name, 'Phase 3')
  assert.equal(blocks[1].week_start, 9)
  assert.equal(blocks[1].workouts[0].day_of_week, 1)
  assert.deepEqual(expandAiBlocks({}, 4), [])
  assert.deepEqual(expandAiBlocks(null, 4), [])
})

test('expandTemplate — parity with the generated template (one workout per day per week)', () => {
  const tpl = generatePlanTemplate('Basketball', ['strength', 'speed'], 'intermediate', 4, 8)
  const blocks = expandTemplate(tpl, 8)
  assert.equal(blocks.length, 2)
  assert.deepEqual(blocks.map(b => [b.week_start, b.week_end]), [[1, 4], [5, 8]])
  for (const b of blocks) {
    assert.equal(b.workouts.length, 16)
    const weeks = new Set(b.workouts.map(w => w.week_number))
    assert.equal(weeks.size, 4)
  }
  const short = expandTemplate(generatePlanTemplate('Soccer', ['endurance'], 'beginner', 3, 4), 4)
  assert.equal(short.length, 1)
  assert.equal(short[0].workouts.length, 12)
})

test('dayTemplatesFromProgram / applyTemplateToBlocks round-trip', () => {
  const days = dayTemplatesFromProgram(program)
  assert.deepEqual(days.map(d => d.day_of_week), [1, 3, 5])
  days[0].exercises.push({ name: 'Deadlift', sets: 3, reps: '5', notes: '' })
  const blocks = applyTemplateToBlocks([{ name: 'Plan', focus: '', week_start: 1, week_end: 4, workouts: [] }], days)
  assert.equal(blocks[0].workouts.length, 12)
  assert.equal(blocks[0].workouts.filter(w => w.day_of_week === 1).every(w => w.exercises.length === 2), true)
})
