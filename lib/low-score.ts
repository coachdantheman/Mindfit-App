export type Ratings = { motivation: number; focus: number; confidence: number; anxiety: number }
export type LowMetric = 'motivation' | 'focus' | 'confidence'

export const LOW_SCORE = 3
export const OFFER_KEY = 'mf-coach-offer-at'
const OFFER_EVERY_MS = 7 * 86_400_000

// The lowest of the three, when it is low enough to mention. Anxiety of 8 or
// more shows the support note instead (CrisisNote), so nothing is returned.
export function lowMetric(r: Ratings): LowMetric | null {
  if (r.anxiety >= 8) return null
  const order: LowMetric[] = ['motivation', 'focus', 'confidence']
  const lowest = order.reduce((a, b) => (r[b] < r[a] ? b : a))
  return r[lowest] <= LOW_SCORE ? lowest : null
}

// The coaching line is offered at most once a week.
export function offerDue(lastShownMs: number, nowMs: number): boolean {
  return nowMs - lastShownMs >= OFFER_EVERY_MS
}
