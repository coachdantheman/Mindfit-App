import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { loadOverview } from '@/lib/overview-server'
import { boardStatusFor } from '@/lib/leaderboard-server'
import { calcMPI, MPI_DIMENSIONS, type MpiKey } from '@/lib/mpi'
import { bestE1rm, evaluateLift } from '@/lib/strength'
import type { AthleteProfile, ExerciseLibraryRow, StrengthTier } from '@/types/exercise'

type Admin = ReturnType<typeof createAdminClient>

const DIM_COLS = MPI_DIMENSIONS.map(d => d.key).join(', ')

type AssessmentRow = { week_date: string; assessment_type: string } & Partial<Record<MpiKey, number>>

function localToday(tz: string): string {
  try {
    if (tz) return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
  } catch {}
  return new Date().toISOString().slice(0, 10)
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

async function loadMpi(admin: Admin, athleteId: string) {
  const base = admin.from('weekly_assessments').select(`week_date, assessment_type, ${DIM_COLS}`).eq('user_id', athleteId)
  const [{ data: weekly }, { data: baseline }] = await Promise.all([
    base.eq('assessment_type', 'weekly').order('week_date', { ascending: false }).limit(8),
    admin.from('weekly_assessments').select(`week_date, assessment_type, ${DIM_COLS}`).eq('user_id', athleteId)
      .eq('assessment_type', 'baseline').order('week_date', { ascending: true }).limit(1).maybeSingle(),
  ])
  const withMpi = (r: AssessmentRow) => ({ ...r, mpi: calcMPI(r) })
  return {
    weekly: ((weekly ?? []) as unknown as AssessmentRow[]).map(withMpi),
    baseline: baseline ? withMpi(baseline as unknown as AssessmentRow) : null,
  }
}

export interface StrengthTierRow { exercise_id: string; exercise_name: string; tier: StrengthTier }

// Tier math matches app/api/exercise/progress/route.ts. Sets are fetched per
// exercise, heaviest then most reps first, so the 1000-row response cap only
// drops sets that cannot be the best one. Bodyweight and age are used here
// only and are never returned.
async function loadStrengthTiers(admin: Admin, athleteId: string): Promise<StrengthTierRow[]> {
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString()
  const { data: recent } = await admin.from('exercise_logs').select('exercise_id')
    .eq('user_id', athleteId).gte('created_at', since).not('exercise_id', 'is', null)
    .order('created_at', { ascending: false }).limit(1000)
  const ids = [...new Set((recent ?? []).map(r => r.exercise_id as string))]
  if (ids.length === 0) return []

  const [{ data: lib }, { data: profile }, setResults] = await Promise.all([
    admin.from('exercise_library').select('*').in('id', ids),
    admin.from('athlete_profiles').select('*').eq('user_id', athleteId).maybeSingle(),
    Promise.all(ids.map(id =>
      admin.from('exercise_logs').select('reps, weight, created_at')
        .eq('user_id', athleteId).eq('exercise_id', id)
        .order('weight', { ascending: false, nullsFirst: false }).order('reps', { ascending: false, nullsFirst: false }).limit(1000)
    )),
  ])
  const ap = profile as AthleteProfile | null
  if (!ap) return []
  const setsById = new Map(ids.map((id, i) => [id, setResults[i].data ?? []]))

  const out: StrengthTierRow[] = []
  for (const ex of (lib ?? []) as ExerciseLibraryRow[]) {
    if (!ex.standard_key || ex.measure === 'distance_time') continue
    const rows = (setsById.get(ex.id) ?? [])
      .map(s => ({ reps: s.reps as number | null, weight: s.weight == null ? null : Number(s.weight) }))
    const weighted = ex.measure === 'weight_reps'
    const best = weighted
      ? bestE1rm(rows)
      : Math.max(0, ...rows.map(r => Number(ex.measure === 'distance_in' ? r.weight : r.reps) || 0))
    if (best <= 0) continue
    const evaluation = weighted
      ? evaluateLift({ key: ex.standard_key, sex: ap.sex, bodyweight_lb: Number(ap.bodyweight_lb), age: ap.age, weight: best, reps: 1 })
      : evaluateLift({ key: ex.standard_key, sex: ap.sex, bodyweight_lb: Number(ap.bodyweight_lb), age: ap.age, value: best })
    out.push({ exercise_id: ex.id, exercise_name: ex.name, tier: evaluation.tier })
  }
  return out.sort((a, b) => a.exercise_name.localeCompare(b.exercise_name))
}

export interface UpcomingItem {
  id: string
  source: 'athlete' | 'team'
  kind: string
  title: string | null
  date: string
  start_time: string | null
  opponent: string | null
  location: string | null
  team_name: string | null
}

async function loadUpcoming(admin: Admin, athleteId: string, from: string, to: string): Promise<UpcomingItem[]> {
  const { data: memberships } = await admin.from('team_members').select('team_id').eq('athlete_id', athleteId)
  const teamIds = (memberships ?? []).map(m => m.team_id as string)

  const [{ data: own }, { data: teamEv }, { data: teams }, { data: anyTeamEv }] = await Promise.all([
    admin.from('athlete_events').select('id, tier, kind, title, event_date, start_time, opponent, location')
      .eq('user_id', athleteId).gte('event_date', from).lte('event_date', to).order('event_date').limit(100),
    teamIds.length
      ? admin.from('team_events').select('id, team_id, kind, event_date, start_time, opponent, location')
          .in('team_id', teamIds).gte('event_date', from).lte('event_date', to).order('event_date').limit(100)
      : Promise.resolve({ data: [] }),
    teamIds.length
      ? admin.from('teams').select('id, name').in('id', teamIds)
      : Promise.resolve({ data: [] }),
    teamIds.length
      ? admin.from('team_events').select('id').in('team_id', teamIds).limit(1)
      : Promise.resolve({ data: [] }),
  ])
  // Same rule as /api/me/events: once a coach posts a team schedule, it
  // replaces the athlete's own primary events.
  const coachSchedule = (anyTeamEv ?? []).length > 0
  const teamName = new Map((teams ?? []).map(t => [t.id as string, t.name as string]))

  const items: UpcomingItem[] = [
    ...(own ?? []).filter(e => !(coachSchedule && e.tier === 'primary')).map((e): UpcomingItem => ({
      id: e.id, source: 'athlete', kind: e.kind, title: e.title, date: e.event_date,
      start_time: e.start_time?.slice(0, 5) ?? null, opponent: e.opponent, location: e.location, team_name: null,
    })),
    ...(teamEv ?? []).map((e): UpcomingItem => ({
      id: e.id, source: 'team', kind: e.kind, title: null, date: e.event_date,
      start_time: e.start_time?.slice(0, 5) ?? null, opponent: e.opponent, location: e.location,
      team_name: teamName.get(e.team_id) ?? null,
    })),
  ]
  return items.sort((a, b) => a.date.localeCompare(b.date) || (a.start_time ?? '').localeCompare(b.start_time ?? ''))
}

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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

  const today = localToday(tz)

  // Flow data: fetch all-time (athletes only run the stack on competition
  // days, so there may be only a handful of entries over many weeks).

  const [
    { data: journalEntries },
    { data: foodEntries },
    { data: nutritionTargets },
    { data: workoutLogs },
    { data: sleepEntries },
    { data: vizEntries },
    { data: goals },
    { data: flowSessions },
    { data: flowLogs },
    { data: flowStageCheckins },
    { data: coachNote },
    { data: tierUpLogs },
    { data: gameLogs },
    mpi,
    strengthTiers,
    upcoming,
    overview,
    board,
  ] = await Promise.all([
    admin.from('journal_entries').select('*').eq('user_id', athleteId).order('entry_date', { ascending: false }).limit(90),
    admin.from('food_entries').select('entry_date, calories, protein_g, carbs_g, fat_g')
      .eq('user_id', athleteId).gte('entry_date', addDays(today, -29)),
    admin.from('nutrition_goals').select('calories, protein_g, carbs_g, fat_g').eq('user_id', athleteId).maybeSingle(),
    admin.from('workout_logs').select('*, exercise_logs(*)').eq('user_id', athleteId).order('log_date', { ascending: false }).limit(30),
    admin.from('sleep_entries').select('*').eq('user_id', athleteId).order('entry_date', { ascending: false }).limit(30),
    admin.from('visualization_entries').select('*').eq('user_id', athleteId).eq('completed', true).order('entry_date', { ascending: false }),
    admin.from('goals').select('*').eq('user_id', athleteId),
    admin.from('flow_sessions').select('*').eq('user_id', athleteId).order('started_at', { ascending: false }).limit(1000),
    admin.from('flow_logs').select('*').eq('user_id', athleteId).order('logged_at', { ascending: false }).limit(1000),
    admin.from('flow_stage_checkins').select('*').eq('user_id', athleteId).order('checked_at', { ascending: false }).limit(500),
    viewer === 'parent'
      ? Promise.resolve({ data: null })
      : admin.from('flow_coach_notes').select('*').eq('athlete_id', athleteId).eq('coach_id', auth.userId).maybeSingle(),
    admin.from('workout_logs').select('id, log_date, workout_name, tier_ups').eq('user_id', athleteId)
      .gt('tier_ups', 0).gte('log_date', addDays(today, -30)).order('log_date', { ascending: false }),
    admin.from('practice_logs').select('log_date, opponent, result, score, performance, flow_log_id')
      .eq('user_id', athleteId).eq('kind', 'game').order('log_date', { ascending: false }).limit(10),
    loadMpi(admin, athleteId),
    loadStrengthTiers(admin, athleteId),
    loadUpcoming(admin, athleteId, today, addDays(today, 13)),
    loadOverview(admin, athleteId),
    boardStatusFor(admin, athleteId, tz),
  ])

  const flowLogList = flowLogs ?? []

  return NextResponse.json({
    profile,
    journalEntries: journalEntries ?? [],
    foodEntries: foodEntries ?? [],
    nutritionTargets: nutritionTargets ?? null,
    workoutLogs: (workoutLogs ?? []).map((l: any) => ({
      ...l,
      exercise_logs: (l.exercise_logs ?? []).sort((a: any, b: any) =>
        (a.exercise_order ?? Number.MAX_SAFE_INTEGER) - (b.exercise_order ?? Number.MAX_SAFE_INTEGER)
        || String(a.created_at).localeCompare(String(b.created_at)) || a.set_number - b.set_number),
    })),
    sleepEntries: sleepEntries ?? [],
    visualizationEntries: vizEntries ?? [],
    goalCount: { total: (goals ?? []).length, completed: (goals ?? []).filter((g: any) => g.is_completed).length },
    mpi,
    strengthTiers,
    tierUps: tierUpLogs ?? [],
    flowSessions: flowSessions ?? [],
    flowLogs: flowLogList,
    recentFlowLogs: flowLogList.slice(0, 20).map(l => ({
      id: l.id, logged_at: l.logged_at, challenge_level: l.challenge_level,
      skill_level: l.skill_level, flow_score: l.flow_score, sport: l.sport,
    })),
    flowStageCheckins: flowStageCheckins ?? [],
    flowCoachNote: coachNote?.note ?? null,
    recentGames: gameLogs ?? [],
    upcoming,
    overview,
    board,
    readOnly: viewer === 'parent',
  })
}
