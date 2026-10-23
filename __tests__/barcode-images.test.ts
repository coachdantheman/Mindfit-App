import test from 'node:test'
import assert from 'node:assert/strict'
import { isValidBarcode, lookupCandidates, normalizeOffProduct } from '../lib/barcode'
import { pickCompareDates } from '../lib/images'

test('isValidBarcode — check digits', () => {
  assert.equal(isValidBarcode('038000138416'), true)   // UPC-A (Quaker)
  assert.equal(isValidBarcode('5000112637922'), true)  // EAN-13
  assert.equal(isValidBarcode('96385074'), true)       // EAN-8
  assert.equal(isValidBarcode('038000138417'), false)
  assert.equal(isValidBarcode('12ab'), false)
})

test('lookupCandidates — UPC-A also tries the EAN-13 form', () => {
  assert.deepEqual(lookupCandidates('038000138416'), ['038000138416', '0038000138416'])
  assert.deepEqual(lookupCandidates('0038000138416'), ['0038000138416', '038000138416'])
})

test('normalizeOffProduct — per-serving values win', () => {
  const food = normalizeOffProduct({
    product_name: 'Protein Bar', brands: 'Quest, Quest Nutrition', serving_size: '1 bar (60 g)', serving_quantity: 60,
    nutriments: { 'energy-kcal_serving': 190, proteins_serving: 21, carbohydrates_serving: 22, fat_serving: 8, 'energy-kcal_100g': 317 },
  })
  assert.deepEqual(food, { name: 'Protein Bar', brand: 'Quest', serving_size: '1 bar (60 g)', serving_grams: 60, calories: 190, protein_g: 21, carbs_g: 22, fat_g: 8 })
})

test('normalizeOffProduct — falls back to per 100 g and converts kJ', () => {
  const food = normalizeOffProduct({
    product_name: 'Oats', nutriments: { energy_100g: 1586, proteins_100g: 13.5, carbohydrates_100g: 67, fat_100g: 6.5 },
  })
  assert.equal(food?.serving_size, '100 g')
  assert.equal(food?.calories, 379)
  assert.equal(food?.protein_g, 13.5)
  assert.equal(normalizeOffProduct({ product_name: 'No data' }), null)
  assert.equal(normalizeOffProduct(null), null)
})

test('pickCompareDates — earliest and latest with photos', () => {
  const rows = [
    { id: 'a', entry_date: '2026-10-01', weight_lb: 170, photo_slots: ['front'] },
    { id: 'b', entry_date: '2026-10-08', weight_lb: 171, photo_slots: [] },
    { id: 'c', entry_date: '2026-10-15', weight_lb: 172, photo_slots: ['front', 'side'] },
  ]
  const pair = pickCompareDates(rows)
  assert.deepEqual(pair?.map(p => p.id), ['a', 'c'])
  assert.equal(pickCompareDates(rows.slice(0, 2)), null)
})
