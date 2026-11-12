const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isEmail(value: unknown): value is string {
  return typeof value === 'string' && EMAIL_RE.test(value.trim())
}

export function requireString(value: unknown, maxLen = 2000): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > maxLen) return null
  return trimmed
}

export function optionalString(value: unknown, maxLen = 2000): string | null {
  if (value === undefined || value === null || value === '') return null
  return requireString(value, maxLen)
}

export function clampNumber(value: unknown, min: number, max: number): number | null {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.min(max, Math.max(min, n))
}

export function isISODate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value))
}

export function intOrNull(value: unknown, min: number, max: number): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = clampNumber(value, min, max)
  return n === null ? null : Math.round(n)
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isDateTime(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && !isNaN(Date.parse(value))
}

export function isUUID(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value)
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null
}
