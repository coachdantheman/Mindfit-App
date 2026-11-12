import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { fetchAll } from '@/lib/fetch-all'
import { isPlainObject, isUUID, oneOf } from '@/lib/validate'

export async function GET() {
  const auth = await verifyApiUser('admin')
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  let error: { message?: string } | null = null
  const data = await fetchAll(async (from, to) => {
    const res = await admin
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .eq('role', 'coach')
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to)
    if (res.error) error = res.error
    return res
  })

  if (error) return dbError(error)

  const links = await fetchAll(async (from, to) => admin
    .from('coach_athletes')
    .select('coach_id')
    .order('coach_id', { ascending: true })
    .order('athlete_id', { ascending: true })
    .range(from, to))
  const counts = new Map<string, number>()
  for (const l of links) counts.set(l.coach_id, (counts.get(l.coach_id) ?? 0) + 1)

  return NextResponse.json(data.map(c => ({ ...c, athlete_count: counts.get(c.id) ?? 0 })))
}

export async function POST(req: Request) {
  const auth = await verifyApiUser('admin')
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  const newRole = isPlainObject(body) ? oneOf(body.newRole, ['coach', 'member'] as const) : null
  if (!isPlainObject(body) || !isUUID(body.userId) || !newRole) {
    return NextResponse.json({ error: 'Invalid userId or role' }, { status: 400 })
  }
  const userId = body.userId

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

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
