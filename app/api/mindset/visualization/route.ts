import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('visualization_entries')
    .upsert({
      user_id: auth.userId,
      entry_date: body.entry_date || new Date().toISOString().split('T')[0],
      completed: body.completed ?? true,
      duration_min: body.duration_min || null,
      notes: body.notes || null,
    }, { onConflict: 'user_id,entry_date' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
