import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import { createAdminClient } from '@/lib/supabase-server'
import { UserRole } from '@/types'
import { touchLastSeen } from '@/lib/last-seen'

interface ApiUser {
  userId: string
  email: string
  role: UserRole
}

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
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, birth_year, consent_status')
    .eq('id', session.user.id)
    .single()

  const role = (profile?.role as UserRole) ?? 'member'
  await touchLastSeen(admin, session.user.id)

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!allowLocked && role === 'member' && (profile?.birth_year == null || profile?.consent_status === 'pending')) {
    return NextResponse.json({ error: 'Finish setting up your account first.', locked: true }, { status: 403 })
  }

  return { userId: session.user.id, email: session.user.email ?? '', role }
}
