import { NextResponse } from 'next/server'
import { getVerifiedUser } from '@/lib/supabase-client'
import { createAdminClient } from '@/lib/supabase-server'
import { UserRole } from '@/types'
import { touchLastSeen } from '@/lib/last-seen'

interface ApiUser {
  userId: string
  email: string
  role: UserRole
}

// One page load fires several API calls. The role lookup is reused for a
// short time per server instance instead of being run for each of them.
const PROFILE_TTL_MS = 30_000
const profileCache = new Map<string, { role: string | null; birth_year: number | null; consent_status: string | null; ts: number }>()

// Athletes who haven't given a birthday, or are waiting on parental
// consent, get no API access except through verifyLockedApiUser.
export async function verifyApiUser(...allowedRoles: UserRole[]): Promise<ApiUser | NextResponse> {
  return verify(allowedRoles, false)
}

// For the few routes a locked athlete still needs: age, consent request,
// account export and deletion.
export async function verifyLockedApiUser(...allowedRoles: UserRole[]): Promise<ApiUser | NextResponse> {
  return verify(allowedRoles, true)
}

async function verify(allowedRoles: UserRole[], allowLocked: boolean): Promise<ApiUser | NextResponse> {
  const user = await getVerifiedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  let profile = profileCache.get(user.id)
  if (!profile || Date.now() - profile.ts > PROFILE_TTL_MS) {
    const { data } = await admin
      .from('profiles')
      .select('role, birth_year, consent_status')
      .eq('id', user.id)
      .single()
    profile = { role: data?.role ?? null, birth_year: data?.birth_year ?? null, consent_status: data?.consent_status ?? null, ts: Date.now() }
    // Locked athletes are never cached, so finishing the age step works at once.
    const locked = (profile.role ?? 'member') === 'member' && (profile.birth_year == null || profile.consent_status === 'pending')
    if (data && !locked) profileCache.set(user.id, profile)
    if (profileCache.size > 5000) profileCache.clear()
  }

  const role = (profile.role as UserRole) ?? 'member'
  await touchLastSeen(admin, user.id)

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!allowLocked && role === 'member' && (profile.birth_year == null || profile.consent_status === 'pending')) {
    return NextResponse.json({ error: 'Finish setting up your account first.', locked: true }, { status: 403 })
  }

  return { userId: user.id, email: user.email, role }
}
