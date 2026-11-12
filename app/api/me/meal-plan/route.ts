import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

// Meal plans for every team the caller is on, with the team name and the coach's first name.
export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()

  const { data: memberships, error: memErr } = await admin.from('team_members').select('team_id').eq('athlete_id', auth.userId)
  if (memErr) return dbError(memErr)
  const teamIds = (memberships ?? []).map(m => m.team_id as string)
  if (teamIds.length === 0) return NextResponse.json([])

  const { data: plans, error } = await admin.from('team_meal_plans')
    .select('team_id, coach_id, title, meals, notes, updated_at')
    .in('team_id', teamIds)
  if (error) return dbError(error)
  const list = plans ?? []
  if (list.length === 0) return NextResponse.json([])

  const [{ data: teams }, { data: coaches }] = await Promise.all([
    admin.from('teams').select('id, name').in('id', list.map(p => p.team_id)),
    admin.from('profiles').select('id, full_name').in('id', [...new Set(list.map(p => p.coach_id as string))]),
  ])
  const teamName = new Map((teams ?? []).map(t => [t.id as string, t.name as string]))
  const coachFirst = new Map((coaches ?? []).map(c => [c.id as string, ((c.full_name as string | null) ?? '').trim().split(/\s+/)[0] || null]))

  return NextResponse.json(list.map(p => ({
    team_id: p.team_id,
    team_name: teamName.get(p.team_id as string) ?? '',
    coach_first_name: coachFirst.get(p.coach_id as string) ?? null,
    title: p.title,
    meals: p.meals,
    notes: p.notes,
    updated_at: p.updated_at,
  })))
}
