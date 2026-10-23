import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { requireString } from '@/lib/validate'
import { pushConfigured, sendPush } from '@/lib/push'
import { getQuoteOfTheDay } from '@/lib/data/quotes'

function parseEndpoint(value: unknown): string | null {
  const endpoint = requireString(value, 2000)
  if (!endpoint) return null
  try {
    const u = new URL(endpoint)
    return u.protocol === 'https:' ? endpoint : null
  } catch {
    return null
  }
}

// Is this browser's subscription registered for the signed-in user?
export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const endpoint = parseEndpoint(new URL(req.url).searchParams.get('endpoint'))
  if (!endpoint) return NextResponse.json({ subscribed: false, configured: pushConfigured() })

  const admin = createAdminClient()
  const { data } = await admin
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', auth.userId)
    .eq('endpoint', endpoint)
    .maybeSingle()

  return NextResponse.json({ subscribed: Boolean(data), configured: pushConfigured() })
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  if (!pushConfigured()) return NextResponse.json({ error: 'Push is not configured on the server' }, { status: 503 })

  const body = await req.json().catch(() => null)
  const endpoint = parseEndpoint(body?.endpoint)
  const p256dh = requireString(body?.keys?.p256dh, 500)
  const authKey = requireString(body?.keys?.auth, 500)
  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('push_subscriptions')
    .upsert(
      {
        user_id: auth.userId,
        endpoint,
        p256dh,
        auth: authKey,
        user_agent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
      },
      { onConflict: 'endpoint' }
    )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Confirmation push so the user sees it work immediately.
  const quote = getQuoteOfTheDay()
  await sendPush(
    { endpoint, p256dh, auth: authKey },
    {
      title: 'Daily quote is on',
      body: `You’ll get one every morning at 7:00. Today’s: “${quote.text}”`,
      url: '/mindset',
      tag: 'mindfit-push-welcome',
    }
  )

  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  const endpoint = parseEndpoint(body?.endpoint)
  if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('push_subscriptions')
    .delete()
    .eq('user_id', auth.userId)
    .eq('endpoint', endpoint)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
