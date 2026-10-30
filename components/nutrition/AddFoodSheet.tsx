'use client'
import { useState } from 'react'
import { useFocusTrap } from '@/lib/useFocusTrap'
import TabBar from '@/components/shared/TabBar'
import dynamic from 'next/dynamic'
import { Food, RecentFood, SavedMeal } from '@/types'
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

type SheetTab = 'search' | 'scan' | 'recent' | 'favorites' | 'describe'

const BarcodeScanner = dynamic(() => import('./BarcodeScanner'), { ssr: false })

interface Props {
  meal: string
  foods: Food[]
  recent: RecentFood[]
  favorites: Food[]
  savedMeals: SavedMeal[]
  onAddSavedMeal: (meal: SavedMeal) => Promise<void>
  onDeleteSavedMeal: (meal: SavedMeal) => void
  onToggleFavorite: (food: Food) => void
  onFoodCreated?: (food: Food) => void
  onAdd: (items: AddItem[], saveToFoods?: boolean) => Promise<void>
  onClose: () => void
}

export default function AddFoodSheet({ meal, foods, recent, favorites, savedMeals, onAddSavedMeal, onDeleteSavedMeal, onToggleFavorite, onFoodCreated, onAdd, onClose }: Props) {
  const [tab, setTab] = useState<SheetTab>('search')
  const [busy, setBusy] = useState(false)
  const [scanMiss, setScanMiss] = useState(false)
  const favoriteIds = new Set(favorites.map(f => f.id))

  const dialogRef = useFocusTrap<HTMLDivElement>(onClose)

  const add = async (items: AddItem[], save?: boolean) => {
    setBusy(true)
    try { await onAdd(items, save) } finally { setBusy(false) }
  }
  const addMeal = async (m: SavedMeal) => {
    setBusy(true)
    try { await onAddSavedMeal(m) } finally { setBusy(false) }
  }

  const TABS: { key: SheetTab; label: string }[] = [
    { key: 'search', label: 'Search' },
    { key: 'scan', label: 'Scan' },
    { key: 'recent', label: 'Recent' },
    { key: 'favorites', label: 'Favorites' },
    { key: 'describe', label: 'Describe' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="add-food-title" tabIndex={-1} className="relative w-full sm:max-w-lg max-h-[92vh] sm:max-h-[85vh] bg-surface border border-edge rounded-t-3xl sm:rounded-3xl flex flex-col pb-safe">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 id="add-food-title" className="font-semibold text-fg-1">Add to {meal}</h3>
          <button type="button" onClick={onClose} className="btn-ghost px-2" aria-label="Close">✕</button>
        </div>
        <div className="px-5">
          <TabBar label="Add food methods" tabs={TABS} active={tab} onSelect={setTab} className="mb-3" />
        </div>
        <div className="px-5 pb-5 overflow-y-auto">
          {tab === 'search' && (
            <>
              {scanMiss && <p className="text-xs text-amber-400 mb-2">That barcode isn’t in the database yet — search for it or add it manually.</p>}
              <FoodSearchList foods={foods} favoriteIds={favoriteIds} onToggleFavorite={onToggleFavorite} busy={busy}
                onAdd={(item, save) => add([item], save)} />
            </>
          )}
          {tab === 'scan' && (
            <BarcodeScanner
              busy={busy}
              onAdd={item => add([item])}
              onFoodCreated={f => onFoodCreated?.(f)}
              onNotFound={() => { setScanMiss(true); setTab('search') }}
            />
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
            <div className="space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-fg-4 mb-1">Meals</p>
                {savedMeals.length === 0
                  ? <p className="text-sm text-fg-4 py-3">Save a logged meal to re-add it in one tap.</p>
                  : <div className="divide-y divide-edge-muted">
                      {savedMeals.map(m => {
                        const kcal = m.items.reduce((s, i) => s + Number(i.calories), 0)
                        return (
                          <div key={m.id} className="flex items-center gap-2">
                            <button type="button" disabled={busy} onClick={() => addMeal(m)} className="flex-1 flex items-center justify-between py-2.5 text-left disabled:opacity-50 min-w-0">
                              <div className="min-w-0">
                                <p className="text-sm text-fg-1 truncate">{m.name}</p>
                                <p className="text-[11px] text-fg-4 truncate">{m.items.length} item{m.items.length === 1 ? '' : 's'} · {m.items.map(i => i.food_name).join(', ')}</p>
                              </div>
                              <span className="text-sm font-semibold text-fg-2 tabular-nums ml-3 shrink-0">+ {kcal}</span>
                            </button>
                            <button type="button" onClick={() => { if (confirm(`Remove "${m.name}" from saved meals?`)) onDeleteSavedMeal(m) }}
                              aria-label={`Remove ${m.name}`} className="btn-ghost px-2 text-fg-4 shrink-0">✕</button>
                          </div>
                        )
                      })}
                    </div>}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-fg-4 mb-1">Foods</p>
                {favorites.length === 0
                  ? <p className="text-sm text-fg-4 py-3">Tap ☆ on any food in Search to favorite it.</p>
                  : <QuickList
                      items={favorites.map(f => ({ key: f.id, name: f.name, sub: f.serving_size, kcal: f.calories,
                        item: { food_name: f.name, food_id: f.id, serving_size: f.serving_size, servings: 1, calories: f.calories, protein_g: Number(f.protein_g), carbs_g: Number(f.carbs_g), fat_g: Number(f.fat_g) } }))}
                      busy={busy} onPick={i => add([i])} />}
              </div>
            </div>
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
