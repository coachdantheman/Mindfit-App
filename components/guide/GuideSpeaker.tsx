'use client'
import { useEffect, useState } from 'react'
import Character, { type CharacterState, type Species } from './art/Character'
import type { Stage } from '@/lib/guide-characters'

// The guide character saying one line. `hero` stacks a large character over
// the line; `row` puts a small one beside a speech bubble. With `show` off
// (the athlete turned the character off in Settings) only the line renders.
export default function GuideSpeaker({ character, stage = 1, line, state = 'idle', layout = 'row', show = true, className = '' }: {
  character: Species
  stage?: Stage
  line: string
  state?: CharacterState
  layout?: 'hero' | 'row'
  show?: boolean
  className?: string
}) {
  // For a moment after the line changes the mouth moves, or the character
  // cheers; then it settles. A cheer is a short burst, never a loop.
  const [fresh, setFresh] = useState(true)
  useEffect(() => {
    setFresh(true)
    const t = setTimeout(() => setFresh(false), state === 'cheer' ? 2400 : 1400)
    return () => clearTimeout(t)
  }, [line, state])
  const pose: CharacterState = state === 'idle' ? (fresh ? 'talk' : 'idle') : state === 'cheer' && !fresh ? 'idle' : state

  if (layout === 'hero') {
    return (
      <div className={`flex flex-col items-center text-center gap-5 ${className}`}>
        {show && <Character species={character} stage={stage} state={pose} size={144} />}
        <p aria-live="polite" className="font-display text-[1.6rem] leading-snug text-fg-1 text-balance break-words max-w-full">{line}</p>
      </div>
    )
  }
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {show && <Character species={character} stage={stage} state={pose} size={56} className="shrink-0" />}
      <p aria-live="polite" className="min-w-0 break-words text-sm leading-snug text-fg-2 bg-surface-2 rounded-2xl px-3.5 py-2.5">{line}</p>
    </div>
  )
}
