import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { liveStreak, timezoneFor } from '@/lib/leaderboard-scores'
import { monthBounds, shiftDayBy, todayIn } from '@/lib/leaderboard'

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()

  const { data: links } = await admin.from('parent_athletes').select('athlete_id').eq('parent_id', auth.userId)
  const ids = (links ?? []).map(l => l.athlete_id)
  if (ids.length === 0) return NextResponse.json([])

  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, email, full_name, primary_sport, created_at, onboarded_at, last_seen_at, journal_entries(count)')
    .in('id', ids)
    .order('created_at', { ascending: false })
  if (error) return dbError(error)

  const tz = await timezoneFor(admin, auth.userId)
  const today = todayIn(tz)
  const weekAgo = shiftDayBy(today, -6)
  const { data: scores } = await admin
    .from('leaderboard_scores')
    .select('user_id, points, streak, last_active_day, recent_days')
    .in('user_id', ids)
    .eq('month', monthBounds(new Date(), tz).month)
  const scoreOf = new Map((scores ?? []).map((s: any) => [s.user_id, s]))

  return NextResponse.json((profiles ?? []).map((p: any) => {
    const s = scoreOf.get(p.id)
    return {
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      primary_sport: p.primary_sport,
      created_at: p.created_at,
      onboarded_at: p.onboarded_at,
      last_seen_at: p.last_seen_at,
      entry_count: p.journal_entries?.[0]?.count ?? 0,
      streak: s ? liveStreak(s, today) : 0,
      month_points: s?.points ?? 0,
      active_days_week: s ? (s.recent_days ?? []).filter((d: string) => d >= weekAgo && d <= today).length : 0,
    }
  }))
}
