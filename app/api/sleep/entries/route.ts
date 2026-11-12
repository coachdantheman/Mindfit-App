import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { clampNumber, isISODate, isPlainObject, optionalString } from '@/lib/validate'

export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  const admin = createAdminClient()
  let query = admin
    .from('sleep_entries')
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
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('sleep_entries')
    .upsert({
      user_id: auth.userId,
      entry_date: isISODate(body.entry_date) ? body.entry_date : new Date().toISOString().split('T')[0],
      bedtime: optionalString(body.bedtime, 20),
      wake_time: optionalString(body.wake_time, 20),
      hours_slept: body.hours_slept != null ? clampNumber(body.hours_slept, 0, 24) : null,
      sleep_quality: body.sleep_quality ? clampNumber(body.sleep_quality, 1, 10) : null,
      notes: optionalString(body.notes, 4000),
    }, { onConflict: 'user_id,entry_date' })
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}
