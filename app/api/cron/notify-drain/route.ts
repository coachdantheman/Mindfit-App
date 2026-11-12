import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { cronAuthorized } from '@/lib/cron-auth'
import { drainQueue } from '@/lib/notify-queue'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Half past each hour: sends anything the hourly run did not get to.
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const results = await drainQueue(createAdminClient(), Date.now() + 240_000)
  return NextResponse.json({ ok: true, results })
}
