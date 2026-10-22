export interface EstimateItem {
  name: string
  serving_size: string
  servings: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  confidence: 'low' | 'medium' | 'high'
}

// Pull the JSON object out of a model reply that may wrap it in a fence or prose.
export function extractJson(text: string): unknown {
  let jsonStr = text
  const fence = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (fence) {
    jsonStr = fence[1]
  } else {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start !== -1 && end > start) jsonStr = text.slice(start, end + 1)
  }
  return JSON.parse(jsonStr.trim())
}

const num = (v: unknown, min: number, max: number, fallback = 0): number => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

export function sanitizeEstimate(obj: unknown): EstimateItem | null {
  if (!obj || typeof obj !== 'object') return null
  const o = obj as Record<string, unknown>
  const name = typeof o.name === 'string' ? o.name.trim().slice(0, 120) : ''
  if (!name) return null
  const confidence = o.confidence === 'high' || o.confidence === 'medium' ? o.confidence : 'low'
  return {
    name,
    serving_size: typeof o.serving_size === 'string' && o.serving_size.trim() ? o.serving_size.trim().slice(0, 60) : '1 serving',
    servings: num(o.servings, 0.1, 50, 1),
    calories: Math.round(num(o.calories, 0, 3000)),
    protein_g: Math.round(num(o.protein_g, 0, 300) * 10) / 10,
    carbs_g: Math.round(num(o.carbs_g, 0, 300) * 10) / 10,
    fat_g: Math.round(num(o.fat_g, 0, 300) * 10) / 10,
    confidence,
  }
}
