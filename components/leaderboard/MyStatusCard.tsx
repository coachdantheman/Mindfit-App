import Link from 'next/link'
import { PILLARS } from '@/lib/leaderboard-config'
import { LevelBadge } from './Badges'
import type { MyStatus } from './types'

const PILLAR_BAR = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4']

export default function MyStatusCard({ me, daysLeft }: { me: MyStatus; daysLeft: number }) {
  const base = me.pillars.mind + me.pillars.body + me.pillars.fuel + me.pillars.rest
  const toNext = me.nextLevel ? me.nextLevel.min - me.points : 0

  return (
    <div className="card p-5 space-y-5">
      <div className="flex items-start gap-4">
        <span className="text-4xl leading-none" aria-hidden>{me.title.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider font-semibold font-mono text-fg-4">Your identity this month</p>
          <h2 className="text-2xl font-bold text-fg-1 leading-tight">
            {me.title.key === 'warming_up' ? 'Warming Up' : `You're a ${me.title.name}`}
          </h2>
          <p className="text-sm text-fg-3 mt-0.5">{me.title.blurb}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <LevelBadge level={me.level} size="md" />
            <span className="text-sm text-fg-2 tabular-nums"><span className="font-bold text-fg-1">{me.points}</span> pts</span>
          </div>
          <span className="text-sm text-fg-3 tabular-nums">
            {me.rank ? <>#{me.rank} <span className="text-fg-4">of {me.of}</span></> : <span className="text-fg-4">Unranked</span>}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-surface-3 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(me.progress * 100)} aria-label="Progress to next level">
          <div className="h-full bg-cta rounded-full transition-all" style={{ width: `${Math.max(2, me.progress * 100)}%` }} />
        </div>
        <p className="text-xs text-fg-4 mt-1.5">
          {me.nextLevel
            ? <><span className="font-semibold text-fg-2">{toNext} pts</span> to {me.nextLevel.name} · {daysLeft} day{daysLeft === 1 ? '' : 's'} left this month</>
            : <>Top level reached. Defend it.</>}
        </p>
      </div>

      <div className="space-y-2">
        {PILLARS.map((p, i) => {
          const pts = me.pillars[p.key]
          const share = base > 0 ? pts / base : 0
          return (
            <div key={p.key} className="flex items-center gap-3 text-sm">
              <span className="w-16 shrink-0 text-fg-3"><span aria-hidden className="mr-1">{p.emoji}</span>{p.name}</span>
              <div className="flex-1 h-2 rounded-full bg-surface-3 overflow-hidden">
                <div className={`h-full rounded-full ${PILLAR_BAR[i]}`} style={{ width: `${share * 100}%` }} />
              </div>
              <span className="w-12 text-right tabular-nums text-fg-2">{pts}</span>
            </div>
          )
        })}
        {me.clutchDays > 0 && (
          <p className="text-xs text-fg-3 pt-1">⭐ {me.clutchDays} Clutch Day{me.clutchDays === 1 ? '' : 's'} · +{me.pillars.bonus} bonus</p>
        )}
      </div>

      {!me.visible && (
        <p className="text-xs text-fg-4 border-t border-edge-muted pt-3">
          You&rsquo;re hidden from the board. Only you can see your rank. <Link href="/settings" className="text-cta">Change in Settings</Link>
        </p>
      )}
    </div>
  )
}
