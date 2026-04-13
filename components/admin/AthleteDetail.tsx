'use client'
import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { Profile, JournalEntry, FoodEntry, NutritionGoal, WorkoutLog, SleepEntry } from '@/types'
import { calcSleepAverages } from '@/lib/stats'
import dynamic from 'next/dynamic'
import SectionTabs, { Section } from '@/components/shared/SectionTabs'
import OverviewCards from '@/components/shared/OverviewCards'
import JournalRatingsGrid from '@/components/shared/JournalRatingsGrid'
import MacroBars from '@/components/shared/MacroBars'
import WorkoutLogList from '@/components/shared/WorkoutLogList'
import SleepEntriesList from '@/components/shared/SleepEntriesList'

const RatingChart = dynamic(() => import('@/components/dashboard/RatingChart'), { ssr: false })

interface AthleteData {
  profile: Profile
  journalEntries: JournalEntry[]
  foodEntries: FoodEntry[]
  nutritionGoal: NutritionGoal | null
  workoutLogs: WorkoutLog[]
  sleepEntries: SleepEntry[]
  vizCount: number
  medCount: number
  goalCount: { total: number; completed: number }
}

export default function AthleteDetail({ athleteId, backHref }: { athleteId: string; backHref: string }) {
  const [data, setData] = useState<AthleteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [section, setSection] = useState<Section>('mindset')

  useEffect(() => {
    fetch(`/api/athlete/${athleteId}`)
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error)
        return r.json()
      })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [athleteId])

  if (loading) return <p className="text-sm text-gray-500">Loading athlete data…</p>
  if (error) return <p className="text-sm text-red-400">{error}</p>
  if (!data) return null

  const { profile, journalEntries, foodEntries, nutritionGoal, workoutLogs, sleepEntries, vizCount, medCount, goalCount } = data
  const { avgSleep, avgSleepQuality } = calcSleepAverages(sleepEntries)

  const todayStr = new Date().toISOString().split('T')[0]
  const todayEntries = foodEntries.filter(e => e.entry_date === todayStr)
  const foodTotals = todayEntries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + Number(e.protein_g),
      carbs: acc.carbs + Number(e.carbs_g),
      fat: acc.fat + Number(e.fat_g),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  return (
    <div>
      <a href={backHref} className="text-brand-500 text-sm hover:underline mb-4 inline-block">
        ← Back
      </a>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">{profile.full_name || profile.email}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {profile.email} · Joined {format(parseISO(profile.created_at), 'MMM d, yyyy')}
        </p>
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
              <p className="font-medium">No journal entries yet</p>
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

              <RatingChart entries={journalEntries} />

              <div className="bg-gray-900 rounded-2xl border border-white/10 p-6">
                <h3 className="font-semibold text-gray-100 mb-4">Recent Entries</h3>
                <div className="space-y-3">
                  {journalEntries.map(e => (
                    <div key={e.id} className="p-3 rounded-xl bg-gray-800/50 border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-300">
                          {format(parseISO(e.entry_date), 'EEEE, MMMM d')}
                        </p>
                        <div className="flex gap-1.5">
                          <span className="text-[10px] text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded-full">M:{e.rating_motivation}</span>
                          <span className="text-[10px] text-purple-400 bg-purple-900/30 px-1.5 py-0.5 rounded-full">F:{e.rating_focus}</span>
                          <span className="text-[10px] text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded-full">C:{e.rating_confidence}</span>
                          <span className="text-[10px] text-orange-400 bg-orange-900/30 px-1.5 py-0.5 rounded-full">A:{e.rating_anxiety}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400"><span className="text-gray-500">Objective:</span> {e.objective}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {section === 'nutrition' && (
        <div className="space-y-4">
          {foodEntries.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="font-medium">No nutrition data yet</p>
            </div>
          ) : (
            <>
              {nutritionGoal && <MacroBars totals={foodTotals} goal={nutritionGoal} title="Today&apos;s Macros" />}
              <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
                <h3 className="font-semibold text-gray-100 mb-3 text-sm">Recent Food Log</h3>
                <div className="space-y-2">
                  {foodEntries.slice(0, 20).map(entry => (
                    <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/30">
                      <div>
                        <p className="text-sm text-gray-200">{entry.food_name}</p>
                        <p className="text-xs text-gray-500">
                          {entry.meal_name} · {entry.calories} cal · {Number(entry.protein_g)}p · {Number(entry.carbs_g)}c · {Number(entry.fat_g)}f
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">{entry.entry_date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {section === 'exercise' && (
        <div className="space-y-4">
          <WorkoutLogList logs={workoutLogs} />
          {workoutLogs.some(l => l.exercise_logs && l.exercise_logs.length > 0) && (
            <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
              <h3 className="font-semibold text-gray-100 mb-3 text-sm">Per-Exercise Data</h3>
              <div className="space-y-2">
                {workoutLogs
                  .filter(l => l.exercise_logs && l.exercise_logs.length > 0)
                  .slice(0, 10)
                  .map(l => (
                    <div key={l.id} className="p-2 rounded-lg bg-gray-800/30">
                      <p className="text-xs text-gray-400 mb-1">{l.workout_name} — {l.log_date}</p>
                      <div className="flex flex-wrap gap-1">
                        {l.exercise_logs!.map(el => (
                          <span key={el.id} className="text-[10px] text-gray-500 bg-gray-700/50 px-1.5 py-0.5 rounded">
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
