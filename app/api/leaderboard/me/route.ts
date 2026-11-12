import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { isValidAlias } from '@/lib/leaderboard'
import { consentFlags } from '@/lib/consent-flags'
import { hasProfanity } from '@/lib/profanity'
import { isPlainObject } from '@/lib/validate'

// Leaderboard privacy settings. Kept apart from /api/profile because its
// update_user_profile RPC whitelists columns and would drop these.
export async function GET() {
  const auth = await verifyApiUser('member', 'coach', 'admin')
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('leaderboard_visible, leaderboard_alias')
    .eq('id', auth.userId)
    .single()
  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const auth = await verifyApiUser('member', 'coach', 'admin')
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const updates: Record<string, unknown> = {}
  if (typeof body.leaderboard_visible === 'boolean') updates.leaderboard_visible = body.leaderboard_visible
  if (body.leaderboard_alias !== undefined) {
    const alias = typeof body.leaderboard_alias === 'string' ? body.leaderboard_alias.trim() : ''
    if (alias && !isValidAlias(alias)) {
      return NextResponse.json({ error: 'Alias must be 2–20 characters.' }, { status: 400 })
    }
    if (alias && hasProfanity(alias)) {
      return NextResponse.json({ error: 'Pick a different name.' }, { status: 400 })
    }
    updates.leaderboard_alias = alias || null
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const admin = createAdminClient()
  if (updates.leaderboard_visible === true && (await consentFlags(admin, auth.userId)).leaderboardBlocked) {
    return NextResponse.json({ error: 'A parent needs to allow the leaderboard first.' }, { status: 403 })
  }
  const { data, error } = await admin
    .from('profiles')
    .update(updates)
    .eq('id', auth.userId)
    .select('leaderboard_visible, leaderboard_alias')
    .single()
  if (error) return dbError(error)
  return NextResponse.json(data)
}
