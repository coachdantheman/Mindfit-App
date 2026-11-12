import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { managedTeam } from '@/lib/teams'
import { isPlainObject, isUUID, oneOf, optionalString, requireString } from '@/lib/validate'

const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack', 'pregame', 'postgame'] as const
const PLAN_COLS = 'team_id, coach_id, title, meals, notes, updated_at'

// Each slot at most once. Empty texts are dropped; overlong ones are refused.
function parseMeals(raw: unknown): { slot: string; text: string }[] | null {
  if (!Array.isArray(raw)) return null
  const out: { slot: string; text: string }[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (!isPlainObject(item)) return null
    const slot = oneOf(item.slot, SLOTS)
    if (!slot || seen.has(slot) || typeof item.text !== 'string') return null
    seen.add(slot)
    const text = item.text.trim()
    if (text.length > 300) return null
    if (text) out.push({ slot, text })
  }
  return out
}

// The team's plan, or null. Only the team's coach (or an admin) can read it.
export async function GET(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const teamId = new URL(req.url).searchParams.get('team_id') ?? ''
  const admin = createAdminClient()
  const team = isUUID(teamId) ? await managedTeam(admin, auth, teamId) : null
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const { data, error } = await admin.from('team_meal_plans').select(PLAN_COLS).eq('team_id', team.id).maybeSingle()
  if (error) return dbError(error)
  return NextResponse.json(data ?? null)
}

// Creates or replaces the team's plan.
export async function PUT(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const admin = createAdminClient()
  const team = await managedTeam(admin, auth, isUUID(body.team_id) ? body.team_id : '')
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const title = requireString(body.title, 80)
  if (!title) return NextResponse.json({ error: 'Give the plan a title of up to 80 characters.' }, { status: 400 })
  const meals = parseMeals(body.meals)
  if (!meals) return NextResponse.json({ error: 'Check the meals: each slot once, up to 300 characters each.' }, { status: 400 })
  const notes = optionalString(body.notes, 500)

  const { data, error } = await admin.from('team_meal_plans')
    .upsert({
      team_id: team.id,
      coach_id: team.coach_id,
      title,
      meals,
      notes,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'team_id' })
    .select(PLAN_COLS)
    .single()
  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const teamId = new URL(req.url).searchParams.get('team_id') ?? ''
  const admin = createAdminClient()
  const team = isUUID(teamId) ? await managedTeam(admin, auth, teamId) : null
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const { error } = await admin.from('team_meal_plans').delete().eq('team_id', team.id)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
