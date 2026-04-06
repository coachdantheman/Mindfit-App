import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await verifyApiUser('admin', 'coach')
  if (auth instanceof NextResponse) return auth

  const athleteId = params.id
  const admin = createAdminClient()

  if (auth.role === 'coach') {
    const { data: link } = await admin
      .from('coach_athletes')
      .select('id')
      .eq('coach_id', auth.userId)
      .eq('athlete_id', athleteId)
      .single()
    if (!link) return NextResponse.json({ error: 'Not your athlete' }, { status: 403 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .eq('id', athleteId)
    .single()

  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [
    { data: journalEntries },
    { data: foodEntries },
    { data: nutritionGoal },
    { data: workoutLogs },
    { data: sleepEntries },
    { data: vizEntries },
    { data: medEntries },
    { data: goals },
  ] = await Promise.all([
    admin.from('journal_entries').select('*').eq('user_id', athleteId).order('entry_date', { ascending: false }).limit(30),
    admin.from('food_entries').select('*').eq('user_id', athleteId).order('entry_date', { ascending: false }).limit(50),
    admin.from('nutrition_goals').select('*').eq('user_id', athleteId).single(),
    admin.from('workout_logs').select('*, workouts(name), workout_categories(name)').eq('user_id', athleteId).order('log_date', { ascending: false }).limit(30),
    admin.from('sleep_entries').select('*').eq('user_id', athleteId).order('entry_date', { ascending: false }).limit(30),
    admin.from('visualization_entries').select('*').eq('user_id', athleteId).eq('completed', true),
    admin.from('meditation_entries').select('*').eq('user_id', athleteId).eq('completed', true),
    admin.from('goals').select('*').eq('user_id', athleteId),
  ])

  return NextResponse.json({
    profile,
    journalEntries: journalEntries ?? [],
    foodEntries: foodEntries ?? [],
    nutritionGoal: nutritionGoal ?? null,
    workoutLogs: (workoutLogs ?? []).map((l: any) => ({
      ...l,
      workout_name: l.workouts?.name ?? 'Unknown',
      category_name: l.workout_categories?.name ?? 'Unknown',
    })),
    sleepEntries: sleepEntries ?? [],
    vizCount: (vizEntries ?? []).length,
    medCount: (medEntries ?? []).length,
    goalCount: { total: (goals ?? []).length, completed: (goals ?? []).filter((g: any) => g.is_completed).length },
  })
}
