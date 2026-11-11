import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('custom_workouts')
    .select('id, name, category, exercises, times_done, last_done_at, pinned_at')
    .eq('user_id', auth.userId)
    .order('pinned_at', { ascending: false, nullsFirst: false })
    .order('last_done_at', { ascending: false })
    .limit(100)

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!body || typeof body.id !== 'string' || typeof body.pinned !== 'boolean') {
    return NextResponse.json({ error: 'id and pinned are required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('custom_workouts')
    .update({ pinned_at: body.pinned ? new Date().toISOString() : null })
    .eq('id', body.id)
    .eq('user_id', auth.userId)
    .select('id, pinned_at')
    .maybeSingle()

  if (error) return dbError(error)
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}
