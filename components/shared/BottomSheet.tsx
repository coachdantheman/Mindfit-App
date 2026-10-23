'use client'
import { useEffect } from 'react'

interface Props {
  title: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  // Rendered between the title row and the scrolling body (tabs, search…)
  header?: React.ReactNode
  footer?: React.ReactNode
}

// Phone: slides up from the bottom; ≥ sm: centered dialog. Locks page
// scroll, closes on Esc and overlay tap.
export default function BottomSheet({ title, onClose, children, header, footer }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] sm:max-h-[85vh] bg-surface border border-edge rounded-t-3xl sm:rounded-3xl flex flex-col pb-safe">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="font-semibold text-fg-1 min-w-0 truncate">{title}</h3>
          <button type="button" onClick={onClose} className="btn-ghost px-2 shrink-0" aria-label="Close">✕</button>
        </div>
        {header && <div className="px-5 pb-3">{header}</div>}
        <div className="px-5 pb-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-edge-muted">{footer}</div>}
      </div>
    </div>
  )
}
