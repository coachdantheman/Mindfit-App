import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

// Sleep and practice/game data the Flow State tab compares against flow logs.
export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()
  const since = new Date(Date.now() - 180 * 86_400_000).toISOString().slice(0, 10)
  const [{ data: sleep }, { data: practice }] = await Promise.all([
    admin.from('sleep_entries').select('entry_date, hours_slept').eq('user_id', auth.userId).gte('entry_date', since),
    admin.from('practice_logs').select('kind, flow_log_id').eq('user_id', auth.userId).not('flow_log_id', 'is', null).gte('log_date', since),
  ])
  return NextResponse.json({ sleep: sleep ?? [], practice: practice ?? [] })
}
