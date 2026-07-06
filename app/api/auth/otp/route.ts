import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { isEmail } from '@/lib/validate'

// Server-side gate for magic-link sign-in. Existing users may always
// request a code; new users only if their email is whitelisted.
export async function POST(req: Request) {
  const { email } = await req.json()

  if (!isEmail(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }
  const normalized = email.toLowerCase().trim()

  const admin = createAdminClient()
  const [{ data: profile }, { data: approved }] = await Promise.all([
    admin.from('profiles').select('id').eq('email', normalized).maybeSingle(),
    admin.from('approved_emails').select('id').eq('email', normalized).maybeSingle(),
  ])

  if (!profile && !approved) {
    return NextResponse.json(
      { error: "This email doesn't have access yet. Join the MindFit community on Skool or contact your coach." },
      { status: 403 }
    )
  }

  return NextResponse.json({ allowed: true, shouldCreateUser: !profile })
}
