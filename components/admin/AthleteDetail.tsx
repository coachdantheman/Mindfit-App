'use client'
import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { Profile, JournalEntry, FoodEntry, NutritionGoal, WorkoutLog, SleepEntry } from '@/types'
import dynamic from 'next/dynamic'

const RatingChart = dynamic(() => import('@/components/dashboard/RatingChart'), { ssr: false })

type Section = 'mindset' | 'nutrition' | 'exercise' | 'sleep'

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

  const avgOf = (key: keyof JournalEntry) => {
    if (journalEntries.length === 0) return '—'
    const sum = journalEntries.reduce((acc, e) => acc + (e[key] as number), 0)
    return (sum / journalEntries.length).toFixed(1)
  }

  const avgSleep = sleepEntries.length > 0
    ? (sleepEntries.reduce((acc, e) => acc + (Number(e.hours_slept) || 0), 0) / sleepEntries.length).toFixed(1)
    : '—'

  const avgSleepQuality = sleepEntries.filter(e => e.sleep_quality).length > 0
    ? (sleepEntries.reduce((acc, e) => acc + (e.sleep_quality || 0), 0) / sleepEntries.filter(e => e.sleep_quality).length).toFixed(1)
    : '—'

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

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-900 rounded-2xl border border-white/10 p-4 text-center">
          <p className="text-2xl font-bold text-cta">{journalEntries.length}</p>
          <p className="text-xs text-gray-500 mt-1">Journal Entries</p>
        </div>
        <div className="bg-gray-900 rounded-2xl border border-white/10 p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{workoutLogs.length}</p>
          <p className="text-xs text-gray-500 mt-1">Workouts</p>
        </div>
        <div className="bg-gray-900 rounded-2xl border border-white/10 p-4 text-center">
          <p className={`text-2xl font-bold ${avgSleep !== '—' && parseFloat(avgSleep) >= 7 ? 'text-green-400' : 'text-orange-400'}`}>{avgSleep}h</p>
          <p className="text-xs text-gray-500 mt-1">Avg Sleep</p>
        </div>
        <div className="bg-gray-900 rounded-2xl border border-white/10 p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{goalCount.completed}/{goalCount.total}</p>
          <p className="text-xs text-gray-500 mt-1">Goals Complete</p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(['mindset', 'nutrition', 'exercise', 'sleep'] as Section[]).map(s => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              section === s ? 'bg-cta/20 text-cta border border-cta/30' : 'text-gray-500 border border-white/10 hover:text-gray-300'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Mindset */}
      {section === 'mindset' && (
        <div className="space-y-6">
          {journalEntries.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="font-medium">No journal entries yet</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Avg Motivation', value: avgOf('rating_motivation'), color: 'text-blue-400 bg-blue-900/30 border border-blue-800/40' },
                  { label: 'Avg Focus', value: avgOf('rating_focus'), color: 'text-purple-400 bg-purple-900/30 border border-purple-800/40' },
                  { label: 'Avg Confidence', value: avgOf('rating_confidence'), color: 'text-green-400 bg-green-900/30 border border-green-800/40' },
                  { label: 'Avg Anxiety', value: avgOf('rating_anxiety'), color: 'text-orange-400 bg-orange-900/30 border border-orange-800/40' },
                ].map(stat => (
                  <div key={stat.label} className={`rounded-2xl p-4 text-center ${stat.color}`}>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs mt-1 font-medium">{stat.label}</p>
                  </div>
                ))}
              </div>

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

      {/* Nutrition */}
      {section === 'nutrition' && (
        <div className="space-y-4">
          {foodEntries.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="font-medium">No nutrition data yet</p>
            </div>
          ) : (
            <>
              {nutritionGoal && (() => {
                const todayStr = new Date().toISOString().split('T')[0]
                const todayEntries = foodEntries.filter(e => e.entry_date === todayStr)
                const totals = todayEntries.reduce(
                  (acc, e) => ({
                    calories: acc.calories + e.calories,
                    protein: acc.protein + Number(e.protein_g),
                    carbs: acc.carbs + Number(e.carbs_g),
                    fat: acc.fat + Number(e.fat_g),
                  }),
                  { calories: 0, protein: 0, carbs: 0, fat: 0 }
                )
                const pct = (c: number, g: number) => Math.min(100, Math.round((c / g) * 100))
                return (
                  <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
                    <h3 className="font-semibold text-gray-100 mb-3 text-sm">Today&apos;s Macros</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Calories', current: totals.calories, goal: nutritionGoal.calories, unit: 'kcal', color: 'bg-cta' },
                        { label: 'Protein', current: totals.protein, goal: nutritionGoal.protein_g, unit: 'g', color: 'bg-blue-500' },
                        { label: 'Carbs', current: totals.carbs, goal: nutritionGoal.carbs_g, unit: 'g', color: 'bg-green-500' },
                        { label: 'Fat', current: totals.fat, goal: nutritionGoal.fat_g, unit: 'g', color: 'bg-orange-500' },
                      ].map(m => (
                        <div key={m.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400">{m.label}</span>
                            <span className="text-gray-300 font-medium">{Math.round(m.current)} / {m.goal} {m.unit}</span>
                          </div>
                          <div className="bg-gray-700 rounded-full h-2.5 overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${m.color}`} style={{ width: `${pct(m.current, m.goal)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

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

      {/* Exercise */}
      {section === 'exercise' && (
        <div className="space-y-4">
          {workoutLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="font-medium">No workouts logged yet</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {Object.entries(
                  workoutLogs.reduce((acc, log) => {
                    acc[log.category_name] = (acc[log.category_name] || 0) + 1
                    return acc
                  }, {} as Record<string, number>)
                ).map(([cat, count]) => (
                  <div key={cat} className="bg-gray-900 rounded-xl border border-white/10 p-3 text-center">
                    <p className="text-lg font-bold text-purple-400">{count}</p>
                    <p className="text-xs text-gray-500">{cat}</p>
                  </div>
                ))}
              </div>

              <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
                <h3 className="font-semibold text-gray-100 mb-3 text-sm">Recent Workouts</h3>
                <div className="space-y-2">
                  {workoutLogs.slice(0, 20).map(log => (
                    <div key={log.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/30">
                      <div>
                        <p className="text-sm text-gray-200">{log.workout_name}</p>
                        <p className="text-xs text-gray-500">{log.category_name}{log.duration_min ? ` · ${log.duration_min} min` : ''}</p>
                      </div>
                      <span className="text-xs text-gray-500">{log.log_date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Sleep */}
      {section === 'sleep' && (
        <div className="space-y-4">
          {sleepEntries.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="font-medium">No sleep data yet</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-900 rounded-2xl border border-white/10 p-4 text-center">
                  <p className={`text-2xl font-bold ${avgSleep !== '—' && parseFloat(avgSleep) >= 7 ? 'text-green-400' : 'text-orange-400'}`}>{avgSleep}h</p>
                  <p className="text-xs text-gray-500 mt-1">Avg Hours</p>
                </div>
                <div className="bg-gray-900 rounded-2xl border border-white/10 p-4 text-center">
                  <p className="text-2xl font-bold text-blue-400">{avgSleepQuality}/10</p>
                  <p className="text-xs text-gray-500 mt-1">Avg Quality</p>
                </div>
              </div>

              <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
                <h3 className="font-semibold text-gray-100 mb-3 text-sm">Recent Nights</h3>
                <div className="space-y-2">
                  {sleepEntries.slice(0, 14).map(entry => (
                    <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/30">
                      <div>
                        <p className="text-sm text-gray-200">{entry.entry_date}</p>
                        <p className="text-xs text-gray-500">
                          {entry.hours_slept ? `${Number(entry.hours_slept).toFixed(1)}h` : '—'}
                          {entry.sleep_quality ? ` · Quality: ${entry.sleep_quality}/10` : ''}
                        </p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${
                        Number(entry.hours_slept) >= 7 ? 'bg-green-500' : Number(entry.hours_slept) > 0 ? 'bg-orange-500' : 'bg-gray-600'
                      }`} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
