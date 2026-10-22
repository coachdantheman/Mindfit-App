'use client'
import { useMemo, useState } from 'react'
import { Food } from '@/types'
import { scaleFood, searchFoods } from '@/lib/nutrition'
import type { AddItem } from './AddFoodSheet'
import ServingStepper from './ServingStepper'
import AiEstimateCard from './AiEstimateCard'
import CustomFoodForm from './CustomFoodForm'

interface Props {
  foods: Food[]
  favoriteIds: Set<string>
  onToggleFavorite: (food: Food) => void
  onAdd: (item: AddItem, saveToFoods?: boolean) => void
  busy?: boolean
}

export default function FoodSearchList({ foods, favoriteIds, onToggleFavorite, onAdd, busy }: Props) {
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Food | null>(null)
  const [servings, setServings] = useState(1)
  const [manual, setManual] = useState(false)

  const results = useMemo(() => searchFoods(foods, q, 30), [foods, q])

  if (selected) {
    const scaled = scaleFood(selected, servings)
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setSelected(null)} className="text-xs text-fg-4 hover:text-fg-2">← Back to search</button>
        <div>
          <p className="text-base font-medium text-fg-1">{selected.name}</p>
          <p className="text-xs text-fg-4">{selected.brand ? `${selected.brand} · ` : ''}per {selected.serving_size}</p>
        </div>
        <ServingStepper value={servings} onChange={setServings} servingSize={selected.serving_size} />
        <div className="grid grid-cols-4 gap-2 text-center">
          {[['kcal', scaled.calories], ['P', scaled.protein_g], ['C', scaled.carbs_g], ['F', scaled.fat_g]].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-surface-2 py-2">
              <p className="text-lg font-semibold text-fg-1 tabular-nums">{v}</p>
              <p className="text-[10px] uppercase tracking-wider text-fg-4">{l}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAdd({ food_name: selected.name, food_id: selected.id, serving_size: selected.serving_size, servings, ...scaled })}
          className="btn-primary w-full"
        >
          Add {scaled.calories} kcal
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <input
        autoFocus
        className="input-field"
        placeholder="Search foods (chicken, rice, Gatorade…)"
        value={q}
        onChange={e => { setQ(e.target.value); setManual(false) }}
      />
      {q.trim() === '' && (
        <p className="text-xs text-fg-4 text-center py-6">Start typing to search {foods.length} foods.</p>
      )}
      {results.length > 0 && (
        <div className="divide-y divide-edge-muted max-h-[50vh] overflow-y-auto -mx-1">
          {results.map(f => (
            <div key={f.id} className="flex items-center gap-2 px-1">
              <button type="button" onClick={() => { setSelected(f); setServings(1) }} className="flex-1 flex items-center justify-between py-2.5 text-left min-w-0">
                <div className="min-w-0">
                  <p className="text-sm text-fg-1 truncate">{f.name}</p>
                  <p className="text-[11px] text-fg-4 truncate">{f.serving_size} · {Math.round(Number(f.protein_g))}P · {Math.round(Number(f.carbs_g))}C · {Math.round(Number(f.fat_g))}F</p>
                </div>
                <span className="text-sm font-semibold text-fg-2 tabular-nums ml-3 shrink-0">{f.calories}</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleFavorite(f)}
                className={`w-11 h-11 sm:w-8 sm:h-8 text-lg sm:text-base shrink-0 ${favoriteIds.has(f.id) ? 'text-cta' : 'text-fg-4 hover:text-fg-2'}`}
                aria-label={favoriteIds.has(f.id) ? 'Remove favorite' : 'Add favorite'}
              >
                {favoriteIds.has(f.id) ? '★' : '☆'}
              </button>
            </div>
          ))}
        </div>
      )}
      {q.trim() !== '' && results.length === 0 && !manual && (
        <>
          <AiEstimateCard query={q.trim()} onAdd={onAdd} busy={busy} />
          <button type="button" onClick={() => setManual(true)} className="btn-ghost w-full">Enter it manually</button>
        </>
      )}
      {q.trim() !== '' && results.length > 0 && !manual && (
        <button type="button" onClick={() => setManual(true)} className="text-xs text-fg-4 hover:text-fg-2 w-full text-center">Not here? Enter it manually</button>
      )}
      {manual && <CustomFoodForm initialName={q.trim()} onAdd={onAdd} busy={busy} />}
    </div>
  )
}
