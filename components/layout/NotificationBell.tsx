'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function NotificationBell() {
  const pathname = usePathname()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch('/api/notifications')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (!cancelled && data && typeof data.unread === 'number') setUnread(data.unread) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [pathname])

  const active = pathname === '/notifications' || pathname.startsWith('/notifications/')

  return (
    <Link
      href="/notifications"
      className={`relative p-2.5 sm:p-1.5 rounded-md transition-colors ${
        active ? 'text-cta bg-cta/10' : 'text-fg-3 hover:text-fg-1 hover:bg-surface-2'
      }`}
      title="Notifications"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      aria-current={active ? 'page' : undefined}
    >
      <BellIcon className="w-5 h-5" />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-1 rounded-full bg-cta text-fg-inverse text-[10px] font-bold leading-4 text-center tabular-nums"
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9z" />
      <path d="M13.7 21a2 2 0 01-3.4 0" />
    </svg>
  )
}
