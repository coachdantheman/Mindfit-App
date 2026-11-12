import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { clientIp, memoryLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// For an uptime monitor: 200 when the app can reach its database.
export async function GET(req: Request) {
  const limited = memoryLimit(`health:${clientIp(req)}`, 30, 60_000)
  if (limited) return limited
  const started = Date.now()
  const { error } = await createAdminClient().from('lessons').select('id', { head: true, count: 'exact' }).limit(1)
  return NextResponse.json({ ok: !error, db_ms: Date.now() - started }, { status: error ? 503 : 200 })
}
