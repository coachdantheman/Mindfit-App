import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-client'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      // A "Database error saving new user" here means the signup trigger
      // rejected a non-whitelisted email (e.g. an unapproved Google account).
      console.error('Auth callback failed:', error.message)
      return NextResponse.redirect(`${origin}/login?error=no_access`)
    }
  }

  return NextResponse.redirect(origin)
}
