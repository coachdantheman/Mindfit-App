import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { loadOverview } from '@/lib/overview-server'
import { refreshScoreThrottled } from '@/lib/leaderboard-scores'

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  // The nav bar asks for this on most screens, which makes it the place to
  // keep the athlete's Board score current (at most once a minute).
  const [overview] = await Promise.all([
    loadOverview(admin, auth.userId),
    auth.role === 'parent' ? null : refreshScoreThrottled(admin, auth.userId, null).catch(() => {}),
  ])
  return NextResponse.json(overview)
}
