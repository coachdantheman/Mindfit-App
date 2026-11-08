import { createHmac, timingSafeEqual } from 'crypto'

export const EMAIL_CATEGORIES = ['email_progress', 'email_weekly', 'email_coach', 'all'] as const
export type EmailCategory = (typeof EMAIL_CATEGORIES)[number]

const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function sign(userId: string, category: EmailCategory): string {
  return createHmac('sha256', key()).update(`unsubscribe:${userId}:${category}`).digest('base64url')
}

export function unsubscribeUrl(userId: string, category: EmailCategory): string {
  const app = process.env.NEXT_PUBLIC_APP_URL || 'https://mindfit.academy'
  return `${app}/api/email/unsubscribe?u=${userId}&c=${category}&t=${sign(userId, category)}`
}

export function verifyUnsubscribe(userId: string, category: string, token: string): category is EmailCategory {
  if (!key() || !(EMAIL_CATEGORIES as readonly string[]).includes(category)) return false
  const expected = Buffer.from(sign(userId, category as EmailCategory))
  const given = Buffer.from(token)
  return given.length === expected.length && timingSafeEqual(given, expected)
}
