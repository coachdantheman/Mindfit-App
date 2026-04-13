import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

export async function GET() {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('coach_workouts')
    .select('*, athlete:profiles!coach_workouts_athlete_id_fkey(full_name, email)')
    .eq('coach_id', auth.userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  if (!body.athlete_id || !body.name?.trim()) {
    return NextResponse.json({ error: 'Athlete and workout name are required' }, { status: 400 })
  }

  // Verify coach-athlete relationship
  const admin = createAdminClient()
  const { data: link } = await admin
    .from('coach_athletes')
    .select('id')
    .eq('coach_id', auth.userId)
    .eq('athlete_id', body.athlete_id)
    .single()

  if (!link) {
    return NextResponse.json({ error: 'Athlete not linked to your account' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('coach_workouts')
    .insert({
      coach_id: auth.userId,
      athlete_id: body.athlete_id,
      name: body.name.trim(),
      description: body.description || null,
      exercises: body.exercises || [],
      assigned_date: body.assigned_date || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth

  const { id } = await req.json()
  const admin = createAdminClient()

  const { error } = await admin
    .from('coach_workouts')
    .delete()
    .eq('id', id)
    .eq('coach_id', auth.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
