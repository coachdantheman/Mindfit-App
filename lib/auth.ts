import { createServerSupabaseClient } from '@/lib/supabase-client'
import { createAdminClient } from '@/lib/supabase-server'
import { UserRole } from '@/types'

interface AuthResult {
  userId: string
  email: string
  role: UserRole
}

export async function getAuthUser(): Promise<AuthResult | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const adminSupabase = createAdminClient()
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle()

  return {
    userId: session.user.id,
    email: session.user.email ?? '',
    role: (profile?.role as UserRole) ?? 'member',
  }
}

const roleCache = new Map<string, { role: UserRole; ts: number }>()
const ROLE_TTL = 60_000

export async function getAuthUserCached(): Promise<AuthResult | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const cached = roleCache.get(session.user.id)
  if (cached && Date.now() - cached.ts < ROLE_TTL) {
    return {
      userId: session.user.id,
      email: session.user.email ?? '',
      role: cached.role,
    }
  }

  const adminSupabase = createAdminClient()
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle()

  const role = (profile?.role as UserRole) ?? 'member'
  roleCache.set(session.user.id, { role, ts: Date.now() })

  return {
    userId: session.user.id,
    email: session.user.email ?? '',
    role,
  }
}

export function hasRole(userRole: UserRole, ...allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole)
}
