import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { isISODate, isPlainObject, optionalString, requireString } from '@/lib/validate'

const COLS = 'id, entry_date, item_1, item_2, item_3'

// Recent gratitude entries, newest first (or one day with ?date=).
export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const date = new URL(req.url).searchParams.get('date')
  const admin = createAdminClient()
  let q = admin.from('gratitude_entries').select(COLS).eq('user_id', auth.userId).order('entry_date', { ascending: false })
  if (date && isISODate(date)) q = q.eq('entry_date', date)
  const { data, error } = await q.limit(90)
  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => null)
  if (!isPlainObject(body) || !isISODate(body.entry_date)) return NextResponse.json({ error: 'entry_date required' }, { status: 400 })
  const items = [body.item_1, body.item_2, body.item_3].map(v => optionalString(v, 300)).filter((v): v is string => !!v)
  const first = requireString(items[0], 300)
  if (!first) return NextResponse.json({ error: 'Write at least one thing you’re grateful for.' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('gratitude_entries').upsert({
    user_id: auth.userId, entry_date: body.entry_date,
    item_1: first, item_2: items[1] ?? null, item_3: items[2] ?? null, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,entry_date' }).select(COLS).single()
  if (error) return dbError(error)
  return NextResponse.json(data)
}
