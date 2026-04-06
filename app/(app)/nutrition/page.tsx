'use client'
import { useState, useEffect, useCallback } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { FoodEntry, NutritionGoal } from '@/types'

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const

export default function NutritionPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [goals, setGoals] = useState<NutritionGoal | null>(null)
  const [loading, setLoading] = useState(true)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [goalSuccess, setGoalSuccess] = useState(false)
  const [foodSuccess, setFoodSuccess] = useState(false)

  // Goal form state
  const [gCalories, setGCalories] = useState(2000)
  const [gProtein, setGProtein] = useState(150)
  const [gCarbs, setGCarbs] = useState(250)
  const [gFat, setGFat] = useState(65)

  // Add food form state
  const [fMeal, setFMeal] = useState<string>('Breakfast')
  const [fFood, setFFood] = useState('')
  const [fCalories, setFCalories] = useState('')
  const [fProtein, setFProtein] = useState('')
  const [fCarbs, setFCarbs] = useState('')
  const [fFat, setFFat] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [entriesRes, goalsRes] = await Promise.all([
      fetch(`/api/nutrition/entries?date=${date}`),
      fetch('/api/nutrition/goals'),
    ])
    const entriesData = await entriesRes.json()
    const goalsData = await goalsRes.json()
    setEntries(entriesData)
    setGoals(goalsData)
    if (goalsData) {
      setGCalories(goalsData.calories)
      setGProtein(goalsData.protein_g)
      setGCarbs(goalsData.carbs_g)
      setGFat(goalsData.fat_g)
    }
    setLoading(false)
  }, [date])

  useEffect(() => { fetchData() }, [fetchData])

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + Number(e.protein_g),
      carbs: acc.carbs + Number(e.carbs_g),
      fat: acc.fat + Number(e.fat_g),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const saveGoals = async () => {
    await fetch('/api/nutrition/goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calories: gCalories, protein_g: gProtein, carbs_g: gCarbs, fat_g: gFat }),
    })
    setGoals({ ...goals!, calories: gCalories, protein_g: gProtein, carbs_g: gCarbs, fat_g: gFat })
    setGoalSuccess(true)
    setTimeout(() => { setGoalSuccess(false); setShowGoalForm(false) }, 1500)
  }

  const addFood = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fFood.trim()) return
    setSaving(true)
    const res = await fetch('/api/nutrition/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry_date: date,
        meal_name: fMeal,
        food_name: fFood,
        calories: parseInt(fCalories) || 0,
        protein_g: parseFloat(fProtein) || 0,
        carbs_g: parseFloat(fCarbs) || 0,
        fat_g: parseFloat(fFat) || 0,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setEntries(prev => [...prev, data])
      setFFood('')
      setFCalories('')
      setFProtein('')
      setFCarbs('')
      setFFat('')
      setFoodSuccess(true)
      setTimeout(() => { setFoodSuccess(false); setShowAddForm(false) }, 1500)
    }
    setSaving(false)
  }

  const removeEntry = async (id: string) => {
    await fetch('/api/nutrition/entries', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const pct = (current: number, goal: number) => Math.min(100, Math.round((current / goal) * 100))

  const goalCalories = goals?.calories || 2000
  const goalProtein = goals?.protein_g || 150
  const goalCarbs = goals?.carbs_g || 250
  const goalFat = goals?.fat_g || 65

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Nutrition</h1>
          <p className="text-gray-500 text-sm mt-1">Track your daily fuel.</p>
        </div>
        <button
          onClick={() => setShowGoalForm(!showGoalForm)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
            showGoalForm
              ? 'text-gray-400 border-white/10 hover:text-gray-200'
              : 'bg-cta/20 text-cta border-cta/30 hover:bg-cta/30'
          }`}
        >
          {showGoalForm ? 'Cancel' : 'Set Goals'}
        </button>
      </div>

      {showGoalForm && (
        <div className="bg-gray-900 rounded-2xl border border-white/10 p-5 mb-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-100">Daily Goals</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Calories', value: gCalories, set: setGCalories },
              { label: 'Protein (g)', value: gProtein, set: setGProtein },
              { label: 'Carbs (g)', value: gCarbs, set: setGCarbs },
              { label: 'Fat (g)', value: gFat, set: setGFat },
            ].map(f => (
              <div key={f.label}>
                <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                <input
                  type="number"
                  value={f.value}
                  onChange={e => f.set(parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cta/50"
                />
              </div>
            ))}
          </div>
          <button onClick={saveGoals} disabled={goalSuccess} className="bg-cta hover:bg-brand-600 text-gray-900 font-semibold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-70">
            {goalSuccess ? 'Success ✓' : 'Save Goals'}
          </button>
        </div>
      )}

      {/* Date picker */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setDate(subDays(new Date(date + 'T12:00:00'), 1).toISOString().split('T')[0])} className="text-gray-400 hover:text-gray-200 text-lg">←</button>
        <span className="text-sm font-medium text-gray-200">{format(new Date(date + 'T12:00:00'), 'EEEE, MMM d')}</span>
        <button onClick={() => setDate(addDays(new Date(date + 'T12:00:00'), 1).toISOString().split('T')[0])} className="text-gray-400 hover:text-gray-200 text-lg">→</button>
      </div>

      {/* Macro progress bars */}
      <div className="bg-gray-900 rounded-2xl border border-white/10 p-5 mb-5">
        <div className="space-y-3">
          {[
            { label: 'Calories', current: totals.calories, goal: goalCalories, unit: 'kcal', color: 'bg-cta' },
            { label: 'Protein', current: totals.protein, goal: goalProtein, unit: 'g', color: 'bg-blue-500' },
            { label: 'Carbs', current: totals.carbs, goal: goalCarbs, unit: 'g', color: 'bg-green-500' },
            { label: 'Fat', current: totals.fat, goal: goalFat, unit: 'g', color: 'bg-orange-500' },
          ].map(m => (
            <div key={m.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">{m.label}</span>
                <span className="text-gray-300 font-medium">{Math.round(m.current)} / {m.goal} {m.unit}</span>
              </div>
              <div className="bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${m.color} ${pct(m.current, m.goal) > 100 ? 'opacity-80' : ''}`}
                  style={{ width: `${Math.min(pct(m.current, m.goal), 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Food entries by meal */}
      <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-100 text-sm">Food Log</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-sm text-cta font-medium hover:underline"
          >
            {showAddForm ? 'Cancel' : '+ Add Food'}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={addFood} className="bg-gray-800/50 rounded-xl border border-white/5 p-4 mb-4 space-y-3">
            <div className="flex gap-2">
              <select
                value={fMeal}
                onChange={e => setFMeal(e.target.value)}
                className="bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cta/50"
              >
                {MEALS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input
                value={fFood}
                onChange={e => setFFood(e.target.value)}
                placeholder="Food name"
                className="flex-1 bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cta/50"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Cal', value: fCalories, set: setFCalories },
                { label: 'Protein', value: fProtein, set: setFProtein },
                { label: 'Carbs', value: fCarbs, set: setFCarbs },
                { label: 'Fat', value: fFat, set: setFFat },
              ].map(f => (
                <input
                  key={f.label}
                  type="number"
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.label}
                  className="bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cta/50"
                />
              ))}
            </div>
            <button
              type="submit"
              disabled={saving || !fFood.trim()}
              className="bg-cta hover:bg-brand-600 text-gray-900 font-semibold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              {saving ? 'Adding…' : foodSuccess ? 'Success ✓' : 'Add'}
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No food logged for this day.</p>
        ) : (
          <div className="space-y-4">
            {MEALS.map(meal => {
              const mealEntries = entries.filter(e => e.meal_name === meal)
              if (mealEntries.length === 0) return null
              return (
                <div key={meal}>
                  <h4 className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-2">{meal}</h4>
                  <div className="space-y-1">
                    {mealEntries.map(e => (
                      <div key={e.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-800/50 group">
                        <div>
                          <p className="text-sm text-gray-200">{e.food_name}</p>
                          <p className="text-xs text-gray-500">
                            {e.calories} cal · {Number(e.protein_g)}p · {Number(e.carbs_g)}c · {Number(e.fat_g)}f
                          </p>
                        </div>
                        <button
                          onClick={() => removeEntry(e.id)}
                          className="text-xs text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
