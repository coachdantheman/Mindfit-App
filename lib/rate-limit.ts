import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export function clientIp(req: Request): string {
  return req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
}

// Returns a 429 response when the key is over its limit, otherwise null.
// Fails open if the database call errors so an outage never locks users out.
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<NextResponse | null> {
  const { data, error } = await createAdminClient().rpc('hit_rate_limit', {
    p_key: key, p_max: max, p_window_seconds: windowSeconds,
  })
  if (error) {
    console.error('rate limit check failed:', error.message)
    return null
  }
  return data === false
    ? NextResponse.json({ error: 'Too many requests. Please wait a bit and try again.' }, { status: 429 })
    : null
}

// Daily cap per user on the AI routes.
export function aiQuota(userId: string, route: string, perDay = 30) {
  return rateLimit(`ai:${route}:${userId}`, perDay, 86_400)
}
