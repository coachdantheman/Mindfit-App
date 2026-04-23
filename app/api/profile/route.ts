import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

const FIELDS = ['full_name', 'primary_sport', 'secondary_sport', 'next_competition_at'] as const

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  // select('*') avoids naming individual columns so a missing-column entry
  // in the PostgREST schema cache (which has been flaky after new migrations)
  // does not break this endpoint.
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('*')
    .eq('id', auth.userId)
    .single()

  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  for (const key of FIELDS) {
    if (body[key] !== undefined) {
      updates[key] = typeof body[key] === 'string' ? body[key].trim() : body[key]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 })
  }

  // Route through an RPC function so PostgREST only needs the function
  // signature in its schema cache, not each profile column. Future schema
  // changes (e.g. new sport-related fields) won't break this endpoint
  // even if the PostgREST cache hasn't picked them up yet.
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('update_user_profile', {
    p_user_id: auth.userId,
    updates,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // RPC with SETOF returns an array; take the first row.
  const row = Array.isArray(data) ? data[0] : data
  return NextResponse.json(row)
}
