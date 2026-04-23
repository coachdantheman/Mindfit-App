import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

const FIELDS = ['full_name', 'primary_sport', 'secondary_sport', 'next_competition_at'] as const

function isSchemaCacheError(err: unknown): boolean {
  const msg = (err as any)?.message ?? ''
  const code = (err as any)?.code ?? ''
  return (
    code === 'PGRST202' ||      // RPC function not found in cache
    code === 'PGRST204' ||      // column not found in cache
    /schema cache/i.test(msg)
  )
}

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('*')
    .eq('id', auth.userId)
    .single()

  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  for (const key of FIELDS) {
    if (body[key] !== undefined) {
      updates[key] = typeof body[key] === 'string'
        ? (body[key].trim() || null)
        : body[key]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Preferred path: route through the update_user_profile RPC. PostgREST
  // only needs the function signature in its schema cache, not each column.
  {
    const { data, error } = await admin.rpc('update_user_profile', {
      p_user_id: auth.userId,
      updates,
    })
    if (!error) {
      const row = Array.isArray(data) ? data[0] : data
      return NextResponse.json(row)
    }
    if (!isSchemaCacheError(error)) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // Fallback: direct update. Runs if the RPC is missing from the cache
  // (e.g. v6 migration hasn't been run yet, or PostgREST hasn't reloaded).
  {
    const { data, error } = await admin
      .from('profiles')
      .update(updates)
      .eq('id', auth.userId)
      .select('*')
      .single()
    if (!error) return NextResponse.json(data)
    if (isSchemaCacheError(error)) {
      return NextResponse.json({
        error:
          "Supabase's schema cache is stale — it doesn't see a new column/function yet. " +
          "Fix: in Supabase Dashboard → Project Settings → API, click 'Restart server'. " +
          "Or run `NOTIFY pgrst, 'reload schema';` in the SQL editor. " +
          `(Raw error: ${error.message})`,
      }, { status: 503 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
