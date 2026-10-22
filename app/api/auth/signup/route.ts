import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { isEmail } from '@/lib/validate'

const CLAIM_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

// Instant email + password signup — no confirmation email required.
// A brand-new member account that never finished onboarding has no data,
// so it can be claimed by setting a password (rescues users stuck on the
// emailed-code flow). Everyone else must sign in instead.
export async function POST(req: Request) {
  const { email, password } = await req.json()

  if (!isEmail(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }
  const normalized = email.toLowerCase().trim()

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, onboarded_at, created_at')
    .eq('email', normalized)
    .maybeSingle()

  // Coaches/admins never onboard, and members from before onboarding existed
  // may have data, so only recent un-onboarded members are claimable.
  const claimable =
    profile?.role === 'member' &&
    !profile.onboarded_at &&
    Date.now() - new Date(profile.created_at).getTime() < CLAIM_WINDOW_MS
  if (profile && !claimable) {
    return NextResponse.json(
      { error: 'An account with this email already exists. Sign in instead.' },
      { status: 409 }
    )
  }

  const { error } = profile
    ? await admin.auth.admin.updateUserById(profile.id, { password, email_confirm: true })
    : await admin.auth.admin.createUser({ email: normalized, password, email_confirm: true })

  if (error) {
    console.error('Signup failed:', error.message)
    return NextResponse.json({ error: 'Could not create your account. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
