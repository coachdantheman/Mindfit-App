// Calendar date in the user's local timezone. Never use toISOString() for
// entry dates: it is UTC, so an evening entry in the US lands on tomorrow.
export function localDateISO(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
