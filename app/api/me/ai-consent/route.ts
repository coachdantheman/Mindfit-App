import { NextResponse } from 'next/server'
import { verifyApiUser } from '@/lib/api-auth'
import { consentFlags } from '@/lib/consent-flags'
import { createAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const { data } = await createAdminClient()
    .from('profiles')
    .select('ai_consent_at')
    .eq('id', auth.userId)
    .maybeSingle()
  return NextResponse.json({ allowed: !!data?.ai_consent_at })
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => null)
  if (typeof body?.allow !== 'boolean') return NextResponse.json({ error: 'allow must be true or false' }, { status: 400 })

  const admin = createAdminClient()
  if (body.allow && (await consentFlags(admin, auth.userId)).aiBlocked) {
    return NextResponse.json({ error: 'AI features are turned off for your account. A parent can turn them on from their MindFit email.' }, { status: 403 })
  }

  const { error } = await admin
    .from('profiles')
    .update({ ai_consent_at: body.allow ? new Date().toISOString() : null })
    .eq('id', auth.userId)
  if (error) return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 500 })
  return NextResponse.json({ allowed: body.allow })
}
