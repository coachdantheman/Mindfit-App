import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await verifyApiUser('admin', 'coach')
  if (auth instanceof NextResponse) return auth

  const athleteId = params.id
  const admin = createAdminClient()

  if (auth.role === 'coach') {
    const { data: link } = await admin
      .from('coach_athletes')
      .select('id')
      .eq('coach_id', auth.userId)
      .eq('athlete_id', athleteId)
      .single()
    if (!link) return NextResponse.json({ error: 'Not your athlete' }, { status: 403 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .eq('id', athleteId)
    .single()

  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: journalEntries } = await admin
    .from('journal_entries')
    .select('*')
    .eq('user_id', athleteId)
    .order('entry_date', { ascending: false })
    .limit(30)

  return NextResponse.json({
    profile,
    journalEntries: journalEntries ?? [],
  })
}
