import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { loadOverview } from '@/lib/overview-server'
import { boardStatusFor } from '@/lib/leaderboard-server'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const athleteId = params.id
  const tz = new URL(req.url).searchParams.get('tz') ?? ''
  const admin = createAdminClient()

  // Admins see everyone. A coach needs a coach_athletes link; anyone else
  // needs a parent_athletes link and gets a read-only view.
  let viewer: 'admin' | 'coach' | 'parent' = 'parent'
  if (auth.role === 'admin') {
    viewer = 'admin'
  } else {
    const [{ data: coachLink }, { data: parentLink }] = await Promise.all([
      auth.role === 'coach'
        ? admin.from('coach_athletes').select('id').eq('coach_id', auth.userId).eq('athlete_id', athleteId).maybeSingle()
        : Promise.resolve({ data: null }),
      admin.from('parent_athletes').select('id').eq('parent_id', auth.userId).eq('athlete_id', athleteId).maybeSingle(),
    ])
    if (coachLink) viewer = 'coach'
    else if (parentLink) viewer = 'parent'
    else return NextResponse.json({ error: 'Not your athlete' }, { status: 403 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .eq('id', athleteId)
    .single()

  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Flow data: fetch all-time (athletes only run the stack on competition
  // days, so there may be only a handful of entries over many weeks).

  const [
    { data: journalEntries },
    { data: foodEntries },
    { data: nutritionGoal },
    { data: workoutLogs },
    { data: sleepEntries },
    { data: vizEntries },
    { data: medEntries },
    { data: goals },
    { data: flowSessions },
    { data: flowLogs },
    { data: flowStageCheckins },
    { data: coachNote },
    overview,
    board,
  ] = await Promise.all([
    admin.from('journal_entries').select('*').eq('user_id', athleteId).order('entry_date', { ascending: false }).limit(90),
    admin.from('food_entries').select('*').eq('user_id', athleteId).order('entry_date', { ascending: false }).limit(50),
    admin.from('nutrition_goals').select('*').eq('user_id', athleteId).single(),
    admin.from('workout_logs').select('*, exercise_logs(*)').eq('user_id', athleteId).order('log_date', { ascending: false }).limit(30),
    admin.from('sleep_entries').select('*').eq('user_id', athleteId).order('entry_date', { ascending: false }).limit(30),
    admin.from('visualization_entries').select('*').eq('user_id', athleteId).eq('completed', true),
    admin.from('meditation_entries').select('*').eq('user_id', athleteId).eq('completed', true),
    admin.from('goals').select('*').eq('user_id', athleteId),
    admin.from('flow_sessions').select('*').eq('user_id', athleteId).order('started_at', { ascending: false }).limit(1000),
    admin.from('flow_logs').select('*').eq('user_id', athleteId).order('logged_at', { ascending: false }).limit(1000),
    admin.from('flow_stage_checkins').select('*').eq('user_id', athleteId).order('checked_at', { ascending: false }).limit(500),
    viewer === 'parent'
      ? Promise.resolve({ data: null })
      : admin.from('flow_coach_notes').select('*').eq('athlete_id', athleteId).eq('coach_id', auth.userId).maybeSingle(),
    loadOverview(admin, athleteId),
    boardStatusFor(admin, athleteId, tz),
  ])

  return NextResponse.json({
    profile,
    journalEntries: journalEntries ?? [],
    foodEntries: foodEntries ?? [],
    nutritionGoal: nutritionGoal ?? null,
    workoutLogs: (workoutLogs ?? []).map((l: any) => ({
      ...l,
      exercise_logs: (l.exercise_logs ?? []).sort((a: any, b: any) =>
        (a.exercise_order ?? Number.MAX_SAFE_INTEGER) - (b.exercise_order ?? Number.MAX_SAFE_INTEGER)
        || String(a.created_at).localeCompare(String(b.created_at)) || a.set_number - b.set_number),
    })),
    sleepEntries: sleepEntries ?? [],
    vizCount: (vizEntries ?? []).length,
    medCount: (medEntries ?? []).length,
    goalCount: { total: (goals ?? []).length, completed: (goals ?? []).filter((g: any) => g.is_completed).length },
    flowSessions: flowSessions ?? [],
    flowLogs: flowLogs ?? [],
    flowStageCheckins: flowStageCheckins ?? [],
    flowCoachNote: coachNote?.note ?? null,
    overview,
    board,
    readOnly: viewer === 'parent',
  })
}
