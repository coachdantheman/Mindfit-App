import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyLockedApiUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'

const USER_TABLES = [
  'journal_entries', 'weekly_assessments', 'nutrition_goals', 'food_entries', 'food_favorites',
  'weigh_ins', 'workout_logs', 'exercise_logs', 'custom_workouts', 'training_programs', 'athlete_profiles',
  'sleep_entries', 'recovery_entries', 'visualization_entries', 'meditation_entries', 'gratitude_entries',
  'affirmations', 'goals', 'flow_sessions', 'flow_logs', 'flow_cue_words', 'flow_stage_checkins',
  'push_subscriptions', 'practice_logs', 'foods', 'exercise_library',
  'quiz_results', 'notification_prefs', 'notifications', 'progress_snapshots',
  'habits', 'habit_checks', 'supplements', 'supplement_checks', 'vault_prefs', 'athlete_events', 'routine_logs', 'guide_unlocks',
  'notification_log',
]
const ATHLETE_TABLES = ['team_members', 'coach_workouts', 'coach_program_assignments', 'coach_link_requests']

// Everything the app stores about the signed-in user, as one JSON file.
export async function GET() {
  const auth = await verifyLockedApiUser()
  if (auth instanceof NextResponse) return auth
  const limited = await rateLimit(`export:${auth.userId}`, 10, 3600)
  if (limited) return limited
  const admin = createAdminClient()
  const uid = auth.userId
  const rows = async (q: PromiseLike<{ data: unknown[] | null }>) => (await q).data ?? []

  const data: Record<string, unknown> = {}
  const results = await Promise.all(USER_TABLES.map(t => admin.from(t).select('*').eq('user_id', auth.userId)))
  USER_TABLES.forEach((t, i) => { data[t] = results[i].error ? [] : results[i].data })
  const athleteResults = await Promise.all(ATHLETE_TABLES.map(t => admin.from(t).select('*').eq('athlete_id', auth.userId)))
  ATHLETE_TABLES.forEach((t, i) => { data[t] = athleteResults[i].error ? [] : athleteResults[i].data })

  const [profile, savedMeals, photos, coaches, parents, coachNotes] = await Promise.all([
    admin.from('profiles').select('*').eq('id', auth.userId).maybeSingle(),
    admin.from('saved_meals').select('*, saved_meal_items(*)').eq('user_id', auth.userId),
    admin.from('progress_photos').select('id, weigh_in_id, slot, created_at').eq('user_id', auth.userId),
    admin.from('coach_athletes').select('coach_id, created_at').eq('athlete_id', auth.userId),
    admin.from('parent_athletes').select('parent_id, created_at').eq('athlete_id', auth.userId),
    admin.from('flow_coach_notes').select('note, created_at, updated_at').eq('athlete_id', auth.userId),
  ])

  // Programs made for this user by a coach or the AI, with their weeks and workouts.
  const programIds = ((data.training_programs as { id: string }[]) ?? []).map(p => p.id)
  const [programBlocks, programWorkouts, pendingLinks, consents, myReports] = await Promise.all([
    programIds.length ? rows(admin.from('program_blocks').select('*').in('program_id', programIds)) : [],
    programIds.length ? rows(admin.from('program_workouts').select('*').in('program_id', programIds)) : [],
    rows(admin.from('pending_links').select('email, kind, created_at').eq('requester_id', uid)),
    rows(admin.from('parental_consents').select('parent_email, parent_name, relationship, status, sent_at, decided_at, share_coaches, ai_features, leaderboard').eq('athlete_id', uid)),
    rows(admin.from('reports').select('kind, reason, created_at, status').eq('reporter_id', uid)),
  ])

  // What this user created as a coach or parent.
  const teams = await rows(admin.from('teams').select('*').eq('coach_id', uid)) as { id: string }[]
  const teamIds = teams.map(t => t.id)
  const [teamEvents, teamRosters, linkedAthletes, linkedChildren, authoredNotes, authoredWorkouts, authoredAssignments, authoredPrograms, sentRequests] = await Promise.all([
    teamIds.length ? rows(admin.from('team_events').select('*').in('team_id', teamIds)) : [],
    teamIds.length ? rows(admin.from('team_members').select('*').in('team_id', teamIds)) : [],
    rows(admin.from('coach_athletes').select('athlete_id, created_at').eq('coach_id', uid)),
    rows(admin.from('parent_athletes').select('athlete_id, created_at').eq('parent_id', uid)),
    rows(admin.from('flow_coach_notes').select('athlete_id, note, created_at, updated_at').eq('coach_id', uid)),
    rows(admin.from('coach_workouts').select('*').eq('coach_id', uid)),
    rows(admin.from('coach_program_assignments').select('*').eq('coach_id', uid)),
    rows(admin.from('training_programs').select('*').eq('created_by', uid).neq('user_id', uid)),
    rows(admin.from('coach_link_requests').select('*').eq('coach_id', uid)),
  ])

  const payload = {
    exported_at: new Date().toISOString(),
    profile: profile.data,
    saved_meals: savedMeals.data ?? [],
    progress_photos: photos.data ?? [],
    coaches: coaches.data ?? [],
    parents: parents.data ?? [],
    coach_notes: coachNotes.data ?? [],
    program_blocks: programBlocks,
    program_workouts: programWorkouts,
    pending_invites: pendingLinks,
    parental_consents: consents,
    reports_filed: myReports,
    as_coach_or_parent: {
      teams, team_events: teamEvents, team_rosters: teamRosters,
      linked_athletes: linkedAthletes, linked_children: linkedChildren,
      notes_written: authoredNotes, workouts_assigned: authoredWorkouts,
      program_assignments: authoredAssignments, programs_written: authoredPrograms,
      link_requests_sent: sentRequests,
    },
    ...data,
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="mindfit-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
