import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { isISODate } from '@/lib/validate'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
  const { supplement_id, date, checked } = body
  if (typeof supplement_id !== 'string' || !UUID_RE.test(supplement_id)) {
    return NextResponse.json({ error: 'Valid supplement_id required' }, { status: 400 })
  }
  if (!isISODate(date)) return NextResponse.json({ error: 'Valid date required' }, { status: 400 })
  if (typeof checked !== 'boolean') return NextResponse.json({ error: 'checked must be boolean' }, { status: 400 })

  const admin = createAdminClient()
  const { data: owned, error: ownErr } = await admin
    .from('supplements')
    .select('id')
    .eq('id', supplement_id)
    .eq('user_id', auth.userId)
    .maybeSingle()

  if (ownErr) return dbError(ownErr)
  if (!owned) return NextResponse.json({ error: 'Supplement not found' }, { status: 404 })

  if (checked) {
    const { error } = await admin
      .from('supplement_checks')
      .upsert(
        { supplement_id, user_id: auth.userId, check_date: date },
        { onConflict: 'supplement_id,check_date' },
      )
    if (error) return dbError(error)
  } else {
    const { error } = await admin
      .from('supplement_checks')
      .delete()
      .eq('supplement_id', supplement_id)
      .eq('user_id', auth.userId)
      .eq('check_date', date)
    if (error) return dbError(error)
  }

  return NextResponse.json({ ok: true })
}
