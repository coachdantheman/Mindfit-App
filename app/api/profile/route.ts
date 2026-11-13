import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { isISODate, isPlainObject } from '@/lib/validate'

const FIELDS = ['full_name', 'primary_sport', 'secondary_sport', 'next_competition_at', 'next_competition_time', 'terms_accepted_at', 'default_bedtime', 'default_wake_time', 'units'] as const
const TIME_FIELDS = ['next_competition_time', 'default_bedtime', 'default_wake_time'] as const
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/

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

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const updates: Record<string, unknown> = {}
  for (const key of FIELDS) {
    const v = body[key]
    if (v === undefined) continue
    if (key === 'terms_accepted_at') continue
    if (v !== null && typeof v !== 'string') return NextResponse.json({ error: `${key} is invalid` }, { status: 400 })
    const value = typeof v === 'string' ? (v.trim().slice(0, 120) || null) : null
    if (key === 'next_competition_at' && value !== null && !isISODate(value)) {
      return NextResponse.json({ error: 'next_competition_at must be YYYY-MM-DD' }, { status: 400 })
    }
    updates[key] = value
  }
  if (body.terms_accepted_at !== undefined) updates.terms_accepted_at = true
  if (body.daily_guidance !== undefined) {
    if (typeof body.daily_guidance !== 'boolean') return NextResponse.json({ error: 'daily_guidance is invalid' }, { status: 400 })
    updates.daily_guidance = body.daily_guidance
  }
  if (body.show_today_card !== undefined) {
    if (typeof body.show_today_card !== 'boolean') return NextResponse.json({ error: 'show_today_card is invalid' }, { status: 400 })
    updates.show_today_card = body.show_today_card
  }
  if (updates.units !== undefined && updates.units !== 'imperial' && updates.units !== 'metric') {
    return NextResponse.json({ error: 'units must be imperial or metric' }, { status: 400 })
  }

  if (typeof updates.full_name === 'string' && updates.full_name.length > 120) {
    return NextResponse.json({ error: 'Name is too long.' }, { status: 400 })
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 })
  }
  for (const key of TIME_FIELDS) {
    if (updates[key] != null && !TIME_RE.test(String(updates[key]))) {
      return NextResponse.json({ error: `${key} must be HH:MM` }, { status: 400 })
    }
  }
  if (updates.terms_accepted_at !== undefined) updates.terms_accepted_at = new Date().toISOString()

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
      return dbError(error)
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
          "Supabase's schema cache is stale. It doesn't see a new column/function yet. " +
          "Fix: in Supabase Dashboard → Project Settings → API, click 'Restart server'. " +
          "Or run `NOTIFY pgrst, 'reload schema';` in the SQL editor. " +
          `(Raw error: ${error.message})`,
      }, { status: 503 })
    }
    return dbError(error)
  }
}
