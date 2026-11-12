'use client'
import { useEffect, useMemo, useState } from 'react'
import { Food } from '@/types'
import { scaleFood, searchFoods } from '@/lib/nutrition'
import type { UsdaFood } from '@/lib/usda'
import type { AddItem } from './AddFoodSheet'
import ServingStepper from './ServingStepper'
import AiEstimateCard from './AiEstimateCard'
import CustomFoodForm from './CustomFoodForm'

interface Props {
  foods: Food[]
  favoriteIds: Set<string>
  onToggleFavorite: (food: Food) => void
  onAdd: (item: AddItem, saveToFoods?: boolean) => void
  onFoodCreated?: (food: Food) => void
  busy?: boolean
}

export default function FoodSearchList({ foods, favoriteIds, onToggleFavorite, onAdd, onFoodCreated, busy }: Props) {
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Food | null>(null)
  const [servings, setServings] = useState(1)
  const [manual, setManual] = useState(false)
  const [usda, setUsda] = useState<UsdaFood[]>([])
  const [usdaLoading, setUsdaLoading] = useState(false)
  const [usdaSaving, setUsdaSaving] = useState(false)
  const [usdaError, setUsdaError] = useState(false)

  const results = useMemo(() => searchFoods(foods, q, 30), [foods, q])
  const trimmed = q.trim()

  useEffect(() => {
    setUsda([])
    if (trimmed.length < 3) { setUsdaLoading(false); return }
    const controller = new AbortController()
    setUsdaLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/nutrition/usda?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        const data = await res.json().catch(() => [])
        if (!controller.signal.aborted) setUsda(Array.isArray(data) ? data : [])
      } catch {
        if (!controller.signal.aborted) setUsda([])
      } finally {
        if (!controller.signal.aborted) setUsdaLoading(false)
      }
    }, 400)
    return () => { clearTimeout(timer); controller.abort() }
  }, [trimmed])

  const localNames = new Set(results.map(r => r.name.toLowerCase()))
  const usdaRows = usda.filter(f => !localNames.has(f.name.toLowerCase()))

  const pickUsda = async (f: UsdaFood) => {
    if (usdaSaving) return
    setUsdaSaving(true)
    setUsdaError(false)
    try {
      const res = await fetch('/api/nutrition/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.name, brand: f.brand, serving_size: f.serving_size, serving_grams: f.serving_grams,
          calories: f.calories, protein_g: f.protein_g, carbs_g: f.carbs_g, fat_g: f.fat_g,
          source: 'usda', fdc_id: f.fdc_id,
        }),
      })
      if (!res.ok) { setUsdaError(true); return }
      const food: Food = await res.json()
      onFoodCreated?.(food)
      setSelected(food)
      setServings(1)
    } catch {
      setUsdaError(true)
    } finally {
      setUsdaSaving(false)
    }
  }

  if (selected) {
    const scaled = scaleFood(selected, servings)
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setSelected(null)} className="text-xs text-fg-4 hover:text-fg-2">← Back to search</button>
        <div>
          <p className="text-base font-medium text-fg-1">{selected.name}</p>
          <p className="text-xs text-fg-4">{selected.brand ? `${selected.brand} · ` : ''}per {selected.serving_size}</p>
        </div>
        <ServingStepper value={servings} onChange={setServings} servingSize={selected.serving_size} servingGrams={selected.serving_grams != null ? Number(selected.serving_grams) : null} />
        <div className="grid grid-cols-4 gap-2 text-center">
          {[['kcal', scaled.calories], ['P', scaled.protein_g], ['C', scaled.carbs_g], ['F', scaled.fat_g]].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-surface-2 py-2">
              <p className="text-lg font-semibold text-fg-1 tabular-nums">{v}</p>
              <p className="text-xs uppercase tracking-wider text-fg-4">{l}</p>
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
              <button type="button" onClick={() => { setSelected(f); setServings(1) }} aria-label={`${f.name}${f.brand ? `, ${f.brand}` : ''}, ${f.calories} kcal per ${f.serving_size}`} className="flex-1 flex items-center justify-between py-2.5 text-left min-w-0">
                <div className="min-w-0">
                  <p className="text-sm text-fg-1 truncate">{f.name}</p>
                  <p className="text-xs text-fg-4 truncate">{f.serving_size} · {Math.round(Number(f.protein_g))}P · {Math.round(Number(f.carbs_g))}C · {Math.round(Number(f.fat_g))}F</p>
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
      {trimmed.length >= 3 && usdaLoading && (
        <p className="text-xs text-fg-4 text-center">Searching more foods…</p>
      )}
      {trimmed.length >= 3 && usdaRows.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-fg-4 pt-1">More foods (USDA)</p>
          <div className="divide-y divide-edge-muted max-h-[40vh] overflow-y-auto -mx-1">
            {usdaRows.map(f => (
              <div key={f.fdc_id} className="flex items-center gap-2 px-1">
                <button type="button" disabled={usdaSaving || busy} onClick={() => pickUsda(f)} aria-label={`${f.name}${f.brand ? `, ${f.brand}` : ''}, ${f.calories} kcal per ${f.serving_size}`} className="flex-1 flex items-center justify-between py-2.5 text-left min-w-0 disabled:opacity-50">
                  <div className="min-w-0">
                    <p className="text-sm text-fg-1 truncate">{f.name}</p>
                    <p className="text-xs text-fg-4 truncate">{f.brand ? `${f.brand} · ` : ''}{f.serving_size} · {Math.round(f.protein_g)}P · {Math.round(f.carbs_g)}C · {Math.round(f.fat_g)}F</p>
                  </div>
                  <span className="text-sm font-semibold text-fg-2 tabular-nums ml-3 shrink-0">{f.calories}</span>
                </button>
              </div>
            ))}
          </div>
          {usdaError && <p className="text-xs text-amber-400">Couldn&rsquo;t add that food. Try again.</p>}
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
