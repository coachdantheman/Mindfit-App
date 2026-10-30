import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()

  const { data: links } = await admin.from('parent_athletes').select('athlete_id').eq('parent_id', auth.userId)
  const ids = (links ?? []).map(l => l.athlete_id)
  if (ids.length === 0) return NextResponse.json([])

  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, email, full_name, primary_sport, created_at, onboarded_at, journal_entries(count)')
    .in('id', ids)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json((profiles ?? []).map((p: any) => ({
    ...p,
    entry_count: p.journal_entries?.[0]?.count ?? 0,
    journal_entries: undefined,
  })))
}
