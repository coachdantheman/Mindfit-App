import type { SupabaseClient } from '@supabase/supabase-js'
import { sendSignInCodeEmail } from '@/lib/email'

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'https://mindfit.academy'

// Pre-creates an account for an invited athlete. The signup trigger builds
// the profile (invited_by comes from metadata); the athlete claims it by
// creating an account with this email, or signs in via a one-click link.
export async function createInvitedAccount(
  admin: SupabaseClient,
  { email, fullName, invitedBy, notes }: { email: string; fullName: string | null; invitedBy: string; notes: string }
): Promise<{ userId: string } | { error: string }> {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName, invited_by: invitedBy },
  })
  if (error || !created.user) return { error: error?.message ?? 'Could not create account.' }

  await admin.from('pending_links').delete().eq('email', email)
  await admin.from('approved_emails').upsert(
    { email, added_by: invitedBy, notes, full_name: fullName, registered: true },
    { onConflict: 'email', ignoreDuplicates: true }
  )
  return { userId: created.user.id }
}

// Emails a sign-in code plus a one-click link from our own mailer, creating
// the account first if it doesn't exist. Replaces supabase.auth.signInWithOtp,
// whose PKCE link broke when opened in a different browser than the app.
// The link uses the configured app URL, never the request Host, so a forged
// Host header can't send a victim's token to another site.
// next: where the email's sign-in button lands. Only /start is allowed (it
// saves the pre-account onboarding answers kept on that device).
export async function sendSignInCode(admin: SupabaseClient, email: string, next?: '/start'): Promise<boolean> {
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { terms_accepted_at: new Date().toISOString() },
  })
  if (createError && !/already/i.test(createError.message)) {
    console.error('Sign-in code: create user failed:', createError.message)
    return false
  }
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  const code = data?.properties?.email_otp
  const hash = data?.properties?.hashed_token
  if (error || !code || !hash) {
    console.error('Sign-in code: generateLink failed:', error?.message)
    return false
  }
  return sendSignInCodeEmail(email, code, `${appUrl()}/auth/confirm?token_hash=${encodeURIComponent(hash)}&type=magiclink${next ? `&next=${encodeURIComponent(next)}` : ''}`)
}

// One-click sign-in URL for an invite email. We build the URL ourselves
// (token_hash → /auth/confirm) so no Supabase redirect allowlist entry is
// needed. Expires with the project's OTP expiry. Null if it can't be made.
export async function signInLinkFor(admin: SupabaseClient, email: string): Promise<string | null> {
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  const token = data?.properties?.hashed_token
  if (error || !token) return null
  return `${appUrl()}/auth/confirm?token_hash=${encodeURIComponent(token)}&type=magiclink`
}
