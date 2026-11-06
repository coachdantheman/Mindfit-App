import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

// Upcoming games and practices for every team this athlete is on,
// from yesterday through the next 120 days.
export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()
  const { data: memberships } = await admin.from('team_members').select('team_id').eq('athlete_id', auth.userId)
  const teamIds = (memberships ?? []).map(m => m.team_id)
  if (teamIds.length === 0) return NextResponse.json([])

  const from = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  const to = new Date(Date.now() + 120 * 86_400_000).toISOString().slice(0, 10)
  const [{ data: teams }, { data: events }] = await Promise.all([
    admin.from('teams').select('id, name').in('id', teamIds),
    admin.from('team_events').select('id, team_id, kind, event_date, start_time, opponent, location, home_away, notes')
      .in('team_id', teamIds).gte('event_date', from).lte('event_date', to).order('event_date').limit(400),
  ])
  const name = new Map((teams ?? []).map(t => [t.id, t.name]))
  return NextResponse.json((events ?? []).map(e => ({ ...e, start_time: e.start_time?.slice(0, 5) ?? null, team_name: name.get(e.team_id) ?? '' })))
}
