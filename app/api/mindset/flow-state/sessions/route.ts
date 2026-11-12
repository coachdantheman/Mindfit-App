import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { isDateTime, isPlainObject, optionalString } from '@/lib/validate'

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
    .from('flow_sessions')
    .select('*')
    .eq('user_id', auth.userId)
    .gte('started_at', since.toISOString())
    .order('started_at', { ascending: false })
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
    .from('flow_sessions')
    .insert({
      user_id: auth.userId,
      started_at: isDateTime(body.started_at) ? body.started_at : new Date().toISOString(),
      completed_at: isDateTime(body.completed_at) ? body.completed_at : new Date().toISOString(),
      identity_statement: optionalString(body.identity_statement, 280),
      aim: optionalString(body.aim, 280),
      cue_word: optionalString(body.cue_word, 80),
      external_target: optionalString(body.external_target, 280),
      sport: optionalString(body.sport, 40),
      skipped_steps: Array.isArray(body.skipped_steps)
        ? body.skipped_steps.filter((s: unknown): s is string => typeof s === 'string').map(s => s.slice(0, 40)).slice(0, 50)
        : [],
    })
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}
