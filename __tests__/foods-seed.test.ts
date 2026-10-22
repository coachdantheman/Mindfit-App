import test from 'node:test'
import assert from 'node:assert/strict'
import { FOODS_SEED, FOOD_CATEGORIES } from '../lib/data/foods-seed'

test('foods seed — slugs are unique kebab-case', () => {
  const seen = new Set<string>()
  for (const f of FOODS_SEED) {
    assert.match(f.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, `bad slug: ${f.slug}`)
    assert.ok(!seen.has(f.slug), `duplicate slug: ${f.slug}`)
    seen.add(f.slug)
  }
})

test('foods seed — every row has name, serving_size, valid category and non-negative numbers', () => {
  for (const f of FOODS_SEED) {
    assert.ok(f.name.trim().length > 0, `empty name: ${f.slug}`)
    assert.ok(f.serving_size.trim().length > 0, `empty serving_size: ${f.slug}`)
    assert.ok(FOOD_CATEGORIES.includes(f.category), `bad category: ${f.slug}`)
    assert.ok(Number.isInteger(f.calories) && f.calories >= 0, `bad calories: ${f.slug}`)
    for (const g of [f.protein_g, f.carbs_g, f.fat_g]) {
      assert.ok(g >= 0 && Math.round(g * 10) === g * 10, `macro not 1-decimal: ${f.slug}`)
    }
    if (f.serving_grams != null) assert.ok(f.serving_grams > 0, `bad serving_grams: ${f.slug}`)
  }
})

test('foods seed — macro calories within 20% of stated calories', () => {
  for (const f of FOODS_SEED) {
    const macroCals = 4 * f.protein_g + 4 * f.carbs_g + 9 * f.fat_g
    assert.ok(
      Math.abs(macroCals - f.calories) <= 0.2 * f.calories + 1e-9,
      `${f.slug}: ${f.calories} kcal vs ${macroCals.toFixed(1)} from macros`
    )
  }
})

test('foods seed — each category has at least 10 rows (other may be 0) and total >= 280', () => {
  const counts: Record<string, number> = {}
  for (const f of FOODS_SEED) counts[f.category] = (counts[f.category] ?? 0) + 1
  for (const c of FOOD_CATEGORIES) {
    if (c === 'other') continue
    assert.ok((counts[c] ?? 0) >= 10, `category ${c} has ${counts[c] ?? 0} rows`)
  }
  assert.ok(FOODS_SEED.length >= 280, `only ${FOODS_SEED.length} rows`)
})
