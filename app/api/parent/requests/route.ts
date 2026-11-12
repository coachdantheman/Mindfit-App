import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { isPlainObject, isUUID } from '@/lib/validate'

// Athletes who asked to share their progress with this parent (v50).
// Nothing is visible until the parent accepts.
export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('parent_link_requests')
    .select('id, created_at, athlete:profiles!parent_link_requests_athlete_id_fkey(full_name, primary_sport)')
    .eq('parent_id', auth.userId)
    .order('created_at')
  if (error) return dbError(error)
  return NextResponse.json((data ?? []).map((r: any) => ({
    id: r.id,
    athlete_name: r.athlete?.full_name || 'An athlete',
    sport: r.athlete?.primary_sport ?? null,
    created_at: r.created_at,
  })))
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => null)
  if (!isPlainObject(body) || !isUUID(body.id) || typeof body.accept !== 'boolean') {
    return NextResponse.json({ error: 'id and accept are required.' }, { status: 400 })
  }
  if (body.accept && (auth.role === 'coach' || auth.role === 'admin')) {
    return NextResponse.json({ error: 'Coach and admin accounts can’t be added as parents.' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: request } = await admin
    .from('parent_link_requests')
    .select('id, athlete_id')
    .eq('id', body.id)
    .eq('parent_id', auth.userId)
    .maybeSingle()
  if (!request) return NextResponse.json({ error: 'That invite is gone.' }, { status: 404 })

  if (body.accept) {
    const { error } = await admin.from('parent_athletes').insert({ parent_id: auth.userId, athlete_id: request.athlete_id })
    if (error && error.code !== '23505') return dbError(error)
  }
  await admin.from('parent_link_requests').delete().eq('id', request.id)
  return NextResponse.json({ ok: true, accepted: body.accept })
}
