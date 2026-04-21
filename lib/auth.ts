import { createServerSupabaseClient } from '@/lib/supabase-client'
import { createAdminClient } from '@/lib/supabase-server'
import { UserRole } from '@/types'

interface AuthResult {
  userId: string
  email: string
  role: UserRole
  fullName: string | null
}

export async function getAuthUser(): Promise<AuthResult | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const adminSupabase = createAdminClient()
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', session.user.id)
    .maybeSingle()

  return {
    userId: session.user.id,
    email: session.user.email ?? '',
    role: (profile?.role as UserRole) ?? 'member',
    fullName: profile?.full_name ?? null,
  }
}

const profileCache = new Map<string, { role: UserRole; fullName: string | null; ts: number }>()
const PROFILE_TTL = 60_000

export async function getAuthUserCached(): Promise<AuthResult | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const cached = profileCache.get(session.user.id)
  if (cached && Date.now() - cached.ts < PROFILE_TTL) {
    return {
      userId: session.user.id,
      email: session.user.email ?? '',
      role: cached.role,
      fullName: cached.fullName,
    }
  }

  const adminSupabase = createAdminClient()
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', session.user.id)
    .maybeSingle()

  const role = (profile?.role as UserRole) ?? 'member'
  const fullName = profile?.full_name ?? null
  profileCache.set(session.user.id, { role, fullName, ts: Date.now() })

  return {
    userId: session.user.id,
    email: session.user.email ?? '',
    role,
    fullName,
  }
}

export function hasRole(userRole: UserRole, ...allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole)
}
