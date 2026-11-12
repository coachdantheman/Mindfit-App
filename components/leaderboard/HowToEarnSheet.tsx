'use client'
import BottomSheet from '@/components/shared/BottomSheet'
import { ACTIONS, FUEL, CLUTCH_DAY_BONUS, LEVELS, PILLARS, STREAK_MULTIPLIERS } from '@/lib/leaderboard-config'

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
                      {a.show ? <span className="font-semibold text-fg-1">{a.show}</span> : (
                        <>
                          <span className="font-semibold text-fg-1">+{a.points}</span>
                          <span className="text-xs text-fg-4"> · max {a.cap}/{a.per === 'week' ? 'week' : 'day'}</span>
                        </>
                      )}
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
          <p className="text-xs uppercase tracking-wide text-fg-4 mb-1.5">🔥 Streak multiplier</p>
          <p className="text-sm text-fg-2 mb-1.5">Log something every day and each day&rsquo;s points grow:</p>
          <ul className="divide-y divide-edge-muted">
            {[...STREAK_MULTIPLIERS].reverse().map(m => (
              <li key={m.days} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-fg-2">{m.days}+ days in a row</span>
                <span className="font-semibold text-fg-1 tabular-nums">×{m.x}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-sky-400/30 bg-sky-400/[0.06] p-3">
          <p className="text-xs uppercase tracking-wide text-sky-300 mb-1.5">🧊 Streak freeze: freeze your streak, keep your flame</p>
          <ul className="text-sm text-fg-2 space-y-1 list-disc pl-5">
            <li>Every 7 days in a row earns 1 freeze. You can hold up to 2.</li>
            <li>Miss a day and a freeze is used for you automatically. Your streak and its point bonus stay alive.</li>
            <li>Miss a day with no freeze left and the streak starts over.</li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-fg-4 mb-1.5">🏆 Weekly leagues</p>
          <ul className="text-sm text-fg-2 space-y-1 list-disc pl-5">
            <li>Each week (Monday to Sunday) you are placed in a group of about 30 athletes in your league.</li>
            <li>Six leagues, low to high: {LEVELS.map(l => l.name).join(', ')}.</li>
            <li>Finish in the top 5 of your group to move up a league. The bottom 5 move down.</li>
            <li>Groups smaller than 10 stay put. Miss a whole week and you drop one league.</li>
            <li>Week points count the same way as the month board.</li>
          </ul>
        </div>
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
