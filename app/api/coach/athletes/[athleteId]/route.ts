import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

// Unlink an athlete from this coach. The athlete's account is untouched.
export async function DELETE(_req: Request, props: { params: Promise<{ athleteId: string }> }) {
  const params = await props.params;
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { error } = await admin
    .from('coach_athletes')
    .delete()
    .eq('coach_id', auth.userId)
    .eq('athlete_id', params.athleteId)
  if (error) return dbError(error)
  const { data: myTeams } = await admin.from('teams').select('id').eq('coach_id', auth.userId)
  if (myTeams?.length) {
    await admin.from('team_members').delete().eq('athlete_id', params.athleteId).in('team_id', myTeams.map(t => t.id))
  }
  return NextResponse.json({ ok: true })
}
