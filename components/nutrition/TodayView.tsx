'use client'
import { useCallback, useEffect, useState } from 'react'
import { Food, FoodEntry, NutritionGoal, RecentFood, SavedMeal } from '@/types'
import { MEALS, MealName, localDateISO, shiftDate, sumEntries } from '@/lib/nutrition'
import DateStrip from './DateStrip'
import DailySummary from './DailySummary'
import MealSection from './MealSection'
import AddFoodSheet, { AddItem } from './AddFoodSheet'
import GameDayCard from './GameDayCard'
import SaveMealSheet from './SaveMealSheet'

interface Props {
  goal: NutritionGoal | null
  foods: Food[]
  favorites: Food[]
  onToggleFavorite: (food: Food) => void
  onFoodCreated: (food: Food) => void
  onSetGoal: () => void
  notify: (msg: string) => void
}

export default function TodayView({ goal, foods, favorites, onToggleFavorite, onFoodCreated, onSetGoal, notify }: Props) {
  const [date, setDate] = useState(() => localDateISO(new Date()))
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [yesterdayMeals, setYesterdayMeals] = useState<Set<string>>(new Set())
  const [recent, setRecent] = useState<RecentFood[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetMeal, setSheetMeal] = useState<MealName | null>(null)
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([])
  const [saveMeal, setSaveMeal] = useState<MealName | null>(null)

  const load = useCallback(async () => {
    const [e, y] = await Promise.all([
      fetch(`/api/nutrition/entries?date=${date}`).then(r => r.json()),
      fetch(`/api/nutrition/entries?date=${shiftDate(date, -1)}`).then(r => r.json()),
    ])
    setEntries(Array.isArray(e) ? e : [])
    setYesterdayMeals(new Set((Array.isArray(y) ? y : []).map((x: FoodEntry) => x.meal_name)))
    setLoading(false)
  }, [date])

  const loadRecent = useCallback(() => {
    fetch('/api/nutrition/recent').then(r => r.json()).then(d => setRecent(Array.isArray(d) ? d : []))
  }, [])

  useEffect(() => { setLoading(true); load() }, [load])
  useEffect(() => { loadRecent() }, [loadRecent])
  useEffect(() => {
    fetch('/api/nutrition/saved-meals').then(r => r.json()).then(d => setSavedMeals(Array.isArray(d) ? d : []))
  }, [])

  const addItems = async (items: AddItem[], saveToFoods?: boolean) => {
    if (!sheetMeal) return
    const added: FoodEntry[] = []
    for (const item of items) {
      let food_id = item.food_id ?? null
      if (saveToFoods && !food_id && item.perServing) {
        const res = await fetch('/api/nutrition/foods', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: item.food_name, ...item.perServing, source: item.source ?? 'user' }),
        })
        if (res.ok) { const food = await res.json(); food_id = food.id; onFoodCreated(food) }
      }
      const res = await fetch('/api/nutrition/entries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_date: date, meal_name: sheetMeal, food_name: item.food_name, food_id,
          servings: item.servings, serving_size: item.serving_size,
          calories: item.calories, protein_g: item.protein_g, carbs_g: item.carbs_g, fat_g: item.fat_g,
        }),
      })
      if (res.ok) added.push(await res.json())
    }
    if (added.length) {
      setEntries(prev => [...prev, ...added])
      notify(`Added ${added.length === 1 ? added[0].food_name : `${added.length} items`} to ${sheetMeal}`)
      loadRecent()
    }
    setSheetMeal(null)
  }

  const updateServings = async (id: string, servings: number) => {
    const res = await fetch('/api/nutrition/entries', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, servings }),
    })
    if (res.ok) { const row = await res.json(); setEntries(prev => prev.map(e => e.id === id ? row : e)) }
  }

  const remove = async (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
    await fetch('/api/nutrition/entries', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
  }

  const copyYesterday = async (meal: MealName) => {
    const res = await fetch('/api/nutrition/entries/copy', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_date: shiftDate(date, -1), to_date: date, meal_name: meal }),
    })
    const data = await res.json()
    if (res.ok) { setEntries(prev => [...prev, ...data.inserted]); notify(`Copied yesterday's ${meal.toLowerCase()}`) }
    else notify(data.error ?? 'Could not copy.')
  }

  const saveMealAs = async (name: string) => {
    if (!saveMeal) return
    const ids = entries.filter(e => e.meal_name === saveMeal).map(e => e.id)
    const res = await fetch('/api/nutrition/saved-meals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, meal_name: saveMeal, entry_ids: ids }),
    })
    const data = await res.json()
    if (res.ok) { setSavedMeals(prev => [data, ...prev]); notify(`Saved "${name}" to Favorites`) }
    else notify(data.error ?? 'Could not save meal.')
    setSaveMeal(null)
  }

  const addSavedMeal = async (meal: SavedMeal) => {
    if (!sheetMeal) return
    const res = await fetch('/api/nutrition/saved-meals/log', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saved_meal_id: meal.id, entry_date: date, meal_name: sheetMeal }),
    })
    const data = await res.json()
    if (res.ok) { setEntries(prev => [...prev, ...data.inserted]); notify(`Added ${meal.name} to ${sheetMeal}`); loadRecent() }
    else notify(data.error ?? 'Could not add meal.')
    setSheetMeal(null)
  }

  const deleteSavedMeal = async (meal: SavedMeal) => {
    setSavedMeals(prev => prev.filter(m => m.id !== meal.id))
    await fetch('/api/nutrition/saved-meals', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: meal.id }) })
  }

  const totals = sumEntries(entries)

  return (
    <div className="space-y-4">
      <DateStrip date={date} onChange={setDate} />
      <DailySummary totals={totals} goal={goal} onSetGoal={onSetGoal} />
      <GameDayCard today={date} bodyWeightLb={goal?.current_weight_lb} />
      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="skeleton h-16" />)}</div>
      ) : (
        MEALS.map(meal => (
          <MealSection
            key={meal}
            meal={meal}
            entries={entries.filter(e => e.meal_name === meal)}
            canCopyYesterday={yesterdayMeals.has(meal)}
            onAdd={() => setSheetMeal(meal)}
            onCopyYesterday={() => copyYesterday(meal)}
            onSaveMeal={() => setSaveMeal(meal)}
            onServings={updateServings}
            onDelete={remove}
          />
        ))
      )}
      {sheetMeal && (
        <AddFoodSheet
          meal={sheetMeal}
          foods={foods}
          recent={recent}
          favorites={favorites}
          savedMeals={savedMeals}
          onAddSavedMeal={addSavedMeal}
          onDeleteSavedMeal={deleteSavedMeal}
          onToggleFavorite={onToggleFavorite}
          onFoodCreated={onFoodCreated}
          onAdd={addItems}
          onClose={() => setSheetMeal(null)}
        />
      )}
      {saveMeal && (
        <SaveMealSheet
          meal={saveMeal}
          entries={entries.filter(e => e.meal_name === saveMeal)}
          defaultName={`${saveMeal} – ${date}`}
          onSave={saveMealAs}
          onClose={() => setSaveMeal(null)}
        />
      )}
    </div>
  )
}
