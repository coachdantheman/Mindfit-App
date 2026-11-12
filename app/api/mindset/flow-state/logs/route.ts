import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { intOrNull, isDateTime, isPlainObject, isUUID, optionalString } from '@/lib/validate'

export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const all = searchParams.get('all') === '1'
  const days = parseInt(searchParams.get('days') || (all ? '3650' : '14'))
  const since = new Date()
  since.setDate(since.getDate() - days)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('flow_logs')
    .select('*')
    .eq('user_id', auth.userId)
    .gte('logged_at', since.toISOString())
    .order('logged_at', { ascending: false })
    .limit(1000)

  if (error) {
    const stale = error.code === 'PGRST204' || error.code === 'PGRST202' || /schema cache/i.test(error.message)
    return NextResponse.json(
      { error: error.message, stale_schema_cache: stale },
      { status: stale ? 503 : 500 },
    )
  }
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('flow_logs')
    .insert({
      user_id: auth.userId,
      flow_session_id: isUUID(body.flow_session_id) ? body.flow_session_id : null,
      logged_at: isDateTime(body.logged_at) ? body.logged_at : new Date().toISOString(),
      sport: optionalString(body.sport, 40),
      challenge_level: intOrNull(body.challenge_level, 1, 10),
      skill_level: intOrNull(body.skill_level, 1, 10),
      flow_score: intOrNull(body.flow_score, 1, 10),
      ending_stage: optionalString(body.ending_stage, 40),
      triggers_fired: Array.isArray(body.triggers_fired)
        ? body.triggers_fired.filter((t: unknown): t is string => typeof t === 'string').map(t => t.slice(0, 80)).slice(0, 20)
        : [],
      journal_note: optionalString(body.journal_note, 4000),
    })
    .select()
    .single()

  if (error) {
    const stale = error.code === 'PGRST204' || error.code === 'PGRST202' || /schema cache/i.test(error.message)
    return NextResponse.json(
      {
        error: stale
          ? "Supabase's schema cache is stale. In Supabase Dashboard → Project Settings → API click 'Restart server', or run `NOTIFY pgrst, 'reload schema';` in the SQL editor. " + `(Raw: ${error.message})`
          : error.message,
        stale_schema_cache: stale,
      },
      { status: stale ? 503 : 400 },
    )
  }
  return NextResponse.json(data)
}
