import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { isEmail } from '@/lib/validate'
import { consentExpired } from '@/lib/age'
import { createConsentRequest, hashToken } from '@/lib/consent'
import { deleteUserCompletely } from '@/lib/account-delete'
import { sendParentConsentEmail } from '@/lib/email'

const TWO_MINUTES = 2 * 60 * 1000
const DAY = 24 * 60 * 60 * 1000
const MAX_PER_DAY = 5

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('consent_status, consent_requested_at').eq('id', auth.userId).single()
  if (profile?.consent_status === 'pending' && consentExpired(profile.consent_requested_at)) {
    await deleteUserCompletely(auth.userId)
    return NextResponse.json({ status: 'deleted' })
  }

  const { data: latest } = await admin
    .from('parental_consents')
    .select('parent_email, sent_at')
    .eq('athlete_id', auth.userId)
    .in('status', ['pending', 'granted'])
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    status: profile?.consent_status ?? null,
    parentEmail: latest?.parent_email ?? null,
    sentAt: latest?.sent_at ?? null,
  })
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('full_name, consent_status').eq('id', auth.userId).single()
  if (profile?.consent_status !== 'pending') {
    return NextResponse.json({ error: 'This account does not need a parent to say yes.' }, { status: 409 })
  }

  const body = await req.json().catch(() => ({}))
  if (!isEmail(body.parentEmail)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  const parentEmail = body.parentEmail.toLowerCase().trim()
  if (parentEmail === auth.email.toLowerCase()) {
    return NextResponse.json({ error: 'Enter your parent’s email, not your own.' }, { status: 400 })
  }

  const { data: sent } = await admin
    .from('parental_consents')
    .select('sent_at')
    .eq('athlete_id', auth.userId)
    .gte('sent_at', new Date(Date.now() - DAY).toISOString())
    .order('sent_at', { ascending: false })
  const newest = sent?.[0]?.sent_at
  if (newest && Date.now() - new Date(newest).getTime() < TWO_MINUTES) {
    return NextResponse.json({ error: 'Please wait a couple of minutes before sending again.' }, { status: 429 })
  }
  if ((sent?.length ?? 0) >= MAX_PER_DAY) {
    return NextResponse.json({ error: 'Too many emails today. Try again tomorrow.' }, { status: 429 })
  }

  try {
    const token = await createConsentRequest(admin, auth.userId, parentEmail)
    const url = `${process.env.NEXT_PUBLIC_APP_URL || 'https://mindfit.academy'}/consent/parent/${token}`
    const sent = await sendParentConsentEmail(parentEmail, profile?.full_name ?? null, auth.email, url)
    if (!sent) {
      await admin.from('parental_consents').delete().eq('token_hash', hashToken(token))
      return NextResponse.json({ error: "We couldn't send the email. Please try again in a few minutes." }, { status: 502 })
    }
    return NextResponse.json({ ok: true, parentEmail })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Could not send the email.' }, { status: 500 })
  }
}
