export const CONSENT_AGE = 13
export const CONSENT_WINDOW_DAYS = 14

export type ConsentStatus = 'not_required' | 'pending' | 'granted'

// Only month and year are asked, so assume the latest possible birthday
// in that month: a child is treated as 13 only once they certainly are.
export function ageOn(birthYear: number, birthMonth: number, now = new Date()): number {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() + 1
  return y - birthYear - (m > birthMonth ? 0 : 1)
}

export function isUnder13(p: { birth_year?: number | null; birth_month?: number | null }, now = new Date()): boolean {
  if (p.birth_year == null || p.birth_month == null) return false
  return ageOn(p.birth_year, p.birth_month, now) < CONSENT_AGE
}

export function validBirth(year: unknown, month: unknown, now = new Date()): { year: number; month: number } | null {
  const y = Number(year)
  const m = Number(month)
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return null
  const thisYear = now.getUTCFullYear()
  if (y < thisYear - 100 || y > thisYear) return null
  if (y === thisYear && m > now.getUTCMonth() + 1) return null
  return { year: y, month: m }
}

export function consentExpired(requestedAt: string | null, now = new Date()): boolean {
  if (!requestedAt) return false
  return now.getTime() - new Date(requestedAt).getTime() > CONSENT_WINDOW_DAYS * 24 * 60 * 60 * 1000
}
