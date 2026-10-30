import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

const USER_TABLES = [
  'journal_entries', 'weekly_assessments', 'nutrition_goals', 'food_entries', 'food_favorites',
  'weigh_ins', 'workout_logs', 'exercise_logs', 'training_programs', 'athlete_profiles',
  'sleep_entries', 'recovery_entries', 'visualization_entries', 'meditation_entries',
  'affirmations', 'goals', 'flow_sessions', 'flow_logs', 'flow_cue_words', 'flow_stage_checkins',
  'push_subscriptions',
]

// Everything the app stores about the signed-in user, as one JSON file.
export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()

  const data: Record<string, unknown> = {}
  const results = await Promise.all(USER_TABLES.map(t => admin.from(t).select('*').eq('user_id', auth.userId)))
  USER_TABLES.forEach((t, i) => { data[t] = results[i].error ? [] : results[i].data })

  const [profile, savedMeals, photos, coaches, parents, coachNotes] = await Promise.all([
    admin.from('profiles').select('*').eq('id', auth.userId).maybeSingle(),
    admin.from('saved_meals').select('*, saved_meal_items(*)').eq('user_id', auth.userId),
    admin.from('progress_photos').select('id, weigh_in_id, slot, created_at').eq('user_id', auth.userId),
    admin.from('coach_athletes').select('coach_id, created_at').eq('athlete_id', auth.userId),
    admin.from('parent_athletes').select('parent_id, created_at').eq('athlete_id', auth.userId),
    admin.from('flow_coach_notes').select('note, created_at, updated_at').eq('athlete_id', auth.userId),
  ])

  const payload = {
    exported_at: new Date().toISOString(),
    profile: profile.data,
    saved_meals: savedMeals.data ?? [],
    progress_photos: photos.data ?? [],
    coaches: coaches.data ?? [],
    parents: parents.data ?? [],
    coach_notes: coachNotes.data ?? [],
    ...data,
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="mindfit-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
