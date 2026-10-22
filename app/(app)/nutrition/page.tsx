'use client'
import { useCallback, useEffect, useState } from 'react'
import { Food, NutritionGoal } from '@/types'
import TodayView from '@/components/nutrition/TodayView'
import TrendsView from '@/components/nutrition/TrendsView'
import GoalsView from '@/components/nutrition/GoalsView'
import LessonLinks from '@/components/shared/LessonLinks'

type Tab = 'today' | 'trends' | 'goals'

const TABS: { key: Tab; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'trends', label: 'Trends' },
  { key: 'goals', label: 'Goals' },
]

export default function NutritionPage() {
  const [tab, setTab] = useState<Tab>('today')
  const [goal, setGoal] = useState<NutritionGoal | null>(null)
  const [foods, setFoods] = useState<Food[]>([])
  const [favorites, setFavorites] = useState<Food[]>([])
  const [toast, setToast] = useState<string | null>(null)

  const notify = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])

  useEffect(() => {
    fetch('/api/nutrition/goals').then(r => r.json()).then(g => setGoal(g?.id ? g : null))
    fetch('/api/nutrition/foods').then(r => r.json()).then(d => setFoods(Array.isArray(d) ? d : []))
    fetch('/api/nutrition/favorites').then(r => r.json()).then(d => setFavorites(Array.isArray(d) ? d : []))
  }, [])

  const toggleFavorite = useCallback(async (food: Food) => {
    const isFav = favorites.some(f => f.id === food.id)
    setFavorites(prev => isFav ? prev.filter(f => f.id !== food.id) : [food, ...prev])
    await fetch('/api/nutrition/favorites', {
      method: isFav ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ food_id: food.id }),
    })
  }, [favorites])

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Nutrition</h1>
        <p className="page-subtitle">Fuel like it&rsquo;s part of training — because it is.</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={tab === t.key ? 'tab-btn-active' : 'tab-btn'}>
            {t.label}
          </button>
        ))}
      </div>

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-surface border border-cta/40 text-fg-1 text-sm px-4 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className={tab === 'today' ? '' : 'hidden'}>
        <TodayView
          goal={goal}
          foods={foods}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onFoodCreated={f => setFoods(prev => [f, ...prev])}
          onSetGoal={() => setTab('goals')}
          notify={notify}
        />
      </div>
      {tab === 'trends' && <TrendsView goal={goal} />}
      {tab === 'goals' && <GoalsView goal={goal} onSaved={setGoal} notify={notify} />}

      <div className="mt-6"><LessonLinks section="nutrition" /></div>
    </div>
  )
}
