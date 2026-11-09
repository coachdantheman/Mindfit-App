import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { isISODate, optionalString, requireString } from '@/lib/validate'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const date = new URL(req.url).searchParams.get('date')
  if (!isISODate(date)) return NextResponse.json({ error: 'Valid date required' }, { status: 400 })

  const admin = createAdminClient()
  const [supp, checks] = await Promise.all([
    admin
      .from('supplements')
      .select('*')
      .eq('user_id', auth.userId)
      .is('archived_at', null)
      .order('sort', { ascending: true })
      .order('created_at', { ascending: true }),
    admin
      .from('supplement_checks')
      .select('supplement_id')
      .eq('user_id', auth.userId)
      .eq('check_date', date),
  ])

  if (supp.error) return dbError(supp.error)
  if (checks.error) return dbError(checks.error)
  return NextResponse.json({
    supplements: supp.data,
    checked: (checks.data ?? []).map(c => c.supplement_id),
  })
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const name = requireString(body.name, 60)
  if (!name) return NextResponse.json({ error: 'Name required (1-60 characters)' }, { status: 400 })
  if (typeof body.dose === 'string' && body.dose.trim().length > 40) {
    return NextResponse.json({ error: 'Dose must be 40 characters or fewer' }, { status: 400 })
  }
  const dose = optionalString(body.dose, 40)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('supplements')
    .insert({ user_id: auth.userId, name, dose })
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const id = new URL(req.url).searchParams.get('id')
  if (!id || !UUID_RE.test(id)) return NextResponse.json({ error: 'Valid id required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('supplements')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', auth.userId)

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
