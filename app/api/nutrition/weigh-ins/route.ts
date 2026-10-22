import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { clampNumber, isISODate, optionalString } from '@/lib/validate'
import { localDateISO, shiftDate } from '@/lib/nutrition'

export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const days = clampNumber(searchParams.get('days') ?? 180, 1, 730) ?? 180

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('weigh_ins')
    .select('*')
    .eq('user_id', auth.userId)
    .gte('entry_date', shiftDate(localDateISO(new Date()), -days))
    .order('entry_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const weight_lb = clampNumber(body.weight_lb, 50, 500)
  if (weight_lb == null) return NextResponse.json({ error: 'Weight must be between 50 and 500 lb' }, { status: 400 })
  const entry_date = isISODate(body.entry_date) ? body.entry_date : localDateISO(new Date())

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('weigh_ins')
    .upsert({
      user_id: auth.userId,
      entry_date,
      weight_lb: Math.round(weight_lb * 10) / 10,
      note: optionalString(body.note, 200),
    }, { onConflict: 'user_id,entry_date' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Keep the goal's current weight in step with the latest weigh-in.
  const { data: latest } = await admin
    .from('weigh_ins')
    .select('weight_lb')
    .eq('user_id', auth.userId)
    .order('entry_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (latest) {
    await admin
      .from('nutrition_goals')
      .update({ current_weight_lb: latest.weight_lb })
      .eq('user_id', auth.userId)
  }

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { id } = await req.json()
  if (typeof id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('weigh_ins')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
