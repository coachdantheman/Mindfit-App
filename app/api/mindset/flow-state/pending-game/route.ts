import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { isPlainObject, isUUID } from '@/lib/validate'

const WINDOW_MS = 48 * 60 * 60 * 1000

// The most recent finished Flow Stack (last 48h) whose game is not logged yet.
export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('flow_sessions')
    .select('id, completed_at')
    .eq('user_id', auth.userId)
    .is('game_logged_at', null)
    .not('completed_at', 'is', null)
    .gte('completed_at', new Date(Date.now() - WINDOW_MS).toISOString())
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return dbError(error)
  return NextResponse.json(data ? { session_id: data.id, completed_at: data.completed_at } : null)
}

// "Not today": the athlete didn't play, or logged it somewhere else.
export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body) || !isUUID(body.session_id)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const admin = createAdminClient()
  const { error } = await admin
    .from('flow_sessions')
    .update({ game_logged_at: new Date().toISOString() })
    .eq('id', body.session_id)
    .eq('user_id', auth.userId)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
