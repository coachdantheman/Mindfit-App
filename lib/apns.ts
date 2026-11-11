import { connect } from 'node:http2'
import { createPrivateKey, sign } from 'node:crypto'
import type { PushPayload } from '@/lib/push'

// Apple Push Notification service, for the iPhone app. Needs four values
// from the Apple Developer account (see .env.local.example). Until they are
// set, nothing here runs and web push carries on alone.
export function apnsConfigured(): boolean {
  return Boolean(process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_PRIVATE_KEY && process.env.APNS_BUNDLE_ID)
}

const b64url = (v: Buffer | string) => Buffer.from(v).toString('base64url')

// Apple accepts a provider token for up to an hour and rejects ones that
// are refreshed too often, so one is reused for 45 minutes.
let cachedJwt: { value: string; at: number } | null = null
function providerToken(): string {
  if (cachedJwt && Date.now() - cachedJwt.at < 45 * 60_000) return cachedJwt.value
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: process.env.APNS_KEY_ID }))
  const claims = b64url(JSON.stringify({ iss: process.env.APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) }))
  const key = createPrivateKey(process.env.APNS_PRIVATE_KEY!.replace(/\\n/g, '\n'))
  const signature = sign('sha256', Buffer.from(`${header}.${claims}`), { key, dsaEncoding: 'ieee-p1363' })
  cachedJwt = { value: `${header}.${claims}.${b64url(signature)}`, at: Date.now() }
  return cachedJwt.value
}

export const isApnsToken = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{64,200}$/i.test(v)

// 'gone' means Apple no longer knows the device (app deleted or token
// replaced) and the row should be removed.
export async function sendApns(token: string, payload: PushPayload, sandbox = false): Promise<'sent' | 'gone' | 'error'> {
  const host = sandbox ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com'
  return new Promise(resolve => {
    let settled = false
    const done = (r: 'sent' | 'gone' | 'error') => { if (!settled) { settled = true; client.close(); resolve(r) } }
    const client = connect(host)
    client.on('error', () => done('error'))
    client.setTimeout(10_000, () => done('error'))
    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${token}`,
      authorization: `bearer ${providerToken()}`,
      'apns-topic': process.env.APNS_BUNDLE_ID!,
      'apns-push-type': 'alert',
      'apns-expiration': String(Math.floor(Date.now() / 1000) + 60 * 60 * 12),
      ...(payload.tag ? { 'apns-collapse-id': payload.tag.slice(0, 64) } : {}),
    })
    let status = 0
    let body = ''
    req.on('response', h => { status = Number(h[':status']) })
    req.on('data', c => { body += c })
    req.on('end', () => {
      if (status === 200) return done('sent')
      if (status === 410 || /BadDeviceToken|Unregistered/.test(body)) return done('gone')
      console.error('[apns] send failed', status, body.slice(0, 200))
      done('error')
    })
    req.on('error', () => done('error'))
    req.end(JSON.stringify({ aps: { alert: { title: payload.title, body: payload.body }, sound: 'default' }, url: payload.url ?? '/mindset' }))
  })
}
