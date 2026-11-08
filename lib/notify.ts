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
