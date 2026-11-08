import { NextResponse } from 'next/server'
import { cronAuthorized } from '@/lib/cron-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { purgeExpiredConsents } from '@/lib/consent'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = createAdminClient()
  const removed = await purgeExpiredConsents(admin)
  await admin.from('rate_limits').delete().lt('window_start', new Date(Date.now() - 2 * 86_400_000).toISOString())
  return NextResponse.json({ removed })
}
