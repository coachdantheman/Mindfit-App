import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { prefsFor, DEFAULT_PREFS } from '@/lib/notify'
import { isValidTimeZone } from '@/lib/leaderboard'

const BOOL_KEYS = ['push_daily_quote', 'push_reminders', 'push_progress', 'push_coach', 'email_progress', 'email_weekly', 'email_coach'] as const

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  return NextResponse.json(await prefsFor(createAdminClient(), auth.userId))
}

// Partial update. Also used silently on app load to keep the timezone current.
export async function PUT(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => ({}))
  const update: Record<string, unknown> = {}
  for (const k of BOOL_KEYS) if (typeof body[k] === 'boolean') update[k] = body[k]
  if (Number.isInteger(body.reminder_hour) && body.reminder_hour >= 6 && body.reminder_hour <= 21) update.reminder_hour = body.reminder_hour
  if (typeof body.timezone === 'string' && isValidTimeZone(body.timezone)) update.timezone = body.timezone
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })

  const admin = createAdminClient()
  const current = await prefsFor(admin, auth.userId)
  const { error } = await admin.from('notification_prefs')
    .upsert({ ...DEFAULT_PREFS, ...current, ...update, user_id: auth.userId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) return dbError(error)
  return NextResponse.json({ ...current, ...update })
}
