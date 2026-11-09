import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Returns the parsed JSON object body, or null for malformed JSON, null, or non-object bodies.
async function parseBody(req: Request): Promise<Record<string, any> | null> {
  try {
    const raw = await req.json()
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
    return raw
  } catch {
    return null
  }
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await parseBody(req)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  if (typeof body.habit_id !== 'string' || !UUID.test(body.habit_id)) {
    return NextResponse.json({ error: 'habit_id required' }, { status: 400 })
  }
  if (!isIsoDate(body.date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  }
  if (typeof body.checked !== 'boolean') {
    return NextResponse.json({ error: 'checked must be boolean' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: habit } = await admin
    .from('habits')
    .select('id')
    .eq('id', body.habit_id)
    .eq('user_id', auth.userId)
    .maybeSingle()
  if (!habit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (body.checked) {
    const { error } = await admin
      .from('habit_checks')
      .upsert(
        { habit_id: body.habit_id, user_id: auth.userId, check_date: body.date },
        { onConflict: 'habit_id,check_date' },
      )
    if (error) return dbError(error)
  } else {
    const { error } = await admin
      .from('habit_checks')
      .delete()
      .eq('habit_id', body.habit_id)
      .eq('user_id', auth.userId)
      .eq('check_date', body.date)
    if (error) return dbError(error)
  }

  return NextResponse.json({ ok: true, checked: body.checked })
}
