'use client'
import { useEffect, useState } from 'react'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface Props {
  state: SaveState
  idleLabel: string
  savedLabel?: string
  savingLabel?: string
  disabled?: boolean
  type?: 'submit' | 'button'
  onClick?: () => void
  className?: string
}

// Save button that confirms success: "Saving…" → "Saved ✓" (2.5 s) → idle.
export default function SaveButton({
  state, idleLabel, savedLabel = 'Saved ✓', savingLabel = 'Saving…',
  disabled, type = 'submit', onClick, className = '',
}: Props) {
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    if (state !== 'saved') { setShowSaved(false); return }
    setShowSaved(true)
    const t = setTimeout(() => setShowSaved(false), 2500)
    return () => clearTimeout(t)
  }, [state])

  const saving = state === 'saving'
  const saved = state === 'saved' && showSaved

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || saving}
      aria-live="polite"
      className={`btn-primary w-full inline-flex items-center justify-center gap-2 transition-colors ${
        saved ? '!bg-[var(--success)] !text-white' : ''
      } ${className}`}
    >
      {saving && (
        <span className="w-4 h-4 rounded-full border-2 border-fg-inverse/40 border-t-fg-inverse animate-spin" aria-hidden />
      )}
      {saving ? savingLabel : saved ? savedLabel : idleLabel}
    </button>
  )
}
