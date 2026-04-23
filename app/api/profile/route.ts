import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

const FIELDS = ['full_name', 'primary_sport', 'secondary_sport', 'next_competition_at'] as const

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id, email, full_name, role, primary_sport, secondary_sport, next_competition_at, created_at')
    .eq('id', auth.userId)
    .single()

  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const update: Record<string, unknown> = {}
  for (const key of FIELDS) {
    if (body[key] !== undefined) {
      update[key] = typeof body[key] === 'string' ? (body[key].trim() || null) : body[key]
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .update(update)
    .eq('id', auth.userId)
    .select('id, email, full_name, role, primary_sport, secondary_sport, next_competition_at, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
