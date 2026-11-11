import test from 'node:test'
import assert from 'node:assert/strict'
import { draftComplete, edgeAndGap, EMPTY_DRAFT } from '../lib/onboarding-draft'
import { MPI_DIMENSIONS } from '../lib/mpi'

const allFive = Object.fromEntries(MPI_DIMENSIONS.map(d => [d.key, 5]))

test('edgeAndGap picks the highest and lowest dimension', () => {
  const r = edgeAndGap({ ...allFive, focus_quality: 9, anxiety_management: 2 })
  assert.equal(r.edge, 'Focus Quality')
  assert.equal(r.gap, 'Anxiety Management')
})

test('edgeAndGap ties go to the first dimension', () => {
  const r = edgeAndGap(allFive)
  assert.equal(r.edge, MPI_DIMENSIONS[0].label)
  assert.equal(r.gap, MPI_DIMENSIONS[0].label)
})

test('draftComplete needs birth date and all ten scores', () => {
  assert.equal(draftComplete(null), false)
  assert.equal(draftComplete({ ...EMPTY_DRAFT, birthYear: 2010, birthMonth: 4, scores: allFive }), true)
  assert.equal(draftComplete({ ...EMPTY_DRAFT, birthYear: null, birthMonth: 4, scores: allFive }), false)
  const missing = { ...allFive } as Record<string, number>
  delete missing.vision_clarity
  assert.equal(draftComplete({ ...EMPTY_DRAFT, birthYear: 2010, birthMonth: 4, scores: missing }), false)
})

test('1–5 onboarding answers, saved doubled, still score out of 100', async () => {
  const { calcMPI } = await import('../lib/mpi')
  const all = (v: number) => Object.fromEntries(MPI_DIMENSIONS.map(d => [d.key, v * 2]))
  assert.equal(calcMPI(all(5)), 100)
  assert.equal(calcMPI(all(3)), 60)
  assert.equal(calcMPI(all(1)), 20)
})
