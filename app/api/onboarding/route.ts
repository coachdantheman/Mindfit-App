import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { pushGhlEvent } from '@/lib/ghl'

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  let fullName: string | null = null
  try {
    const body = await req.json()
    if (typeof body?.full_name === 'string' && body.full_name.trim()) {
      fullName = body.full_name.trim().slice(0, 120)
    }
  } catch {
    // no body — name is optional
  }

  const admin = createAdminClient()
  const update: Record<string, string> = { onboarded_at: new Date().toISOString() }
  if (fullName) update.full_name = fullName

  const { data: profile, error } = await admin
    .from('profiles')
    .update(update)
    .eq('id', auth.userId)
    .select('email, full_name')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (profile?.email) {
    void pushGhlEvent({ email: profile.email, name: profile.full_name }, 'onboarding_complete')
  }

  return NextResponse.json({ ok: true })
}
