import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { isApnsToken } from '@/lib/apns'

// The iPhone app's push token for the signed-in user (table device_tokens).

export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const token = new URL(req.url).searchParams.get('token')
  if (!isApnsToken(token)) return NextResponse.json({ registered: false })
  const { data } = await createAdminClient().from('device_tokens').select('token').eq('user_id', auth.userId).eq('token', token).maybeSingle()
  return NextResponse.json({ registered: Boolean(data) })
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const limited = await rateLimit(`push-native:${auth.userId}`, 20, 3600)
  if (limited) return limited

  const body = await req.json().catch(() => null)
  if (!isApnsToken(body?.token)) return NextResponse.json({ error: 'Invalid device token' }, { status: 400 })

  // A phone belongs to whoever is signed in on it now, so the token moves.
  const { error } = await createAdminClient().from('device_tokens').upsert(
    { token: body.token.toLowerCase(), user_id: auth.userId, platform: 'ios', sandbox: body.sandbox === true, updated_at: new Date().toISOString() },
    { onConflict: 'token' }
  )
  if (error) return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => null)
  if (!isApnsToken(body?.token)) return NextResponse.json({ ok: true })
  await createAdminClient().from('device_tokens').delete().eq('user_id', auth.userId).eq('token', body.token.toLowerCase())
  return NextResponse.json({ ok: true })
}
