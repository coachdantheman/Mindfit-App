import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { isEmail } from '@/lib/validate'

// Pre-flight for magic-link sign-in. Signup is open to everyone; this
// only tells the client whether the email belongs to an existing user.
export async function POST(req: Request) {
  const { email } = await req.json()

  if (!isEmail(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }
  const normalized = email.toLowerCase().trim()

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', normalized)
    .maybeSingle()

  return NextResponse.json({ allowed: true, shouldCreateUser: !profile })
}
