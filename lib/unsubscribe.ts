import { createHmac, timingSafeEqual } from 'crypto'

export const EMAIL_CATEGORIES = ['email_progress', 'email_weekly', 'email_coach', 'all'] as const
export type EmailCategory = (typeof EMAIL_CATEGORIES)[number]

// UNSUBSCRIBE_SECRET signs new links. Links already sent were signed with
// the service-role key, so those still verify.
const legacyKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const key = () => process.env.UNSUBSCRIBE_SECRET || legacyKey()

function sign(userId: string, category: EmailCategory, k = key()): string {
  return createHmac('sha256', k).update(`unsubscribe:${userId}:${category}`).digest('base64url')
}

export function unsubscribeUrl(userId: string, category: EmailCategory): string {
  const app = process.env.NEXT_PUBLIC_APP_URL || 'https://mindfit.academy'
  return `${app}/api/email/unsubscribe?u=${userId}&c=${category}&t=${sign(userId, category)}`
}

export function verifyUnsubscribe(userId: string, category: string, token: string): category is EmailCategory {
  if (!key() || !(EMAIL_CATEGORIES as readonly string[]).includes(category)) return false
  const given = Buffer.from(token)
  return [...new Set([key(), legacyKey()])].filter(Boolean).some(k => {
    const expected = Buffer.from(sign(userId, category as EmailCategory, k))
    return given.length === expected.length && timingSafeEqual(given, expected)
  })
}
