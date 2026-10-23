import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { EXERCISE_LIBRARY_SEED } from '../lib/data/exercise-library'
import { normalizeName, searchExercises, matchExercise, slugify } from '../lib/exercise-library'

const ROOT = join(__dirname, '..')

test('seed — unique slugs, names and aliases; sane size', () => {
  assert.ok(EXERCISE_LIBRARY_SEED.length >= 80 && EXERCISE_LIBRARY_SEED.length <= 130, String(EXERCISE_LIBRARY_SEED.length))
  const slugs = new Set<string>()
  const keys = new Map<string, string>()
  for (const e of EXERCISE_LIBRARY_SEED) {
    assert.ok(!slugs.has(e.slug), `duplicate slug ${e.slug}`)
    slugs.add(e.slug)
    assert.match(e.slug, /^[a-z0-9-]+$/)
    for (const k of [e.name, ...e.aliases]) {
      const n = normalizeName(k).replace(/\s+/g, '')
      const owner = keys.get(n)
      assert.ok(!owner || owner === e.slug, `name/alias "${k}" belongs to both ${owner} and ${e.slug}`)
      keys.set(n, e.slug)
    }
  }
})

test('seed — exactly the 12 standard keys, each once', () => {
  const found = EXERCISE_LIBRARY_SEED.map(e => e.standard_key).filter(Boolean).sort()
  assert.deepEqual(found, [
    'bench', 'broad_jump', 'deadlift', 'front_squat', 'hip_thrust', 'ohp',
    'power_clean', 'pullup', 'pushup', 'row', 'squat', 'vertical_jump',
  ])
})

test('every workout-templates.ts exercise name resolves to a library row', () => {
  const src = readFileSync(join(ROOT, 'lib/workout-templates.ts'), 'utf8')
  const names = [...src.matchAll(/name:\s*'((?:[^'\\]|\\.)*)'/g)].map(m => m[1].replace(/\\'/g, "'"))
  assert.ok(names.length > 60)
  const missing = names.filter(n => !matchExercise(EXERCISE_LIBRARY_SEED, n))
  assert.deepEqual(missing, [])
})

test('every seed-workouts.sql exercise name resolves to a library row', () => {
  const src = readFileSync(join(ROOT, 'seed-workouts.sql'), 'utf8')
  const names = [...src.matchAll(/"name":\s*"([^"]+)"/g)].map(m => m[1].replace(/''/g, "'"))
  assert.ok(names.length > 100)
  const missing = [...new Set(names.filter(n => !matchExercise(EXERCISE_LIBRARY_SEED, n)))]
  assert.deepEqual(missing, [])
})

test('matchExercise — case, punctuation and plural tolerant; names beat aliases', () => {
  assert.equal(matchExercise(EXERCISE_LIBRARY_SEED, 'barbell rows')?.slug, 'barbell-row')
  assert.equal(matchExercise(EXERCISE_LIBRARY_SEED, 'PULL UPS')?.slug, 'pull-ups')
  assert.equal(matchExercise(EXERCISE_LIBRARY_SEED, 'Pull-Up')?.slug, 'pull-ups')
  assert.equal(matchExercise(EXERCISE_LIBRARY_SEED, 'Bench Press')?.standard_key, 'bench')
  assert.equal(matchExercise(EXERCISE_LIBRARY_SEED, 'Squat')?.standard_key, 'squat')
  assert.equal(matchExercise(EXERCISE_LIBRARY_SEED, 'Totally Made Up Move'), null)
  assert.equal(matchExercise(EXERCISE_LIBRARY_SEED, ''), null)
})

test('searchExercises — name prefix ranks above alias and word matches; aliases count', () => {
  const bench = searchExercises(EXERCISE_LIBRARY_SEED, 'bench')
  assert.equal(bench[0].slug, 'bench-press')
  assert.ok(bench.some(e => e.slug === 'dumbbell-bench-press'))
  const ohp = searchExercises(EXERCISE_LIBRARY_SEED, 'ohp')
  assert.equal(ohp[0].slug, 'overhead-press')
  const rdl = searchExercises(EXERCISE_LIBRARY_SEED, 'rdl')
  assert.ok(rdl.slice(0, 2).map(e => e.slug).includes('romanian-deadlift'))
  assert.deepEqual(searchExercises(EXERCISE_LIBRARY_SEED, '   '), [])
  assert.equal(searchExercises(EXERCISE_LIBRARY_SEED, 'squat', 3).length, 3)
  const multi = searchExercises(EXERCISE_LIBRARY_SEED, 'split squat')
  assert.equal(multi[0].slug, 'bulgarian-split-squat')
})

test('normalizeName / slugify', () => {
  assert.equal(normalizeName("World's Greatest Stretch"), 'worlds greatest stretch')
  assert.equal(normalizeName('Agility Ladder — In-Out'), 'agility ladder in out')
  assert.equal(normalizeName('Pro Agility (5-10-5)'), 'pro agility 5 10 5')
  assert.equal(matchExercise(EXERCISE_LIBRARY_SEED, 'pullups')?.slug, 'pull-ups')
  assert.equal(matchExercise(EXERCISE_LIBRARY_SEED, 'push ups')?.slug, 'push-ups')
  assert.equal(slugify('Cable Fly (High to Low)'), 'cable-fly-high-to-low')
})
