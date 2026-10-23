import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { optionalString, requireString } from '@/lib/validate'
import { matchExercise } from '@/lib/exercise-library'
import type { ExerciseLibraryRow } from '@/types/exercise'

const MUSCLE_GROUPS = ['chest', 'back', 'shoulders', 'arms', 'legs', 'glutes', 'core', 'full_body', 'conditioning', 'mobility']
const MEASURES = ['weight_reps', 'reps', 'distance_in', 'time_sec']

async function loadLibrary(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data, error } = await admin
    .from('exercise_library')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .order('name')
    .limit(2000)
  return { rows: (data ?? []) as ExerciseLibraryRow[], error }
}

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()
  const { rows, error } = await loadLibrary(admin, auth.userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const name = requireString(body.name, 80)
  if (!name) return NextResponse.json({ error: 'Exercise name is required.' }, { status: 400 })
  const muscle_group = MUSCLE_GROUPS.includes(body.muscle_group) ? body.muscle_group : 'full_body'
  const measure = MEASURES.includes(body.measure) ? body.measure : 'weight_reps'
  const equipment = optionalString(body.equipment, 40) ?? 'none'

  const admin = createAdminClient()
  const { rows, error: loadErr } = await loadLibrary(admin, auth.userId)
  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 })

  const existing = matchExercise(rows, name)
  if (existing) return NextResponse.json(existing)

  const { data, error } = await admin
    .from('exercise_library')
    .insert({ user_id: auth.userId, name, aliases: [], muscle_group, equipment, measure, source: 'user' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
