import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('flow_sessions')
    .insert({
      user_id: auth.userId,
      started_at: body.started_at || new Date().toISOString(),
      completed_at: body.completed_at || new Date().toISOString(),
      identity_statement: body.identity_statement || null,
      aim: body.aim || null,
      cue_word: body.cue_word || null,
      external_target: body.external_target || null,
      sport: body.sport || null,
      skipped_steps: body.skipped_steps || [],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
