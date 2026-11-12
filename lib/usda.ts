// USDA FoodData Central search results → the app's food shape. Pure and
// unit-tested. Search results list nutrients per 100 g.

export interface UsdaFood {
  fdc_id: number
  name: string
  brand: string | null
  serving_size: string
  serving_grams: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

const ENERGY = [1008, 2047, 2048]
const PROTEIN = 1003, FAT = 1004, CARBS = 1005
const round1 = (n: number) => Math.round(n * 10) / 10

function titleCase(s: string): string {
  if (s !== s.toUpperCase()) return s
  return s.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_, a, b) => a + b.toUpperCase())
}

export function normalizeUsdaFood(raw: any): UsdaFood | null {
  if (!raw || typeof raw !== 'object' || !Number.isInteger(raw.fdcId) || typeof raw.description !== 'string') return null
  const nutrients: any[] = Array.isArray(raw.foodNutrients) ? raw.foodNutrients : []
  const per100 = (id: number): number | null => {
    const n = nutrients.find(x => x?.nutrientId === id)
    return typeof n?.value === 'number' && n.value >= 0 ? n.value : null
  }
  const kcal = ENERGY.map(per100).find(v => v != null)
  if (kcal == null) return null

  let grams = 100
  let label = '100 g'
  const unit = typeof raw.servingSizeUnit === 'string' ? raw.servingSizeUnit.toLowerCase() : ''
  if (typeof raw.servingSize === 'number' && raw.servingSize > 0 && (unit === 'g' || unit === 'grm' || unit === 'ml' || unit === 'mlt')) {
    grams = raw.servingSize
    const household = typeof raw.householdServingFullText === 'string' ? raw.householdServingFullText.trim().toLowerCase() : ''
    label = household ? `${household} (${round1(grams)} g)` : `${round1(grams)} g`
  } else {
    const measures: any[] = Array.isArray(raw.foodMeasures) ? raw.foodMeasures : []
    const best = measures
      .filter(m => typeof m?.gramWeight === 'number' && m.gramWeight > 0 && typeof m.disseminationText === 'string' && !/not specified/i.test(m.disseminationText))
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))[0]
    if (best) {
      grams = best.gramWeight
      label = `${best.disseminationText.trim()} (${round1(grams)} g)`
    }
  }
  const scale = grams / 100
  const brand = [raw.brandName, raw.brandOwner].find(b => typeof b === 'string' && b.trim())
  return {
    fdc_id: raw.fdcId,
    name: titleCase(raw.description.trim()).slice(0, 120),
    brand: brand ? titleCase(String(brand).trim()).slice(0, 80) : null,
    serving_size: label.slice(0, 60),
    serving_grams: round1(grams),
    calories: Math.round(kcal * scale),
    protein_g: round1((per100(PROTEIN) ?? 0) * scale),
    carbs_g: round1((per100(CARBS) ?? 0) * scale),
    fat_g: round1((per100(FAT) ?? 0) * scale),
  }
}

// Amount typed in grams or ounces → servings of a food with a known gram weight.
export function servingsFromAmount(amount: number, unit: 'g' | 'oz', servingGrams: number): number | null {
  if (!(amount > 0) || !(servingGrams > 0)) return null
  const grams = unit === 'oz' ? amount * 28.3495 : amount
  const servings = Math.round((grams / servingGrams) * 100) / 100
  return servings >= 0.01 && servings <= 50 ? servings : null
}
