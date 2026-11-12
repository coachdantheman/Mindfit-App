import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import { createAdminClient } from '@/lib/supabase-server'
import { clientIp, memoryLimit } from '@/lib/rate-limit'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  if (memoryLimit(`auth-callback:${clientIp(request)}`, 30, 600_000)) return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('Auth callback failed:', error.message)
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }
    if (searchParams.get('terms') === '1' && data.user) {
      await createAdminClient().from('profiles')
        .update({ terms_accepted_at: new Date().toISOString() })
        .eq('id', data.user.id).is('terms_accepted_at', null)
    }
  }

  return NextResponse.redirect(origin)
}
