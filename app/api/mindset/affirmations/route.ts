import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { intOrNull, isPlainObject, isUUID, requireString } from '@/lib/validate'

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('affirmations')
    .select('*')
    .eq('user_id', auth.userId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  const text = isPlainObject(body) ? requireString(body.text, 280) : null
  if (!text) return NextResponse.json({ error: 'Text required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('affirmations')
    .select('sort_order')
    .eq('user_id', auth.userId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

  const { data, error } = await admin
    .from('affirmations')
    .insert({ user_id: auth.userId, text, sort_order: nextOrder })
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  const text = isPlainObject(body) ? requireString(body.text, 280) : null
  if (!isPlainObject(body) || !isUUID(body.id) || !text) return NextResponse.json({ error: 'id and text required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('affirmations')
    .update({ text })
    .eq('id', body.id)
    .eq('user_id', auth.userId)

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body) || !Array.isArray(body.items) || body.items.length > 200) {
    return NextResponse.json({ error: 'items array required' }, { status: 400 })
  }
  const items = body.items.map(i => ({
    id: isPlainObject(i) ? i.id : null,
    sort_order: isPlainObject(i) ? intOrNull(i.sort_order, 0, 10000) : null,
  }))
  if (!items.every(i => isUUID(i.id) && i.sort_order !== null)) {
    return NextResponse.json({ error: 'Each item needs an id and sort_order.' }, { status: 400 })
  }

  const admin = createAdminClient()
  await Promise.all(
    items.map(item =>
      admin
        .from('affirmations')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)
        .eq('user_id', auth.userId)
    )
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body) || !isUUID(body.id)) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const admin = createAdminClient()
  const { error } = await admin
    .from('affirmations')
    .update({ is_active: false })
    .eq('id', body.id)
    .eq('user_id', auth.userId)

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
