'use client'
import { isNativeApp } from '@/lib/platform'

// Bridge to the iPhone shell (mindfit-ios). The shell injects
// window.Capacitor into this site; on the website none of this exists and
// every helper quietly does nothing or falls back to the browser.
type Listener = { remove: () => Promise<void> }
interface NativePlugins {
  Haptics?: {
    impact(o: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }): Promise<void>
    notification(o: { type: 'SUCCESS' | 'WARNING' | 'ERROR' }): Promise<void>
  }
  PushNotifications?: {
    checkPermissions(): Promise<{ receive: 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied' }>
    requestPermissions(): Promise<{ receive: 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied' }>
    register(): Promise<void>
    unregister(): Promise<void>
    addListener(event: string, cb: (data: any) => void): Promise<Listener>
  }
}

function plugins(): NativePlugins | null {
  if (!isNativeApp()) return null
  return ((window as any).Capacitor?.Plugins as NativePlugins | undefined) ?? null
}

const TOKEN_KEY = 'mf:apns-token'
const savedToken = () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }

/** A tap you can feel: set done, timer finished, barcode found, new PR. */
export function haptic(kind: 'tap' | 'done' | 'success' = 'tap', fallbackPattern?: number | number[]) {
  const h = plugins()?.Haptics
  try {
    if (h) {
      if (kind === 'success') void h.notification({ type: 'SUCCESS' })
      else void h.impact({ style: kind === 'done' ? 'MEDIUM' : 'LIGHT' })
    } else if (fallbackPattern !== undefined) {
      navigator.vibrate?.(fallbackPattern)
    }
  } catch {}
}

export function nativePushAvailable(): boolean {
  return Boolean(plugins()?.PushNotifications)
}

export async function nativePushStatus(): Promise<'on' | 'off' | 'blocked'> {
  const push = plugins()?.PushNotifications
  if (!push) return 'off'
  const { receive } = await push.checkPermissions()
  if (receive === 'denied') return 'blocked'
  const token = savedToken()
  if (receive !== 'granted' || !token) return 'off'
  const res = await fetch(`/api/push/native?token=${encodeURIComponent(token)}`)
  return res.ok && (await res.json()).registered ? 'on' : 'off'
}

/** Ask iOS for permission, get the device token and store it for this user. */
export async function enableNativePush(): Promise<'on' | 'off' | 'blocked'> {
  const push = plugins()?.PushNotifications
  if (!push) return 'off'
  const { receive } = await push.requestPermissions()
  if (receive !== 'granted') return receive === 'denied' ? 'blocked' : 'off'

  const token = await new Promise<string>((resolve, reject) => {
    const handles: Promise<Listener>[] = []
    const finish = (fn: () => void) => { handles.forEach(h => h.then(l => l.remove()).catch(() => {})); fn() }
    const timer = setTimeout(() => finish(() => reject(new Error('Apple did not answer. Try again.'))), 15_000)
    handles.push(push.addListener('registration', (t: { value: string }) => { clearTimeout(timer); finish(() => resolve(t.value)) }))
    handles.push(push.addListener('registrationError', (e: { error?: string }) => { clearTimeout(timer); finish(() => reject(new Error(e?.error || 'Could not register for notifications.'))) }))
    push.register().catch(reject)
  })

  const res = await fetch('/api/push/native', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not turn on notifications.')
  try { localStorage.setItem(TOKEN_KEY, token) } catch {}
  return 'on'
}

export async function disableNativePush(): Promise<void> {
  const token = savedToken()
  if (token) {
    await fetch('/api/push/native', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
    try { localStorage.removeItem(TOKEN_KEY) } catch {}
  }
  await plugins()?.PushNotifications?.unregister().catch(() => {})
}

/** When a notification is tapped, open the screen it points at. Returns a cleanup. */
export function onNativePushTap(open: (path: string) => void): () => void {
  const push = plugins()?.PushNotifications
  if (!push) return () => {}
  const handle = push.addListener('pushNotificationActionPerformed', (a: { notification?: { data?: { url?: unknown } } }) => {
    const url = a?.notification?.data?.url
    // Same-site paths only: a notification can never send the app elsewhere.
    if (typeof url === 'string' && /^\/[a-z0-9\-/?=&_]*$/i.test(url)) open(url)
  })
  return () => { handle.then(l => l.remove()).catch(() => {}) }
}
