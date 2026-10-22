'use client'
import { useEffect, useState } from 'react'
import { Food, RecentFood } from '@/types'
import { FoodMacros, scaleFood } from '@/lib/nutrition'
import FoodSearchList from './FoodSearchList'
import DescribeMeal from './DescribeMeal'

export interface AddItem extends FoodMacros {
  food_name: string
  food_id?: string | null
  serving_size?: string | null
  servings: number
  // present when the item should also be saved to the user's foods
  perServing?: FoodMacros & { serving_size: string }
  source?: 'user' | 'ai'
}

type SheetTab = 'search' | 'recent' | 'favorites' | 'describe'

interface Props {
  meal: string
  foods: Food[]
  recent: RecentFood[]
  favorites: Food[]
  onToggleFavorite: (food: Food) => void
  onAdd: (items: AddItem[], saveToFoods?: boolean) => Promise<void>
  onClose: () => void
}

export default function AddFoodSheet({ meal, foods, recent, favorites, onToggleFavorite, onAdd, onClose }: Props) {
  const [tab, setTab] = useState<SheetTab>('search')
  const [busy, setBusy] = useState(false)
  const favoriteIds = new Set(favorites.map(f => f.id))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  const add = async (items: AddItem[], save?: boolean) => {
    setBusy(true)
    try { await onAdd(items, save) } finally { setBusy(false) }
  }

  const TABS: { key: SheetTab; label: string }[] = [
    { key: 'search', label: 'Search' },
    { key: 'recent', label: 'Recent' },
    { key: 'favorites', label: 'Favorites' },
    { key: 'describe', label: 'Describe' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] sm:max-h-[85vh] bg-surface border border-edge rounded-t-3xl sm:rounded-3xl flex flex-col pb-safe">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="font-semibold text-fg-1">Add to {meal}</h3>
          <button type="button" onClick={onClose} className="btn-ghost px-2" aria-label="Close">✕</button>
        </div>
        <div className="flex gap-2 px-5 pb-3 overflow-x-auto scrollbar-none">
          {TABS.map(t => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={tab === t.key ? 'tab-btn-active' : 'tab-btn'}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="px-5 pb-5 overflow-y-auto">
          {tab === 'search' && (
            <FoodSearchList foods={foods} favoriteIds={favoriteIds} onToggleFavorite={onToggleFavorite} busy={busy}
              onAdd={(item, save) => add([item], save)} />
          )}
          {tab === 'recent' && (
            recent.length === 0
              ? <p className="text-sm text-fg-4 text-center py-8">Foods you log show up here for one-tap re-adding.</p>
              : <QuickList
                  items={recent.map(r => ({ key: r.food_name, name: r.food_name, sub: `${r.servings} × ${r.serving_size ?? 'serving'}`, kcal: scaleFood(r, r.servings).calories,
                    item: { food_name: r.food_name, food_id: r.food_id, serving_size: r.serving_size, servings: r.servings, ...scaleFood(r, r.servings) } }))}
                  busy={busy} onPick={i => add([i])} />
          )}
          {tab === 'favorites' && (
            favorites.length === 0
              ? <p className="text-sm text-fg-4 text-center py-8">Tap ☆ on any food in Search to favorite it.</p>
              : <QuickList
                  items={favorites.map(f => ({ key: f.id, name: f.name, sub: f.serving_size, kcal: f.calories,
                    item: { food_name: f.name, food_id: f.id, serving_size: f.serving_size, servings: 1, calories: f.calories, protein_g: Number(f.protein_g), carbs_g: Number(f.carbs_g), fat_g: Number(f.fat_g) } }))}
                  busy={busy} onPick={i => add([i])} />
          )}
          {tab === 'describe' && <DescribeMeal meal={meal} busy={busy} onAddMany={items => add(items, true)} />}
        </div>
      </div>
    </div>
  )
}

function QuickList({ items, busy, onPick }: { items: { key: string; name: string; sub: string; kcal: number; item: AddItem }[]; busy: boolean; onPick: (i: AddItem) => void }) {
  return (
    <div className="divide-y divide-edge-muted">
      {items.map(x => (
        <button key={x.key} type="button" disabled={busy} onClick={() => onPick(x.item)} className="w-full flex items-center justify-between py-2.5 text-left disabled:opacity-50">
          <div className="min-w-0">
            <p className="text-sm text-fg-1 truncate">{x.name}</p>
            <p className="text-[11px] text-fg-4">{x.sub}</p>
          </div>
          <span className="text-sm font-semibold text-fg-2 tabular-nums ml-3 shrink-0">+ {x.kcal}</span>
        </button>
      ))}
    </div>
  )
}
