import type { Level, Title } from '@/lib/leaderboard-config'
import { LEVELS } from '@/lib/leaderboard-config'

const LEVEL_STYLE: string[] = [
  'bg-surface-3 text-fg-3 border-edge',
  'bg-cta/10 text-cta border-cta/20',
  'bg-cta/20 text-cta border-cta/30',
  'bg-cta/35 text-fg-1 border-cta/40',
  'bg-cta/60 text-fg-inverse border-cta/60',
  'bg-cta text-fg-inverse border-cta',
]

export function LevelBadge({ level, size = 'sm' }: { level: Level; size?: 'sm' | 'md' }) {
  const idx = Math.max(0, LEVELS.findIndex(l => l.key === level.key))
  return (
    <span className={`inline-flex items-center rounded-full border font-semibold whitespace-nowrap ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-sm'} ${LEVEL_STYLE[idx] ?? LEVEL_STYLE[0]}`}>
      {level.name}
    </span>
  )
}

export function TitleBadge({ title, size = 'sm' }: { title: Title; size?: 'sm' | 'md' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-edge bg-surface-2/60 text-fg-2 font-medium whitespace-nowrap ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-sm'}`}>
      <span aria-hidden>{title.emoji}</span>{title.name}
    </span>
  )
}
