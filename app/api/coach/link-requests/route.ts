import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

// Athletes this coach invited who haven't accepted yet.
export async function GET() {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth

  const { data, error } = await createAdminClient()
    .from('coach_link_requests')
    .select('id, created_at, athlete:profiles!coach_link_requests_athlete_id_fkey(full_name, email), team:teams(name)')
    .eq('coach_id', auth.userId)
    .order('created_at', { ascending: false })
  if (error) return dbError(error)
  return NextResponse.json((data ?? []).map((r: any) => ({
    id: r.id,
    name: r.athlete?.full_name ?? null,
    email: r.athlete?.email ?? '',
    team_name: r.team?.name ?? null,
    created_at: r.created_at,
  })))
}

// Cancel a request.
export async function DELETE(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await req.json().catch(() => ({}))
  if (typeof id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await createAdminClient().from('coach_link_requests').delete().eq('id', id).eq('coach_id', auth.userId)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
