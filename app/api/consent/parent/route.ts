import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { findConsentByToken, grantConsent } from '@/lib/consent'
import { deleteUserCompletely } from '@/lib/account-delete'
import { sendParentInviteEmail } from '@/lib/email'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { isPlainObject, oneOf } from '@/lib/validate'

const RELATIONSHIPS = ['parent', 'legal_guardian'] as const

// No session: the emailed token is the credential.
export async function POST(req: Request) {
  const limited = await rateLimit(`consent:ip:${clientIp(req)}`, 20, 3600, { failClosed: true })
  if (limited) return limited
  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const admin = createAdminClient()
  const row = await findConsentByToken(admin, typeof body.token === 'string' && body.token.length <= 200 ? body.token : '')
  if (!row || row.status === 'superseded') {
    return NextResponse.json({ error: 'This link is no longer valid.' }, { status: 404 })
  }

  if (body.decision === 'decline') {
    await deleteUserCompletely(row.athlete_id)
    return NextResponse.json({ ok: true })
  }
  if (body.decision !== 'grant') return NextResponse.json({ error: 'Choose to consent or decline.' }, { status: 400 })

  const parentName = typeof body.parentName === 'string' ? body.parentName.trim() : ''
  if (parentName.length < 2 || parentName.length > 120) {
    return NextResponse.json({ error: 'Enter your full name.' }, { status: 400 })
  }
  const signature = typeof body.signature === 'string' ? body.signature.trim() : ''
  if (signature.toLowerCase() !== parentName.toLowerCase()) {
    return NextResponse.json({ error: 'Type your full name to sign. It must match the name above.' }, { status: 400 })
  }
  const relationship = oneOf(body.relationship, RELATIONSHIPS)
  if (!relationship) {
    return NextResponse.json({ error: 'Choose parent or legal guardian.' }, { status: 400 })
  }
  if (typeof body.shareCoaches !== 'boolean' || typeof body.ai !== 'boolean' || typeof body.leaderboard !== 'boolean') {
    return NextResponse.json({ error: 'Invalid choices.' }, { status: 400 })
  }

  const firstTime = row.athlete.consent_status !== 'granted'
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const userAgent = req.headers.get('user-agent')
  await grantConsent(
    admin,
    row,
    { shareCoaches: body.shareCoaches, ai: body.ai, leaderboard: body.leaderboard },
    { parentName, relationship, ip, userAgent }
  )
  if (firstTime) void sendParentInviteEmail(row.parent_email, row.athlete.full_name)
  return NextResponse.json({ ok: true, firstTime })
}
