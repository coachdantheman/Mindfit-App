import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { sendWelcomeEmail } from '@/lib/email'
import { isEmail, isPlainObject, isUUID, optionalString } from '@/lib/validate'

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
    if (error) return dbError(error)
    return NextResponse.json(data)
  }

  const { data, error } = await admin
    .from('approved_emails')
    .select('*')
    .order('added_at', { ascending: false })
  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser('admin', 'coach')
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const email = body.email
  if (!isEmail(email)) return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('approved_emails')
    .insert({
      email: email.toLowerCase().trim(),
      notes: optionalString(body.notes, 280),
      added_by: auth.userId,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This email is already on the list.' }, { status: 409 })
    }
    return dbError(error)
  }

  sendWelcomeEmail(email.toLowerCase().trim())

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser('admin', 'coach')
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body) || !isUUID(body.id)) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const id = body.id
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
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
