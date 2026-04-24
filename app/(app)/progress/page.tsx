'use client'
import { useState, useEffect } from 'react'
import { JournalEntry, SleepEntry, WorkoutLog, FoodEntry, NutritionGoal, WeeklyAssessment } from '@/types'
import { calcSleepAverages } from '@/lib/stats'
import dynamic from 'next/dynamic'
import SectionTabs, { Section } from '@/components/shared/SectionTabs'
import OverviewCards from '@/components/shared/OverviewCards'
import JournalRatingsGrid from '@/components/shared/JournalRatingsGrid'
import MacroBars from '@/components/shared/MacroBars'
import WorkoutLogList from '@/components/shared/WorkoutLogList'
import SleepEntriesList from '@/components/shared/SleepEntriesList'

import StatCard from '@/components/dashboard/StatCard'
import ReadinessHero from '@/components/dashboard/ReadinessHero'

const RatingChart = dynamic(() => import('@/components/dashboard/RatingChart'), { ssr: false })
const EntryList = dynamic(() => import('@/components/dashboard/EntryList'), { ssr: false })
const FlowProgressView = dynamic(() => import('@/components/mindset/flow/FlowProgressView'), { ssr: false })

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/journal').then(r => r.json()),
      fetch('/api/sleep/entries').then(r => r.json()),
      fetch('/api/exercise/logs').then(r => r.json()),
      fetch('/api/mindset/visualization').then(r => r.json()),
      fetch('/api/mindset/meditation').then(r => r.json()),
      fetch('/api/mindset/goals').then(r => r.json()),
      fetch('/api/nutrition/entries?date=' + new Date().toISOString().split('T')[0]).then(r => r.json()),
      fetch('/api/nutrition/goals').then(r => r.json()),
      fetch('/api/mindset/weekly-assessment').then(r => r.json()),
    ]).then(([journal, sleep, workouts, viz, med, goals, food, nutGoal, weeklyAssessments]) => {
      setJournalEntries(journal)
      setSleepEntries(sleep)
      setWorkoutLogs(workouts)
      setVizCount(viz.filter((v: { completed: boolean }) => v.completed).length)
      setMedCount(med.filter((m: { completed: boolean }) => m.completed).length)
      setGoalCount({ total: goals.length, completed: goals.filter((g: { is_completed: boolean }) => g.is_completed).length })
      setFoodEntries(food)
      setNutritionGoal(nutGoal)
      setAssessments(Array.isArray(weeklyAssessments) ? weeklyAssessments : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const { avgSleep, avgSleepQuality } = calcSleepAverages(sleepEntries)

  const foodTotals = foodEntries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + Number(e.protein_g),
      carbs: acc.carbs + Number(e.carbs_g),
      fat: acc.fat + Number(e.fat_g),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  if (loading) return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-2">Progress</h1>
      <p className="text-sm text-gray-500">Loading your data…</p>
    </div>
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Progress</h1>
        <p className="text-gray-500 text-sm mt-1">Your performance at a glance.</p>
      </div>

      <OverviewCards
        journalCount={journalEntries.length}
        workoutCount={workoutLogs.length}
        avgSleep={avgSleep}
        goalCount={goalCount}
      />

      <SectionTabs active={section} onSelect={setSection} />

      {section === 'mindset' && (
        <div className="space-y-6">
          {journalEntries.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="font-medium">No journal data yet</p>
              <p className="text-sm mt-1">Start journaling to see your progress.</p>
            </div>
          ) : (
            <>
              <JournalRatingsGrid entries={journalEntries} />

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-900 rounded-xl border border-white/10 p-3 text-center">
                  <p className="text-lg font-bold text-gray-200">{vizCount}</p>
                  <p className="text-xs text-gray-500">Visualizations</p>
                </div>
                <div className="bg-gray-900 rounded-xl border border-white/10 p-3 text-center">
                  <p className="text-lg font-bold text-gray-200">{medCount}</p>
                  <p className="text-xs text-gray-500">Meditations</p>
                </div>
                <div className="bg-gray-900 rounded-xl border border-white/10 p-3 text-center">
                  <p className="text-lg font-bold text-gray-200">{goalCount.completed}</p>
                  <p className="text-xs text-gray-500">Goals Hit</p>
                </div>
              </div>

              {(() => {
                const latest = journalEntries[0]
                const prev = journalEntries[1]
                const readinessOf = (e: JournalEntry) =>
                  Math.round(((e.rating_motivation + e.rating_focus + e.rating_confidence + (11 - e.rating_anxiety)) / 4) * 10)
                const score = readinessOf(latest)
                const prevScore = prev ? readinessOf(prev) : null
                const delta = prevScore !== null ? score - prevScore : null
                const verdict =
                  score >= 80 ? 'Locked in — peak window.' :
                  score >= 65 ? 'Solid. Execute with intent.' :
                  score >= 50 ? 'Steady. Protect your focus.' :
                  'Recover first. Identity over output.'
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
                      subtitle={avgSleep !== '—' ? `Sleep avg ${avgSleep}h · ${workoutLogs.length} workouts logged` : `${workoutLogs.length} workouts logged`}
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
                        color="#3b82f6"
                      />
                      <StatCard
                        label="Focus"
                        value={latest.rating_focus}
                        unit="/10"
                        delta={diff(e => e.rating_focus)}
                        sparkline={spark(e => e.rating_focus)}
                        color="#a855f7"
                      />
                      <StatCard
                        label="Confidence"
                        value={latest.rating_confidence}
                        unit="/10"
                        delta={diff(e => e.rating_confidence)}
                        sparkline={spark(e => e.rating_confidence)}
                        color="#22c55e"
                      />
                      <StatCard
                        label="Anxiety"
                        value={latest.rating_anxiety}
                        unit="/10"
                        delta={diff(e => e.rating_anxiety)}
                        sparkline={spark(e => e.rating_anxiety)}
                        color="#f97316"
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

      {section === 'flow' && <FlowProgressView />}

      {section === 'nutrition' && (
        <div className="space-y-4">
          {foodEntries.length === 0 && !nutritionGoal ? (
            <div className="text-center py-12 text-gray-400">
              <p className="font-medium">No nutrition data yet</p>
              <p className="text-sm mt-1">Log food in the Nutrition tab to see your progress.</p>
            </div>
          ) : (
            <>
              {nutritionGoal && <MacroBars totals={foodTotals} goal={nutritionGoal} title="Today&apos;s Macros" />}
              {foodEntries.length > 0 && (
                <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
                  <h3 className="font-semibold text-gray-100 mb-3 text-sm">Today&apos;s Food Log</h3>
                  <div className="space-y-2">
                    {foodEntries.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/30">
                        <div>
                          <p className="text-sm text-gray-200">{entry.food_name}</p>
                          <p className="text-xs text-gray-500">
                            {entry.meal_name} · {entry.calories} cal · {Number(entry.protein_g)}p · {Number(entry.carbs_g)}c · {Number(entry.fat_g)}f
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {section === 'exercise' && <WorkoutLogList logs={workoutLogs} />}

      {section === 'sleep' && (
        <SleepEntriesList entries={sleepEntries} avgSleep={avgSleep} avgSleepQuality={avgSleepQuality} />
      )}
    </div>
  )
}

function WeeklyAssessmentTrends({ assessments }: { assessments: WeeklyAssessment[] }) {
  const latest = assessments[0]
  const previous = assessments[1] || null
  const latestAvg = Math.round(getAssessmentAvg(latest) * 10) / 10

  return (
    <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-100 text-sm">Weekly Assessment</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{assessments.length} week{assessments.length !== 1 ? 's' : ''} tracked</span>
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
              <span className="text-xs text-gray-400 w-24 shrink-0">{label}</span>
              <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    current <= 3 ? 'bg-red-500/80' : current <= 5 ? 'bg-yellow-500/80' : current <= 7 ? 'bg-cta/60' : 'bg-green-500/80'
                  }`}
                  style={{ width: `${(current / 10) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-200 w-5 text-right tabular-nums">{current}</span>
              {diff !== null && diff !== 0 && (
                <span className={`text-xs font-medium w-6 ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {diff > 0 ? '+' : ''}{diff}
                </span>
              )}
              {diff !== null && diff === 0 && (
                <span className="text-xs text-gray-600 w-6">=</span>
              )}
            </div>
          )
        })}
      </div>

      {assessments.length > 1 && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <h4 className="text-xs text-gray-500 mb-2">Weekly Averages</h4>
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
            <span className="text-[10px] text-gray-600">
              {assessments.length > 1 ? new Date(assessments[Math.min(assessments.length - 1, 11)].week_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
            </span>
            <span className="text-[10px] text-gray-600">
              {new Date(assessments[0].week_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
