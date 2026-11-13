'use client'

// The page frame every guide flow shares: progress bar, a small title, the
// guide's line, the page itself, then Back and the main button. `secondary`
// is the quiet text button under them ("Skip this one"); its row keeps its
// height when empty so the main button never jumps between pages.
import { useEffect, useRef } from 'react'

export default function FlowShell({ index, total, title, speaker, children, onBack, backDisabled = false, primary, secondary }: {
  index: number
  total: number
  title: string
  speaker?: React.ReactNode
  children: React.ReactNode
  onBack?: () => void
  backDisabled?: boolean
  primary: React.ReactNode
  secondary?: React.ReactNode
}) {
  // Pages swap in place, so move focus to the new page's title.
  const titleRef = useRef<HTMLParagraphElement>(null)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    titleRef.current?.focus({ preventScroll: true })
  }, [index])

  return (
    <div className="flex-1 flex flex-col">
      <div className="pt-2">
        <div className="h-1 rounded-full bg-surface-3 overflow-hidden" role="progressbar" aria-label="Progress" aria-valuemin={1} aria-valuemax={total} aria-valuenow={index + 1}>
          <div className="h-full bg-cta transition-[width] duration-300" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
      </div>
      <p ref={titleRef} tabIndex={-1} className="mt-6 text-xs uppercase tracking-[0.24em] text-cta text-center outline-none">{title}</p>
      {speaker && <div className="mt-4">{speaker}</div>}
      <div className="flex-1 mt-4">{children}</div>
      <div className="pt-4 flex items-center gap-3">
        {onBack && (
          <button type="button" onClick={onBack} disabled={backDisabled} className="h-14 px-6 rounded-full border border-edge text-fg-2 font-semibold shrink-0 disabled:opacity-40">
            Back
          </button>
        )}
        {primary}
      </div>
      <div className="min-h-[44px] pb-2 flex items-center justify-center">{secondary}</div>
    </div>
  )
}
