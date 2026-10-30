'use client'
import { useRef } from 'react'

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
    <div role="tablist" aria-label={label} className={`flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none ${className}`}>
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
  )
}
