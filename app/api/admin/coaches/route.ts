import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

export async function GET() {
  const auth = await verifyApiUser('admin')
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .eq('role', 'coach')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (data ?? []).map(c => c.id)
  const { data: links } = ids.length
    ? await admin.from('coach_athletes').select('coach_id').in('coach_id', ids)
    : { data: [] as { coach_id: string }[] }
  const counts = new Map<string, number>()
  for (const l of links ?? []) counts.set(l.coach_id, (counts.get(l.coach_id) ?? 0) + 1)

  return NextResponse.json((data ?? []).map(c => ({ ...c, athlete_count: counts.get(c.id) ?? 0 })))
}

export async function POST(req: Request) {
  const auth = await verifyApiUser('admin')
  if (auth instanceof NextResponse) return auth

  const { userId, newRole } = await req.json()
  if (!userId || !['coach', 'member'].includes(newRole)) {
    return NextResponse.json({ error: 'Invalid userId or role' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: target } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (target.role === 'admin') return NextResponse.json({ error: 'Cannot change admin role' }, { status: 403 })

  const { error } = await admin
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
