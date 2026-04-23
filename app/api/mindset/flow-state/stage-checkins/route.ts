import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

const STAGES = ['struggle', 'release', 'flow', 'recovery'] as const

export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('flow_stage_checkins')
    .select('*')
    .eq('user_id', auth.userId)
    .order('checked_at', { ascending: false })
    .limit(limit)

  if (error) {
    const stale = error.code === 'PGRST204' || error.code === 'PGRST202' || /schema cache/i.test(error.message) || /Could not find the table/i.test(error.message)
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

  const body = await req.json()
  if (!STAGES.includes(body.stage)) {
    return NextResponse.json({ error: 'invalid stage' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('flow_stage_checkins')
    .insert({
      user_id: auth.userId,
      stage: body.stage,
      note: body.note?.trim() || null,
      checked_at: body.checked_at || new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    const stale = error.code === 'PGRST204' || error.code === 'PGRST202' || /schema cache/i.test(error.message) || /Could not find the table/i.test(error.message)
    return NextResponse.json(
      {
        error: stale
          ? "Supabase's schema cache is stale. In Supabase Dashboard → Project Settings → API click 'Restart server', or run `NOTIFY pgrst, 'reload schema';` in the SQL editor. " + `(Raw: ${error.message})`
          : error.message,
        stale_schema_cache: stale,
      },
      { status: stale ? 503 : 500 },
    )
  }
  return NextResponse.json(data)
}
