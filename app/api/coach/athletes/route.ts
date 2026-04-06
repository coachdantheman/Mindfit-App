import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

export async function GET() {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()

  let athleteIds: string[] = []

  if (auth.role === 'coach') {
    const { data: links } = await admin
      .from('coach_athletes')
      .select('athlete_id')
      .eq('coach_id', auth.userId)
    athleteIds = (links ?? []).map((l: any) => l.athlete_id)
  }

  if (auth.role === 'coach' && athleteIds.length === 0) {
    return NextResponse.json([])
  }

  let query = admin
    .from('profiles')
    .select('*, journal_entries(count)')
    .order('created_at', { ascending: false })

  if (auth.role === 'coach') {
    query = query.in('id', athleteIds)
  }

  const { data: profiles, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const athletes = (profiles ?? []).map((p: any) => ({
    ...p,
    entry_count: p.journal_entries?.[0]?.count ?? 0,
    journal_entries: undefined,
  }))

  return NextResponse.json(athletes)
}
