'use client'
import { useState, useEffect } from 'react'
import { JournalEntry, SleepEntry, WorkoutLog, FoodEntry, NutritionGoal, WeeklyAssessment } from '@/types'
import { calcSleepAverages } from '@/lib/stats'
import { cached, cachedAll } from '@/lib/api-cache'
import PageSkeleton from '@/components/shared/PageSkeleton'
import dynamic from 'next/dynamic'
import SectionTabs, { Section } from '@/components/shared/SectionTabs'
import OverviewCards from '@/components/shared/OverviewCards'
import JournalRatingsGrid from '@/components/shared/JournalRatingsGrid'
import LessonLinks from '@/components/shared/LessonLinks'
import WorkoutLogList from '@/components/shared/WorkoutLogList'
import SleepEntriesList from '@/components/shared/SleepEntriesList'
import InsightsCard from '@/components/dashboard/InsightsCard'
import { progressInsights, type InsightData, type InsightSection } from '@/lib/insights'
import { factFor } from '@/lib/data/research-facts'
import { localDateISO } from '@/lib/dates'
import { readinessScore, readinessVerdict } from '@/lib/readiness'

import Link from 'next/link'
import StatCard from '@/components/dashboard/StatCard'
import type { MyStatus } from '@/components/leaderboard/types'
import ReadinessHero from '@/components/dashboard/ReadinessHero'
import { FlameIcon } from '@/components/shared/icons'

const RatingChart = dynamic(() => import('@/components/dashboard/RatingChart'), { ssr: false })
const EntryList = dynamic(() => import('@/components/dashboard/EntryList'), { ssr: false })
const FlowProgressView = dynamic(() => import('@/components/mindset/flow/FlowProgressView'), { ssr: false })
const NutritionProgressView = dynamic(() => import('@/components/dashboard/NutritionProgressView'), { ssr: false })

const ASSESSMENT_CATEGORIES = [
  { key: 'self_identity_clarity', label: 'Identity Clarity' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'focus_quality', label: 'Focus' },
  { key: 'anxiety_management', label: 'Anxiety Mgmt' },
  { key: 'resilience', label: 'Resilience' },
  { key: 'motivation', label: 'Motivation' },
  { key: 'mental_imagery', label: 'Mental Imagery' },
  { key: 'routine_consistency', label: 'Routine' },
  { key: 'team_relationships', label: 'Team' },
  { key: 'vision_clarity', label: 'Vision' },
] as const

function getAssessmentAvg(entry: WeeklyAssessment) {
  return ASSESSMENT_CATEGORIES.reduce((sum, c) => sum + (entry[c.key as keyof WeeklyAssessment] as number), 0) / ASSESSMENT_CATEGORIES.length
}

export default function ProgressPage() {
  const [section, setSection] = useState<Section>('mindset')
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([])
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([])
  const [vizCount, setVizCount] = useState(0)
  const [medCount, setMedCount] = useState(0)
  const [goalCount, setGoalCount] = useState({ total: 0, completed: 0 })
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([])
  const [nutritionGoal, setNutritionGoal] = useState<NutritionGoal | null>(null)
  const [assessments, setAssessments] = useState<WeeklyAssessment[]>([])
  const [overview, setOverview] = useState<{ streak: number; latestMpi: number | null; baselineMpi: number | null } | null>(null)
  const [board, setBoard] = useState<MyStatus | null>(null)
  const [games, setGames] = useState<InsightData['games']>([])
  const [routineDates, setRoutineDates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    type Answers = [
      JournalEntry[],
      SleepEntry[],
      WorkoutLog[],
      { completed: boolean; duration_min: number | null }[],
      { is_completed: boolean }[],
      FoodEntry[],
      NutritionGoal | null,
      WeeklyAssessment[],
      { streak: number; latestMpi: number | null; baselineMpi: number | null } | null,
    ]
    cachedAll([
      '/api/journal',
      '/api/sleep/entries',
      '/api/exercise/logs',
      '/api/mindset/visualization',
      '/api/mindset/goals',
      '/api/nutrition/entries?days=30',
      '/api/nutrition/goals',
      '/api/mindset/weekly-assessment',
      '/api/stats/overview',
    ], ([journal, sleep, workouts, viz, goals, food, nutGoal, weeklyAssessments, stats]: Answers) => {
      // A failed request answers with an error object, not a list.
      const list = <T,>(v: T[]): T[] => (Array.isArray(v) ? v : [])
      const done = list(viz).filter(v => v.completed)
      setJournalEntries(list(journal))
      setSleepEntries(list(sleep))
      setWorkoutLogs(list(workouts))
      setVizCount(done.length)
      setMedCount(done.reduce((sum, v) => sum + (v.duration_min ?? 0), 0))
      setGoalCount({ total: list(goals).length, completed: list(goals).filter(g => g.is_completed).length })
      setFoodEntries(list(food))
      setNutritionGoal(nutGoal && 'id' in nutGoal ? nutGoal : null)
      setAssessments(Array.isArray(weeklyAssessments) ? weeklyAssessments : [])
      if (stats && typeof stats.streak === 'number') setOverview(stats)
      setLoading(false)
    }).catch(() => setLoading(false))
    let tz = ''
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone } catch {}
    cached(`/api/leaderboard?tz=${encodeURIComponent(tz)}`, (d: { me?: MyStatus }) => { if (d?.me) setBoard(d.me) })
      .catch(() => {})
    cached('/api/exercise/practice?days=120', (rows: { kind: string; log_date: string; performance: number | null }[]) => {
      if (Array.isArray(rows)) setGames(rows.filter(r => r.kind === 'game').map(r => ({ log_date: r.log_date, performance: r.performance })))
    }).catch(() => {})
    cached(`/api/exercise/pregame?date=${localDateISO()}`, (d: { runs?: { game_date: string; completed_at: string | null }[] }) => {
      if (Array.isArray(d?.runs)) setRoutineDates(d.runs.filter(r => r.completed_at).map(r => r.game_date))
    }).catch(() => {})
  }, [])

  const { avgSleep, avgSleepQuality } = calcSleepAverages(sleepEntries)

  const insightData: InsightData = {
    journal: journalEntries,
    sleep: sleepEntries,
    workouts: workoutLogs.map(w => ({ log_date: w.log_date })),
    food: foodEntries,
    proteinGoal: nutritionGoal?.protein_g ?? null,
    games,
    routineDates,
  }
  const insights = progressInsights(insightData)
  const today = localDateISO()
  const insightCard = (section: InsightSection) => (
    <InsightsCard section={section} insights={insights} fact={factFor(section, today)} />
  )

  if (loading) return <PageSkeleton variant="progress" title="Progress" />

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Progress</h1>
        <p className="page-subtitle">Your performance at a glance.</p>
      </div>

      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <StatCard
            label="MPI Score"
            value={overview.latestMpi ?? '-'}
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
            context="Mental Performance Index"
            sparkline={
              assessments.length > 1
                ? [...assessments].slice(0, 8).reverse().map(a => getAssessmentAvg(a) / 10)
                : undefined
            }
          />
          <StatCard
            label="Streak"
            value={overview.streak}
            unit={overview.streak === 1 ? 'day' : 'days'}
            context={overview.streak > 0 ? 'Consecutive days of training. Keep it alive.' : 'Log anything today to start a streak.'}
            icon={<FlameIcon className="w-5 h-5 text-cta" />}
          />
          {board && (
            <Link href="/leaderboard" className="block col-span-2 sm:col-span-1 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-cta">
              <StatCard
                label="The Board"
                value={board.points}
                unit="pts"
                context={board.rank ? `${board.title.name} · ${board.level.name} · #${board.rank} of ${board.of}` : `${board.title.name} · ${board.level.name} · log anything to get ranked`}
                icon={<span>{board.title.emoji}</span>}
              />
            </Link>
          )}
        </div>
      )}

      <OverviewCards
        journalCount={journalEntries.length}
        workoutCount={workoutLogs.length}
        avgSleep={avgSleep}
        goalCount={goalCount}
      />

      <SectionTabs active={section} onSelect={setSection} />

      {section === 'mindset' && (
        <div className="space-y-6">
          {insightCard('mindset')}
          {journalEntries.length === 0 ? (
            <div className="text-center py-12 text-fg-3">
              <p className="font-medium">No journal data yet</p>
              <p className="text-sm mt-1">Start journaling to see your progress.</p>
            </div>
          ) : (
            <>
              <JournalRatingsGrid entries={journalEntries} />

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-surface rounded-xl border border-edge p-3 text-center">
                  <p className="text-lg font-bold text-fg-2">{vizCount}</p>
                  <p className="break-words text-xs text-fg-4">Visualizations</p>
                </div>
                <div className="bg-surface rounded-xl border border-edge p-3 text-center">
                  <p className="text-lg font-bold text-fg-2">{medCount}</p>
                  <p className="break-words text-xs text-fg-4">Practice minutes</p>
                </div>
                <div className="bg-surface rounded-xl border border-edge p-3 text-center">
                  <p className="text-lg font-bold text-fg-2">{goalCount.completed}</p>
                  <p className="break-words text-xs text-fg-4">Goals Hit</p>
                </div>
              </div>

              {(() => {
                const latest = journalEntries[0]
                const prev = journalEntries[1]
                const score = readinessScore(latest)
                const prevScore = prev ? readinessScore(prev) : null
                const delta = prevScore !== null ? score - prevScore : null
                const verdict = readinessVerdict(score)
                const entryDate = new Date(latest.entry_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                const spark = (pick: (e: JournalEntry) => number) =>
                  [...journalEntries].slice(0, 7).reverse().map(e => pick(e) / 10)
                const diff = (pick: (e: JournalEntry) => number) => {
                  if (!prev) return undefined
                  const d = pick(latest) - pick(prev)
                  return {
                    value: `${d > 0 ? '+' : ''}${d}`,
                    direction: d > 0 ? 'up' as const : d < 0 ? 'down' as const : 'flat' as const,
                  }
                }
                return (
                  <>
                    <ReadinessHero
                      score={score}
                      verdict={verdict}
                      subtitle={avgSleep !== '-' ? `Sleep avg ${avgSleep}h · ${workoutLogs.length} workouts logged` : `${workoutLogs.length} workouts logged`}
                      date={`Today · ${entryDate}`}
                      pills={[
                        ...(delta !== null ? [{ label: 'Δ', value: `${delta > 0 ? '+' : ''}${delta}`, delta: delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : undefined }] : []),
                        { label: 'Entries', value: String(journalEntries.length) },
                        { label: 'Goals', value: `${goalCount.completed}/${goalCount.total}` },
                      ]}
                    />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <StatCard
                        label="Motivation"
                        value={latest.rating_motivation}
                        unit="/10"
                        delta={diff(e => e.rating_motivation)}
                        sparkline={spark(e => e.rating_motivation)}
                        color="var(--rating-motivation)"
                      />
                      <StatCard
                        label="Focus"
                        value={latest.rating_focus}
                        unit="/10"
                        delta={diff(e => e.rating_focus)}
                        sparkline={spark(e => e.rating_focus)}
                        color="var(--rating-focus)"
                      />
                      <StatCard
                        label="Confidence"
                        value={latest.rating_confidence}
                        unit="/10"
                        delta={diff(e => e.rating_confidence)}
                        sparkline={spark(e => e.rating_confidence)}
                        color="var(--rating-confidence)"
                      />
                      <StatCard
                        label="Anxiety"
                        value={latest.rating_anxiety}
                        unit="/10"
                        delta={diff(e => e.rating_anxiety)}
                        sparkline={spark(e => e.rating_anxiety)}
                        color="var(--rating-anxiety)"
                        context="Lower is better"
                      />
                    </div>
                  </>
                )
              })()}

              <RatingChart entries={journalEntries} />
              <EntryList entries={journalEntries} />
            </>
          )}

          {assessments.length > 0 && <WeeklyAssessmentTrends assessments={assessments} />}
        </div>
      )}

      {section === 'flow' && (
        <div className="space-y-6">
          {insightCard('flow')}
          <FlowProgressView />
        </div>
      )}

      {section === 'nutrition' && (
        <div className="space-y-6">
          {insightCard('nutrition')}
          <NutritionProgressView entries={foodEntries} goal={nutritionGoal} />
        </div>
      )}

      {section === 'exercise' && (
        <div className="space-y-6">
          {insightCard('exercise')}
          <WorkoutLogList logs={workoutLogs} />
        </div>
      )}

      {section === 'sleep' && (
        <div className="space-y-6">
          {insightCard('sleep')}
          <SleepEntriesList entries={sleepEntries} avgSleep={avgSleep} avgSleepQuality={avgSleepQuality} />
        </div>
      )}
    </div>
  )
}

function WeeklyAssessmentTrends({ assessments }: { assessments: WeeklyAssessment[] }) {
  const latest = assessments[0]
  const previous = assessments[1] || null
  const latestAvg = Math.round(getAssessmentAvg(latest) * 10) / 10

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-fg-1 text-sm">Weekly Assessment</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-4">{assessments.length} week{assessments.length !== 1 ? 's' : ''} tracked</span>
          <span className="text-lg font-bold text-cta">{latestAvg}</span>
        </div>
      </div>

      <div className="space-y-2.5">
        {ASSESSMENT_CATEGORIES.map(({ key, label }) => {
          const current = latest[key as keyof WeeklyAssessment] as number
          const prev = previous ? (previous[key as keyof WeeklyAssessment] as number) : null
          const diff = prev !== null ? current - prev : null
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-fg-3 w-24 shrink-0">{label}</span>
              <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] ${
                    current <= 3 ? 'bg-red-500/80' : current <= 5 ? 'bg-yellow-500/80' : current <= 7 ? 'bg-cta/60' : 'bg-green-500/80'
                  }`}
                  style={{ width: `${(current / 10) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-fg-2 w-5 text-right tabular-nums">{current}</span>
              {diff !== null && diff !== 0 && (
                <span className={`text-xs font-medium w-6 ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {diff > 0 ? '+' : ''}{diff}
                </span>
              )}
              {diff !== null && diff === 0 && (
                <span className="text-xs text-fg-4 w-6">=</span>
              )}
            </div>
          )
        })}
      </div>

      {assessments.length > 1 && (
        <div className="mt-4 pt-4 border-t border-edge-muted">
          <h4 className="text-xs text-fg-4 mb-2">Weekly Averages</h4>
          <div className="flex gap-1.5 items-end h-16">
            {assessments.slice(0, 12).reverse().map(entry => {
              const avg = getAssessmentAvg(entry)
              return (
                <div key={entry.id} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-sm ${avg <= 3 ? 'bg-red-500/60' : avg <= 5 ? 'bg-yellow-500/60' : avg <= 7 ? 'bg-cta/50' : 'bg-green-500/60'}`}
                    style={{ height: `${(avg / 10) * 100}%` }}
                    title={`Week of ${entry.week_date}: ${avg.toFixed(1)}`}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-fg-4">
              {assessments.length > 1 ? new Date(assessments[Math.min(assessments.length - 1, 11)].week_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
            </span>
            <span className="text-xs text-fg-4">
              {new Date(assessments[0].week_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      )}

      <LessonLinks section="progress" />
    </div>
  )
}
