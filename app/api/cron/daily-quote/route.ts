import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getQuoteOfTheDay, QUOTE_TIMEZONE } from '@/lib/data/quotes'
import { pushConfigured, sendPush } from '@/lib/push'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SEND_HOUR_CENTRAL = 7

function centralHour(date = new Date()): number {
  const h = new Intl.DateTimeFormat('en-US', { timeZone: QUOTE_TIMEZONE, hour: 'numeric', hour12: false }).format(date)
  return Number(h) % 24
}

// Scheduled in vercel.json at 12:00 and 13:00 UTC (Vercel cron is UTC only);
// whichever run lands on 7 AM Central sends, the other exits early.
// `?force=1` skips the hour check for manual tests.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
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
  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const payload = {
    title: 'MindFit — Quote of the Day',
    body: `“${quote.text}” — ${quote.author}`,
    url: `/quote?id=${quote.id}`,
    tag: `mindfit-daily-quote-${quote.date}`,
  }

  let sent = 0
  let errors = 0
  const gone: string[] = []
  const batchSize = 50
  for (let i = 0; i < (subs ?? []).length; i += batchSize) {
    const results = await Promise.all(subs!.slice(i, i + batchSize).map(s => sendPush(s, payload)))
    results.forEach((r, j) => {
      if (r === 'sent') sent++
      else if (r === 'gone') gone.push(subs![i + j].endpoint)
      else errors++
    })
  }
  if (gone.length) await admin.from('push_subscriptions').delete().in('endpoint', gone)

  return NextResponse.json({ ok: true, date: quote.date, quote: quote.id, sent, removed: gone.length, errors })
}
