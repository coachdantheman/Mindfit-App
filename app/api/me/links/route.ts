import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { isEmail } from '@/lib/validate'
import { linkOrQueue } from '@/lib/links'
import { sendParentInviteEmail } from '@/lib/email'
import type { LinkedPerson } from '@/types'

const MAX_PARENTS = 5
const PERSON = 'id, full_name, email'

// Who can see this user's progress (coaches, parents) and, for parents,
// which athletes they follow.
export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const admin = createAdminClient()

  const [{ data: coachLinks }, { data: parentLinks }, { data: pending }, { data: athleteLinks }] = await Promise.all([
    admin.from('coach_athletes').select('id, coach_id').eq('athlete_id', auth.userId),
    admin.from('parent_athletes').select('id, parent_id').eq('athlete_id', auth.userId),
    admin.from('pending_links').select('id, email').eq('requester_id', auth.userId).eq('kind', 'parent'),
    admin.from('parent_athletes').select('id, athlete_id').eq('parent_id', auth.userId),
  ])

  const ids = [
    ...(coachLinks ?? []).map(l => l.coach_id),
    ...(parentLinks ?? []).map(l => l.parent_id),
    ...(athleteLinks ?? []).map(l => l.athlete_id),
  ]
  const { data: people } = ids.length
    ? await admin.from('profiles').select(PERSON).in('id', ids)
    : { data: [] as LinkedPerson[] }
  const byId = new Map((people ?? []).map(p => [p.id, p as LinkedPerson]))
  const row = (linkId: string, id: string) => {
    const p = byId.get(id)
    return p ? { linkId, ...p } : null
  }

  return NextResponse.json({
    coaches: (coachLinks ?? []).map(l => row(l.id, l.coach_id)).filter(Boolean),
    parents: (parentLinks ?? []).map(l => row(l.id, l.parent_id)).filter(Boolean),
    pendingParents: (pending ?? []).map(p => ({ linkId: p.id, email: p.email })),
    athletes: (athleteLinks ?? []).map(l => row(l.id, l.athlete_id)).filter(Boolean),
  })
}

// Share progress with a parent by email.
export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const { kind, email } = await req.json().catch(() => ({}))
  if (kind !== 'parent') return NextResponse.json({ error: 'Unsupported link kind' }, { status: 400 })
  if (!isEmail(email)) return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  const normalized = email.toLowerCase().trim()
  if (normalized === auth.email.toLowerCase()) return NextResponse.json({ error: 'That is your own email.' }, { status: 400 })

  const admin = createAdminClient()
  const [{ count: linked }, { count: pending }, { data: me }] = await Promise.all([
    admin.from('parent_athletes').select('id', { count: 'exact', head: true }).eq('athlete_id', auth.userId),
    admin.from('pending_links').select('id', { count: 'exact', head: true }).eq('requester_id', auth.userId).eq('kind', 'parent'),
    admin.from('profiles').select('full_name').eq('id', auth.userId).single(),
  ])
  if ((linked ?? 0) + (pending ?? 0) >= MAX_PARENTS) {
    return NextResponse.json({ error: `You can share with up to ${MAX_PARENTS} parents.` }, { status: 400 })
  }

  try {
    const { outcome } = await linkOrQueue(admin, { email: normalized, requesterId: auth.userId, kind: 'parent' })
    if (outcome === 'invited') void sendParentInviteEmail(normalized, me?.full_name)
    return NextResponse.json({ outcome })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Could not share.' }, { status: 500 })
  }
}

// Revoke: the athlete removes a coach, a parent, or a pending parent invite.
export async function DELETE(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const { kind, id } = await req.json().catch(() => ({}))
  if (typeof id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 })
  const admin = createAdminClient()

  const q =
    kind === 'coach' ? admin.from('coach_athletes').delete().eq('id', id).eq('athlete_id', auth.userId) :
    kind === 'parent' ? admin.from('parent_athletes').delete().eq('id', id).eq('athlete_id', auth.userId) :
    kind === 'pending_parent' ? admin.from('pending_links').delete().eq('id', id).eq('requester_id', auth.userId) :
    null
  if (!q) return NextResponse.json({ error: 'Unsupported link kind' }, { status: 400 })
  const { error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
