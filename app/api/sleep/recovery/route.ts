import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { intOrNull, isISODate, isPlainObject, optionalString } from '@/lib/validate'

export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  const admin = createAdminClient()
  let query = admin
    .from('recovery_entries')
    .select('*')
    .eq('user_id', auth.userId)
    .order('entry_date', { ascending: false })

  if (date) query = query.eq('entry_date', date)

  const { data, error } = await query.limit(30)
  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  if (body.entry_date && !isISODate(body.entry_date)) return NextResponse.json({ error: 'Invalid date.' }, { status: 400 })
  const activities = Array.isArray(body.activities)
    ? body.activities.slice(0, 50).flatMap(a => {
        if (!isPlainObject(a)) return []
        const type = optionalString(a.type, 40)
        return type ? [{ type, duration_min: intOrNull(a.duration_min, 0, 600) ?? 0 }] : []
      })
    : []
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('recovery_entries')
    .upsert({
      user_id: auth.userId,
      entry_date: body.entry_date || new Date().toISOString().split('T')[0],
      is_rest_day: body.is_rest_day === true,
      activities,
      notes: optionalString(body.notes, 4000),
    }, { onConflict: 'user_id,entry_date' })
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}
