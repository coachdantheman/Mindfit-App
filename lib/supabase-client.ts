import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server-side Supabase client for Server Components and Route Handlers
// Uses the anon key — respects Row Level Security
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

// getSession() trusts the cookie without checking its signature. getClaims()
// verifies the JWT (locally with asymmetric keys, else via the Auth server).
export async function getVerifiedUser(): Promise<{ id: string; email: string; user_metadata: Record<string, unknown> } | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (error || !claims?.sub) return null
  return {
    id: claims.sub,
    email: typeof claims.email === 'string' ? claims.email : '',
    user_metadata: (claims.user_metadata ?? {}) as Record<string, unknown>,
  }
}
