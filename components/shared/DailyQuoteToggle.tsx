'use client'
import { useEffect, useState } from 'react'

type Status = 'loading' | 'unsupported' | 'needs-install' | 'blocked' | 'off' | 'on' | 'busy'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true

export default function DailyQuoteToggle() {
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  useEffect(() => {
    const run = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        setStatus(isIOS() && !isStandalone() ? 'needs-install' : 'unsupported')
        return
      }
      if (Notification.permission === 'denied') { setStatus('blocked'); return }
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        const sub = await reg.pushManager.getSubscription()
        if (!sub) { setStatus('off'); return }
        const res = await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`)
        const j = res.ok ? await res.json() : { subscribed: false }
        setStatus(j.subscribed ? 'on' : 'off')
      } catch {
        setStatus('off')
      }
    }
    run()
  }, [])

  const enable = async () => {
    if (!vapidKey) { setError('Push is not configured yet.'); return }
    setStatus('busy'); setError(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setStatus(permission === 'denied' ? 'blocked' : 'off'); return }
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        }))
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || `Could not subscribe (${res.status})`)
      }
      setStatus('on')
    } catch (e: any) {
      setError(e?.message || 'Could not turn on notifications.')
      setStatus('off')
    }
  }

  const disable = async () => {
    setStatus('busy'); setError(null)
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setStatus('off')
    } catch (e: any) {
      setError(e?.message || 'Could not turn off notifications.')
      setStatus('on')
    }
  }

  const on = status === 'on'
  const disabled = status === 'loading' || status === 'busy' || status === 'unsupported' || status === 'needs-install' || status === 'blocked'

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-fg-2 font-medium">Daily quote notification</p>
          <p className="text-xs text-fg-4 mt-0.5">One quote, every morning at 7:00 AM Central.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Daily quote notification"
          disabled={disabled}
          onClick={on ? disable : enable}
          className={`relative shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-40 ${on ? 'bg-cta' : 'bg-surface-3 border border-edge'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-fg-1 shadow transition-transform ${on ? 'translate-x-5' : ''}`}
          />
        </button>
      </div>
      {status === 'needs-install' && (
        <p className="text-xs text-fg-4 mt-3">
          On iPhone, notifications only work after you add MindFit to your Home Screen: Share → “Add to Home Screen”, then open it from there.
        </p>
      )}
      {status === 'unsupported' && (
        <p className="text-xs text-fg-4 mt-3">This browser doesn’t support push notifications.</p>
      )}
      {status === 'blocked' && (
        <p className="text-xs text-fg-4 mt-3">Notifications are blocked for this site. Allow them in your browser settings, then reload.</p>
      )}
      {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
    </div>
  )
}
