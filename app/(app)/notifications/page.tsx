'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import EmptyState from '@/components/shared/EmptyState'
import Skeleton from '@/components/shared/Skeleton'

interface Item {
  id: string
  type: string
  title: string
  body: string
  url: string | null
  created_at: string
  read_at: string | null
}

function relativeTime(iso: string): string {
  const then = new Date(iso)
  const now = new Date()
  const mins = Math.round((now.getTime() - then.getTime()) / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startThen = new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime()
  if (Math.round((startToday - startThen) / 86_400_000) === 1) return 'Yesterday'
  return then.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: then.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  })
}

function Row({ item }: { item: Item }) {
  const unread = item.read_at === null
  const content = (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className={`mt-2 w-2 h-2 rounded-full shrink-0 ${unread ? 'bg-cta' : 'bg-transparent'}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className={`text-sm font-semibold truncate ${unread ? 'text-fg-1' : 'text-fg-2'}`}>
            {unread && <span className="sr-only">Unread: </span>}
            {item.title}
          </p>
          <time dateTime={item.created_at} className="text-xs text-fg-4 whitespace-nowrap">
            {relativeTime(item.created_at)}
          </time>
        </div>
        {item.body && <p className="text-sm text-fg-3 mt-1">{item.body}</p>}
      </div>
    </div>
  )

  if (item.url) {
    return (
      <li>
        <Link href={item.url} className="card block p-4 hover:bg-surface-2/60 transition-colors">
          {content}
        </Link>
      </li>
    )
  }
  return <li className="card p-4">{content}</li>
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Item[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/notifications')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (!cancelled) setItems(data?.items ?? []) })
      .catch(() => { if (!cancelled) setItems([]) })
    return () => { cancelled = true }
  }, [])

  // Mark everything read once the list is in. Local state keeps the unread
  // dots for this visit so the user can see what is new.
  useEffect(() => {
    if (items === null) return
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(() => {})
  }, [items])

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Notifications</h1>
      </div>

      {items === null ? (
        <Skeleton rows={4} />
      ) : items.length === 0 ? (
        <EmptyState title="You're all caught up" />
      ) : (
        <ul className="space-y-2">
          {items.map(item => <Row key={item.id} item={item} />)}
        </ul>
      )}
    </div>
  )
}
