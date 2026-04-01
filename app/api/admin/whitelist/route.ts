import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import { createAdminClient } from '@/lib/supabase-server'

async function verifyAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') return null
  return session
}

export async function GET() {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('approved_emails')
    .select('*')
    .order('added_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { email, notes } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('approved_emails')
    .insert({ email: email.toLowerCase().trim(), notes: notes || null })
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
  if (!await verifyAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await req.json()
  const admin = createAdminClient()
  const { error } = await admin.from('approved_emails').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
