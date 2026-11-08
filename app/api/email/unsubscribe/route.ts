import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyUnsubscribe } from '@/lib/unsubscribe'
import { DEFAULT_PREFS } from '@/lib/notify'

// One-click unsubscribe from the link in every engagement email (GET) and
// from mail apps using List-Unsubscribe-Post (POST). No sign-in needed:
// the signed token proves which account and category.
async function unsubscribe(req: Request) {
  const url = new URL(req.url)
  const u = url.searchParams.get('u') ?? ''
  const c = url.searchParams.get('c') ?? ''
  const t = url.searchParams.get('t') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(u) || !verifyUnsubscribe(u, c, t)) return null
  const off = c === 'all' ? { email_progress: false, email_weekly: false, email_coach: false } : { [c]: false }
  const admin = createAdminClient()
  const { data: existing } = await admin.from('notification_prefs').select('user_id').eq('user_id', u).maybeSingle()
  if (existing) await admin.from('notification_prefs').update({ ...off, updated_at: new Date().toISOString() }).eq('user_id', u)
  else await admin.from('notification_prefs').insert({ ...DEFAULT_PREFS, ...off, user_id: u })
  return c
}

const LABEL: Record<string, string> = {
  email_progress: 'level-up emails', email_weekly: 'weekly recap emails', email_coach: 'coach update emails', all: 'all MindFit emails',
}

export async function GET(req: Request) {
  const c = await unsubscribe(req)
  const msg = c
    ? `You're unsubscribed from ${LABEL[c]}. You can turn them back on in Settings → Notifications.`
    : 'This unsubscribe link is not valid. You can change your emails in Settings → Notifications.'
  return new NextResponse(
    `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>MindFit</title>
<body style="background:#0A0F1A;color:#e5e7eb;font-family:sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px">
<div style="max-width:420px"><h1 style="color:#C4B400;letter-spacing:4px;font-size:24px">MINDFIT</h1><p style="line-height:1.6">${msg}</p></div></body>`,
    { status: c ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

export async function POST(req: Request) {
  const c = await unsubscribe(req)
  return NextResponse.json({ ok: !!c }, { status: c ? 200 : 400 })
}
