'use client'
import BottomSheet from '@/components/shared/BottomSheet'
import { ACTIONS, FUEL, CLUTCH_DAY_BONUS, LEVELS, PILLARS } from '@/lib/leaderboard-config'

export default function HowToEarnSheet({ onClose }: { onClose: () => void }) {
  return (
    <BottomSheet title="How to earn points" onClose={onClose}>
      <p className="text-sm text-fg-3 mb-4">Points reset every month. Showing up daily beats logging everything once: each action caps per day.</p>
      <div className="space-y-5">
        {PILLARS.map(p => {
          const rows = ACTIONS.filter(a => a.pillar === p.key)
          return (
            <div key={p.key}>
              <p className="text-xs uppercase tracking-wide text-fg-4 mb-1.5"><span aria-hidden className="mr-1">{p.emoji}</span>{p.name}</p>
              <ul className="divide-y divide-edge-muted">
                {rows.map(a => (
                  <li key={a.key} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="text-fg-2">{a.label}</span>
                    <span className="text-fg-3 tabular-nums text-right">
                      <span className="font-semibold text-fg-1">+{a.points}</span>
                      <span className="text-xs text-fg-4"> · max {a.cap}/{a.per === 'week' ? 'week' : 'day'}</span>
                    </span>
                  </li>
                ))}
                {p.key === 'fuel' && (
                  <>
                    <li className="flex items-center justify-between py-1.5 text-sm">
                      <span className="text-fg-2">Any meal logged</span>
                      <span className="text-fg-3 tabular-nums"><span className="font-semibold text-fg-1">+{FUEL.dayPoints}</span><span className="text-xs text-fg-4"> · per day</span></span>
                    </li>
                    <li className="flex items-center justify-between py-1.5 text-sm">
                      <span className="text-fg-2">{FUEL.fullDayEntries}+ meals in a day</span>
                      <span className="text-fg-3 tabular-nums"><span className="font-semibold text-fg-1">+{FUEL.fullDayBonus}</span><span className="text-xs text-fg-4"> · bonus</span></span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          )
        })}
        <div>
          <p className="text-xs uppercase tracking-wide text-fg-4 mb-1.5">⭐ Clutch Day</p>
          <p className="text-sm text-fg-2">Hit all four pillars on the same day: <span className="font-semibold text-fg-1">+{CLUTCH_DAY_BONUS}</span> bonus.</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-fg-4 mb-1.5">Levels</p>
          <ul className="grid grid-cols-2 gap-x-4">
            {LEVELS.map(l => (
              <li key={l.key} className="flex items-center justify-between py-1 text-sm">
                <span className="text-fg-2">{l.name}</span>
                <span className="text-fg-4 tabular-nums text-xs">{l.min}+ pts</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-fg-4">Only your name, sport, title, level and points are shown. Your journal, scores, meals, sleep and weight stay private.</p>
      </div>
    </BottomSheet>
  )
}
