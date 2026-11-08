'use client'
import { useEffect } from 'react'

const KEY = 'mf:tz-synced'

export default function TimezoneSync() {
  useEffect(() => {
    let tz: string
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return }
    if (!tz) return
    let synced: string | null = null
    try { synced = sessionStorage.getItem(KEY) } catch {}
    if (synced === tz) return
    fetch('/api/notifications/prefs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: tz }),
    })
      .then(r => {
        if (!r.ok) return
        try { sessionStorage.setItem(KEY, tz) } catch {}
      })
      .catch(() => {})
  }, [])

  return null
}
