import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('primary_sport, next_competition_at')
    .eq('id', auth.userId)
    .single()

  return NextResponse.json(data || { primary_sport: null, next_competition_at: null })
}

export async function PATCH(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const update: Record<string, unknown> = {}
  if (typeof body.primary_sport === 'string') update.primary_sport = body.primary_sport.trim() || null
  if (body.next_competition_at !== undefined) update.next_competition_at = body.next_competition_at || null

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .update(update)
    .eq('id', auth.userId)
    .select('primary_sport, next_competition_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
