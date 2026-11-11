'use client'
import { useRef } from 'react'

// Six boxes for an emailed code. Typing, iOS one-time-code autofill and
// paste all land here; onComplete fires once all six digits are in.
export default function CodeInput({ value, onChange, onComplete, disabled }: {
  value: string
  onChange: (v: string) => void
  onComplete: (v: string) => void
  disabled?: boolean
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const setFrom = (start: number, raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return
    const chars = value.padEnd(6, ' ').split('')
    let i = start
    for (const d of digits) { if (i > 5) break; chars[i++] = d }
    const next = chars.join('').replace(/\s+$/, '')
    onChange(next)
    refs.current[Math.min(i, 5)]?.focus()
    if (next.length === 6 && !next.includes(' ')) onComplete(next)
  }

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Backspace') return
    e.preventDefault()
    const chars = value.padEnd(6, ' ').split('')
    const at = chars[i] !== ' ' ? i : Math.max(0, i - 1)
    chars[at] = ' '
    onChange(chars.join('').replace(/\s+$/, ''))
    refs.current[at]?.focus()
  }

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="6-digit code">
      {Array.from({ length: 6 }, (_, i) => {
        const ch = value[i] && value[i] !== ' ' ? value[i] : ''
        return (
          <input
            key={i}
            ref={el => { refs.current[i] = el }}
            id={`code-${i}`}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={`Digit ${i + 1}`}
            maxLength={i === 0 ? 6 : 1}
            autoFocus={i === 0}
            disabled={disabled}
            value={ch}
            onChange={e => setFrom(i, e.target.value)}
            onPaste={e => { e.preventDefault(); setFrom(0, e.clipboardData.getData('text')) }}
            onKeyDown={e => onKeyDown(i, e)}
            onFocus={e => e.target.select()}
            className={`w-full min-w-0 h-14 text-center text-2xl font-display rounded-xl border bg-surface-2 text-fg-1 transition-colors focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta disabled:opacity-60 ${ch ? 'border-cta/60' : 'border-edge'}`}
          />
        )
      })}
    </div>
  )
}
