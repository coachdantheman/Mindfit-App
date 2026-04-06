import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

export async function GET() {
  const auth = await verifyApiUser('admin', 'coach')
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()

  if (auth.role === 'coach') {
    const { data, error } = await admin
      .from('approved_emails')
      .select('*')
      .eq('added_by', auth.userId)
      .order('added_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { data, error } = await admin
    .from('approved_emails')
    .select('*')
    .order('added_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser('admin', 'coach')
  if (auth instanceof NextResponse) return auth

  const { email, notes } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('approved_emails')
    .insert({
      email: email.toLowerCase().trim(),
      notes: notes || null,
      added_by: auth.userId,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This email is already on the list.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser('admin', 'coach')
  if (auth instanceof NextResponse) return auth

  const { id } = await req.json()
  const admin = createAdminClient()

  if (auth.role === 'coach') {
    const { data: email } = await admin
      .from('approved_emails')
      .select('added_by')
      .eq('id', id)
      .single()
    if (email?.added_by !== auth.userId) {
      return NextResponse.json({ error: 'You can only remove emails you added' }, { status: 403 })
    }
  }

  const { error } = await admin.from('approved_emails').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
