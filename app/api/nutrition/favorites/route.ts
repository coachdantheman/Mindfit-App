import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('food_favorites')
    .select('created_at, foods(*)')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json((data ?? []).map(r => r.foods).filter(Boolean))
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { food_id } = await req.json()
  if (typeof food_id !== 'string') return NextResponse.json({ error: 'food_id required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('food_favorites')
    .upsert({ user_id: auth.userId, food_id }, { onConflict: 'user_id,food_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { food_id } = await req.json()
  if (typeof food_id !== 'string') return NextResponse.json({ error: 'food_id required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('food_favorites')
    .delete()
    .eq('user_id', auth.userId)
    .eq('food_id', food_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
