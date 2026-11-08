import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { purgeExpiredConsents } from '@/lib/consent'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ removed: await purgeExpiredConsents(createAdminClient()) })
}
