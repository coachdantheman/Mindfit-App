'use client'
import { useCallback, useEffect, useState } from 'react'
import { Food, NutritionGoal } from '@/types'
import { cached } from '@/lib/api-cache'
import TodayView from '@/components/nutrition/TodayView'
import TrendsView from '@/components/nutrition/TrendsView'
import GoalsView from '@/components/nutrition/GoalsView'
import GameDayView from '@/components/nutrition/GameDayView'
import LessonLinks from '@/components/shared/LessonLinks'
import TabBar from '@/components/shared/TabBar'

type Tab = 'today' | 'gameday' | 'trends' | 'goals'

const TABS: { key: Tab; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'gameday', label: 'Game Day' },
  { key: 'trends', label: 'Progress' },
  { key: 'goals', label: 'Goals' },
]

const QUIZ_SKIP_KEY = 'mf-nutrition-quiz-skipped'

export default function NutritionPage() {
  const [tab, setTab] = useState<Tab>('today')
  const [goal, setGoal] = useState<NutritionGoal | null>(null)
  const [goalLoaded, setGoalLoaded] = useState(false)
  const [quizSkipped, setQuizSkipped] = useState(true)
  const [foods, setFoods] = useState<Food[]>([])
  const [favorites, setFavorites] = useState<Food[]>([])
  const [toast, setToast] = useState<{ msg: string; kind: 'success' | 'error' } | null>(null)

  const notify = useCallback((msg: string, kind: 'success' | 'error' = 'success') => {
    setToast({ msg, kind })
    setTimeout(() => setToast(null), kind === 'error' ? 4000 : 2500)
  }, [])

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab')
    if (t && TABS.some(x => x.key === t)) setTab(t as Tab)
  }, [])

  useEffect(() => {
    try { setQuizSkipped(localStorage.getItem(QUIZ_SKIP_KEY) === '1') } catch { setQuizSkipped(false) }
    cached('/api/nutrition/goals', (g: NutritionGoal | null) => { setGoal(g?.id ? g : null); setGoalLoaded(true) }).catch(() => {})
    cached('/api/nutrition/foods', (d: Food[]) => setFoods(Array.isArray(d) ? d : [])).catch(() => {})
    cached('/api/nutrition/favorites', (d: Food[]) => setFavorites(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const toggleFavorite = useCallback(async (food: Food) => {
    const isFav = favorites.some(f => f.id === food.id)
    const before = favorites
    setFavorites(prev => isFav ? prev.filter(f => f.id !== food.id) : [food, ...prev])
    const res = await fetch('/api/nutrition/favorites', {
      method: isFav ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ food_id: food.id }),
    }).catch(() => null)
    if (!res?.ok) {
      setFavorites(before)
      notify("Couldn't update favorites. Try again.", 'error')
    }
  }, [favorites, notify])

  // The server already starred it (favorites API with entry_id); just merge.
  const favoriteSaved = useCallback((food: Food) => {
    setFavorites(prev => prev.some(f => f.id === food.id) ? prev : [food, ...prev])
  }, [])

  const skipQuiz = () => {
    setQuizSkipped(true)
    try { localStorage.setItem(QUIZ_SKIP_KEY, '1') } catch {}
  }
  const showQuiz = goalLoaded && !quizSkipped && !goal?.quiz_completed_at

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Nutrition</h1>
        <p className="page-subtitle">Fuel like it&rsquo;s part of training, because it is.</p>
      </div>

      <TabBar label="Nutrition sections" tabs={TABS} active={tab} onSelect={setTab} />

      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-surface border text-sm px-4 py-2 rounded-xl shadow-lg ${toast.kind === 'error' ? 'border-red-500/40 text-red-400' : 'border-cta/40 text-fg-1'}`}>
          {toast.msg}
        </div>
      )}

      <div className={tab === 'today' ? '' : 'hidden'}>
        {showQuiz && (
          <section className="mb-6 space-y-3" aria-label="Set your nutrition goal">
            <div>
              <h2 className="text-base font-semibold text-fg-1">Set your fuel goal</h2>
              <p className="text-sm text-fg-3">Five quick questions and you get your calories and macros for today. You can change it anytime in Goals.</p>
            </div>
            <GoalsView goal={goal} onSaved={setGoal} notify={notify} />
            <button type="button" onClick={skipQuiz} className="block mx-auto text-xs text-fg-4 underline underline-offset-4 min-h-[44px]">
              Skip for now
            </button>
          </section>
        )}
        <TodayView
          goal={goal}
          foods={foods}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onFavoriteSaved={favoriteSaved}
          onFoodCreated={f => setFoods(prev => prev.some(x => x.id === f.id) ? prev : [f, ...prev])}
          onSetGoal={() => setTab('goals')}
          onOpenGameDay={() => setTab('gameday')}
          notify={notify}
        />
      </div>
      {tab === 'gameday' && <GameDayView bodyWeightLb={goal?.current_weight_lb} notify={notify} />}
      {tab === 'trends' && <TrendsView goal={goal} />}
      {tab === 'goals' && <GoalsView goal={goal} onSaved={setGoal} notify={notify} />}

      <div className="mt-6"><LessonLinks section="nutrition" /></div>
      <p className="text-xs text-fg-4 mt-6">
        Nutrition numbers here are estimates for learning, not medical or dietary advice. Check with a parent and a doctor or registered dietitian before changing how you eat.
      </p>
    </div>
  )
}
