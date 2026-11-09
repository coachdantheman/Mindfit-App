import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

// Upcoming games and practices for every team this athlete is on,
// from yesterday through the next 120 days. With no team events, the
// athlete's own primary games and practices stand in for them.
export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()
  const { data: memberships } = await admin.from('team_members').select('team_id').eq('athlete_id', auth.userId)
  const teamIds = (memberships ?? []).map(m => m.team_id)

  const from = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  const to = new Date(Date.now() + 120 * 86_400_000).toISOString().slice(0, 10)
  if (teamIds.length > 0) {
    const [{ data: teams }, { data: events }] = await Promise.all([
      admin.from('teams').select('id, name').in('id', teamIds),
      admin.from('team_events').select('id, team_id, kind, event_date, start_time, opponent, location, home_away, notes')
        .in('team_id', teamIds).gte('event_date', from).lte('event_date', to).order('event_date').limit(400),
    ])
    const hasCoachSchedule = (events ?? []).length > 0
      || ((await admin.from('team_events').select('id').in('team_id', teamIds).limit(1)).data ?? []).length > 0
    if (hasCoachSchedule) {
      const name = new Map((teams ?? []).map(t => [t.id, t.name]))
      return NextResponse.json((events ?? []).map(e => ({ ...e, start_time: e.start_time?.slice(0, 5) ?? null, team_name: name.get(e.team_id) ?? '' })))
    }
  }

  const { data: own } = await admin.from('athlete_events')
    .select('id, kind, event_date, start_time, opponent, location, home_away, notes')
    .eq('user_id', auth.userId).eq('tier', 'primary')
    .gte('event_date', from).lte('event_date', to).order('event_date').limit(400)
  return NextResponse.json((own ?? []).map(e => ({
    id: e.id,
    team_id: '',
    team_name: 'My schedule',
    kind: e.kind,
    event_date: e.event_date,
    start_time: e.start_time?.slice(0, 5) ?? null,
    opponent: e.opponent,
    location: e.location,
    home_away: e.home_away,
    notes: e.notes,
  })))
}
