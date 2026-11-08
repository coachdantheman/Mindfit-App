import { User } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import { createAdminClient } from '@/lib/supabase-server'
import { maybeSyncToGhl } from '@/lib/ghl'
import { UserRole } from '@/types'
import { touchLastSeen } from '@/lib/last-seen'
import type { ConsentStatus } from '@/lib/age'

interface AuthResult {
  userId: string
  email: string
  role: UserRole
  fullName: string | null
  onboardedAt: string | null
  birthYear: number | null
  consentStatus: ConsentStatus
}

function nameFromMetadata(user: User): string | null {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const pickString = (k: string) => (typeof meta[k] === 'string' ? (meta[k] as string).trim() : '')
  const full = pickString('full_name') || pickString('name')
  if (full) return full
  const first = pickString('given_name') || pickString('first_name')
  const last = pickString('family_name') || pickString('last_name')
  const joined = [first, last].filter(Boolean).join(' ').trim()
  return joined || null
}

export async function getAuthUser(): Promise<AuthResult | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const adminSupabase = createAdminClient()
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('role, full_name, onboarded_at, ghl_synced_at, birth_year, consent_status')
    .eq('id', session.user.id)
    .maybeSingle()

  if (profile && !profile.ghl_synced_at) void maybeSyncToGhl(session.user.id)

  return {
    userId: session.user.id,
    email: session.user.email ?? '',
    role: (profile?.role as UserRole) ?? 'member',
    fullName: profile?.full_name ?? nameFromMetadata(session.user),
    onboardedAt: profile?.onboarded_at ?? null,
    birthYear: profile?.birth_year ?? null,
    consentStatus: (profile?.consent_status as ConsentStatus) ?? 'not_required',
  }
}

const profileCache = new Map<string, { role: UserRole; fullName: string | null; onboardedAt: string | null; birthYear: number | null; consentStatus: ConsentStatus; ts: number }>()
const PROFILE_TTL = 60_000

export async function getAuthUserCached(): Promise<AuthResult | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const cached = profileCache.get(session.user.id)
  // Un-onboarded profiles, profiles without a birth year and pending
  // consent bypass the cache so finishing those steps takes effect
  // immediately instead of after the TTL.
  if (cached && cached.onboardedAt && cached.birthYear != null && cached.consentStatus !== 'pending' && Date.now() - cached.ts < PROFILE_TTL) {
    await touchLastSeen(createAdminClient(), session.user.id)
    return {
      userId: session.user.id,
      email: session.user.email ?? '',
      role: cached.role,
      fullName: cached.fullName,
      onboardedAt: cached.onboardedAt,
      birthYear: cached.birthYear,
      consentStatus: cached.consentStatus,
    }
  }

  const adminSupabase = createAdminClient()
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('role, full_name, onboarded_at, ghl_synced_at, birth_year, consent_status')
    .eq('id', session.user.id)
    .maybeSingle()

  if (profile && !profile.ghl_synced_at) void maybeSyncToGhl(session.user.id)
  await touchLastSeen(adminSupabase, session.user.id)

  const role = (profile?.role as UserRole) ?? 'member'
  const fullName = profile?.full_name ?? nameFromMetadata(session.user)
  const onboardedAt = profile?.onboarded_at ?? null
  const birthYear = profile?.birth_year ?? null
  const consentStatus = (profile?.consent_status as ConsentStatus) ?? 'not_required'
  profileCache.set(session.user.id, { role, fullName, onboardedAt, birthYear, consentStatus, ts: Date.now() })

  return {
    userId: session.user.id,
    email: session.user.email ?? '',
    role,
    fullName,
    onboardedAt,
    birthYear,
    consentStatus,
  }
}

export function hasRole(userRole: UserRole, ...allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole)
}
