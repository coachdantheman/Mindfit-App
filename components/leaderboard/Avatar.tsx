import Character from '@/components/guide/art/Character'
import type { GuideIcon } from '@/lib/guide-characters'
import { initialsOf } from './types'

// An athlete on The Board: their guide character's face when they have one
// showing, else their initials. `className` sets the size (w-9 h-9 text-xs).
export default function Avatar({ name, guide, size, className }: { name: string; guide?: GuideIcon | null; size: number; className: string }) {
  if (guide) {
    return (
      <span aria-hidden className={`${className} rounded-full border border-cta/40 bg-surface-2 flex items-center justify-center shrink-0`}>
        <Character species={guide.species} stage={guide.stage} state="steady" size={size - 6} face />
      </span>
    )
  }
  return (
    <span aria-hidden className={`${className} rounded-full bg-gradient-to-br from-cta to-brand-700 text-fg-inverse flex items-center justify-center font-bold shrink-0`}>
      {initialsOf(name)}
    </span>
  )
}
