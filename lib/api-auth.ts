import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import { createAdminClient } from '@/lib/supabase-server'
import { UserRole } from '@/types'

interface ApiUser {
  userId: string
  email: string
  role: UserRole
}

export async function verifyApiUser(...allowedRoles: UserRole[]): Promise<ApiUser | NextResponse> {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  const role = (profile?.role as UserRole) ?? 'member'

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return { userId: session.user.id, email: session.user.email ?? '', role }
}
