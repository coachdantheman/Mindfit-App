// EAN-8 / UPC-A / EAN-13 / GTIN-14 with a valid mod-10 check digit.
export function isValidBarcode(code: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false
  const digits = code.split('').map(Number)
  const check = digits.pop()!
  let sum = 0
  for (let i = digits.length - 1, w = 3; i >= 0; i--, w = 4 - w) sum += digits[i] * w
  return (10 - (sum % 10)) % 10 === check
}

// Codes to try against Open Food Facts: the code as typed and, for
// UPC-A, the EAN-13 form with a leading zero (OFF stores both).
export function lookupCandidates(code: string): string[] {
  const c = code.replace(/\D/g, '')
  const out = [c]
  if (c.length === 12) out.push('0' + c)
  if (c.length === 13 && c.startsWith('0')) out.push(c.slice(1))
  return [...new Set(out)]
}

export interface BarcodeFood {
  name: string
  brand: string | null
  serving_size: string
  serving_grams: number | null
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

interface OffProduct {
  product_name?: string
  product_name_en?: string
  brands?: string
  serving_size?: string
  serving_quantity?: number | string
  nutriments?: Record<string, number | string | undefined>
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? n : null
}
const round1 = (n: number) => Math.round(n * 10) / 10

// Normalize an Open Food Facts product to the foods shape. Per-serving
// values win; otherwise per 100 g with the serving labeled as such.
export function normalizeOffProduct(p: OffProduct | null | undefined): BarcodeFood | null {
  if (!p) return null
  const name = (p.product_name || p.product_name_en || '').trim()
  if (!name) return null
  const n = p.nutriments ?? {}
  const servingGrams = num(p.serving_quantity)
  const perServing = num(n['energy-kcal_serving']) ?? (num(n['energy_serving']) != null ? num(n['energy_serving'])! / 4.184 : null)
  const usePerServing = perServing != null && (num(n['proteins_serving']) != null || num(n['carbohydrates_serving']) != null)

  const pick = (key: string) => usePerServing ? num(n[`${key}_serving`]) : num(n[`${key}_100g`])
  const kcal = usePerServing
    ? perServing!
    : num(n['energy-kcal_100g']) ?? (num(n['energy_100g']) != null ? num(n['energy_100g'])! / 4.184 : null)
  if (kcal == null) return null

  const servingLabel = usePerServing
    ? (p.serving_size?.trim() || (servingGrams ? `${servingGrams} g` : '1 serving'))
    : '100 g'

  return {
    name: name.slice(0, 120),
    brand: p.brands ? p.brands.split(',')[0].trim().slice(0, 80) || null : null,
    serving_size: servingLabel.slice(0, 60),
    serving_grams: usePerServing ? servingGrams : 100,
    calories: Math.max(0, Math.round(kcal)),
    protein_g: round1(Math.max(0, pick('proteins') ?? 0)),
    carbs_g: round1(Math.max(0, pick('carbohydrates') ?? 0)),
    fat_g: round1(Math.max(0, pick('fat') ?? 0)),
  }
}
