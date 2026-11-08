import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { notify } from '@/lib/notify'
import { ENCOURAGEMENT, type EncouragementKey } from '@/lib/notify-copy'

// Coach taps "Send encouragement" on one athlete or a whole team. Preset
// messages only, so nothing unreviewed reaches a minor. One per athlete
// per message per day.
export async function POST(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => ({}))
  const key = body.message as EncouragementKey
  if (!(key in ENCOURAGEMENT)) return NextResponse.json({ error: 'Pick a message.' }, { status: 400 })
  const limited = await rateLimit(`encourage:${auth.userId}`, 30, 86_400)
  if (limited) return limited

  const admin = createAdminClient()
  let athleteIds: string[] = []
  if (typeof body.team_id === 'string') {
    const { data: team } = await admin.from('teams').select('id').eq('id', body.team_id).eq('coach_id', auth.userId).maybeSingle()
    if (!team) return NextResponse.json({ error: 'Team not found.' }, { status: 404 })
    const { data } = await admin.from('team_members').select('athlete_id').eq('team_id', team.id)
    athleteIds = (data ?? []).map(r => r.athlete_id)
  } else if (typeof body.athlete_id === 'string') {
    const { data } = await admin.from('coach_athletes').select('athlete_id').eq('coach_id', auth.userId).eq('athlete_id', body.athlete_id).maybeSingle()
    if (!data) return NextResponse.json({ error: 'Athlete not found.' }, { status: 404 })
    athleteIds = [data.athlete_id]
  }
  if (athleteIds.length === 0) return NextResponse.json({ error: 'Pick an athlete or team.' }, { status: 400 })

  const { data: me } = await admin.from('profiles').select('full_name').eq('id', auth.userId).single()
  const coach = me?.full_name?.trim() || 'Your coach'
  const day = new Date().toISOString().slice(0, 10)
  let sent = 0
  for (const id of athleteIds) {
    const r = await notify(admin, id, {
      type: 'encouragement', category: 'coach', title: coach, body: ENCOURAGEMENT[key], url: '/mindset',
      dedupeKey: `encourage:${auth.userId}:${id}:${key}:${day}`,
    })
    if (r === 'sent') sent++
  }
  return NextResponse.json({ sent, of: athleteIds.length })
}
