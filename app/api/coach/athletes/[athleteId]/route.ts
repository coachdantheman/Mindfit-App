import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

// Unlink an athlete from this coach. The athlete's account is untouched.
export async function DELETE(_req: Request, { params }: { params: { athleteId: string } }) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { error } = await admin
    .from('coach_athletes')
    .delete()
    .eq('coach_id', auth.userId)
    .eq('athlete_id', params.athleteId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
