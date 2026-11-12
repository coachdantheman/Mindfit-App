'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Food, FoodEntry, NutritionGoal, RecentFood, SavedMeal } from '@/types'
import { MEALS, MealName, localDateISO, shiftDate, sumEntries } from '@/lib/nutrition'
import DateStrip from './DateStrip'
import DailySummary from './DailySummary'
import MealSection from './MealSection'
import AddFoodSheet, { AddItem } from './AddFoodSheet'
import GameDayCard from './GameDayCard'
import SaveMealSheet from './SaveMealSheet'
import SupplementsCard from './SupplementsCard'
import { cached, cachedAll } from '@/lib/api-cache'

interface Props {
  goal: NutritionGoal | null
  foods: Food[]
  favorites: Food[]
  onToggleFavorite: (food: Food) => void
  onFavoriteSaved: (food: Food) => void
  onFoodCreated: (food: Food) => void
  onSetGoal: () => void
  onOpenGameDay: () => void
  notify: (msg: string, kind?: 'success' | 'error') => void
}

export default function TodayView({ goal, foods, favorites, onToggleFavorite, onFavoriteSaved, onFoodCreated, onSetGoal, onOpenGameDay, notify }: Props) {
  const [date, setDate] = useState(() => localDateISO(new Date()))
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [yesterdayMeals, setYesterdayMeals] = useState<Set<string>>(new Set())
  const [recent, setRecent] = useState<RecentFood[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetMeal, setSheetMeal] = useState<MealName | null>(null)
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([])
  const [saveMeal, setSaveMeal] = useState<MealName | null>(null)
  const inFlight = useRef(new Set<string>())
  const once = (key: string, fn: () => Promise<void>) => {
    if (inFlight.current.has(key)) return Promise.resolve()
    inFlight.current.add(key)
    return fn().finally(() => inFlight.current.delete(key))
  }

  const load = useCallback(() => cachedAll([
    `/api/nutrition/entries?date=${date}`,
    `/api/nutrition/entries?date=${shiftDate(date, -1)}`,
  ], ([e, y]: [FoodEntry[], FoodEntry[]]) => {
    setEntries(Array.isArray(e) ? e : [])
    setYesterdayMeals(new Set((Array.isArray(y) ? y : []).map(x => x.meal_name)))
    setLoading(false)
  }), [date])

  const loadRecent = useCallback(() => {
    fetch('/api/nutrition/recent').then(r => r.json()).then(d => setRecent(Array.isArray(d) ? d : []))
  }, [])

  useEffect(() => { setLoading(true); load() }, [load])
  useEffect(() => { cached('/api/nutrition/recent', (d: RecentFood[]) => setRecent(Array.isArray(d) ? d : [])) }, [])
  useEffect(() => {
    cached('/api/nutrition/saved-meals', (d: SavedMeal[]) => setSavedMeals(Array.isArray(d) ? d : []))
  }, [])

  // Every meal the athlete builds lands in Favorites on its own. A slot
  // needs at least two items to count as a meal, and the server skips
  // item sets it already has.
  const autoTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const entriesRef = useRef(entries)
  entriesRef.current = entries
  const autoSaveMeal = useCallback((meal: MealName) => {
    clearTimeout(autoTimers.current[meal])
    autoTimers.current[meal] = setTimeout(async () => {
      const ids = entriesRef.current.filter(e => e.meal_name === meal).map(e => e.id)
      if (ids.length < 2) return
      const res = await fetch('/api/nutrition/saved-meals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto: true, meal_name: meal, entry_date: date, entry_ids: ids }),
      })
      if (!res.ok) return
      const data = await res.json()
      if (data?.id && !data.duplicate) setSavedMeals(prev => [...prev.filter(m => !m.auto_saved), data, ...prev.filter(m => m.auto_saved)])
    }, 1500)
  }, [date])

  const addItems = (items: AddItem[], saveToFoods?: boolean) => once('add', async () => {
    if (!sheetMeal) return
    const added: FoodEntry[] = []
    let failed = 0
    for (const item of items) {
      try {
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
        else failed++
      } catch {
        failed++
      }
    }
    if (added.length) {
      setEntries(prev => [...prev, ...added])
      notify(`Added ${added.length === 1 ? added[0].food_name : `${added.length} items`} to ${sheetMeal}`)
      loadRecent()
      autoSaveMeal(sheetMeal)
    }
    if (failed) {
      notify(failed === items.length ? "Couldn't add those items. Try again." : `Couldn't add ${failed} of ${items.length} items. Try again.`, 'error')
    }
    setSheetMeal(null)
  })

  const updateServings = async (id: string, servings: number) => {
    const res = await fetch('/api/nutrition/entries', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, servings }),
    }).catch(() => null)
    if (!res?.ok) { notify("Couldn't update servings. Try again.", 'error'); return }
    const row = await res.json()
    setEntries(prev => prev.map(e => e.id === id ? row : e))
  }

  const remove = async (id: string) => {
    const before = entries
    setEntries(prev => prev.filter(e => e.id !== id))
    const res = await fetch('/api/nutrition/entries', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => null)
    if (!res?.ok) {
      setEntries(before)
      notify("Couldn't remove that. Try again.", 'error')
    }
  }

  const copyYesterday = (meal: MealName) => once('copy', async () => {
    try {
      const res = await fetch('/api/nutrition/entries/copy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_date: shiftDate(date, -1), to_date: date, meal_name: meal }),
      })
      const data = await res.json()
      if (res.ok) { setEntries(prev => [...prev, ...data.inserted]); notify(`Copied yesterday's ${meal.toLowerCase()}`); autoSaveMeal(meal) }
      else notify(data.error ?? 'Could not copy.', 'error')
    } catch {
      notify("Couldn't copy. Try again.", 'error')
    }
  })

  const saveMealAs = (name: string) => once('saveMeal', async () => {
    if (!saveMeal) return
    const ids = entries.filter(e => e.meal_name === saveMeal).map(e => e.id)
    try {
      const res = await fetch('/api/nutrition/saved-meals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, meal_name: saveMeal, entry_ids: ids }),
      })
      const data = await res.json()
      if (res.ok) { setSavedMeals(prev => [data, ...prev]); notify(`Saved "${name}" to Favorites`) }
      else notify(data.error ?? 'Could not save meal.', 'error')
    } catch {
      notify("Couldn't save the meal. Try again.", 'error')
    }
    setSaveMeal(null)
  })

  const addSavedMeal = (meal: SavedMeal) => once('addSaved', async () => {
    if (!sheetMeal) return
    try {
      const res = await fetch('/api/nutrition/saved-meals/log', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saved_meal_id: meal.id, entry_date: date, meal_name: sheetMeal }),
      })
      const data = await res.json()
      if (res.ok) { setEntries(prev => [...prev, ...data.inserted]); notify(`Added ${meal.name} to ${sheetMeal}`); loadRecent() }
      else notify(data.error ?? 'Could not add meal.', 'error')
    } catch {
      notify("Couldn't add that meal. Try again.", 'error')
    }
    setSheetMeal(null)
  })

  const deleteSavedMeal = async (meal: SavedMeal) => {
    const before = savedMeals
    setSavedMeals(prev => prev.filter(m => m.id !== meal.id))
    const res = await fetch('/api/nutrition/saved-meals', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: meal.id }) }).catch(() => null)
    if (!res?.ok) {
      setSavedMeals(before)
      notify("Couldn't delete that meal. Try again.", 'error')
    }
  }

  // Star something already on the log. Unstarring only needs the food id;
  // starring goes through the server so a manual or AI-estimated entry
  // becomes a reusable food first and the entry gets linked to it.
  const favoriteIds = new Set(favorites.map(f => f.id))
  const toggleEntryFavorite = (entry: FoodEntry) => once(`fav:${entry.id}`, async () => {
    const starred = entry.food_id ? favorites.find(f => f.id === entry.food_id) : undefined
    if (starred) { onToggleFavorite(starred); notify(`Removed ${entry.food_name} from Favorites`); return }
    const res = await fetch('/api/nutrition/favorites', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: entry.id }),
    })
    const data = await res.json()
    if (!res.ok || !data?.food) { notify(data?.error ?? 'Could not add to Favorites.'); return }
    const food: Food = data.food
    if (!foods.some(f => f.id === food.id)) onFoodCreated(food)
    onFavoriteSaved(food)
    if (entry.food_id !== food.id) setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, food_id: food.id } : e))
    notify(`Saved ${entry.food_name} to Favorites`)
  })

  const totals = sumEntries(entries)

  return (
    <div className="space-y-4">
      <DateStrip date={date} onChange={setDate} />
      <DailySummary totals={totals} goal={goal} onSetGoal={onSetGoal} />
      <GameDayCard today={date} onOpenGameDay={onOpenGameDay} />
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
            favoriteIds={favoriteIds}
            onToggleFavorite={toggleEntryFavorite}
            onServings={updateServings}
            onDelete={remove}
          />
        ))
      )}
      <SupplementsCard date={date} />
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
          defaultName={`${saveMeal}, ${date}`}
          onSave={saveMealAs}
          onClose={() => setSaveMeal(null)}
        />
      )}
    </div>
  )
}
