import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('coach_workouts')
    .select('*')
    .eq('athlete_id', auth.userId)
    .eq('is_completed', false)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { id } = await req.json()
  const admin = createAdminClient()

  const { error } = await admin
    .from('coach_workouts')
    .update({ is_completed: true })
    .eq('id', id)
    .eq('athlete_id', auth.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
