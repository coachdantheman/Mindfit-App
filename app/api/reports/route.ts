import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { displayNameFor } from '@/lib/leaderboard'
import { sendReportEmail } from '@/lib/email'
import { openId } from '@/lib/report-token'

const KINDS = ['leaderboard_name', 'coach_note'] as const
type Kind = typeof KINDS[number]

// Any signed-in user can report a leaderboard name or a coach note they can see.
// The server reads the text itself: the client never supplies the snapshot.
export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const limited = await rateLimit(`report:${auth.userId}`, 10, 86_400)
  if (limited) return limited

  const body = await req.json().catch(() => ({}))
  const kind = body.kind as Kind
  if (!KINDS.includes(kind)) return NextResponse.json({ error: 'Unknown report type.' }, { status: 400 })
  const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim().slice(0, 500) : null
  const targetUserId = typeof body.target_user_id === 'string' ? openId(body.target_user_id) : null
  const targetId = typeof body.target_id === 'string' ? body.target_id.slice(0, 100) : null

  const admin = createAdminClient()
  let snapshot: string
  let reportedUser: string | null = targetUserId

  if (kind === 'leaderboard_name') {
    if (!targetUserId) return NextResponse.json({ error: 'Nothing to report.' }, { status: 400 })
    const { data: profile, error } = await admin
      .from('profiles')
      .select('full_name, leaderboard_alias')
      .eq('id', targetUserId)
      .maybeSingle()
    if (error) return dbError(error)
    if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    snapshot = displayNameFor(profile.full_name, profile.leaderboard_alias)
  } else {
    // The athlete's own notes only. Without a target_id, the newest note is the one the athlete sees.
    let q = admin.from('flow_coach_notes').select('id, coach_id, note').eq('athlete_id', auth.userId)
    if (targetId) q = q.eq('id', targetId)
    const { data: note, error } = await q.order('updated_at', { ascending: false }).limit(1).maybeSingle()
    if (error) return dbError(error)
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    snapshot = note.note ?? ''
    reportedUser = note.coach_id
    if (!snapshot.trim()) return NextResponse.json({ error: 'Nothing to report.' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('reports')
    .insert({
      reporter_id: auth.userId,
      kind,
      target_user_id: reportedUser,
      target_id: kind === 'coach_note' ? targetId : targetUserId,
      snapshot: snapshot.slice(0, 4000),
      reason,
    })
    .select('id')
    .single()
  if (error) return dbError(error)

  try {
    await sendReportEmail(kind, snapshot, reason)
  } catch (e) {
    console.error('report email failed:', e)
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
}

export async function GET() {
  const auth = await verifyApiUser('admin')
  if (auth instanceof NextResponse) return auth

  const { data, error } = await createAdminClient()
    .from('reports')
    .select('id, kind, target_user_id, target_id, snapshot, reason, status, created_at')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: Request) {
  const auth = await verifyApiUser('admin')
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  if (typeof body.id !== 'string' || body.status !== 'resolved') {
    return NextResponse.json({ error: 'id and status "resolved" required' }, { status: 400 })
  }

  const { data, error } = await createAdminClient()
    .from('reports')
    .update({ status: 'resolved' })
    .eq('id', body.id)
    .select('id, status')
    .maybeSingle()
  if (error) return dbError(error)
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}
