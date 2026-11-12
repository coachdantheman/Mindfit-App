import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export function clientIp(req: Request): string {
  return req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
}

const tooMany = () => NextResponse.json({ error: 'Too many requests. Please wait a bit and try again.' }, { status: 429 })

// Returns a 429 response when the key is over its limit, otherwise null.
// Fails open if the database call errors so an outage never locks users out,
// except where `failClosed` is set (sign-in, signup, consent): there a burst
// during an outage is worse than a short wait.
export async function rateLimit(key: string, max: number, windowSeconds: number, opts: { failClosed?: boolean } = {}): Promise<NextResponse | null> {
  const { data, error } = await createAdminClient().rpc('hit_rate_limit', {
    p_key: key, p_max: max, p_window_seconds: windowSeconds,
  })
  if (error) {
    console.error('rate limit check failed:', error.message)
    if (opts.failClosed) return memoryLimit(`fallback:${key}`, max, windowSeconds * 1000)
    return null
  }
  return data === false ? tooMany() : null
}

// Cheap per-instance limiter with no database call, for limits checked on
// every request (each signed-in API call) and as the fallback above.
const hits = new Map<string, { n: number; reset: number }>()
export function memoryLimit(key: string, max: number, windowMs: number): NextResponse | null {
  const now = Date.now()
  const h = hits.get(key)
  if (!h || now > h.reset) {
    if (hits.size > 20_000) hits.clear()
    hits.set(key, { n: 1, reset: now + windowMs })
    return null
  }
  h.n++
  return h.n > max ? tooMany() : null
}

// Daily cap per user on the AI routes.
export function aiQuota(userId: string, route: string, perDay = 30) {
  return rateLimit(`ai:${route}:${userId}`, perDay, 86_400)
}
