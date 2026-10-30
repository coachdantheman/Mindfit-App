import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-client'

// Lands a one-click sign-in link from an invite email (see lib/invites.ts).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (token_hash && type) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) return NextResponse.redirect(origin)
    console.error('Sign-in link failed:', error.message)
  }
  return NextResponse.redirect(`${origin}/login?error=link_expired`)
}
