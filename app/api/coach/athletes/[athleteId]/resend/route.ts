import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { sendCoachInviteEmail } from '@/lib/email'

export async function POST(_req: Request, { params }: { params: { athleteId: string } }) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const [{ data: link }, { data: athlete }, { data: me }] = await Promise.all([
    admin.from('coach_athletes').select('id').eq('coach_id', auth.userId).eq('athlete_id', params.athleteId).maybeSingle(),
    admin.from('profiles').select('email, full_name, onboarded_at').eq('id', params.athleteId).maybeSingle(),
    admin.from('profiles').select('full_name').eq('id', auth.userId).single(),
  ])
  if (!link && auth.role !== 'admin') return NextResponse.json({ error: 'Not your athlete' }, { status: 403 })
  if (!athlete) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (athlete.onboarded_at) return NextResponse.json({ error: 'This athlete is already active.' }, { status: 400 })

  await sendCoachInviteEmail(athlete.email, me?.full_name, athlete.full_name)
  return NextResponse.json({ ok: true })
}
