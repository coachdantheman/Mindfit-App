'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { readRoster } from '@/components/shared/roster'
import { format, parseISO } from 'date-fns'
import { Profile, JournalEntry, WorkoutLog, SleepEntry, FlowSession, FlowLog, FlowStageCheckin } from '@/types'
import type { StrengthTier } from '@/types/exercise'
import { MPI_DIMENSIONS, type MpiKey } from '@/lib/mpi'
import { calcSleepAverages } from '@/lib/stats'
import dynamic from 'next/dynamic'
import SectionTabs, { Section } from '@/components/shared/SectionTabs'
import OverviewCards from '@/components/shared/OverviewCards'
import JournalRatingsGrid from '@/components/shared/JournalRatingsGrid'
import MacroBar from '@/components/nutrition/MacroBar'
import WorkoutLogList from '@/components/shared/WorkoutLogList'
import SleepEntriesList from '@/components/shared/SleepEntriesList'
import StatCard from '@/components/dashboard/StatCard'
import EntryList from '@/components/dashboard/EntryList'
import { TierBadge } from '@/components/exercise/TierResult'
import type { OverviewStats } from '@/lib/overview-server'
import type { BoardStatus } from '@/lib/leaderboard-server'
import {
  calcCompetitionStreak, flowZone, ZONE_COLOR, needsAttention,
} from '@/components/mindset/flow-logic'
import { STAGE_META } from '@/components/mindset/flow/flow-constants'
import { formatDistanceToNow } from 'date-fns'
import { localDateISO } from '@/lib/dates'
import { FlameIcon } from '@/components/shared/icons'
import SaveButton, { type SaveState } from '@/components/shared/SaveButton'

const RatingChart = dynamic(() => import('@/components/dashboard/RatingChart'), { ssr: false })
const FlowBarChart = dynamic(() => import('@/components/mindset/flow/FlowBarChart'), { ssr: false })

interface MpiRow extends Partial<Record<MpiKey, number>> {
  week_date: string
  assessment_type: string
  mpi: number
}

interface NutritionTargets { calories: number; protein_g: number; carbs_g: number; fat_g: number }

interface FoodDay { entry_date: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }

interface UpcomingItem {
  id: string
  source: 'athlete' | 'team'
  kind: string
  title: string | null
  date: string
  start_time: string | null
  opponent: string | null
  location: string | null
  team_name: string | null
}

interface AthleteData {
  profile: Profile
  journalEntries: JournalEntry[]
  foodEntries: FoodDay[]
  nutritionTargets: NutritionTargets | null
  workoutLogs: WorkoutLog[]
  sleepEntries: SleepEntry[]
  visualizationEntries: { id: string; entry_date: string; viz_type: string | null }[]
  goalCount: { total: number; completed: number }
  mpi: { weekly: MpiRow[]; baseline: MpiRow | null }
  strengthTiers: { exercise_id: string; exercise_name: string; tier: StrengthTier }[]
  tierUps: { id: string; log_date: string; workout_name: string; tier_ups: number }[]
  flowSessions: FlowSession[]
  flowLogs: FlowLog[]
  recentFlowLogs: Pick<FlowLog, 'id' | 'logged_at' | 'challenge_level' | 'skill_level' | 'flow_score' | 'sport'>[]
  flowStageCheckins: FlowStageCheckin[]
  flowCoachNote: string | null
  recentGames: { log_date: string; opponent: string | null; result: string | null; score: string | null; performance: number | null; flow_log_id: string | null }[]
  upcoming: UpcomingItem[]
  overview: OverviewStats
  board: BoardStatus | null
  readOnly?: boolean
}

interface DayTotals { calories: number; protein: number; carbs: number; fat: number }

function lastNDays(n: number): string[] {
  const now = new Date()
  return Array.from({ length: n }, (_, i) => localDateISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)))
}

function averageOver(days: string[], byDay: Map<string, DayTotals>, pick: (t: DayTotals) => number): number | null {
  const vals = days.filter(d => byDay.has(d)).map(d => pick(byDay.get(d)!))
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

export default function AthleteDetail({ athleteId, backHref, backLabel = 'Back', readOnly }: { athleteId: string; backHref: string; backLabel?: string; readOnly?: boolean }) {
  const [data, setData] = useState<AthleteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [section, setSection] = useState<Section>('mindset')
  const [roster, setRoster] = useState<{ base: string; ids: string[] } | null>(null)

  useEffect(() => { setRoster(readRoster(backHref.split('?')[0], athleteId)) }, [backHref, athleteId])

  useEffect(() => {
    let tz = ''
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone } catch {}
    fetch(`/api/athlete/${athleteId}?tz=${encodeURIComponent(tz)}`)
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error)
        return r.json()
      })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [athleteId])

  const idx = roster ? roster.ids.indexOf(athleteId) : -1
  const prevId = idx > 0 ? roster!.ids[idx - 1] : null
  const nextId = roster && idx >= 0 && idx < roster.ids.length - 1 ? roster.ids[idx + 1] : null
  const navBar = (
    <div className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 py-2 mb-4 bg-page/95 backdrop-blur border-b border-edge flex flex-wrap items-center justify-between gap-2">
      <Link href={backHref} className="text-cta text-sm font-medium hover:underline shrink-0 py-2">← {backLabel}</Link>
      {roster && idx >= 0 && (
        <div className="flex items-center gap-1 text-sm">
          <span className="text-xs text-fg-4 tabular-nums mr-1">{idx + 1} of {roster.ids.length}</span>
          <Link
            href={prevId ? `${roster.base}/athlete/${prevId}` : '#'}
            aria-disabled={!prevId}
            className={`btn-ghost ${prevId ? '' : 'pointer-events-none opacity-40'}`}
          >← Prev</Link>
          <Link
            href={nextId ? `${roster.base}/athlete/${nextId}` : '#'}
            aria-disabled={!nextId}
            className={`btn-ghost ${nextId ? '' : 'pointer-events-none opacity-40'}`}
          >Next →</Link>
        </div>
      )}
    </div>
  )

  if (loading) return <div>{navBar}<p className="text-sm text-fg-4">Loading athlete data…</p></div>
  if (error) return <div>{navBar}<p className="text-sm text-red-400">{error}</p></div>
  if (!data) return null

  const {
    profile, journalEntries, foodEntries, nutritionTargets, workoutLogs, sleepEntries,
    visualizationEntries, goalCount, mpi, strengthTiers, tierUps, flowSessions, flowLogs, recentFlowLogs,
    flowStageCheckins, flowCoachNote, recentGames, upcoming, overview, board,
  } = data
  const { avgSleep, avgSleepQuality } = calcSleepAverages(sleepEntries)

  const todayStr = localDateISO()
  const byDay = new Map<string, DayTotals>()
  for (const e of foodEntries) {
    const t = byDay.get(e.entry_date) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }
    t.calories += Number(e.calories)
    t.protein += Number(e.protein_g)
    t.carbs += Number(e.carbs_g)
    t.fat += Number(e.fat_g)
    byDay.set(e.entry_date, t)
  }
  const foodTotals = byDay.get(todayStr) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }

  return (
    <div>
      {navBar}

      <div className="mb-6 min-w-0">
        <h1 className="page-title break-all">{profile.full_name || profile.email}</h1>
        <p className="page-subtitle break-all">
          {profile.email} · Joined {format(parseISO(profile.created_at), 'MMM d, yyyy')}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <StatCard
          label="MPI Score"
          value={overview.latestMpi ?? '—'}
          unit={overview.latestMpi != null ? '/ 100' : undefined}
          delta={
            overview.latestMpi != null && overview.baselineMpi != null
              ? {
                  value: `${overview.latestMpi - overview.baselineMpi > 0 ? '+' : ''}${overview.latestMpi - overview.baselineMpi} vs baseline`,
                  direction:
                    overview.latestMpi > overview.baselineMpi ? 'up'
                    : overview.latestMpi < overview.baselineMpi ? 'down' : 'flat',
                }
              : undefined
          }
          context={overview.latestMpi == null ? 'No assessment yet' : 'Mental Performance Index'}
        />
        <StatCard
          label="Streak"
          value={overview.streak}
          unit={overview.streak === 1 ? 'day' : 'days'}
          context={overview.streak > 0 ? 'Consecutive days with any log' : 'Nothing logged recently'}
          icon={<FlameIcon className="w-5 h-5 text-cta" />}
        />
        <div className="col-span-2 sm:col-span-1">
          <StatCard
            label="The Board"
            value={board?.points ?? 0}
            unit="pts"
            context={board?.rank ? `${board.title.name} · ${board.level.name} · #${board.rank} of ${board.of}` : 'Not ranked this month yet'}
            icon={board ? <span>{board.title.emoji}</span> : undefined}
          />
        </div>
      </div>

      <OverviewCards
        journalCount={journalEntries.length}
        workoutCount={workoutLogs.length}
        avgSleep={avgSleep}
        goalCount={goalCount}
      />

      <UpcomingCard items={upcoming} />

      <SectionTabs active={section} onSelect={setSection} />

      {section === 'mindset' && (
        <div className="space-y-6">
          <MpiBreakdown mpi={mpi} />

          {journalEntries.length === 0 ? (
            <div className="text-center py-12 text-fg-3">
              <p className="font-medium">No journal entries yet</p>
            </div>
          ) : (
            <>
              <JournalRatingsGrid entries={journalEntries} />

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface rounded-xl border border-edge p-3 text-center">
                  <p className="text-lg font-bold text-fg-2">{visualizationEntries.length}</p>
                  <p className="text-xs text-fg-4">Visualizations</p>
                </div>
                <div className="bg-surface rounded-xl border border-edge p-3 text-center">
                  <p className="text-lg font-bold text-fg-2">{goalCount.completed}</p>
                  <p className="text-xs text-fg-4">Goals Hit</p>
                </div>
              </div>

              <RatingChart entries={journalEntries} />

              <EntryList entries={journalEntries} linked={false} />
            </>
          )}
        </div>
      )}

      {section === 'flow' && (
        <FlowSectionPanel
          athleteId={profile.id}
          sessions={flowSessions}
          logs={flowLogs}
          recentLogs={recentFlowLogs}
          games={recentGames}
          checkins={flowStageCheckins}
          initialNote={flowCoachNote}
          readOnly={readOnly || data.readOnly}
        />
      )}

      {section === 'nutrition' && (
        <div className="space-y-4">
          {foodEntries.length === 0 ? (
            <div className="text-center py-12 text-fg-3">
              <p className="font-medium">No nutrition data yet</p>
            </div>
          ) : (
            <>
              <div className="card p-5">
                <h3 className="font-semibold text-fg-1 mb-3 text-sm">Today&apos;s Macros</h3>
                <div className="space-y-3">
                  <MacroBar label="Calories" current={foodTotals.calories} goal={nutritionTargets?.calories ?? 0} unit="kcal" colorClass="bg-cta" />
                  <MacroBar label="Protein" current={foodTotals.protein} goal={nutritionTargets?.protein_g ?? 0} unit="g" colorClass="bg-chart-2" />
                  <MacroBar label="Carbs" current={foodTotals.carbs} goal={nutritionTargets?.carbs_g ?? 0} unit="g" colorClass="bg-chart-4" />
                  <MacroBar label="Fat" current={foodTotals.fat} goal={nutritionTargets?.fat_g ?? 0} unit="g" colorClass="bg-chart-5" />
                </div>
              </div>

              <NutritionAverages byDay={byDay} targets={nutritionTargets} />
            </>
          )}
        </div>
      )}

      {section === 'exercise' && (
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-fg-1 mb-3 text-sm">Strength tiers <span className="font-normal text-fg-4">· last 90 days</span></h3>
            {strengthTiers.length === 0 ? (
              <p className="text-sm text-fg-4">No strength-standard lifts logged in the last 90 days.</p>
            ) : (
              <ul className="divide-y divide-edge">
                {strengthTiers.map(s => (
                  <li key={s.exercise_id} className="flex items-center justify-between gap-3 py-2 min-w-0">
                    <span className="text-sm text-fg-2 truncate min-w-0">{s.exercise_name}</span>
                    <TierBadge tier={s.tier} size="sm" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-fg-1 mb-3 text-sm">Recent tier-ups <span className="font-normal text-fg-4">· last 30 days</span></h3>
            {tierUps.length === 0 ? (
              <p className="text-sm text-fg-4">No tier-ups in the last 30 days.</p>
            ) : (
              <ul className="space-y-2">
                {tierUps.map(t => (
                  <li key={t.id} className="flex items-center justify-between gap-3 text-sm min-w-0">
                    <span className="text-fg-2 truncate min-w-0">{t.workout_name}</span>
                    <span className="text-xs text-fg-4 shrink-0">{t.log_date} · +{t.tier_ups}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <WorkoutLogList logs={workoutLogs} />
          {workoutLogs.some(l => l.exercise_logs && l.exercise_logs.length > 0) && (
            <div className="card p-5">
              <h3 className="font-semibold text-fg-1 mb-3 text-sm">Per-Exercise Data</h3>
              <div className="space-y-2">
                {workoutLogs
                  .filter(l => l.exercise_logs && l.exercise_logs.length > 0)
                  .slice(0, 10)
                  .map(l => (
                    <div key={l.id} className="p-2 rounded-lg bg-surface-2/30 min-w-0">
                      <p className="text-xs text-fg-3 mb-1 truncate">{l.workout_name} — {l.log_date}</p>
                      <div className="flex flex-wrap gap-1">
                        {l.exercise_logs!.map(el => (
                          <span key={el.id} className="text-xs text-fg-4 bg-surface-3/50 px-1.5 py-0.5 rounded">
                            {el.exercise_name} S{el.set_number}: {el.reps ?? '-'}r{el.weight ? ` @${el.weight}lbs` : ''}{el.rpe ? ` RPE${el.rpe}` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {section === 'sleep' && (
        <SleepEntriesList entries={sleepEntries} avgSleep={avgSleep} avgSleepQuality={avgSleepQuality} />
      )}
    </div>
  )
}

function MpiBreakdown({ mpi }: { mpi: AthleteData['mpi'] }) {
  const latest = mpi.weekly[0] ?? mpi.baseline
  if (!latest) {
    return (
      <div className="card p-5 text-sm text-fg-4">No MPI check-in yet.</div>
    )
  }
  const hasWeekly = mpi.weekly.length > 0
  const baseline = mpi.baseline
  const recent4 = mpi.weekly.slice(0, 4)
  const avgFor = (key: MpiKey): number | null => {
    const vals = recent4.map(r => r[key]).filter((v): v is number => typeof v === 'number')
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }
  const lowest = [...MPI_DIMENSIONS]
    .sort((a, b) => (latest[a.key] ?? 0) - (latest[b.key] ?? 0))
    .slice(0, 3)
  const trend = [...mpi.weekly].reverse().map(r => r.mpi)
  const pos = (score: number) => `${Math.min(100, Math.max(0, score * 10))}%`

  return (
    <div className="card p-5 space-y-5">
      <div className="flex items-center justify-between gap-3 min-w-0">
        <h3 className="font-semibold text-fg-1 text-sm">MPI breakdown</h3>
        <span className="text-xs text-fg-4 shrink-0">{hasWeekly ? `Week of ${latest.week_date}` : 'Baseline'}</span>
      </div>

      <div className="space-y-3">
        {MPI_DIMENSIONS.map(d => {
          const score = latest[d.key] ?? 0
          const avg = avgFor(d.key)
          const base = baseline?.[d.key]
          return (
            <div key={d.key} className="min-w-0">
              <div className="flex justify-between gap-2 text-xs mb-1">
                <span className="text-fg-3 truncate min-w-0">{d.label}</span>
                <span className="tabular-nums text-fg-2 shrink-0">
                  {score}/10
                  {avg != null && <span className="text-fg-4"> · avg {avg.toFixed(1)}</span>}
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-surface-3">
                <div className="absolute inset-y-0 left-0 rounded-full bg-cta" style={{ width: pos(score) }} />
                {avg != null && (
                  <div className="absolute -top-1 -bottom-1 w-0.5 bg-fg-4" style={{ left: `calc(${pos(avg)} - 1px)` }} />
                )}
                {base != null && (
                  <div className="absolute -top-1 -bottom-1 w-0.5 bg-fg-1" style={{ left: `calc(${pos(base)} - 1px)` }} />
                )}
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-fg-4">Bar = latest · white tick = baseline · grey tick = 4-week average</p>

      <div className="bg-cta/10 border border-cta/40 rounded-xl px-4 py-3">
        <p className="text-sm font-semibold text-cta mb-1">Needs work</p>
        <ul className="text-sm text-fg-2 space-y-0.5">
          {lowest.map(d => <li key={d.key}>{d.label} · {latest[d.key] ?? 0}/10</li>)}
        </ul>
      </div>

      {hasWeekly && (
        <div className="min-w-0">
          <div className="flex justify-between items-baseline gap-2 mb-1">
            <p className="text-xs uppercase tracking-wide text-fg-4">MPI trend · last {trend.length} weeks</p>
            <p className="text-xs tabular-nums text-fg-2 shrink-0">{trend[0]} → {trend[trend.length - 1]}</p>
          </div>
          <Sparkline values={trend} />
        </div>
      )}
    </div>
  )
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <p className="text-xs text-fg-4">Need two or more check-ins for a trend.</p>
  const w = 240
  const h = 48
  const pad = 4
  const pts = values.map((v, i) => {
    const x = pad + (i * (w - 2 * pad)) / (values.length - 1)
    const y = h - pad - (Math.min(100, Math.max(0, v)) / 100) * (h - 2 * pad)
    return [x, y] as const
  })
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-12 text-cta" role="img" aria-label="MPI trend">
      <polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={3} fill="currentColor" />
    </svg>
  )
}

function NutritionAverages({ byDay, targets }: { byDay: Map<string, DayTotals>; targets: NutritionTargets | null }) {
  const days30 = lastNDays(30)
  const days7 = days30.slice(0, 7)
  const loggedDays = days30.filter(d => byDay.has(d)).length
  const cal = (d: string[]) => averageOver(d, byDay, t => t.calories)
  const pro = (d: string[]) => averageOver(d, byDay, t => t.protein)
  const targetCal = targets?.calories ?? 0
  const targetPro = targets?.protein_g ?? 0

  const strip = days30.slice(0, 14).reverse()
  const stripMax = Math.max(targetCal * 1.2, ...strip.map(d => byDay.get(d)?.calories ?? 0), 1)

  const rows: { label: string; avg7: number | null; avg30: number | null; target: number; unit: string }[] = [
    { label: 'Calories', avg7: cal(days7), avg30: cal(days30), target: targetCal, unit: 'kcal' },
    { label: 'Protein', avg7: pro(days7), avg30: pro(days30), target: targetPro, unit: 'g' },
  ]

  return (
    <div className="card p-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-fg-1 text-sm">Averages vs target</h3>
        <span className="text-xs text-fg-4 tabular-nums shrink-0">Days logged: {loggedDays} of 30</span>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 text-xs text-fg-4">
          <span />
          <span className="text-right">7-day</span>
          <span className="text-right">30-day</span>
          <span className="text-right">Target</span>
        </div>
        {rows.map(r => (
          <div key={r.label} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 text-sm items-baseline">
            <span className="text-fg-3">{r.label}</span>
            <span className="text-right tabular-nums text-fg-2">{r.avg7 != null ? Math.round(r.avg7) : '—'}</span>
            <span className="text-right tabular-nums text-fg-2">{r.avg30 != null ? Math.round(r.avg30) : '—'}</span>
            <span className="text-right tabular-nums text-fg-4">{r.target > 0 ? `${Math.round(r.target)} ${r.unit}` : '—'}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-fg-4">Averages are over days with a log.</p>

      <div>
        <p className="text-xs uppercase tracking-wide text-fg-4 mb-2">Calories · last 14 days</p>
        <div className="relative flex items-end gap-1 h-28">
          {strip.map(d => {
            const c = byDay.get(d)?.calories ?? 0
            return (
              <div key={d} className="flex-1 min-w-0 h-full flex items-end">
                <div
                  className={`w-full rounded-t ${targetCal > 0 && c > targetCal ? 'bg-orange-400/70' : 'bg-cta'}`}
                  style={{ height: `${(c / stripMax) * 100}%` }}
                  title={`${d}: ${Math.round(c)} kcal`}
                />
              </div>
            )
          })}
          {targetCal > 0 && (
            <div className="absolute left-0 right-0 border-t border-dashed border-fg-3 pointer-events-none" style={{ bottom: `${(targetCal / stripMax) * 100}%` }} />
          )}
        </div>
        <div className="flex gap-1 mt-1">
          {strip.map(d => (
            <span key={d} className="flex-1 min-w-0 text-center text-[10px] text-fg-4 tabular-nums">{d.slice(8)}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function UpcomingCard({ items }: { items: UpcomingItem[] }) {
  return (
    <div className="card p-5 mb-4">
      <h3 className="font-semibold text-fg-1 mb-3 text-sm">Upcoming (14 days)</h3>
      {items.length === 0 ? (
        <p className="text-sm text-fg-4">Nothing scheduled in the next 14 days.</p>
      ) : (
        <ul className="divide-y divide-edge">
          {items.map(it => (
            <li key={`${it.source}-${it.id}`} className="flex items-center justify-between gap-3 py-2 min-w-0">
              <div className="min-w-0">
                <p className="text-sm text-fg-2 truncate">
                  {it.kind}{it.opponent ? ` vs ${it.opponent}` : it.title ? ` · ${it.title}` : ''}
                </p>
                <p className="text-xs text-fg-4 truncate">
                  {[it.team_name, it.location].filter(Boolean).join(' · ') || (it.source === 'athlete' ? 'Athlete schedule' : '')}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-fg-3 tabular-nums">{format(parseISO(it.date), 'EEE MMM d')}</p>
                {it.start_time && <p className="text-xs text-fg-4 tabular-nums">{format(parseISO(`2000-01-01T${it.start_time}`), 'h:mm a')}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const RESULT_LABEL: Record<string, string> = { win: 'W', loss: 'L', tie: 'T' }

function FlowSectionPanel({
  athleteId, sessions, logs, recentLogs, games, checkins, initialNote, readOnly,
}: {
  athleteId: string
  sessions: FlowSession[]
  logs: FlowLog[]
  recentLogs: AthleteData['recentFlowLogs']
  games: AthleteData['recentGames']
  checkins: FlowStageCheckin[]
  initialNote: string | null
  readOnly?: boolean
}) {
  const [note, setNote] = useState(initialNote ?? '')
  const [noteState, setNoteState] = useState<SaveState>('idle')
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const streak = calcCompetitionStreak(logs, sessions)
  const avgRecent = recentLogs.length
    ? Math.round((recentLogs.reduce((a, l) => a + l.flow_score, 0) / recentLogs.length) * 10) / 10
    : null
  const inZoneRate = recentLogs.length
    ? Math.round((recentLogs.filter(l => flowZone(l.challenge_level, l.skill_level) === 'in_zone').length / recentLogs.length) * 100)
    : null
  const flowById = new Map(logs.map(l => [l.id, l]))
  const today = localDateISO()
  const attention = needsAttention(logs, sessions, today, checkins)
  const latestCheckin = checkins[0] ?? null

  async function saveNote() {
    setNoteState('saving')
    const res = await fetch('/api/mindset/flow-state/coach-notes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athlete_id: athleteId, note }),
    }).catch(() => null)
    if (res?.ok) { setSavedAt(new Date().toLocaleTimeString()); setNoteState('saved') }
    else setNoteState('error')
  }

  if (sessions.length === 0 && logs.length === 0 && checkins.length === 0) {
    return (
      <div className="text-center py-12 text-fg-3">
        <p className="font-medium">No flow data yet</p>
        <p className="text-xs text-fg-4 mt-1">Athlete hasn't started the Flow State tracker.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {attention.length > 0 && (
        <div className="bg-cta/10 border border-cta/40 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-cta mb-1">Needs attention</p>
          <ul className="list-disc list-inside text-sm text-fg-2 space-y-0.5">
            {attention.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface rounded-xl border border-edge p-3 text-center">
          <p className="text-lg font-bold text-cta">{streak}</p>
          <p className="text-xs text-fg-4">Competition streak</p>
        </div>
        <div className="bg-surface rounded-xl border border-edge p-3 text-center">
          <p className="text-lg font-bold text-fg-2">{avgRecent ?? '—'}</p>
          <p className="text-xs text-fg-4">Avg flow (last {recentLogs.length})</p>
        </div>
        <div className="bg-surface rounded-xl border border-edge p-3 text-center">
          <p className="text-lg font-bold text-fg-2">{inZoneRate != null ? `${inZoneRate}%` : '—'}</p>
          <p className="text-xs text-fg-4">In the zone</p>
        </div>
        <div className="bg-surface rounded-xl border border-edge p-3 text-center">
          <p className="text-lg font-bold text-fg-2">{logs.length}</p>
          <p className="text-xs text-fg-4">Competitions</p>
        </div>
      </div>

      <FlowBarChart logs={logs} />

      {latestCheckin && (
        <div className="card p-4 flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm">
            <span className="text-fg-4">Current stage: </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${STAGE_META[latestCheckin.stage].fg}`}
              style={{ backgroundColor: STAGE_META[latestCheckin.stage].hex }}
            >
              {STAGE_META[latestCheckin.stage].emoji} {STAGE_META[latestCheckin.stage].label}
            </span>
          </div>
          <span className="text-xs text-fg-4">
            {formatDistanceToNow(parseISO(latestCheckin.checked_at), { addSuffix: true })}
          </span>
        </div>
      )}

      {recentLogs.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-fg-1 mb-3 text-sm">Recent flow logs</h3>
          <ul className="divide-y divide-edge">
            {recentLogs.slice(0, 8).map(l => {
              const zone = flowZone(l.challenge_level, l.skill_level)
              return (
                <li key={l.id} className="flex items-center justify-between gap-3 py-2 min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm text-fg-2 truncate">{format(parseISO(l.logged_at), 'MMM d')}{l.sport ? ` · ${l.sport}` : ''}</p>
                    <p className="text-xs text-fg-4 tabular-nums">Challenge {l.challenge_level} · Skill {l.skill_level} · Flow {l.flow_score}</p>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${ZONE_COLOR[zone].tw}`}>{ZONE_COLOR[zone].label}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {games.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-fg-1 mb-3 text-sm">Recent games</h3>
          <ul className="divide-y divide-edge">
            {games.map((g, i) => {
              const linked = g.flow_log_id ? flowById.get(g.flow_log_id) : undefined
              return (
                <li key={`${g.log_date}-${i}`} className="flex items-center justify-between gap-3 py-2 min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm text-fg-2 truncate">
                      {g.opponent ? `vs ${g.opponent}` : 'Game'}{g.result ? ` · ${RESULT_LABEL[g.result] ?? g.result}` : ''}{g.score ? ` ${g.score}` : ''}
                    </p>
                    <p className="text-xs text-fg-4 tabular-nums">
                      {g.log_date}{g.performance != null ? ` · Performance ${g.performance}/10` : ''}
                    </p>
                  </div>
                  {linked && <span className="shrink-0 text-xs text-fg-3 tabular-nums">Flow {linked.flow_score}</span>}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {!readOnly && <div className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wide text-fg-4">Coach note (visible to athlete)</p>
          {savedAt && <span className="text-xs text-fg-4">Saved at {savedAt}</span>}
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          onBlur={saveNote}
          rows={3}
          placeholder="What should this athlete focus on this week?"
          className="textarea-field"
        />
        <div className="mt-2 flex items-center justify-end gap-3">
          {noteState === 'error' && <span className="text-xs text-red-400">Couldn&rsquo;t save the note. Try again.</span>}
          <SaveButton type="button" onClick={saveNote} state={noteState} idleLabel="Save now" savingLabel="Saving…" className="!w-auto" />
        </div>
      </div>}
    </div>
  )
}
