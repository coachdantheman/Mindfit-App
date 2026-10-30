import type { SupabaseClient } from '@supabase/supabase-js'
import { format, parseISO } from 'date-fns'

function toDate(value: string): Date | null {
  const d = parseISO(value)
  return Number.isNaN(d.getTime()) ? null : d
}

// Most recent of several ISO dates/timestamps (nulls ignored).
export function latestOf(...dates: (string | null | undefined)[]): string | null {
  let best: Date | null = null
  for (const value of dates) {
    if (!value) continue
    const d = toDate(value)
    if (d && (!best || d > best)) best = d
  }
  return best ? best.toISOString() : null
}

export function formatLastSeen(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return 'Never'
  const d = toDate(iso)
  if (!d) return 'Never'
  const dayStart = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((dayStart(now) - dayStart(d)) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days <= 60) return `${days}d ago`
  return format(d, d.getFullYear() === now.getFullYear() ? 'MMM d' : 'MMM d, yyyy')
}

const stamped = new Map<string, number>()
const TOUCH_INTERVAL_MS = 10 * 60_000

// One UPDATE per user per 10 minutes per server instance. Awaited by the
// caller so a serverless response can't drop it; errors are swallowed.
export async function touchLastSeen(admin: SupabaseClient, userId: string): Promise<void> {
  const now = Date.now()
  const last = stamped.get(userId)
  if (last && now - last < TOUCH_INTERVAL_MS) return
  stamped.set(userId, now)
  try {
    const { error } = await admin
      .from('profiles')
      .update({ last_seen_at: new Date(now).toISOString() })
      .eq('id', userId)
    if (error) stamped.delete(userId)
  } catch {
    stamped.delete(userId)
  }
}
