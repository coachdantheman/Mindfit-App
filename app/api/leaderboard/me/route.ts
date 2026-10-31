import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { isValidAlias } from '@/lib/leaderboard'

// Leaderboard privacy settings. Kept apart from /api/profile because its
// update_user_profile RPC whitelists columns and would drop these.
export async function GET() {
  const auth = await verifyApiUser('member')
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('leaderboard_visible, leaderboard_alias')
    .eq('id', auth.userId)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const auth = await verifyApiUser('member')
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}
  if (typeof body.leaderboard_visible === 'boolean') updates.leaderboard_visible = body.leaderboard_visible
  if (body.leaderboard_alias !== undefined) {
    const alias = typeof body.leaderboard_alias === 'string' ? body.leaderboard_alias.trim() : ''
    if (alias && !isValidAlias(alias)) {
      return NextResponse.json({ error: 'Alias must be 2–20 characters.' }, { status: 400 })
    }
    updates.leaderboard_alias = alias || null
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .update(updates)
    .eq('id', auth.userId)
    .select('leaderboard_visible, leaderboard_alias')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
