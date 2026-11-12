import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeUsdaFood, servingsFromAmount } from '../lib/usda'

const n = (nutrientId: number, value: number) => ({ nutrientId, value })

test('survey food uses its best household measure', () => {
  const f = normalizeUsdaFood({
    fdcId: 2705968, description: 'Chicken breast, grilled without sauce, skin not eaten', dataType: 'Survey (FNDDS)',
    foodNutrients: [n(1003, 29.62), n(1004, 5.45), n(1005, 0), n(1008, 176)],
    foodMeasures: [
      { disseminationText: 'Quantity not specified', gramWeight: 130, rank: 1 },
      { disseminationText: '1 medium breast', gramWeight: 120, rank: 3 },
      { disseminationText: '1 large or thick slice', gramWeight: 85, rank: 7 },
    ],
  })
  assert.ok(f)
  assert.equal(f!.serving_size, '1 medium breast (120 g)')
  assert.equal(f!.calories, 211)
  assert.equal(f!.protein_g, 35.5)
  assert.equal(f!.brand, null)
})

test('branded food uses the label serving and tidies shouting names', () => {
  const f = normalizeUsdaFood({
    fdcId: 1, description: 'GREEK YOGURT, PLAIN', brandOwner: 'ACME DAIRY', servingSize: 170, servingSizeUnit: 'g', householdServingFullText: '1 CONTAINER',
    foodNutrients: [n(1008, 59), n(1003, 10), n(1004, 0.4), n(1005, 3.6)],
  })
  assert.equal(f!.name, 'Greek Yogurt, Plain')
  assert.equal(f!.brand, 'Acme Dairy')
  assert.equal(f!.serving_size, '1 container (170 g)')
  assert.equal(f!.calories, 100)
  assert.equal(f!.protein_g, 17)
})

test('falls back to 100 g and to Atwater energy; rejects food with no energy', () => {
  const f = normalizeUsdaFood({ fdcId: 2, description: 'Rice, white, cooked', foodNutrients: [n(2047, 130), n(1003, 2.7)] })
  assert.equal(f!.serving_size, '100 g')
  assert.equal(f!.calories, 130)
  assert.equal(normalizeUsdaFood({ fdcId: 3, description: 'x', foodNutrients: [n(1003, 5)] }), null)
  assert.equal(normalizeUsdaFood(null), null)
})

test('servingsFromAmount converts grams and ounces', () => {
  assert.equal(servingsFromAmount(150, 'g', 100), 1.5)
  assert.equal(servingsFromAmount(6, 'oz', 120), 1.42)
  assert.equal(servingsFromAmount(0, 'g', 100), null)
  assert.equal(servingsFromAmount(100, 'g', 0), null)
})
