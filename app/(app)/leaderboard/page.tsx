'use client'
import { useEffect, useState } from 'react'
import TabBar from '@/components/shared/TabBar'
import Skeleton from '@/components/shared/Skeleton'
import EmptyState from '@/components/shared/EmptyState'
import MyStatusCard from '@/components/leaderboard/MyStatusCard'
import LeaderboardList from '@/components/leaderboard/LeaderboardList'
import Podium from '@/components/leaderboard/Podium'
import HowToEarnSheet from '@/components/leaderboard/HowToEarnSheet'
import TitlesGuideSheet from '@/components/leaderboard/TitlesGuideSheet'
import { monthLabel, type LeaderboardResponse } from '@/components/leaderboard/types'

type Scope = 'all' | 'team'

export default function LeaderboardPage() {
  const [scope, setScope] = useState<Scope>('all')
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sheet, setSheet] = useState<'earn' | 'titles' | null>(null)

  useEffect(() => {
    let tz = ''
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone } catch {}
    setError(null)
    fetch(`/api/leaderboard?scope=${scope}&tz=${encodeURIComponent(tz)}`)
      .then(async r => {
        const body = await r.json().catch(() => null)
        if (!r.ok) throw new Error(body?.error || 'Could not load the board.')
        return body as LeaderboardResponse
      })
      .then(setData)
      .catch(e => setError(e.message))
  }, [scope])

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">The Board</h1>
          <p className="page-subtitle">{data ? `${monthLabel(data.period.month)} · resets in ${data.period.daysLeft} day${data.period.daysLeft === 1 ? '' : 's'}` : 'Monthly standings.'}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={() => setSheet('titles')} className="btn-secondary text-xs px-3">Titles</button>
          <button type="button" onClick={() => setSheet('earn')} className="btn-secondary text-xs px-3">Earn points</button>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-400 mb-4">{error}</p>}

      {!data && !error && <Skeleton rows={5} />}

      {data && (
        <div className="space-y-6">
          {data.me && <MyStatusCard me={data.me} daysLeft={data.period.daysLeft} />}

          <div>
            {data.teamAvailable && (
              <TabBar<Scope>
                label="Leaderboard scope"
                tabs={[{ key: 'all', label: 'Everyone' }, { key: 'team', label: 'My Team' }]}
                active={scope}
                onSelect={setScope}
                className="mb-4"
              />
            )}
            <div className="card p-3 sm:p-4">
              <div className="flex items-baseline justify-between px-2 mb-2">
                <h3 className="font-semibold text-fg-1 text-sm">This month</h3>
                <span className="text-xs text-fg-4 tabular-nums">{data.thisMonth.of} ranked</span>
              </div>
              {data.thisMonth.of === 0 ? (
                <EmptyState title="Nobody on the board yet" subtitle="Log a journal, workout, meal or sleep to claim the top spot." />
              ) : (
                <LeaderboardList top={data.thisMonth.top} around={data.thisMonth.around} />
              )}
            </div>
          </div>

          <Podium podium={data.lastMonth.podium} month={data.period.lastMonth} myRank={data.lastMonth.myRank} of={data.lastMonth.of} />
        </div>
      )}

      {sheet === 'earn' && <HowToEarnSheet onClose={() => setSheet(null)} />}
      {sheet === 'titles' && <TitlesGuideSheet onClose={() => setSheet(null)} />}
    </div>
  )
}
