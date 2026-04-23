import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

export async function GET(req: Request) {
  const auth = await verifyApiUser('admin', 'coach')
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const athleteId = searchParams.get('athlete_id')
  if (!athleteId) return NextResponse.json({ error: 'athlete_id required' }, { status: 400 })

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

  const { data } = await admin
    .from('flow_coach_notes')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('coach_id', auth.userId)
    .maybeSingle()

  return NextResponse.json(data)
}

export async function PUT(req: Request) {
  const auth = await verifyApiUser('admin', 'coach')
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  if (!body.athlete_id || typeof body.note !== 'string') {
    return NextResponse.json({ error: 'athlete_id and note required' }, { status: 400 })
  }

  const admin = createAdminClient()

  if (auth.role === 'coach') {
    const { data: link } = await admin
      .from('coach_athletes')
      .select('id')
      .eq('coach_id', auth.userId)
      .eq('athlete_id', body.athlete_id)
      .single()
    if (!link) return NextResponse.json({ error: 'Not your athlete' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('flow_coach_notes')
    .upsert({
      athlete_id: body.athlete_id,
      coach_id: auth.userId,
      note: body.note,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'athlete_id,coach_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
