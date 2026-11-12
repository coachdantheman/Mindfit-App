import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { clampNumber, isISODate, isPlainObject, isUUID, oneOf, optionalString, requireString } from '@/lib/validate'

const GOAL_TYPES = ['weekly', 'season', 'year'] as const

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('goals')
    .select('*')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const title = requireString(body.title, 120)
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  const goal_type = oneOf(body.goal_type, GOAL_TYPES)
  if (!goal_type) {
    return NextResponse.json({ error: 'Invalid goal_type' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('goals')
    .insert({
      user_id: auth.userId,
      goal_type,
      title,
      description: optionalString(body.description, 500),
      target_date: isISODate(body.target_date) ? body.target_date : null,
    })
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const { progress, title, description, target_date } = body
  const id = body.id
  if (!isUUID(id)) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const is_completed = typeof body.is_completed === 'boolean' ? body.is_completed : undefined

  const updates: Record<string, any> = {}
  if (progress !== undefined) {
    const p = clampNumber(progress, 0, 100)
    if (p === null) return NextResponse.json({ error: 'Invalid progress' }, { status: 400 })
    updates.progress = p
  }
  if (title !== undefined) {
    const t = requireString(title, 120)
    if (!t) return NextResponse.json({ error: 'Title required' }, { status: 400 })
    updates.title = t
  }
  if (description !== undefined) updates.description = optionalString(description, 500)
  if (target_date !== undefined) {
    if (target_date !== null && !isISODate(target_date)) {
      return NextResponse.json({ error: 'Invalid end date' }, { status: 400 })
    }
    updates.target_date = target_date
  }
  if (body.goal_type !== undefined) {
    const goal_type = oneOf(body.goal_type, GOAL_TYPES)
    if (!goal_type) {
      return NextResponse.json({ error: 'Invalid goal_type' }, { status: 400 })
    }
    updates.goal_type = goal_type
  }

  const admin = createAdminClient()

  // Stamp completed_at only on the false→true transition so re-saving a
  // finished goal can't move its leaderboard credit into a new month.
  if (is_completed !== undefined) {
    const { data: current } = await admin
      .from('goals')
      .select('is_completed')
      .eq('id', id)
      .eq('user_id', auth.userId)
      .single()
    if (current && current.is_completed !== is_completed) {
      updates.is_completed = is_completed
      updates.completed_at = is_completed ? new Date().toISOString() : null
    }
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true })

  const { error } = await admin
    .from('goals')
    .update(updates)
    .eq('id', id)
    .eq('user_id', auth.userId)

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body) || !isUUID(body.id)) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const admin = createAdminClient()
  const { error } = await admin
    .from('goals')
    .delete()
    .eq('id', body.id)
    .eq('user_id', auth.userId)

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
