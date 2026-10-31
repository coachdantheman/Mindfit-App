import { LevelBadge, TitleBadge } from './Badges'
import { initialsOf, type Entry } from './types'

const MEDAL = ['🥇', '🥈', '🥉']

function Row({ e }: { e: Entry }) {
  return (
    <li className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${e.isMe ? 'border-cta/40 bg-cta/5' : e.isMine ? 'border-edge bg-surface-2/40' : 'border-transparent'}`}>
      <span className="w-7 text-center text-sm font-bold tabular-nums text-fg-2 shrink-0">
        {e.rank <= 3 ? <span aria-label={`Rank ${e.rank}`}>{MEDAL[e.rank - 1]}</span> : e.rank}
      </span>
      <span className="w-9 h-9 rounded-full bg-gradient-to-br from-cta to-brand-700 text-fg-inverse flex items-center justify-center text-xs font-bold shrink-0" aria-hidden>
        {initialsOf(e.displayName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg-1 truncate">
          {e.displayName}{e.isMe && <span className="text-fg-4 font-normal"> (you)</span>}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <TitleBadge title={e.title} />
          <LevelBadge level={e.level} />
          {e.sport && <span className="text-[11px] text-fg-4 truncate">{e.sport}</span>}
        </div>
      </div>
      <span className="text-sm font-bold tabular-nums text-fg-1 shrink-0">{e.points}<span className="text-[11px] font-medium text-fg-4 ml-0.5">pts</span></span>
    </li>
  )
}

export default function LeaderboardList({ top, around }: { top: Entry[]; around: Entry[] | null }) {
  return (
    <ol className="space-y-1">
      {top.map(e => <Row key={`${e.rank}-${e.displayName}`} e={e} />)}
      {around && around.length > 0 && (
        <>
          <li className="text-center text-fg-4 text-sm py-1" aria-hidden>···</li>
          {around.map(e => <Row key={`${e.rank}-${e.displayName}`} e={e} />)}
        </>
      )}
    </ol>
  )
}
