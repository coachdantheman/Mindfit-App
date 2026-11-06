'use client'
import { useState } from 'react'

// Long saved lists show the newest few and fold the rest into a dropdown,
// so nobody scrolls past 30 rows to reach the next section.
export default function CollapsibleList<T>({ items, render, visible = 3, noun = 'more', className = '' }: {
  items: T[]
  render: (item: T, index: number) => React.ReactNode
  visible?: number
  noun?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const shown = open ? items : items.slice(0, visible)
  const hidden = items.length - visible
  return (
    <>
      <div className={className}>{shown.map(render)}</div>
      {hidden > 0 && (
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
          className="w-full mt-2 py-2 text-xs font-medium text-fg-3 hover:text-fg-1 border border-edge-muted rounded-xl">
          {open ? 'Show less ▲' : `Show ${hidden} ${noun} ▼`}
        </button>
      )}
    </>
  )
}

// A titled section that starts closed.
export function Collapsible({ title, count, defaultOpen = false, children }: {
  title: string
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-edge-muted rounded-xl">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left min-h-[44px]">
        <span className="text-sm font-medium text-fg-2">{title}{count !== undefined && <span className="text-fg-4"> ({count})</span>}</span>
        <span className="text-xs text-fg-4">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}
