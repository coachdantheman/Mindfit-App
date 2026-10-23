import webpush, { type PushSubscription as WebPushSubscription } from 'web-push'

export interface StoredSubscription {
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

export function pushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

let configured = false
function configure() {
  if (configured) return
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:daniel@mindfit.academy',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  configured = true
}

// Returns 'sent', or 'gone' when the browser has dropped the subscription
// (404/410) and the row should be deleted.
export async function sendPush(sub: StoredSubscription, payload: PushPayload): Promise<'sent' | 'gone' | 'error'> {
  configure()
  const target: WebPushSubscription = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }
  try {
    await webpush.sendNotification(target, JSON.stringify(payload), { TTL: 60 * 60 * 12 })
    return 'sent'
  } catch (e: any) {
    const status = e?.statusCode
    if (status === 404 || status === 410) return 'gone'
    console.error('[push] send failed', status, e?.body || e?.message)
    return 'error'
  }
}
