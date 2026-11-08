import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { isEmail } from '@/lib/validate'
import { clientIp, rateLimit } from '@/lib/rate-limit'

// Step 1 of signup. Makes sure an account exists for the email WITHOUT a
// password, so nobody can use an email they don't own: the client then
// emails a 6-digit code, and only after the code is verified does the
// browser set the password (supabase.auth.updateUser). The response is the
// same whether or not the email already has an account.
export async function POST(req: Request) {
  const { email, termsAccepted } = await req.json().catch(() => ({}))

  if (!isEmail(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }
  if (termsAccepted !== true) {
    return NextResponse.json({ error: 'Please accept the Terms and Privacy Policy.' }, { status: 400 })
  }
  const normalized = email.toLowerCase().trim()
  const limited =
    (await rateLimit(`signup:ip:${clientIp(req)}`, 10, 3600)) ??
    (await rateLimit(`signup:email:${normalized}`, 5, 3600))
  if (limited) return limited

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', normalized)
    .maybeSingle()

  if (!profile) {
    const { error } = await admin.auth.admin.createUser({
      email: normalized,
      email_confirm: true,
      user_metadata: { terms_accepted_at: new Date().toISOString() },
    })
    if (error && !/already/i.test(error.message)) {
      console.error('Signup failed:', error.message)
      return NextResponse.json({ error: 'Could not create your account. Please try again.' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
