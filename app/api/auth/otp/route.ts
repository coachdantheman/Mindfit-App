import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { sendSignInCode } from '@/lib/invites'
import { isEmail } from '@/lib/validate'
import { clientIp, rateLimit } from '@/lib/rate-limit'

// Emails a sign-in code (creating the account if new). Same answer for every email so it
// never reveals who has an account; only rate-limits by IP and email.
export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}))
  if (!isEmail(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }
  const normalized = email.toLowerCase().trim()
  const limited =
    (await rateLimit(`otp:ip:${clientIp(req)}`, 10, 3600)) ??
    (await rateLimit(`otp:email:${normalized}`, 5, 3600))
  if (limited) return limited

  const sent = await sendSignInCode(createAdminClient(), normalized, new URL(req.url).origin)
  if (!sent) {
    return NextResponse.json({ error: 'Could not send the code. Please try again in a minute.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
