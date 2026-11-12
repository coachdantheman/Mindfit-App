import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { cronAuthorized } from '@/lib/cron-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { getQuoteOfTheDay, QUOTE_TIMEZONE } from '@/lib/data/quotes'
import { pushConfigured, sendPush, type StoredSubscription } from '@/lib/push'
import { fetchAll } from '@/lib/fetch-all'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const SEND_HOUR_CENTRAL = 7

function centralHour(date = new Date()): number {
  const h = new Intl.DateTimeFormat('en-US', { timeZone: QUOTE_TIMEZONE, hour: 'numeric', hour12: false }).format(date)
  return Number(h) % 24
}

// Scheduled in vercel.json at 12:00 and 13:00 UTC (Vercel cron is UTC only);
// whichever run lands on 7 AM Central sends, the other exits early.
// `?force=1` skips the hour check for manual tests.
export async function GET(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!pushConfigured()) return NextResponse.json({ error: 'Push not configured' }, { status: 503 })

  const url = new URL(req.url)
  const force = url.searchParams.get('force') === '1'
  const hour = centralHour()
  if (!force && hour !== SEND_HOUR_CENTRAL) {
    return NextResponse.json({ skipped: true, reason: `Central hour is ${hour}, send hour is ${SEND_HOUR_CENTRAL}` })
  }

  const quote = getQuoteOfTheDay()
  const admin = createAdminClient()
  const { error } = await admin.from('push_subscriptions').select('endpoint').limit(1)
  if (error) return dbError(error)
  let allSubs: (StoredSubscription & { user_id: string })[]
  let optedOut: { user_id: string }[]
  try {
    [allSubs, optedOut] = await Promise.all([
      fetchAll<StoredSubscription & { user_id: string }>((from, to) =>
        admin.from('push_subscriptions').select('user_id, endpoint, p256dh, auth').order('endpoint').range(from, to)),
      fetchAll<{ user_id: string }>((from, to) =>
        admin.from('notification_prefs').select('user_id').eq('push_daily_quote', false).order('user_id').range(from, to)),
    ])
  } catch (e: any) {
    // Better no quote today than a quote to people who turned it off.
    return dbError({ message: e?.message ?? 'daily quote read failed' })
  }
  const off = new Set(optedOut.map(r => r.user_id))
  const subs = allSubs.filter(s => !off.has(s.user_id))
  const deadline = Date.now() + 250_000

  const payload = {
    title: 'MindFit — Quote of the Day',
    body: `“${quote.text}” — ${quote.author}`,
    url: `/quote?id=${quote.id}`,
    tag: `mindfit-daily-quote-${quote.date}`,
  }

  let sent = 0
  let errors = 0
  const gone: string[] = []
  const batchSize = 100
  let reached = 0
  for (let i = 0; i < subs.length && Date.now() < deadline; i += batchSize) {
    reached = Math.min(subs.length, i + batchSize)
    const results = await Promise.all(subs!.slice(i, i + batchSize).map(s => sendPush(s, payload)))
    results.forEach((r, j) => {
      if (r === 'sent') sent++
      else if (r === 'gone') gone.push(subs![i + j].endpoint)
      else errors++
    })
  }
  for (let i = 0; i < gone.length; i += 20) await admin.from('push_subscriptions').delete().in('endpoint', gone.slice(i, i + 20))

  return NextResponse.json({ ok: true, date: quote.date, quote: quote.id, sent, removed: gone.length, errors, notReached: subs.length - reached })
}
