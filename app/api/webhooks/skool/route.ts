import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase-server'
import { sendWelcomeEmail } from '@/lib/email'
import { isEmail } from '@/lib/validate'

// Called by Zapier when someone joins (or leaves) the MindFit Skool
// community. Secured with a shared secret in the x-skool-secret header.

function secretMatches(provided: string | null): boolean {
  const expected = process.env.SKOOL_WEBHOOK_SECRET
  if (!expected || !provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: Request) {
  if (!secretMatches(req.headers.get('x-skool-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { event?: string; name?: string; email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const event = body.event === 'member.left' ? 'member.left' : 'member.joined'
  if (!isEmail(body.email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }
  const email = body.email.toLowerCase().trim()
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : null

  const admin = createAdminClient()

  if (event === 'member.joined') {
    const { error } = await admin
      .from('approved_emails')
      .upsert(
        {
          email,
          full_name: name || null,
          source: 'skool',
          notes: 'Skool auto-added',
        },
        { onConflict: 'email' }
      )
    if (error) {
      console.error('skool webhook: whitelist upsert failed', email, error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await sendWelcomeEmail(email, name || undefined)
    console.log('skool webhook: member.joined', email)
    return NextResponse.json({ ok: true, action: 'whitelisted' })
  }

  // member.left — best-effort revocation. Only rows that Skool created
  // are removed; manually-added emails are the admin's call.
  const { data: row } = await admin
    .from('approved_emails')
    .select('id, source')
    .eq('email', email)
    .maybeSingle()

  if (!row || row.source !== 'skool') {
    console.log('skool webhook: member.left ignored (manual or unknown email)', email)
    return NextResponse.json({ ok: true, action: 'ignored' })
  }

  await admin.from('approved_emails').delete().eq('id', row.id)

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('email', email)
    .maybeSingle()

  if (profile && profile.role === 'member') {
    const { error: banError } = await admin.auth.admin.updateUserById(profile.id, {
      ban_duration: '876600h',
    })
    if (banError) console.error('skool webhook: ban failed', email, banError.message)
  }

  console.log('skool webhook: member.left', email)
  return NextResponse.json({ ok: true, action: 'revoked' })
}
