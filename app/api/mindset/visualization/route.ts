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
    .from('visualization_entries')
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
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('visualization_entries')
    .upsert({
      user_id: auth.userId,
      entry_date: body.entry_date || new Date().toISOString().split('T')[0],
      completed: typeof body.completed === 'boolean' ? body.completed : true,
      duration_min: intOrNull(body.duration_min, 0, 600),
      notes: optionalString(body.notes, 4000),
      viz_type: optionalString(body.viz_type, 40),
    }, { onConflict: 'user_id,entry_date' })
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}
