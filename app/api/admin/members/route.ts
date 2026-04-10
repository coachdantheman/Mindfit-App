import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

export async function GET() {
  const auth = await verifyApiUser('admin')
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('*, journal_entries(count)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const members = profiles.map((p: { journal_entries?: { count: number }[]; [key: string]: unknown }) => ({
    ...p,
    entry_count: p.journal_entries?.[0]?.count ?? 0,
    journal_entries: undefined,
  }))

  return NextResponse.json(members)
}
