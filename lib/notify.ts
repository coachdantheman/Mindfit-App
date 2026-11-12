import type { SupabaseClient } from '@supabase/supabase-js'
import { pushConfigured, sendPush } from '@/lib/push'
import { sendEngagementEmail } from '@/lib/email'
import { unsubscribeUrl, type EmailCategory } from '@/lib/unsubscribe'

export type Category = 'reminders' | 'progress' | 'coach' | 'weekly' | 'daily_quote'

export interface Prefs {
  push_daily_quote: boolean
  push_reminders: boolean
  push_progress: boolean
  push_coach: boolean
  email_progress: boolean
  email_weekly: boolean
  email_coach: boolean
  reminder_hour: number
  timezone: string
}

export const DEFAULT_PREFS: Prefs = {
  push_daily_quote: true, push_reminders: true, push_progress: true, push_coach: true,
  email_progress: true, email_weekly: true, email_coach: true,
  reminder_hour: 18, timezone: 'America/New_York',
}

const PUSH_KEY: Record<Category, keyof Prefs> = {
  reminders: 'push_reminders', weekly: 'push_reminders', progress: 'push_progress',
  coach: 'push_coach', daily_quote: 'push_daily_quote',
}
const EMAIL_KEY: Partial<Record<Category, Exclude<EmailCategory, 'all'>>> = {
  progress: 'email_progress', weekly: 'email_weekly', coach: 'email_coach',
}

export interface Message {
  type: string
  category: Category
  title: string
  body: string
  url?: string
  // Same key = same message; the second send is dropped.
  dedupeKey: string
  email?: { subject: string; html: string }
  inbox?: boolean
}

export async function prefsFor(admin: SupabaseClient, userId: string): Promise<Prefs> {
  const { data } = await admin.from('notification_prefs').select('*').eq('user_id', userId).maybeSingle()
  return { ...DEFAULT_PREFS, ...(data ?? {}) }
}

// One way out for every notification: in-app inbox, push and (for some
// categories) email. Respects prefs and the under-13 rules: athletes
// waiting on consent get nothing, and under-13 accounts never get email.
export async function notify(admin: SupabaseClient, userId: string, msg: Message): Promise<'sent' | 'duplicate' | 'skipped'> {
  const { error: dupErr } = await admin.from('notification_log').insert({ dedupe_key: msg.dedupeKey, user_id: userId })
  if (dupErr) return dupErr.code === '23505' ? 'duplicate' : 'skipped'

  const { data: profile } = await admin.from('profiles')
    .select('email, role, birth_year, consent_status').eq('id', userId).maybeSingle()
  if (!profile) return 'skipped'
  if (profile.role === 'member' && (profile.birth_year == null || profile.consent_status === 'pending')) return 'skipped'
  const emailAllowed = (profile.consent_status ?? 'not_required') === 'not_required'
  const prefs = await prefsFor(admin, userId)

  if (msg.inbox !== false) {
    await admin.from('notifications').insert({ user_id: userId, type: msg.type, title: msg.title, body: msg.body, url: msg.url ?? null })
  }

  if (prefs[PUSH_KEY[msg.category]] && pushConfigured()) {
    const { data: subs } = await admin.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', userId)
    const gone: string[] = []
    for (const s of subs ?? []) {
      const r = await sendPush(s, { title: msg.title, body: msg.body, url: msg.url ?? '/mindset', tag: msg.type })
      if (r === 'gone') gone.push(s.endpoint)
    }
    if (gone.length) await admin.from('push_subscriptions').delete().in('endpoint', gone)
  }

  const emailKey = EMAIL_KEY[msg.category]
  if (msg.email && emailKey && prefs[emailKey] && emailAllowed && profile.email) {
    await sendEngagementEmail(profile.email, msg.email.subject, msg.email.html, unsubscribeUrl(userId, emailKey))
  }
  return 'sent'
}

export type NotifyCounts = Record<'sent' | 'duplicate' | 'skipped', number>

// Same rules as notify(), for many messages at once: a fixed handful of
// database calls per batch instead of five per message. Keep batches
// small so the id lists fit in one request. Throws if it cannot read
// profiles or prefs or write the send log, before anything is sent, so
// the caller can keep the messages and try again.
export async function notifyMany(admin: SupabaseClient, items: { userId: string; msg: Message }[]): Promise<NotifyCounts> {
  const counts: NotifyCounts = { sent: 0, duplicate: 0, skipped: 0 }
  const seen = new Set<string>()
  const unique = items.filter(i => (seen.has(i.msg.dedupeKey) ? (counts.duplicate++, false) : (seen.add(i.msg.dedupeKey), true)))
  if (unique.length === 0) return counts

  const ids = [...new Set(unique.map(i => i.userId))]
  const [{ data: profiles, error: profileErr }, { data: prefRows, error: prefErr }] = await Promise.all([
    admin.from('profiles').select('id, email, role, birth_year, consent_status').in('id', ids),
    admin.from('notification_prefs').select('*').in('user_id', ids),
  ])
  // Without prefs we cannot tell who opted out, so nothing goes out.
  if (profileErr || prefErr) throw new Error(`notify read failed: ${(profileErr ?? prefErr)!.message}`)
  const profileOf = new Map((profiles ?? []).map((p: any) => [p.id, p]))
  const prefsOf = new Map<string, Prefs>((prefRows ?? []).map((p: any) => [p.user_id, { ...DEFAULT_PREFS, ...p }]))

  const allowed = unique.filter(i => {
    const p = profileOf.get(i.userId)
    const ok = !!p && !(p.role === 'member' && (p.birth_year == null || p.consent_status === 'pending'))
    if (!ok) counts.skipped++
    return ok
  })
  if (allowed.length === 0) return counts

  // Only keys that were not logged before come back, so a repeat run sends nothing twice.
  const { data: logged, error } = await admin.from('notification_log')
    .upsert(allowed.map(i => ({ dedupe_key: i.msg.dedupeKey, user_id: i.userId })), { onConflict: 'dedupe_key', ignoreDuplicates: true })
    .select('dedupe_key')
  if (error) throw new Error(`notify log failed: ${error.message}`)
  const isNew = new Set((logged ?? []).map((r: any) => r.dedupe_key))
  const fresh = allowed.filter(i => isNew.has(i.msg.dedupeKey))
  counts.duplicate += allowed.length - fresh.length
  counts.sent += fresh.length
  if (fresh.length === 0) return counts

  const inbox = fresh.filter(i => i.msg.inbox !== false)
  if (inbox.length) {
    await admin.from('notifications').insert(inbox.map(i => ({ user_id: i.userId, type: i.msg.type, title: i.msg.title, body: i.msg.body, url: i.msg.url ?? null })))
  }

  const wantsPush = fresh.filter(i => (prefsOf.get(i.userId) ?? DEFAULT_PREFS)[PUSH_KEY[i.msg.category]])
  if (wantsPush.length && pushConfigured()) {
    const { data: subs } = await admin.from('push_subscriptions').select('user_id, endpoint, p256dh, auth').in('user_id', [...new Set(wantsPush.map(i => i.userId))])
    const subsOf = new Map<string, { endpoint: string; p256dh: string; auth: string }[]>()
    for (const s of subs ?? []) subsOf.set(s.user_id, [...(subsOf.get(s.user_id) ?? []), s])
    const gone: string[] = []
    await Promise.all(wantsPush.flatMap(i => (subsOf.get(i.userId) ?? []).map(async s => {
      const r = await sendPush(s, { title: i.msg.title, body: i.msg.body, url: i.msg.url ?? '/mindset', tag: i.msg.type })
      if (r === 'gone') gone.push(s.endpoint)
    })))
    for (let n = 0; n < gone.length; n += 20) await admin.from('push_subscriptions').delete().in('endpoint', gone.slice(n, n + 20))
  }

  const emails = fresh.flatMap(i => {
    const emailKey = EMAIL_KEY[i.msg.category]
    const p = profileOf.get(i.userId)
    const emailAllowed = (p.consent_status ?? 'not_required') === 'not_required'
    return i.msg.email && emailKey && (prefsOf.get(i.userId) ?? DEFAULT_PREFS)[emailKey] && emailAllowed && p.email
      ? [{ to: p.email as string, email: i.msg.email, unsub: unsubscribeUrl(i.userId, emailKey) }]
      : []
  })
  for (let n = 0; n < emails.length; n += 10) {
    await Promise.all(emails.slice(n, n + 10).map(e => sendEngagementEmail(e.to, e.email.subject, e.email.html, e.unsub).catch(() => {})))
  }
  return counts
}
