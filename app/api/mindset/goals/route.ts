import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('goals')
    .select('*')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  if (!body.title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  if (!['weekly', 'season', 'year'].includes(body.goal_type)) {
    return NextResponse.json({ error: 'Invalid goal_type' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('goals')
    .insert({
      user_id: auth.userId,
      goal_type: body.goal_type,
      title: body.title.trim(),
      description: body.description || null,
      target_date: body.target_date || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { id, progress, is_completed, title, description } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const updates: Record<string, any> = {}
  if (progress !== undefined) updates.progress = Math.min(100, Math.max(0, progress))
  if (is_completed !== undefined) updates.is_completed = is_completed
  if (title !== undefined) updates.title = title
  if (description !== undefined) updates.description = description

  const admin = createAdminClient()
  const { error } = await admin
    .from('goals')
    .update(updates)
    .eq('id', id)
    .eq('user_id', auth.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { id } = await req.json()
  const admin = createAdminClient()
  const { error } = await admin
    .from('goals')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
