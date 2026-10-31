import { TitleBadge } from './Badges'
import { initialsOf, monthLabel, type Entry } from './types'

const MEDAL = ['🥇', '🥈', '🥉']

export default function Podium({ podium, month, myRank, of }: { podium: Entry[]; month: string; myRank: number | null; of: number }) {
  if (podium.length === 0) return null
  // Visual order: 2nd, 1st, 3rd
  const order = [podium[1], podium[0], podium[2]].filter(Boolean) as Entry[]
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-semibold text-fg-1 text-sm">Hall of Fame · {monthLabel(month)}</h3>
        {myRank && <span className="text-xs text-fg-4 tabular-nums">You finished #{myRank} of {of}</span>}
      </div>
      <div className="flex items-end justify-center gap-3">
        {order.map(e => {
          const first = e.rank === 1
          return (
            <div key={`${e.rank}-${e.displayName}`} className={`flex flex-col items-center text-center ${first ? 'w-28' : 'w-24'}`}>
              <span className={`${first ? 'text-3xl' : 'text-2xl'} leading-none mb-1`} aria-label={`Rank ${e.rank}`}>{MEDAL[e.rank - 1] ?? e.rank}</span>
              <span className={`${first ? 'w-14 h-14 text-base' : 'w-11 h-11 text-sm'} rounded-full bg-gradient-to-br from-cta to-brand-700 text-fg-inverse flex items-center justify-center font-bold`} aria-hidden>
                {initialsOf(e.displayName)}
              </span>
              <p className="text-sm font-semibold text-fg-1 mt-2 truncate w-full">{e.displayName}</p>
              <p className="text-xs text-fg-3 tabular-nums">{e.points} pts</p>
              <div className="mt-1"><TitleBadge title={e.title} /></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
