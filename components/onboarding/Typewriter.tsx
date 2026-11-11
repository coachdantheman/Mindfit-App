'use client'
import { useEffect, useState } from 'react'

const CHAR_MS = 38
const LINE_PAUSE_MS = 650

// Types each line in turn. A tap anywhere (or reduced motion) shows it all.
export default function Typewriter({ lines, onDone }: { lines: string[]; onDone: () => void }) {
  const total = lines.reduce((n, l) => n + l.length, 0)
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setShown(total)
  }, [total])

  useEffect(() => {
    if (shown >= total) { onDone(); return }
    let acc = 0
    let atLineEnd = false
    for (const l of lines) { acc += l.length; if (shown === acc) atLineEnd = true }
    const t = setTimeout(() => setShown(s => s + 1), atLineEnd && shown > 0 ? LINE_PAUSE_MS : CHAR_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, total])

  let left = shown
  return (
    <button
      type="button"
      onClick={() => setShown(total)}
      className="block w-full text-left space-y-3 cursor-default"
      aria-label={lines.join(' ')}
    >
      {lines.map((line, i) => {
        const n = Math.max(0, Math.min(line.length, left))
        left -= line.length
        const typing = n > 0 && n < line.length
        const last = i === lines.length - 1
        return (
          <span
            key={i}
            aria-hidden
            className={`block font-display text-[1.7rem] sm:text-3xl leading-snug ${last ? 'text-fg-1' : 'text-fg-3'} ${n === 0 ? 'invisible' : ''}`}
          >
            {line.slice(0, n)}
            {(typing || (last && n === line.length && shown >= total)) && (
              <span className="inline-block w-[2px] h-[1em] align-[-0.1em] ml-1 bg-cta animate-pulse" />
            )}
            {n === 0 && line}
          </span>
        )
      })}
    </button>
  )
}
