import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { sendSignInCode } from '@/lib/invites'
import { isEmail, isPlainObject } from '@/lib/validate'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { AGE_BLOCK_COOKIE } from '@/lib/age'

// Step 1 of signup. Makes sure an account exists for the email WITHOUT a
// password, so nobody can use an email they don't own: this route emails a
// sign-in code, and only after the code is verified does the browser set the
// password (supabase.auth.updateUser). The response is the same whether or
// not the email already has an account.
export async function POST(req: Request) {
  const body: Record<string, unknown> = (await req.json().catch(() => null)) ?? {}
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const { email, termsAccepted, next } = body

  if (!isEmail(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }
  if (termsAccepted !== true) {
    return NextResponse.json({ error: 'Please accept the Terms and Privacy Policy.' }, { status: 400 })
  }
  if (new RegExp(`(?:^|; )${AGE_BLOCK_COOKIE}=1`).test(req.headers.get('cookie') ?? '')) {
    return NextResponse.json({ error: 'MindFit is for athletes 13 and older.' }, { status: 403 })
  }
  const normalized = email.toLowerCase().trim()
  const limited =
    (await rateLimit(`signup:ip:${clientIp(req)}`, 20, 3600, { failClosed: true })) ??
    (await rateLimit(`signup:email:${normalized}`, 10, 3600, { failClosed: true }))
  if (limited) return limited

  const sent = await sendSignInCode(createAdminClient(), normalized, next === '/start' ? '/start' : undefined)
  if (!sent) {
    return NextResponse.json({ error: 'Could not send the code. Please try again in a minute.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
