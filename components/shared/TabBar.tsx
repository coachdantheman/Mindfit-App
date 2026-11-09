'use client'
import { useEffect, useRef } from 'react'

export interface TabItem<K extends string> { key: K; label: string; badge?: React.ReactNode }

interface Props<K extends string> {
  tabs: TabItem<K>[]
  active: K
  onSelect: (key: K) => void
  label: string
  className?: string
  itemClassName?: string
}

// Accessible tab row: role=tablist, arrow / Home / End move focus and select.
export default function TabBar<K extends string>({ tabs, active, onSelect, label, className = '', itemClassName = '' }: Props<K>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const rowRef = useRef<HTMLDivElement | null>(null)

  // Keep the active tab visible in the scrolling row (deep links, long tab
  // lists). Scrolls the row only, never the page.
  const activeIndex = tabs.findIndex(t => t.key === active)
  useEffect(() => {
    const row = rowRef.current
    const el = refs.current[activeIndex]
    if (!row || !el) return
    if (el.offsetLeft < row.scrollLeft || el.offsetLeft + el.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollTo({ left: el.offsetLeft - 16 })
    }
  }, [activeIndex])

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    let next: number | null = null
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    if (next === null) return
    e.preventDefault()
    onSelect(tabs[next].key)
    refs.current[next]?.focus()
  }

  return (
    <div className="relative mb-6">
      <div ref={rowRef} role="tablist" aria-label={label} className={`relative flex gap-2 overflow-x-auto pb-1 scrollbar-none ${className}`}>
        {tabs.map((t, i) => {
          const selected = t.key === active
          return (
            <button
              key={t.key}
              ref={el => { refs.current[i] = el }}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(t.key)}
              onKeyDown={e => onKeyDown(e, i)}
              className={`shrink-0 relative ${selected ? 'tab-btn-active' : 'tab-btn'} ${itemClassName}`}
            >
              {t.label}
              {t.badge}
            </button>
          )
        })}
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-r from-transparent to-page" />
    </div>
  )
}
